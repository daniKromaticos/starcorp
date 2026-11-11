import { createClient } from "jsr:@supabase/supabase-js@2";

const POWERBI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";
const TOKEN_CACHE: { value?: string; expiresAt?: number } = {};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(
  body: BodyInit | null,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: { ...corsHeaders, ...(init.headers ?? {}) },
  });
}

function respondJson(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAzureToken(tenant: string, clientId: string, secret: string) {
  if (TOKEN_CACHE.value && TOKEN_CACHE.expiresAt! > Date.now() + 60_000) {
    return TOKEN_CACHE.value;
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: secret,
        scope: POWERBI_SCOPE,
      }),
    },
  );
  if (!res.ok) throw new Error(`Azure token ${res.status}`);
  const json = await res.json();
  TOKEN_CACHE.value = json.access_token;
  TOKEN_CACHE.expiresAt = Date.now() + json.expires_in * 1000;
  return json.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return respond("ok");
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond("Missing auth", { status: 401 });
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const {
      data: { user },
      error: uErr,
    } = await supabase.auth.getUser(token);
    if (uErr || !user) return respond("Invalid JWT", { status: 401 });

    const { groupId, reportId } = (await req.json()) as {
      groupId?: string;
      reportId?: string;
    };
    if (!groupId || !reportId) {
      return respond("groupId + reportId required", { status: 400 });
    }

    const { data: vault, error: vErr } = await supabase
      .from("starcorp_vault")
      .select("key,value")
      .in("key", ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"]);
    if (vErr || !vault || vault.length < 3) {
      throw new Error("Vault misconfigured");
    }
    const kv = Object.fromEntries(vault.map((r) => [r.key, r.value]));

    const azureToken = await getAzureToken(
      kv.AZURE_TENANT_ID,
      kv.AZURE_CLIENT_ID,
      kv.AZURE_CLIENT_SECRET,
    );

    const reportRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}`,
      { headers: { Authorization: `Bearer ${azureToken}` } },
    );
    if (!reportRes.ok) {
      const txt = await reportRes.text();
      return respond(`PBI report ${reportRes.status}: ${txt}`, {
        status: 502,
      });
    }
    const report = await reportRes.json();

    const tokenRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/GenerateToken`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${azureToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessLevel: "View" }),
      },
    );
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return respond(`PBI token ${tokenRes.status}: ${txt}`, { status: 502 });
    }
    const { token: embedToken, expiration } = await tokenRes.json();

    return respondJson({
      embedUrl: report.embedUrl,
      embedToken,
      reportId,
      expiration,
    });
  } catch (err) {
    console.error(err);
    return respond("Internal error", { status: 500 });
  }
});

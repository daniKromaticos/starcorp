import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

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

interface TokenRow {
  user_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  access_expires_at: string;
  refresh_expires_at: string;
  updated_at: string;
}

async function loadTokens(
  admin: SupabaseClient,
  userId: string,
  realmId: string | undefined,
): Promise<TokenRow> {
  let query = admin
    .from("qb_user_tokens")
    .select("*")
    .eq("user_id", userId);

  if (realmId) {
    query = query.eq("realm_id", realmId);
  } else {
    // Fallback: most recently updated row when client didn't pick a company.
    query = query.order("updated_at", { ascending: false }).limit(1);
  }

  const { data, error } = await query.maybeSingle<TokenRow>();
  if (error) throw new Error(`load_failed_${error.code}`);
  if (!data) throw new Error("not_connected");
  return data;
}

async function refreshIfNeeded(
  admin: SupabaseClient,
  row: TokenRow,
  clientId: string,
  clientSecret: string,
): Promise<TokenRow> {
  if (new Date(row.refresh_expires_at).getTime() < Date.now()) {
    throw new Error("reauth_required");
  }

  if (new Date(row.access_expires_at).getTime() > Date.now() + 60_000) {
    return row;
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
  });
  if (res.status === 400 || res.status === 401) {
    throw new Error("reauth_required");
  }
  if (!res.ok) throw new Error(`refresh_failed_${res.status}`);

  const t = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
  };
  const now = Date.now();
  const updated: TokenRow = {
    ...row,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    access_expires_at: new Date(now + t.expires_in * 1000).toISOString(),
    refresh_expires_at: new Date(
      now + t.x_refresh_token_expires_in * 1000,
    ).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
  await admin.from("qb_user_tokens")
    .update(updated)
    .eq("user_id", row.user_id)
    .eq("realm_id", row.realm_id);
  return updated;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respond("ok");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond("Missing auth", { status: 401 });
    const userJwt = authHeader.replace(/^Bearer\s+/i, "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: uErr } = await admin.auth.getUser(userJwt);
    if (uErr || !user) return respond("Invalid JWT", { status: 401 });

    const body = await req.json() as {
      endpoint: string;
      query?: Record<string, string>;
      realmId?: string;
    };
    if (!body.endpoint) {
      return respond("endpoint required", { status: 400 });
    }

    const { data: vault, error: vErr } = await admin
      .from("starcorp_vault")
      .select("key,value")
      .in(
        "key",
        ["QB_CLIENT_ID", "QB_CLIENT_SECRET", "QB_ENVIRONMENT", "ADMIN_USER_ID"],
      );
    if (vErr || !vault || vault.length < 3) {
      return respond("Vault misconfigured", { status: 500 });
    }
    const kv = Object.fromEntries(vault.map((r) => [r.key, r.value]));

    if (!kv.ADMIN_USER_ID) {
      return respondJson({ error: "not_connected" }, { status: 409 });
    }

    let tokens: TokenRow;
    try {
      const row = await loadTokens(admin, kv.ADMIN_USER_ID, body.realmId);
      tokens = await refreshIfNeeded(
        admin,
        row,
        kv.QB_CLIENT_ID,
        kv.QB_CLIENT_SECRET,
      );
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "not_connected") {
        return respondJson({ error: "not_connected" }, { status: 409 });
      }
      if (msg === "reauth_required") {
        return respondJson({ error: "reauth_required" }, { status: 410 });
      }
      throw e;
    }

    const base = kv.QB_ENVIRONMENT === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";

    const cleanedEndpoint = body.endpoint.replace(/^\//, "");
    const qs = body.query
      ? "?" + new URLSearchParams(body.query).toString()
      : "";
    const url =
      `${base}/v3/company/${tokens.realm_id}/${cleanedEndpoint}${qs}`;

    const qbRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
      },
    });
    const intuitTid = qbRes.headers.get("intuit_tid") ?? undefined;
    if (!qbRes.ok) {
      const txt = await qbRes.text();
      console.error({
        error: "QB_API_ERROR",
        status: qbRes.status,
        intuit_tid: intuitTid,
        realm_id: tokens.realm_id,
        endpoint: body.endpoint,
        detail: txt,
      });
      return respondJson(
        { error: `QB ${qbRes.status}`, intuit_tid: intuitTid },
        { status: 502 },
      );
    }
    return respondJson({ ...(await qbRes.json()), intuit_tid: intuitTid });
  } catch (err) {
    console.error(err);
    return respond("Internal error", { status: 500 });
  }
});

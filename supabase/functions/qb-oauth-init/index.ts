import { createClient } from "jsr:@supabase/supabase-js@2";

const QB_AUTHORIZE = "https://appcenter.intuit.com/connect/oauth2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respondJson(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respondJson({ error: "missing_auth" }, { status: 401 });
    const userJwt = authHeader.replace(/^Bearer\s+/i, "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: uErr } = await admin.auth.getUser(userJwt);
    if (uErr || !user) return respondJson({ error: "invalid_jwt" }, { status: 401 });

    // Conectar es cosa de rol: cualquier super_admin puede. ADMIN_USER_ID ya
    // no es un gate de identidad, es solo el dueño canonico bajo el que se
    // guardan TODOS los tokens, sin importar quien corra el OAuth. Si cada
    // quien los guardara bajo su propio id, qb-companies y qb-query (que leen
    // por ese unico user_id) dejarian de verlos.
    if (user.app_metadata?.role !== "super_admin") {
      return respondJson({ error: "not_admin" }, { status: 403 });
    }

    const { data: adminRow } = await admin
      .from("starcorp_vault")
      .select("value")
      .eq("key", "ADMIN_USER_ID")
      .maybeSingle<{ value: string }>();

    // Slot vacio → lo reclama el primero que conecte (race-safe por la PK
    // en `key`: si otro gano la carrera, se adopta su id como dueño).
    let ownerId = adminRow?.value;
    if (!ownerId) {
      const { error: claimErr } = await admin
        .from("starcorp_vault")
        .insert({ key: "ADMIN_USER_ID", value: user.id });
      if (claimErr) {
        const { data: refetched } = await admin
          .from("starcorp_vault")
          .select("value")
          .eq("key", "ADMIN_USER_ID")
          .single<{ value: string }>();
        if (!refetched) {
          return respondJson({ error: "claim_failed" }, { status: 500 });
        }
        ownerId = refetched.value;
      } else {
        ownerId = user.id;
      }
    }

    const { data: vault, error: vErr } = await admin
      .from("starcorp_vault")
      .select("key,value")
      .eq("key", "QB_CLIENT_ID")
      .single<{ key: string; value: string }>();
    if (vErr || !vault) {
      return respondJson({ error: "vault_misconfigured" }, { status: 500 });
    }

    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const nonce = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

    // El callback guarda los tokens bajo `qb_oauth_states.user_id`: va el
    // dueño canonico, no quien inicio el flujo.
    const { error: insErr } = await admin.from("qb_oauth_states").insert({
      nonce,
      user_id: ownerId,
    });
    if (insErr) {
      console.error("nonce insert failed", insErr);
      return respondJson({ error: "persist_failed" }, { status: 500 });
    }

    await admin.from("qb_oauth_states").delete().lt("expires_at", new Date().toISOString());

    const redirectUri =
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/qb-oauth-callback`;
    const params = new URLSearchParams({
      client_id: vault.value,
      scope: "com.intuit.quickbooks.accounting",
      redirect_uri: redirectUri,
      response_type: "code",
      state: nonce,
    });
    const authUrl = `${QB_AUTHORIZE}?${params.toString()}`;

    return respondJson({ authUrl });
  } catch (err) {
    console.error(err);
    return respondJson({ error: "internal" }, { status: 500 });
  }
});

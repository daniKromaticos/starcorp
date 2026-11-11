import { createClient } from "jsr:@supabase/supabase-js@2";

const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

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

async function readRealmId(req: Request): Promise<string | undefined> {
  if (req.method !== "POST") return undefined;
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return undefined;
  try {
    const body = await req.json() as { realmId?: string };
    return typeof body.realmId === "string" && body.realmId.length > 0
      ? body.realmId
      : undefined;
  } catch {
    return undefined;
  }
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

    const { data: adminRow } = await admin
      .from("starcorp_vault")
      .select("value")
      .eq("key", "ADMIN_USER_ID")
      .maybeSingle<{ value: string }>();

    // Desconectar es cosa de rol: cualquier super_admin puede. Lo que se borra
    // son los tokens del dueño canonico (ADMIN_USER_ID), que es donde viven
    // todos, no los del que llama.
    if (user.app_metadata?.role !== "super_admin") {
      return respondJson({ error: "not_admin" }, { status: 403 });
    }

    const ownerId = adminRow?.value;
    if (!ownerId) return respondJson({ status: "already_disconnected" });

    const realmId = await readRealmId(req);

    let rowsQuery = admin
      .from("qb_user_tokens")
      .select("realm_id, refresh_token")
      .eq("user_id", ownerId);
    if (realmId) rowsQuery = rowsQuery.eq("realm_id", realmId);

    const { data: rows } = await rowsQuery.returns<
      { realm_id: string; refresh_token: string }[]
    >();
    if (!rows || rows.length === 0) {
      return respondJson({ status: "already_disconnected" });
    }

    const { data: vault, error: vErr } = await admin
      .from("starcorp_vault")
      .select("key,value")
      .in("key", ["QB_CLIENT_ID", "QB_CLIENT_SECRET"]);
    if (vErr || !vault || vault.length < 2) {
      return respondJson({ error: "vault_misconfigured" }, { status: 500 });
    }
    const kv = Object.fromEntries(vault.map((r) => [r.key, r.value]));
    const basic = btoa(`${kv.QB_CLIENT_ID}:${kv.QB_CLIENT_SECRET}`);

    // Best-effort revoke at Intuit; we delete locally regardless.
    await Promise.all(rows.map(async (row) => {
      try {
        const res = await fetch(REVOKE_URL, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ token: row.refresh_token }),
        });
        if (!res.ok) console.warn("QB revoke non-2xx", res.status, row.realm_id);
      } catch (e) {
        console.warn("QB revoke threw", (e as Error).message, row.realm_id);
      }
    }));

    let delQuery = admin.from("qb_user_tokens").delete().eq("user_id", ownerId);
    if (realmId) delQuery = delQuery.eq("realm_id", realmId);
    const { error: delErr } = await delQuery;
    if (delErr) {
      console.error("delete failed", delErr);
      return respondJson({ error: "delete_failed" }, { status: 500 });
    }

    // Sin realms conectados se libera el slot, para que la proxima conexion
    // vuelva a fijar dueño (puede ser otro super_admin).
    const { count: remaining } = await admin
      .from("qb_user_tokens")
      .select("realm_id", { count: "exact", head: true })
      .eq("user_id", ownerId);
    if (!remaining) {
      await admin.from("starcorp_vault").delete().eq("key", "ADMIN_USER_ID");
    }

    return respondJson({
      status: "disconnected",
      realmIds: rows.map((r) => r.realm_id),
    });
  } catch (err) {
    console.error(err);
    return respondJson({ error: "internal" }, { status: 500 });
  }
});

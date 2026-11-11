import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function respondJson(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Row {
  realm_id: string;
  company_name: string | null;
  updated_at: string;
  refresh_expires_at: string;
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

    // Administrar la conexion es cosa de rol, no de haber sido quien hizo el
    // OAuth: cualquier super_admin puede. ADMIN_USER_ID sigue existiendo pero
    // solo como dueño canonico, el user_id bajo el que se guardan TODOS los
    // tokens en qb_user_tokens, para no fragmentarlos por persona.
    const isAdmin = user.app_metadata?.role === "super_admin";
    const hasAdmin = !!adminRow;
    const ownerId = adminRow?.value;

    if (!ownerId) {
      return respondJson({ companies: [], hasAdmin: false, isAdmin });
    }

    const { data, error } = await admin
      .from("qb_user_tokens")
      .select("realm_id, company_name, updated_at, refresh_expires_at")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("list failed", error);
      return respondJson({ error: "list_failed" }, { status: 500 });
    }

    const now = Date.now();
    const companies = (data as Row[] | null ?? []).map((r) => ({
      realmId: r.realm_id,
      name: r.company_name,
      connectedAt: r.updated_at,
      reauthRequired: new Date(r.refresh_expires_at).getTime() < now,
    }));
    return respondJson({ companies, hasAdmin, isAdmin });
  } catch (err) {
    console.error(err);
    return respondJson({ error: "internal" }, { status: 500 });
  }
});

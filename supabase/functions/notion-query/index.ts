/**
 * Edge Function: notion-query
 *
 * Proxy genérico a la Notion API (`/v1/databases/{id}/query`). El cliente
 * NUNCA llama a api.notion.com directo — el token vive en
 * `starcorp_vault` y nunca debe aparecer en el bundle.
 *
 * Body esperado:
 *   {
 *     database_id: string,                          // requerido
 *     filter?: Record<string, unknown>,             // Notion filter object
 *     sorts?: Array<Record<string, unknown>>,
 *     page_size?: number,                           // 1..100 (default 100)
 *     start_cursor?: string,                        // paginación desde el cliente
 *     fetch_all?: boolean                           // true → la fn pagina (max 20)
 *   }
 *
 * Vault keys requeridas:
 *   NOTION_TOKEN          (secret_xxx... de la Internal Integration)
 *   NOTION_ALLOWED_DBS    (csv de database_ids permitidos, sin guiones)
 *
 * El whitelist evita que la fn pueda ser usada para leer cualquier
 * database del workspace si un atacante adivina IDs.
 *
 * Auth: la fn valida JWT obligatoriamente. Mientras el login real no
 * exista, el cliente garantiza una sesión anónima vía
 * `ensureAnonymousSession()` (signInAnonymously habilitado en el proyecto
 * Supabase). Cuando el login real esté listo, el flujo es el mismo.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const NOTION_VERSION = "2022-06-28";
const NOTION_BASE = "https://api.notion.com/v1";
const MAX_PAGES_PER_INVOCATION = 20;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(body: BodyInit | null, init: { status?: number } = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: corsHeaders,
  });
}

function respondJson(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface NotionQueryRequest {
  database_id?: string;
  filter?: Record<string, unknown>;
  sorts?: Array<Record<string, unknown>>;
  page_size?: number;
  start_cursor?: string;
  fetch_all?: boolean;
}

interface NotionPageResponse {
  results: unknown[];
  has_more: boolean;
  next_cursor: string | null;
}

function normalizeId(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respond("ok");
  if (req.method !== "POST") {
    return respond("Method not allowed", { status: 405 });
  }

  try {
    // 1. Validar JWT del usuario (anónimo o real)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond("Missing auth", { status: 401 });
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const {
      data: { user },
      error: uErr,
    } = await admin.auth.getUser(token);
    if (uErr || !user) return respond("Invalid JWT", { status: 401 });

    // 2. Parsear body
    const body = (await req.json().catch(() => ({}))) as NotionQueryRequest;
    if (!body.database_id) {
      return respondJson({ error: "database_id requerido" }, { status: 400 });
    }

    // 3. Leer credenciales + whitelist del vault
    const { data: vault, error: vaultErr } = await admin
      .from("starcorp_vault")
      .select("key,value")
      .in("key", ["NOTION_TOKEN", "NOTION_ALLOWED_DBS"]);
    if (vaultErr) {
      console.error("[notion-query] vault read failed", vaultErr);
      return respondJson({ error: "Vault read failed" }, { status: 500 });
    }
    const kv = Object.fromEntries((vault ?? []).map((r) => [r.key, r.value]));
    if (!kv.NOTION_TOKEN) {
      return respondJson(
        { error: "NOTION_TOKEN no configurado en starcorp_vault" },
        { status: 500 },
      );
    }
    if (!kv.NOTION_ALLOWED_DBS) {
      return respondJson(
        { error: "NOTION_ALLOWED_DBS no configurado en starcorp_vault" },
        { status: 500 },
      );
    }
    const allowed = new Set(
      kv.NOTION_ALLOWED_DBS.split(",")
        .map((s: string) => normalizeId(s.trim()))
        .filter(Boolean),
    );
    const requested = normalizeId(body.database_id);
    if (!allowed.has(requested)) {
      return respondJson(
        { error: "database_id no está en la whitelist" },
        { status: 403 },
      );
    }

    // 4. Helper para una página de resultados
    async function queryPage(cursor?: string): Promise<NotionPageResponse> {
      const res = await fetch(
        `${NOTION_BASE}/databases/${body.database_id}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${kv.NOTION_TOKEN}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filter: body.filter,
            sorts: body.sorts,
            page_size: Math.min(body.page_size ?? 100, 100),
            start_cursor: cursor,
          }),
        },
      );
      const text = await res.text();
      if (!res.ok) {
        console.error(
          `[notion-query] upstream ${res.status}: ${text.slice(0, 200)}`,
        );
        throw new Response(
          JSON.stringify({
            error: "Notion error",
            status: res.status,
            body: text,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return JSON.parse(text) as NotionPageResponse;
    }

    // 5. Una página o todas
    if (!body.fetch_all) {
      const page = await queryPage(body.start_cursor);
      return respondJson(page);
    }

    const all: unknown[] = [];
    let cursor: string | undefined = body.start_cursor;
    let pages = 0;
    do {
      const page = await queryPage(cursor);
      all.push(...page.results);
      cursor = page.next_cursor ?? undefined;
      pages++;
      if (pages >= MAX_PAGES_PER_INVOCATION) break;
    } while (cursor);

    return respondJson({
      results: all,
      has_more: !!cursor,
      next_cursor: cursor ?? null,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[notion-query] internal error", err);
    return respondJson({ error: "Internal error" }, { status: 500 });
  }
});

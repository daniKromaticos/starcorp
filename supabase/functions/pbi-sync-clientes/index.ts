// Pulls the entire Power BI 'ListadoClientes5Stars' table and upserts it
// into clientes_master keyed by id_centro_costo. The full row is stored in
// the `data` JSONB column with column names stripped of their PBI
// "TableName[...]" prefix, so new fields appear automatically.

import { createClient } from "jsr:@supabase/supabase-js@2";

const POWERBI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";
const CHUNK = 2000;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
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

async function getAzureToken(t: string, c: string, s: string) {
  const res = await fetch(
    `https://login.microsoftonline.com/${t}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: c,
        client_secret: s,
        scope: POWERBI_SCOPE,
      }),
    },
  );
  if (!res.ok) throw new Error(`azure ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

type Cell = Record<string, unknown>;

// PBI returns keys like "ListadoClientes5Stars[IdCentroCosto]". Strip the
// table prefix and outer brackets so the JSONB stored is { IdCentroCosto: ... }.
function cleanKey(raw: string): string {
  const bracketIdx = raw.indexOf("[");
  if (bracketIdx === -1) return raw;
  const inner = raw.slice(bracketIdx + 1);
  return inner.endsWith("]") ? inner.slice(0, -1) : inner;
}

function findIdKey(row: Cell): string | null {
  for (const k of Object.keys(row)) {
    if (/IdCentroCosto/i.test(cleanKey(k))) return k;
  }
  return null;
}

function buildRecord(row: Cell): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[cleanKey(k)] = v;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respond("ok");

  const startedAt = Date.now();
  let logId: number | null = null;
  let source: "cron" | "manual" = "manual";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const cronSecret = req.headers.get("x-cron-secret");
    let triggeredBy: string | null = null;

    if (cronSecret) {
      const { data: row, error } = await admin
        .from("starcorp_vault")
        .select("value")
        .eq("key", "PBI_SYNC_CRON_SECRET")
        .single();
      if (error || !row || row.value !== cronSecret) {
        return respond("Invalid cron secret", { status: 401 });
      }
      source = "cron";
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return respond("Missing auth", { status: 401 });
      const userJwt = authHeader.replace(/^Bearer\s+/i, "");
      const { data: { user }, error: uErr } = await admin.auth.getUser(
        userJwt,
      );
      if (uErr || !user) return respond("Invalid JWT", { status: 401 });
      triggeredBy = user.id;
      source = "manual";
    }

    const { data: log, error: logErr } = await admin
      .from("pbi_sync_log")
      .insert({
        status: "running",
        source,
        triggered_by: triggeredBy,
        error_message: "table=ListadoClientes5Stars",
      })
      .select("id")
      .single();
    if (logErr || !log) throw new Error(`log insert: ${logErr?.message}`);
    logId = log.id;

    const { data: vault, error: vErr } = await admin
      .from("starcorp_vault")
      .select("key,value")
      .in("key", [
        "AZURE_TENANT_ID",
        "AZURE_CLIENT_ID",
        "AZURE_CLIENT_SECRET",
        "PBI_CLIENTES_DATASET_ID",
        "PBI_CLIENTES_GROUP_ID",
      ]);
    if (vErr || !vault || vault.length < 5) {
      throw new Error("Vault misconfigured");
    }
    const kv = Object.fromEntries(vault.map((r) => [r.key, r.value]));
    if (
      !kv.PBI_CLIENTES_DATASET_ID ||
      kv.PBI_CLIENTES_DATASET_ID === "CHANGE_ME"
    ) {
      throw new Error("PBI_CLIENTES_DATASET_ID not set in vault");
    }

    const azureToken = await getAzureToken(
      kv.AZURE_TENANT_ID,
      kv.AZURE_CLIENT_ID,
      kv.AZURE_CLIENT_SECRET,
    );

    const hasGroup = kv.PBI_CLIENTES_GROUP_ID &&
      kv.PBI_CLIENTES_GROUP_ID !== "CHANGE_ME";
    const pbiUrl = hasGroup
      ? `https://api.powerbi.com/v1.0/myorg/groups/${kv.PBI_CLIENTES_GROUP_ID}/datasets/${kv.PBI_CLIENTES_DATASET_ID}/executeQueries`
      : `https://api.powerbi.com/v1.0/myorg/datasets/${kv.PBI_CLIENTES_DATASET_ID}/executeQueries`;

    const dax = `EVALUATE 'ListadoClientes5Stars'`;
    const pbiRes = await fetch(pbiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${azureToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queries: [{ query: dax }],
        serializerSettings: { includeNulls: true },
      }),
    });
    if (!pbiRes.ok) {
      throw new Error(`PBI ${pbiRes.status}: ${await pbiRes.text()}`);
    }
    const pbiJson = await pbiRes.json() as {
      results: Array<{ tables: Array<{ rows: Cell[] }> }>;
    };
    const rows = pbiJson.results?.[0]?.tables?.[0]?.rows ?? [];
    const rowsFetched = rows.length;

    if (rowsFetched === 0) {
      throw new Error("PBI returned 0 rows for ListadoClientes5Stars");
    }

    const idKey = findIdKey(rows[0]);
    if (!idKey) {
      throw new Error(
        `No IdCentroCosto-like column in PBI response. Keys: ${
          Object.keys(rows[0]).join(", ")
        }`,
      );
    }

    type MappedRow = {
      id_centro_costo: string;
      data: Record<string, unknown>;
    };

    const seen = new Set<string>();
    const unique: MappedRow[] = [];
    for (const r of rows) {
      const idRaw = r[idKey];
      if (idRaw == null) continue;
      const id = String(idRaw).trim();
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push({ id_centro_costo: id, data: buildRecord(r) });
    }

    let upserted = 0;
    for (let i = 0; i < unique.length; i += CHUNK) {
      const slice = unique.slice(i, i + CHUNK).map((m) => ({
        ...m,
        synced_at: new Date().toISOString(),
      }));
      const { error } = await admin
        .from("clientes_master")
        .upsert(slice, { onConflict: "id_centro_costo" });
      if (error) {
        throw new Error(`upsert at offset ${i}: ${error.message}`);
      }
      upserted += slice.length;
    }

    const duration = Date.now() - startedAt;
    await admin
      .from("pbi_sync_log")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        rows_fetched: rowsFetched,
        rows_upserted: upserted,
        duration_ms: duration,
        error_message: `table=ListadoClientes5Stars; id_key=${cleanKey(idKey)}`,
      })
      .eq("id", logId);

    return respondJson({
      ok: true,
      source,
      table: "ListadoClientes5Stars",
      id_key: cleanKey(idKey),
      rows_fetched: rowsFetched,
      rows_unique: unique.length,
      rows_upserted: upserted,
      duration_ms: duration,
      sample_columns: Object.keys(unique[0]?.data ?? {}),
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("pbi-sync-clientes failed:", message);
    if (logId !== null) {
      await admin
        .from("pbi_sync_log")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
          error_message: message,
        })
        .eq("id", logId);
    }
    return respondJson({ ok: false, error: message }, { status: 500 });
  }
});

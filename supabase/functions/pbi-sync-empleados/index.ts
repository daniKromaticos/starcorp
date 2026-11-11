// Pulls the entire Power BI 'empleadosHotel' table and upserts it into
// empleados_detail keyed by id_employee. One row per employee. The Informe
// Asociados activos lee de aquí vía el RPC get_asociados_snapshot, que toma
// como vigentes a los que tienen codigoalterno (Retirement Date llega siempre
// en blanco desde el origen, ver migración 0048).
//
// Mirrors pbi-sync-clientes: full-table EVALUATE, dedup by key, chunked upsert,
// prune rows that kept an older synced_at (gone from the source this run).
//
// codigoalterno se rescata de cualquier fila del empleado: sin él la persona no
// entra al informe, y el origen no siempre lo trae en todas sus filas de área.

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

// PBI returns keys as the SELECTCOLUMNS alias wrapped in brackets, e.g.
// "[employee_name]". Read by alias.
function g(row: Cell, alias: string): unknown {
  const k = `[${alias}]`;
  return k in row ? row[k] : null;
}

function toText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toIsoDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return null;
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

interface MappedRow {
  id_employee: string;
  employee_name: string | null;
  area: string | null;
  account: string | null;
  sub_account: string | null;
  codigo: string | null;
  codigo_alterno: string | null;
  admission_date: string | null;
  retirement_date: string | null;
  start_date_area: string | null;
  synced_at: string;
}

function mapRow(row: Cell, syncedAt: string): MappedRow | null {
  const id_employee = toText(g(row, "id_employee"));
  if (!id_employee) return null;
  return {
    id_employee,
    employee_name: toText(g(row, "employee_name")),
    area: toText(g(row, "area")),
    account: toText(g(row, "account")),
    sub_account: toText(g(row, "sub_account")),
    codigo: toText(g(row, "codigo")),
    codigo_alterno: toText(g(row, "codigo_alterno")),
    admission_date: toIsoDate(g(row, "admission_date")),
    retirement_date: toIsoDate(g(row, "retirement_date")),
    start_date_area: toIsoDate(g(row, "start_date_area")),
    synced_at: syncedAt,
  };
}

// empleadosHotel grain is (employee × area assignment): ~14 rows/employee.
// We keep, per employee, the row with the most recent area assignment
// (Start Date Area, then Admission Date) so the stored Area/Sub Account is
// the CURRENT one rather than an arbitrary historical assignment.
function currencyKey(m: MappedRow): string {
  return (m.start_date_area ?? "") + "|" + (m.admission_date ?? "");
}

// codigoalterno is the person's identity and drives who counts as an active
// associate (RPC get_asociados_snapshot). The source doesn't always fill it on
// every area row, so if the winning row happens to have it blank the employee
// would silently drop out of the report. Take it from any row of the employee,
// preferring the winner's own value. NOT applied to `codigo`: that one is the
// client code, and guessing it across rows could attach the wrong client.
function backfillCodigoAlterno(
  winner: MappedRow,
  seen: Map<string, string>,
): MappedRow {
  if (winner.codigo_alterno) return winner;
  const fallback = seen.get(winner.id_employee);
  return fallback ? { ...winner, codigo_alterno: fallback } : winner;
}

const DAX = `
EVALUATE
SELECTCOLUMNS(
  'empleadosHotel',
  "id_employee", 'empleadosHotel'[ID Employee],
  "employee_name", 'empleadosHotel'[Employee Name],
  "area", 'empleadosHotel'[Area],
  "account", 'empleadosHotel'[Account],
  "sub_account", 'empleadosHotel'[Sub Account],
  "codigo", 'empleadosHotel'[Codigo],
  "codigo_alterno", 'empleadosHotel'[codigoalterno],
  "admission_date", 'empleadosHotel'[Admission Date],
  "retirement_date", 'empleadosHotel'[Retirement Date],
  "start_date_area", 'empleadosHotel'[Start Date Area]
)
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respond("ok");

  const startedAt = Date.now();
  const runIso = new Date(startedAt).toISOString();
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
      const { data: { user }, error: uErr } = await admin.auth.getUser(userJwt);
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
        error_message: "table=empleadosHotel",
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
        "PBI_EMPLEADOS_DATASET_ID",
        "PBI_EMPLEADOS_GROUP_ID",
      ]);
    if (vErr || !vault || vault.length < 5) {
      throw new Error("Vault misconfigured");
    }
    const kv = Object.fromEntries(vault.map((r) => [r.key, r.value]));
    if (
      !kv.PBI_EMPLEADOS_DATASET_ID ||
      kv.PBI_EMPLEADOS_DATASET_ID === "CHANGE_ME"
    ) {
      throw new Error("PBI_EMPLEADOS_DATASET_ID not set in vault");
    }

    const azureToken = await getAzureToken(
      kv.AZURE_TENANT_ID,
      kv.AZURE_CLIENT_ID,
      kv.AZURE_CLIENT_SECRET,
    );

    const hasGroup = kv.PBI_EMPLEADOS_GROUP_ID &&
      kv.PBI_EMPLEADOS_GROUP_ID !== "CHANGE_ME";
    const pbiUrl = hasGroup
      ? `https://api.powerbi.com/v1.0/myorg/groups/${kv.PBI_EMPLEADOS_GROUP_ID}/datasets/${kv.PBI_EMPLEADOS_DATASET_ID}/executeQueries`
      : `https://api.powerbi.com/v1.0/myorg/datasets/${kv.PBI_EMPLEADOS_DATASET_ID}/executeQueries`;

    const pbiRes = await fetch(pbiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${azureToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queries: [{ query: DAX }],
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
      throw new Error("PBI returned 0 rows for empleadosHotel");
    }

    // Collapse the area-assignment grain to one row per employee, keeping the
    // most recent assignment (current Area / Sub Account).
    const byId = new Map<string, MappedRow>();
    const codigoAlternoSeen = new Map<string, string>();
    for (const r of rows) {
      const m = mapRow(r, runIso);
      if (!m) continue;
      if (m.codigo_alterno && !codigoAlternoSeen.has(m.id_employee)) {
        codigoAlternoSeen.set(m.id_employee, m.codigo_alterno);
      }
      const prev = byId.get(m.id_employee);
      if (!prev || currencyKey(m) >= currencyKey(prev)) {
        byId.set(m.id_employee, m);
      }
    }

    let recoveredCodigoAlterno = 0;
    const unique = [...byId.values()].map((m) => {
      const filled = backfillCodigoAlterno(m, codigoAlternoSeen);
      if (filled !== m) recoveredCodigoAlterno++;
      return filled;
    });

    let upserted = 0;
    for (let i = 0; i < unique.length; i += CHUNK) {
      const slice = unique.slice(i, i + CHUNK);
      const { error } = await admin
        .from("empleados_detail")
        .upsert(slice, { onConflict: "id_employee" });
      if (error) throw new Error(`upsert at offset ${i}: ${error.message}`);
      upserted += slice.length;
    }

    // Prune employees no longer in the source (kept an older synced_at).
    // Guard on a non-empty fetch so a transient empty response can't wipe all.
    let deleted = 0;
    if (unique.length > 0) {
      const { error: delErr, count } = await admin
        .from("empleados_detail")
        .delete({ count: "exact" })
        .lt("synced_at", runIso);
      if (delErr) throw new Error(`prune stale: ${delErr.message}`);
      deleted = count ?? 0;
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
        error_message:
          `table=empleadosHotel; pruned=${deleted}; ` +
          `codigo_alterno_recuperados=${recoveredCodigoAlterno}`,
      })
      .eq("id", logId);

    return respondJson({
      ok: true,
      source,
      rows_fetched: rowsFetched,
      rows_unique: unique.length,
      rows_upserted: upserted,
      rows_pruned: deleted,
      codigo_alterno_recuperados: recoveredCodigoAlterno,
      duration_ms: duration,
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("pbi-sync-empleados failed:", message);
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

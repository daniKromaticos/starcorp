import { createClient } from "jsr:@supabase/supabase-js@2";

const POWERBI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";
const CHUNK = 2000;
const DEFAULT_LOOKBACK_DAYS = 90;
// Tamaño de lote y tope de pasadas del prune. 40 × 2000 = 80k filas por
// corrida; si se llega al tope, lo que sobra lo limpia la corrida siguiente.
const PRUNE_BATCH = 2000;
const PRUNE_MAX_PASSES = 40;

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

function parseMoney(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (!s) return null;
  const negParen = s.charCodeAt(0) === 40 && s.charCodeAt(s.length - 1) === 41;
  if (negParen) s = s.slice(1, -1);
  s = s.replace(/[\$\s,]/g, "");
  if (!s || s === "-") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negParen ? -n : n;
}

function toIsoDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function toIsoTimestamp(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

type Cell = Record<string, unknown>;
function g(row: Cell, alias: string): unknown {
  const k = `[${alias}]`;
  return k in row ? row[k] : null;
}

interface MappedRow {
  fecha: string;
  cuenta: string;
  nombre_cuenta: string | null;
  centro_costo_codigo: string | null;
  centro_costo_nombre: string;
  nit: string | null;
  razon_social: string | null;
  detalle: string | null;
  referencia: string | null;
  debitos: number;
  creditos: number;
  saldo_inicial: number | null;
  saldo_final: number | null;
  saldo_final_ajustado: number | null;
  tipo_ingreso: string | null;
  clasificacion: string | null;
  fecha_auditoria: string | null;
  usuario: string | null;
  source_hash: string;
  synced_at: string;
}

// Fast synchronous ~106-bit row hash (two cyrb53 passes). crypto.subtle.digest
// is async and, called once per row, its per-call overhead dominated runtime
// and got the function killed (546) mid-backfill. cyrb53 is pure integer math.
function cyrb53(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function hashRow(canonical: string): string {
  return cyrb53(canonical, 0).toString(16).padStart(14, "0") +
    cyrb53(canonical, 0x9e3779b9).toString(16).padStart(14, "0");
}

// Los RPCs del consolidado agrupan y filtran por centro_costo_nombre, así que
// un asiento sin nombre quedaba fuera de la lista de clientes pero dentro del
// total del dashboard (centros nuevos como 2031/2032 que aún no tienen nombre
// en el ERP). Se rotula con un nombre de reemplazo para que la lista cuadre
// con el total. El hash se calcula con el valor crudo: cuando el ERP le ponga
// nombre, el asiento cambia de hash y el prune borra la versión rotulada.
// Misma lógica que el backfill de la migración 0053.
//
// El nombre real se guarda en mayúsculas: en 2025-08 el ERP pasó varios
// centros de "Kalahari Pocono" a "KALAHARI POCONO" (mismo código), y como los
// RPCs agrupan por nombre exacto la historia previa quedaba en otro grupo
// (Great Wolf salía +124% contra un año anterior al que le faltaba julio).
// Misma normalización que la migración 0055.
function centroDisplayName(
  nombre: string | null,
  codigo: string | null,
  detalle: string | null,
): string {
  const nom = nombre != null ? String(nombre).trim() : "";
  if (nom) return nom.toUpperCase();
  const cod = codigo != null ? String(codigo).trim() : "";
  if (cod) return `Centro ${cod} (sin nombre)`;
  if (detalle === "Cierre periodo fiscal") return "Cierre periodo fiscal";
  return "Sin centro de costo";
}

function mapRow(row: Cell, syncedAt: string): MappedRow | null {
  const fecha = toIsoDate(g(row, "fecha"));
  const cuentaRaw = g(row, "cuenta");
  if (!fecha || !cuentaRaw) return null;
  const cuenta = String(cuentaRaw).trim();
  const c0 = cuenta.charCodeAt(0);
  // ASCII codes for '4'..'6'.
  if (c0 < 52 || c0 > 54) return null;

  const debitos = parseMoney(g(row, "debitos")) ?? 0;
  const creditos = parseMoney(g(row, "creditos")) ?? 0;
  const saldo_final = parseMoney(g(row, "saldo_final"));
  const saldo_final_ajustado = parseMoney(g(row, "saldo_final_ajustado"));
  const saldo_inicial = parseMoney(g(row, "saldo_inicial"));
  const referencia = (g(row, "referencia") as string | null) ?? null;
  const centro_codigo = (g(row, "centro_codigo") as string | null) ?? null;
  const centro_nombre = (g(row, "centro_nombre") as string | null) ?? null;
  const nit = (g(row, "nit") as string | null) ?? null;
  const nombre_cuenta = (g(row, "nombre_cuenta") as string | null) ?? null;
  const razon_social = (g(row, "razon_social") as string | null) ?? null;
  const detalle = (g(row, "detalle") as string | null) ?? null;
  const tipo_ingreso = (g(row, "tipo_ingreso") as string | null) ?? null;
  const clasificacion = (g(row, "clasificacion") as string | null) ?? null;
  const fecha_auditoria = toIsoTimestamp(g(row, "fecha_auditoria"));
  const usuario = (g(row, "usuario") as string | null) ?? null;

  // Hash EVERY value column. The old hash omitted the saldos, so distinct
  // zero-movement rows (debitos=creditos=0, different saldo_final) produced
  // the same hash and the in-fetch dedup silently dropped ~70% of income
  // rows. Cross-sync staleness (an adjusted row keeping an old hash) is
  // handled by the synced_at prune, so a fully-discriminating hash is safe.
  const source_hash = hashRow(JSON.stringify([
    fecha, cuenta, nombre_cuenta, centro_codigo, centro_nombre, nit,
    razon_social, detalle, referencia, debitos, creditos, saldo_inicial,
    saldo_final, saldo_final_ajustado, tipo_ingreso, clasificacion,
    fecha_auditoria, usuario,
  ]));

  return {
    fecha,
    cuenta,
    nombre_cuenta,
    centro_costo_codigo: centro_codigo,
    centro_costo_nombre: centroDisplayName(centro_nombre, centro_codigo, detalle),
    nit,
    razon_social,
    detalle,
    referencia,
    debitos,
    creditos,
    saldo_inicial,
    saldo_final,
    saldo_final_ajustado,
    tipo_ingreso,
    clasificacion,
    fecha_auditoria,
    usuario,
    source_hash,
    synced_at: syncedAt,
  };
}

function buildDax(from: Date, to: Date): string {
  // Half-open: [from, to)
  return `
EVALUATE
SELECTCOLUMNS(
  CALCULATETABLE(
    'Auxiliar',
    'Auxiliar'[Fecha] >= DATE(${from.getUTCFullYear()}, ${from.getUTCMonth() + 1}, ${from.getUTCDate()}),
    'Auxiliar'[Fecha] < DATE(${to.getUTCFullYear()}, ${to.getUTCMonth() + 1}, ${to.getUTCDate()}),
    LEFT('Auxiliar'[Cuenta8], 1) = "4"
      || LEFT('Auxiliar'[Cuenta8], 1) = "5"
      || LEFT('Auxiliar'[Cuenta8], 1) = "6"
  ),
  "fecha", 'Auxiliar'[Fecha],
  "cuenta", 'Auxiliar'[Cuenta8],
  "nombre_cuenta", 'Auxiliar'[Nombre cuenta],
  "centro_codigo", 'Auxiliar'[Centro costos],
  "centro_nombre", 'Auxiliar'[Nom. centro costos],
  "nit", 'Auxiliar'[nit],
  "razon_social", 'Auxiliar'[RazonSocial],
  "detalle", 'Auxiliar'[Detalle],
  "referencia", 'Auxiliar'[Referencia],
  "debitos", 'Auxiliar'[Debitos],
  "creditos", 'Auxiliar'[Creditos],
  "saldo_inicial", 'Auxiliar'[Saldo Inicial],
  "saldo_final", 'Auxiliar'[Saldo Final],
  "saldo_final_ajustado", 'Auxiliar'[SaldoFinalAjustado],
  "tipo_ingreso", 'Auxiliar'[TIPO_INGRESO],
  "clasificacion", 'Auxiliar'[Clasificaicon],
  "fecha_auditoria", 'Auxiliar'[Fecha auditoria],
  "usuario", 'Auxiliar'[Usuario]
)
`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respond("ok");

  const startedAt = Date.now();
  // Timestamp stamped on every row written this run. Rows in the synced range
  // that keep an older synced_at afterwards no longer exist in the Auxiliar
  // (adjusted or deleted) and get pruned below.
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
      const { data: { user }, error: uErr } = await admin.auth.getUser(
        userJwt,
      );
      if (uErr || !user) return respond("Invalid JWT", { status: 401 });
      triggeredBy = user.id;
      source = "manual";
    }

    const body = await req.json().catch(() => ({})) as {
      from?: string;
      to?: string;
    };

    let from: Date;
    let to: Date;
    const today = new Date();
    if (body.from && body.to) {
      from = new Date(body.from + "T00:00:00Z");
      to = new Date(body.to + "T00:00:00Z");
    } else {
      const tomorrow = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() + 1,
      );
      // El Auxiliar puede traer asientos ya contabilizados a futuro dentro del
      // mes en curso (ej. nómina pre-cerrada para el 26 si hoy es 21). "Mes
      // corriente" en Power BI suma el mes calendario completo sin tope en
      // "hoy", así que el sync tiene que llegar al menos hasta fin de mes para
      // que la app pueda calzar. `from` se ancla a este `to` extendido (no al
      // "mañana" original) para que la ventana siga pesando ~90 días en vez
      // de crecer: una corrida más pesada ya tocó el tope de CPU de la edge
      // function (546 WORKER_RESOURCE_LIMIT) al ancharla sin compensar. El
      // histórico más viejo que este desplazamiento deja fuera lo cubre el
      // backfill semanal de 12 meses (refresh_12m_por_tandas).
      const monthEndExclusive = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() + 1,
        1,
      );
      to = new Date(Math.max(tomorrow, monthEndExclusive));
      from = new Date(to.getTime() - DEFAULT_LOOKBACK_DAYS * 86400_000);
    }
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
      throw new Error(`invalid range: from=${body.from}, to=${body.to}`);
    }
    const rangeLabel = `${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}`;

    const { data: log, error: logErr } = await admin
      .from("pbi_sync_log")
      .insert({
        status: "running",
        source,
        triggered_by: triggeredBy,
        error_message: `range=${rangeLabel}`,
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
        "PBI_AUXILIAR_DATASET_ID",
        "PBI_AUXILIAR_GROUP_ID",
      ]);
    if (vErr || !vault || vault.length < 5) {
      throw new Error("Vault misconfigured");
    }
    const kv = Object.fromEntries(vault.map((r) => [r.key, r.value]));

    const azureToken = await getAzureToken(
      kv.AZURE_TENANT_ID,
      kv.AZURE_CLIENT_ID,
      kv.AZURE_CLIENT_SECRET,
    );

    const hasGroup = kv.PBI_AUXILIAR_GROUP_ID &&
      kv.PBI_AUXILIAR_GROUP_ID !== "CHANGE_ME";
    const pbiUrl = hasGroup
      ? `https://api.powerbi.com/v1.0/myorg/groups/${kv.PBI_AUXILIAR_GROUP_ID}/datasets/${kv.PBI_AUXILIAR_DATASET_ID}/executeQueries`
      : `https://api.powerbi.com/v1.0/myorg/datasets/${kv.PBI_AUXILIAR_DATASET_ID}/executeQueries`;

    const dax = buildDax(from, to);
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

    // The Auxiliar legitimately contains byte-identical duplicate rows, and the
    // Power BI measures sum every one of them. To mirror PBI exactly we keep
    // them all: each repeated hash gets an occurrence suffix (-0, -1, ...) so
    // every row lands a distinct source_hash instead of being dropped.
    const seen = new Map<string, number>();
    const unique: MappedRow[] = [];
    for (const r of rows) {
      const m = mapRow(r, runIso);
      if (!m) continue;
      const n = seen.get(m.source_hash) ?? 0;
      seen.set(m.source_hash, n + 1);
      m.source_hash = `${m.source_hash}-${n}`;
      unique.push(m);
    }

    let upserted = 0;
    for (let i = 0; i < unique.length; i += CHUNK) {
      const slice = unique.slice(i, i + CHUNK);
      const { error } = await admin
        .from("accounting_entries")
        .upsert(slice, { onConflict: "source_hash" });
      if (error) {
        throw new Error(`upsert at offset ${i}: ${error.message}`);
      }
      upserted += slice.length;
    }

    // Prune stale rows: anything in the synced range still carrying an older
    // synced_at was not returned by this run's Auxiliar query, so it's an
    // adjusted-away version or a deleted line. Guard on a non-empty fetch so a
    // transient empty PBI response can never wipe the whole range.
    //
    // Va por lotes (prune_accounting_stale) porque el DELETE del rango completo
    // expiraba por statement timeout: la fila vieja y la re-auditada quedaban
    // conviviendo e inflaban los totales del mes hasta un 30%.
    let deleted = 0;
    let pruneTruncated = false;
    if (unique.length > 0) {
      const fromIso = from.toISOString().slice(0, 10);
      const toIso = to.toISOString().slice(0, 10);
      pruneTruncated = true;
      for (let pass = 0; pass < PRUNE_MAX_PASSES; pass++) {
        const { data: batchDeleted, error: delErr } = await admin.rpc(
          "prune_accounting_stale",
          {
            p_from: fromIso,
            p_to: toIso,
            p_before: runIso,
            p_limit: PRUNE_BATCH,
          },
        );
        if (delErr) throw new Error(`prune stale: ${delErr.message}`);
        const n = (batchDeleted as number | null) ?? 0;
        deleted += n;
        if (n < PRUNE_BATCH) {
          pruneTruncated = false;
          break;
        }
      }
      if (pruneTruncated) {
        console.warn(
          `prune stale: se alcanzó el tope de ${PRUNE_MAX_PASSES} lotes ` +
            `(${deleted} filas); el resto queda para la próxima corrida`,
        );
      }
    }

    const { error: refErr } = await admin.rpc("refresh_mv_monthly_summary");
    if (refErr) console.warn("refresh MV:", refErr.message);

    const duration = Date.now() - startedAt;
    await admin
      .from("pbi_sync_log")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        rows_fetched: rowsFetched,
        rows_upserted: upserted,
        duration_ms: duration,
        error_message: `range=${rangeLabel}; pruned=${deleted}` +
          (pruneTruncated ? "; prune_truncated" : ""),
      })
      .eq("id", logId);

    return respondJson({
      ok: true,
      source,
      range: rangeLabel,
      rows_fetched: rowsFetched,
      rows_unique: unique.length,
      rows_upserted: upserted,
      rows_pruned: deleted,
      duration_ms: duration,
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("pbi-sync-auxiliar failed:", message);
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

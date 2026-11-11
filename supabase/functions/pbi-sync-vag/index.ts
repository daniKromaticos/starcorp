/**
 * pbi-sync-vag — staging de las tablas curadas de VAG en Power BI:
 * ListadoActivosVag → vag_activos (ficha completa de cada activo) y
 * MovimientosVag → vag_movimientos (movimientos por centro de costo,
 * incluye las filas de Cuentas por Cobrar/Pagar bajo CENTRO DE COSTO —
 * ver get_vag_cuentas en la migración 0037). Son tablas chicas
 * (~15 y ~100-120 filas): cada corrida trae todo, upserta (activos por
 * codigo; movimientos insert) y poda synced_at viejo.
 *
 * OJO: NO usa AuxiliarVAG (fue un error inicial — esa tabla es el
 * auxiliar contable, desactualizado y con otro grano).
 *
 * Los nombres de columna del origen pueden venir con mojibake
 * ("Fecha de AdquisiciÃ³n") y los montos como texto con puntos de miles
 * ("170.000.000"); se resuelven columnas por nombre normalizado y se
 * parsea formato colombiano.
 *
 * Vive en el mismo dataset que el Auxiliar de 5 Stars, así que reutiliza
 * PBI_AUXILIAR_DATASET_ID / PBI_AUXILIAR_GROUP_ID del vault.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const POWERBI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";

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

// Data (y nombres de columna) con UTF-8 doblemente decodificado
// ("LONDOÑO" → "LONDOÃ‘O"). Reconstruye los bytes originales (cp1252
// inverso para 0x80–0x9F) y re-decodifica como UTF-8; ante cualquier
// duda devuelve el string original.
const CP1252_REV: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

function fixMojibake(s: string | null): string | null {
  if (!s || !/[ÃÂ]/.test(s)) return s;
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c <= 0xff) bytes[i] = c;
    else if (CP1252_REV[c] !== undefined) bytes[i] = CP1252_REV[c];
    else return s;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return s;
  }
}

function toText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** "Fecha de AdquisiciÃ³n" / "Fecha de Adquisición" → "fechadeadquisicion". */
function normalizeKey(k: string): string {
  return (fixMojibake(k) ?? k)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type Cell = Record<string, unknown>;

/** Row del executeQueries ({"Tabla[Col]": v}) → {colNormalizada: v}. */
function normalizeRow(row: Cell): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const m = key.match(/\[(.+)\]$/);
    out[normalizeKey(m ? m[1] : key)] = value;
  }
  return out;
}

/** Formato colombiano: "170.000.000" / "1.234.567,89" / number → number|null. */
function parseMoneyCo(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s) return null;
  const negParen = s.startsWith("(") && s.endsWith(")");
  if (negParen) s = s.slice(1, -1);
  s = s.replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return null;
  // Puntos = miles, coma = decimal.
  s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negParen ? -n : n;
}

/**
 * "8/26/2020" (m/d/yyyy, formato US del origen — confirmado 2026-07-22:
 * "8/26/2020" = 26 de agosto; el dataset cambió de dd/mm/yyyy a m/d/yyyy
 * en algún momento, probablemente al re-publicar el reporte con las
 * cuentas por cobrar/pagar), "2026-01-14T...", Date → ISO yyyy-mm-dd.
 * "0"/vacío → null.
 */
function toIsoDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s || s === "0") return null;
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

async function executeDax(
  url: string,
  azureToken: string,
  dax: string,
): Promise<Cell[]> {
  const res = await fetch(url, {
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
  if (!res.ok) {
    throw new Error(`PBI ${res.status}: ${await res.text()}`);
  }
  const json = await res.json() as {
    results: Array<{ tables: Array<{ rows: Cell[] }> }>;
  };
  return json.results?.[0]?.tables?.[0]?.rows ?? [];
}

// ── Mapeo ListadoActivosVag → vag_activos ────────────────────────────
interface ActivoRow {
  codigo: string;
  nombre: string;
  tipo: string | null;
  fecha_adquisicion: string | null;
  valor_adquisicion: number | null;
  valor_estimado: number | null;
  valor_contable: number | null;
  avaluo_catastral: number | null;
  valor_predial: number | null;
  valor_seguro: number | null;
  vigencia: string | null;
  aseguradora: string | null;
  ciudad: string | null;
  direccion: string | null;
  numero_matricula: string | null;
  ficha_catastral: string | null;
  synced_at: string;
}

function mapActivo(raw: Cell, syncedAt: string): ActivoRow | null {
  const r = normalizeRow(raw);
  const codigo = toText(r["codigo"]);
  const nombre = fixMojibake(toText(r["nombredelactivo"]));
  const consolidador = normalizeKey(toText(r["consolidador"]) ?? "");
  // Solo las filas de activos reales; los agrupadores (ADMINISTRATIVOS
  // GENERALES, CUENTAS POR COBRAR…) vienen sin nombre.
  if (!codigo || !nombre || consolidador !== "activos") return null;

  return {
    codigo,
    nombre,
    tipo: fixMojibake(toText(r["tipodeactivo"])),
    fecha_adquisicion: toIsoDate(r["fechadeadquisicion"]),
    valor_adquisicion: parseMoneyCo(r["valordeadquisicion"]),
    valor_estimado: parseMoneyCo(r["valorestimado"]),
    valor_contable: parseMoneyCo(r["valorcontablealafecha"]),
    avaluo_catastral: parseMoneyCo(r["avaluocatastral"]),
    valor_predial: parseMoneyCo(r["valorpredial"]),
    valor_seguro: parseMoneyCo(r["valordeseguro"]),
    vigencia: toIsoDate(r["vigencia"]),
    aseguradora: fixMojibake(toText(r["aseguradora"])),
    ciudad: fixMojibake(toText(r["ciudad"])),
    direccion: fixMojibake(toText(r["direccion"])),
    numero_matricula: toText(r["numerodematricula"]),
    ficha_catastral: toText(r["fichacatastral"]),
    synced_at: syncedAt,
  };
}

// ── Mapeo MovimientosVag → vag_movimientos ───────────────────────────
interface MovimientoRow {
  codigo: string | null;
  centro_costo: string | null;
  fecha: string;
  tipo: string | null;
  subpartida: string | null;
  concepto: string | null;
  tercero: string | null;
  valor: number;
  observaciones: string | null;
  synced_at: string;
}

function mapMovimiento(raw: Cell, syncedAt: string): MovimientoRow | null {
  const r = normalizeRow(raw);
  const fecha = toIsoDate(r["fecha"]);
  if (!fecha) return null;

  return {
    codigo: toText(r["codigo"]),
    centro_costo: fixMojibake(toText(r["centrodecosto"])),
    fecha,
    tipo: fixMojibake(toText(r["tipomovimiento"])),
    subpartida: fixMojibake(toText(r["subpartida"])),
    concepto: fixMojibake(toText(r["concepto"])),
    tercero: fixMojibake(toText(r["tercero"])),
    valor: parseMoneyCo(r["valor"]) ?? 0,
    observaciones: fixMojibake(toText(r["observaciones"])),
    synced_at: syncedAt,
  };
}

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
        error_message: "table=ListadoActivosVag+MovimientosVag",
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

    // ── ListadoActivosVag → vag_activos ───────────────────────
    const activoRows = await executeDax(
      pbiUrl,
      azureToken,
      "EVALUATE 'ListadoActivosVag'",
    );
    const activos = activoRows
      .map((r) => mapActivo(r, runIso))
      .filter((a): a is ActivoRow => a !== null);

    if (activos.length > 0) {
      const { error } = await admin
        .from("vag_activos")
        .upsert(activos, { onConflict: "codigo" });
      if (error) throw new Error(`upsert activos: ${error.message}`);

      const { error: delErr } = await admin
        .from("vag_activos")
        .delete()
        .lt("synced_at", runIso);
      if (delErr) throw new Error(`prune activos: ${delErr.message}`);
    }

    // ── MovimientosVag → vag_movimientos ──────────────────────
    // Sin clave natural (Codigo se repite): insert de todo + poda de lo
    // viejo. Guard con fetch no-vacío para que una respuesta transitoria
    // vacía nunca deje la tabla en cero.
    const movRows = await executeDax(
      pbiUrl,
      azureToken,
      "EVALUATE 'MovimientosVag'",
    );
    const movimientos = movRows
      .map((r) => mapMovimiento(r, runIso))
      .filter((m): m is MovimientoRow => m !== null);

    let movsPruned = 0;
    if (movimientos.length > 0) {
      const { error } = await admin
        .from("vag_movimientos")
        .insert(movimientos);
      if (error) throw new Error(`insert movimientos: ${error.message}`);

      const { error: delErr, count } = await admin
        .from("vag_movimientos")
        .delete({ count: "exact" })
        .lt("synced_at", runIso);
      if (delErr) throw new Error(`prune movimientos: ${delErr.message}`);
      movsPruned = count ?? 0;
    }

    const duration = Date.now() - startedAt;
    await admin
      .from("pbi_sync_log")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        rows_fetched: activoRows.length + movRows.length,
        rows_upserted: activos.length + movimientos.length,
        duration_ms: duration,
        error_message:
          `table=ListadoActivosVag+MovimientosVag; activos=${activos.length}; movs=${movimientos.length}; movs_pruned=${movsPruned}`,
      })
      .eq("id", logId);

    return respondJson({
      ok: true,
      source,
      activos_fetched: activoRows.length,
      activos_upserted: activos.length,
      movimientos_fetched: movRows.length,
      movimientos_upserted: movimientos.length,
      movimientos_pruned: movsPruned,
      duration_ms: duration,
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("pbi-sync-vag failed:", message);
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

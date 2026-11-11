/**
 * pbi-sync-bancos — staging de la tabla curada BANCOS de Power BI
 * (saldos bancarios por empresa) → tabla `bancos`.
 *
 * Es una tabla chica (~13 filas): cada corrida trae todo, upserta por
 * (empresa, numero_cuenta) y poda synced_at viejo. Además escribe el
 * snapshot diario en `bancos_snapshots` para que get_bancos_previous()
 * pueda calcular el delta % del informe (mismo mecanismo que tenía el
 * flujo QuickBooks con bank_balance_snapshots).
 *
 * Columnas del origen: EMPRESA, NUMERO DE CUENTA ("CK 6321339230"),
 * SALDO (numérico nativo), ESTADO ('CONTROL' | 'SOLO QUICKBOOKS'),
 * BANCO, ID CUENTA ("CITIZENS CHECKING"), FECHA ACTUALIZACION en
 * formato US m/d/yyyy ("7/13/2026") — OJO: no es d/m/yyyy como en VAG.
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

/** "NUMERO DE CUENTA" / "FECHA ACTUALIZACION" → "numerodecuenta". */
function normalizeKey(k: string): string {
  return (fixMojibake(k) ?? k)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type Cell = Record<string, unknown>;

/** Row del executeQueries ({"BANCOS[Col]": v}) → {colNormalizada: v}. */
function normalizeRow(row: Cell): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const m = key.match(/\[(.+)\]$/);
    out[normalizeKey(m ? m[1] : key)] = value;
  }
  return out;
}

/** SALDO viene numérico nativo; tolera texto US ("1,234.56") por si acaso. */
function parseSaldo(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "7/13/2026" (m/d/yyyy, formato US) o ISO → yyyy-mm-dd. */
function toIsoDateUs(v: unknown): string | null {
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

// ── Mapeo BANCOS → bancos ────────────────────────────────────────────
interface BancoRow {
  empresa: string;
  numero_cuenta: string;
  saldo: number;
  estado: string | null;
  banco: string | null;
  id_cuenta: string | null;
  fecha_actualizacion: string | null;
  synced_at: string;
}

function mapBanco(raw: Cell, syncedAt: string): BancoRow | null {
  const r = normalizeRow(raw);
  const empresa = fixMojibake(toText(r["empresa"]));
  const numeroCuenta = toText(r["numerodecuenta"]);
  if (!empresa || !numeroCuenta) return null;

  return {
    empresa,
    numero_cuenta: numeroCuenta,
    saldo: parseSaldo(r["saldo"]) ?? 0,
    estado: fixMojibake(toText(r["estado"])),
    banco: fixMojibake(toText(r["banco"])),
    id_cuenta: fixMojibake(toText(r["idcuenta"])),
    fecha_actualizacion: toIsoDateUs(r["fechaactualizacion"]),
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
        error_message: "table=BANCOS",
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

    const rawRows = await executeDax(pbiUrl, azureToken, "EVALUATE 'BANCOS'");
    const bancos = rawRows
      .map((r) => mapBanco(r, runIso))
      .filter((b): b is BancoRow => b !== null);

    // Guard con fetch no-vacío para que una respuesta transitoria vacía
    // nunca deje la tabla en cero.
    let pruned = 0;
    if (bancos.length > 0) {
      const { error } = await admin
        .from("bancos")
        .upsert(bancos, { onConflict: "empresa,numero_cuenta" });
      if (error) throw new Error(`upsert bancos: ${error.message}`);

      const { error: delErr, count } = await admin
        .from("bancos")
        .delete({ count: "exact" })
        .lt("synced_at", runIso);
      if (delErr) throw new Error(`prune bancos: ${delErr.message}`);
      pruned = count ?? 0;

      // Snapshot diario para el delta % (get_bancos_previous). La fecha
      // es la del día UTC — el cron corre 11:00 UTC = 6am Bogotá, así
      // que coincide con el día local.
      const snapshotDate = runIso.slice(0, 10);
      const { error: snapErr } = await admin
        .from("bancos_snapshots")
        .upsert(
          bancos.map((b) => ({
            snapshot_date: snapshotDate,
            empresa: b.empresa,
            numero_cuenta: b.numero_cuenta,
            saldo: b.saldo,
          })),
          { onConflict: "snapshot_date,empresa,numero_cuenta" },
        );
      if (snapErr) throw new Error(`snapshot bancos: ${snapErr.message}`);
    }

    const duration = Date.now() - startedAt;
    await admin
      .from("pbi_sync_log")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        rows_fetched: rawRows.length,
        rows_upserted: bancos.length,
        duration_ms: duration,
        error_message: `table=BANCOS; bancos=${bancos.length}; pruned=${pruned}`,
      })
      .eq("id", logId);

    return respondJson({
      ok: true,
      source,
      fetched: rawRows.length,
      upserted: bancos.length,
      pruned,
      duration_ms: duration,
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("pbi-sync-bancos failed:", message);
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

/**
 * pbi-sync-bbm — staging de la tabla AuxiliarBBM (compañía BBM) a
 * bbm_entries. Mismo patrón que pbi-sync-auxiliar, pero SIN rango: la
 * historia completa de cuentas 4/5/6 son ~12k filas (2020→hoy), así que
 * cada corrida trae todo, upserta por source_hash y poda lo que ya no
 * exista en el origen (synced_at viejo).
 *
 * Vive en el mismo dataset que el Auxiliar de 5 Stars, así que reutiliza
 * PBI_AUXILIAR_DATASET_ID / PBI_AUXILIAR_GROUP_ID del vault.
 */

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

function toText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

type Cell = Record<string, unknown>;
function g(row: Cell, alias: string): unknown {
  const k = `[${alias}]`;
  return k in row ? row[k] : null;
}

interface MappedRow {
  fecha: string;
  cuenta: string;
  cuenta4: string;
  tipo: string | null;
  documento: string | null;
  prefijo: string | null;
  numero: string | null;
  modulo: string | null;
  nota: string | null;
  tercero: string | null;
  nombre_tercero: string | null;
  base: number | null;
  debito: number;
  credito: number;
  saldo_inicial: number | null;
  saldo_final: number | null;
  source_hash: string;
  synced_at: string;
}

// Hash sincrónico rápido (dos pasadas cyrb53), igual que pbi-sync-auxiliar.
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

function mapRow(row: Cell, syncedAt: string): MappedRow | null {
  const fecha = toIsoDate(g(row, "fecha"));
  const cuenta = toText(g(row, "cuenta"));
  const cuenta4 = toText(g(row, "cuenta4"));
  if (!fecha || !cuenta || !cuenta4) return null;
  const c0 = cuenta4.charCodeAt(0);
  // ASCII '4'..'6' — solo P&L.
  if (c0 < 52 || c0 > 54) return null;

  const tipo = toText(g(row, "tipo"));
  const documento = toText(g(row, "documento"));
  const prefijo = toText(g(row, "prefijo"));
  const numero = toText(g(row, "numero"));
  const modulo = toText(g(row, "modulo"));
  const nota = toText(g(row, "nota"));
  const tercero = toText(g(row, "tercero"));
  const nombre_tercero = toText(g(row, "nombre_tercero"));
  const base = parseMoney(g(row, "base"));
  const debito = parseMoney(g(row, "debito")) ?? 0;
  const credito = parseMoney(g(row, "credito")) ?? 0;
  const saldo_inicial = parseMoney(g(row, "saldo_inicial"));
  const saldo_final = parseMoney(g(row, "saldo_final"));

  // Hash sobre TODAS las columnas de valor (ver nota en pbi-sync-auxiliar:
  // un hash parcial colapsa filas distintas y pierde movimientos).
  const source_hash = hashRow(JSON.stringify([
    fecha, cuenta, cuenta4, tipo, documento, prefijo, numero, modulo, nota,
    tercero, nombre_tercero, base, debito, credito, saldo_inicial, saldo_final,
  ]));

  return {
    fecha,
    cuenta,
    cuenta4,
    tipo,
    documento,
    prefijo,
    numero,
    modulo,
    nota,
    tercero,
    nombre_tercero,
    base,
    debito,
    credito,
    saldo_inicial,
    saldo_final,
    source_hash,
    synced_at: syncedAt,
  };
}

const DAX = `
EVALUATE
SELECTCOLUMNS(
  CALCULATETABLE(
    'AuxiliarBBM',
    'AuxiliarBBM'[CUENTA1] = "4"
      || 'AuxiliarBBM'[CUENTA1] = "5"
      || 'AuxiliarBBM'[CUENTA1] = "6"
  ),
  "fecha", 'AuxiliarBBM'[FECHA],
  "cuenta", 'AuxiliarBBM'[CUENTA8],
  "cuenta4", 'AuxiliarBBM'[CUENTA4],
  "tipo", 'AuxiliarBBM'[TIPO],
  "documento", 'AuxiliarBBM'[DOCUMENTO],
  "prefijo", 'AuxiliarBBM'[PREFIJO],
  "numero", 'AuxiliarBBM'[NUMERO],
  "modulo", 'AuxiliarBBM'[MODULO],
  "nota", 'AuxiliarBBM'[NOTA],
  "tercero", 'AuxiliarBBM'[TERCERO],
  "nombre_tercero", 'AuxiliarBBM'[NOMBRE TERCERO],
  "base", 'AuxiliarBBM'[BASE],
  "debito", 'AuxiliarBBM'[DEBITO],
  "credito", 'AuxiliarBBM'[CREDITO],
  "saldo_inicial", 'AuxiliarBBM'[SALDO INICIAL],
  "saldo_final", 'AuxiliarBBM'[SALDO FINAL]
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
        error_message: "table=AuxiliarBBM",
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

    // El auxiliar trae filas byte-idénticas legítimas; sufijo de ocurrencia
    // para que cada una conserve un source_hash distinto (ver pbi-sync-auxiliar).
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
        .from("bbm_entries")
        .upsert(slice, { onConflict: "source_hash" });
      if (error) {
        throw new Error(`upsert at offset ${i}: ${error.message}`);
      }
      upserted += slice.length;
    }

    // Sync completo → cualquier fila con synced_at viejo ya no existe en el
    // origen. Guard con fetch no-vacío para que una respuesta transitoria
    // vacía de PBI nunca borre toda la tabla.
    let deleted = 0;
    if (unique.length > 0) {
      const { error: delErr, count } = await admin
        .from("bbm_entries")
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
        error_message: `table=AuxiliarBBM; pruned=${deleted}`,
      })
      .eq("id", logId);

    return respondJson({
      ok: true,
      source,
      rows_fetched: rowsFetched,
      rows_unique: unique.length,
      rows_upserted: upserted,
      rows_pruned: deleted,
      duration_ms: duration,
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("pbi-sync-bbm failed:", message);
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

// Daily snapshot of QB bank account balances into bank_balance_snapshots,
// so the Informe Bancos can compute a real deltaPct (QB's Account query
// only exposes CurrentBalance — no history). One row per active Bank
// account per realm per day, upserted so re-runs the same day are safe.
// Accounts listed in bank_account_exclusions (QB type 'Bank' but not real
// banks: employee advances, petty cash, clearing) are skipped.

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const BANK_ACCOUNT_QUERY = "SELECT * FROM Account WHERE AccountType='Bank'";

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

interface TokenRow {
  user_id: string;
  realm_id: string;
  company_name: string | null;
  access_token: string;
  refresh_token: string;
  access_expires_at: string;
  refresh_expires_at: string;
  updated_at: string;
}

interface QBAccountRaw {
  Id: string;
  Name: string;
  Active?: boolean;
  CurrentBalance?: number;
}

async function refreshIfNeeded(
  admin: SupabaseClient,
  row: TokenRow,
  clientId: string,
  clientSecret: string,
): Promise<TokenRow> {
  if (new Date(row.access_expires_at).getTime() > Date.now() + 60_000) {
    return row;
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`refresh_failed_${res.status}`);

  const t = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
  };
  const now = Date.now();
  const updated: TokenRow = {
    ...row,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    access_expires_at: new Date(now + t.expires_in * 1000).toISOString(),
    refresh_expires_at: new Date(
      now + t.x_refresh_token_expires_in * 1000,
    ).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
  await admin.from("qb_user_tokens")
    .update(updated)
    .eq("user_id", row.user_id)
    .eq("realm_id", row.realm_id);
  return updated;
}

async function fetchRealmBalances(
  admin: SupabaseClient,
  row: TokenRow,
  base: string,
  clientId: string,
  clientSecret: string,
  snapshotDate: string,
  exclusions: Set<string>,
): Promise<{ realmId: string; rows: number } | null> {
  if (new Date(row.refresh_expires_at).getTime() < Date.now()) {
    // Reauth required for this realm — skip, the rest still snapshots.
    return null;
  }

  const tokens = await refreshIfNeeded(admin, row, clientId, clientSecret);

  const qs = "?" + new URLSearchParams({ query: BANK_ACCOUNT_QUERY }).toString();
  const url = `${base}/v3/company/${tokens.realm_id}/query${qs}`;
  const qbRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: "application/json",
    },
  });
  if (!qbRes.ok) {
    throw new Error(
      `QB ${qbRes.status} for realm ${row.realm_id}: ${await qbRes.text()}`,
    );
  }
  const json = await qbRes.json() as {
    QueryResponse?: { Account?: QBAccountRaw[] };
  };
  const accounts = (json.QueryResponse?.Account ?? [])
    .filter((a) => a.Active !== false)
    .filter((a) => !exclusions.has(`${row.realm_id}:${a.Id}`));

  if (accounts.length === 0) return { realmId: row.realm_id, rows: 0 };

  const upsertRows = accounts.map((acc) => ({
    snapshot_date: snapshotDate,
    realm_id: row.realm_id,
    company_name: row.company_name,
    account_id: acc.Id,
    account_name: acc.Name,
    balance: typeof acc.CurrentBalance === "number" ? acc.CurrentBalance : 0,
  }));

  const { error } = await admin
    .from("bank_balance_snapshots")
    .upsert(upsertRows, { onConflict: "snapshot_date,realm_id,account_id" });
  if (error) throw new Error(`upsert realm ${row.realm_id}: ${error.message}`);

  return { realmId: row.realm_id, rows: upsertRows.length };
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
        error_message: "job=qb-snapshot-bank-balances",
      })
      .select("id")
      .single();
    if (logErr || !log) throw new Error(`log insert: ${logErr?.message}`);
    logId = log.id;

    const { data: vault, error: vErr } = await admin
      .from("starcorp_vault")
      .select("key,value")
      .in(
        "key",
        ["QB_CLIENT_ID", "QB_CLIENT_SECRET", "QB_ENVIRONMENT", "ADMIN_USER_ID"],
      );
    if (vErr || !vault || vault.length < 3) {
      throw new Error("Vault misconfigured");
    }
    const kv = Object.fromEntries(vault.map((r) => [r.key, r.value]));
    if (!kv.ADMIN_USER_ID) throw new Error("ADMIN_USER_ID not set in vault");

    const { data: tokenRows, error: tErr } = await admin
      .from("qb_user_tokens")
      .select(
        "user_id, realm_id, company_name, access_token, refresh_token, access_expires_at, refresh_expires_at, updated_at",
      )
      .eq("user_id", kv.ADMIN_USER_ID);
    if (tErr) throw new Error(`load tokens: ${tErr.message}`);

    const base = kv.QB_ENVIRONMENT === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";
    const snapshotDate = new Date().toISOString().slice(0, 10);

    const { data: exclRows, error: exclErr } = await admin
      .from("bank_account_exclusions")
      .select("realm_id, account_id");
    if (exclErr) throw new Error(`load exclusions: ${exclErr.message}`);
    const exclusions = new Set(
      (exclRows ?? []).map((r) => `${r.realm_id}:${r.account_id}`),
    );

    const results = await Promise.all(
      (tokenRows as TokenRow[] ?? []).map((row) =>
        fetchRealmBalances(
          admin,
          row,
          base,
          kv.QB_CLIENT_ID,
          kv.QB_CLIENT_SECRET,
          snapshotDate,
          exclusions,
        ).catch((e) => {
          console.error(`[qb-snapshot-bank-balances] realm ${row.realm_id}`, e);
          return null;
        })
      ),
    );

    const skipped = results.filter((r) => r === null).length;
    const rowsUpserted = results.reduce((s, r) => s + (r?.rows ?? 0), 0);
    const duration = Date.now() - startedAt;

    await admin
      .from("pbi_sync_log")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        rows_fetched: (tokenRows ?? []).length,
        rows_upserted: rowsUpserted,
        duration_ms: duration,
        error_message:
          `job=qb-snapshot-bank-balances; snapshot_date=${snapshotDate}; realms=${(tokenRows ?? []).length}; skipped=${skipped}`,
      })
      .eq("id", logId);

    return respondJson({
      ok: true,
      source,
      snapshot_date: snapshotDate,
      realms: (tokenRows ?? []).length,
      skipped,
      rows_upserted: rowsUpserted,
      duration_ms: duration,
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("qb-snapshot-bank-balances failed:", message);
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

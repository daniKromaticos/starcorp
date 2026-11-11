-- Daily snapshot of QuickBooks bank account balances, so the Informe
-- Bancos can compute a real deltaPct (QB only exposes CurrentBalance,
-- not history). Populated by the qb-snapshot-bank-balances edge function
-- via pg_cron, one row per bank account per day.

create table bank_balance_snapshots (
  id bigserial primary key,
  snapshot_date date not null,
  realm_id text not null,
  company_name text,
  account_id text not null,
  account_name text,
  balance numeric not null,
  created_at timestamptz not null default now(),
  unique (snapshot_date, realm_id, account_id)
);

alter table bank_balance_snapshots enable row level security;
-- No policies: deny-by-default for anon/authenticated (same as
-- empleados_detail/historico_emp_cli). Writes come from the edge function
-- via service_role, which bypasses RLS. Reads go through the RPC below.

-- Aggregated balance per realm from the most recent snapshot strictly
-- before today, so the client can diff it against the live QB balance
-- regardless of what time of day it queries.
create or replace function get_bank_balance_previous()
returns table (realm_id text, previous_total numeric, snapshot_date date)
language sql
stable
security definer
set search_path = public
as $$
  with latest_prior as (
    select realm_id, max(snapshot_date) as snap_date
    from bank_balance_snapshots
    where snapshot_date < current_date
    group by realm_id
  )
  select s.realm_id, sum(s.balance), lp.snap_date
  from bank_balance_snapshots s
  join latest_prior lp using (realm_id)
  where s.snapshot_date = lp.snap_date
  group by s.realm_id, lp.snap_date;
$$;

revoke all on function get_bank_balance_previous() from public;
revoke execute on function get_bank_balance_previous() from anon;
grant execute on function get_bank_balance_previous() to authenticated;

-- Schedule daily snapshot via pg_cron + pg_net, same convention as the
-- pbi-sync-* jobs (0011_pbi_sync_cron and friends): reuses the existing
-- PBI_SYNC_CRON_SECRET / PROJECT_URL vault keys, 0 11 * * * UTC = 6am Bogota.
create or replace function trigger_qb_snapshot_bank_balances()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
  v_req_id bigint;
begin
  select value into v_url    from starcorp_vault where key = 'PROJECT_URL';
  select value into v_secret from starcorp_vault where key = 'PBI_SYNC_CRON_SECRET';

  if v_url    is null then raise exception 'PROJECT_URL missing in starcorp_vault';          end if;
  if v_secret is null then raise exception 'PBI_SYNC_CRON_SECRET missing in starcorp_vault'; end if;

  select net.http_post(
    url     := v_url || '/functions/v1/qb-snapshot-bank-balances',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', v_secret
    ),
    body    := jsonb_build_object('source', 'cron')
  ) into v_req_id;

  return v_req_id;
end;
$$;

revoke all on function trigger_qb_snapshot_bank_balances() from public;

select cron.schedule(
  'qb-snapshot-bank-balances-daily',
  '0 11 * * *',
  $cron$select trigger_qb_snapshot_bank_balances();$cron$
);

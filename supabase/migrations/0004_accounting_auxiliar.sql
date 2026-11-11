-- Auxiliar/Saldo Final (Power BI) staging.
-- Source: Power BI 'Auxiliar' table, filtered to chart-of-accounts
-- levels 4 (ingresos), 5 (gastos), 6 (costos). Loaded by the
-- pbi-sync-auxiliar edge function.

create table if not exists accounting_entries (
  id                    bigserial primary key,
  fecha                 date          not null,
  cuenta                text          not null,
  cuenta_nivel_1        smallint      generated always as
                          (substring(cuenta from 1 for 1)::smallint) stored,
  nombre_cuenta         text,
  centro_costo_codigo   text,
  centro_costo_nombre   text,
  nit                   text,
  razon_social          text,
  detalle               text,
  referencia            text,
  debitos               numeric(18,2) not null default 0,
  creditos              numeric(18,2) not null default 0,
  saldo_inicial         numeric(18,2),
  saldo_final           numeric(18,2),
  saldo_final_ajustado  numeric(18,2),
  monto_reporte         numeric(18,2) generated always as
                          (coalesce(saldo_final_ajustado, saldo_final * -1)) stored,
  tipo_ingreso          text,
  clasificacion         text,
  fecha_auditoria       timestamptz,
  usuario               text,
  source_hash           text          not null,
  synced_at             timestamptz   not null default now(),
  constraint cuenta_starts_with_4_5_6 check (cuenta ~ '^[4-6]')
);

create unique index if not exists accounting_entries_source_hash_uq
  on accounting_entries (source_hash);

create index if not exists accounting_entries_fecha_brin
  on accounting_entries using brin (fecha);

create index if not exists accounting_entries_centro_cuenta_fecha
  on accounting_entries (centro_costo_nombre, cuenta_nivel_1, fecha);

create index if not exists accounting_entries_cuenta_fecha
  on accounting_entries (cuenta_nivel_1, fecha);

alter table accounting_entries enable row level security;

drop policy if exists "auth read accounting_entries" on accounting_entries;
create policy "auth read accounting_entries" on accounting_entries
  for select to authenticated using (true);

-- Writes happen via service_role only (bypasses RLS); no write policy.

-- Sync log
create table if not exists pbi_sync_log (
  id              bigserial primary key,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running'
                    check (status in ('running','success','failed')),
  source          text not null check (source in ('cron','manual')),
  rows_fetched    integer,
  rows_upserted   integer,
  duration_ms     integer,
  error_message   text,
  triggered_by    uuid references auth.users(id) on delete set null
);

create index if not exists pbi_sync_log_started_idx
  on pbi_sync_log (started_at desc);

alter table pbi_sync_log enable row level security;

drop policy if exists "auth read pbi_sync_log" on pbi_sync_log;
create policy "auth read pbi_sync_log" on pbi_sync_log
  for select to authenticated using (true);

-- Monthly summary materialized view
drop materialized view if exists mv_monthly_summary;

create materialized view mv_monthly_summary as
select
  date_trunc('month', fecha)::date as year_month,
  centro_costo_nombre,
  cuenta_nivel_1,
  sum(monto_reporte)               as total,
  count(*)                         as n_entries
from accounting_entries
group by 1, 2, 3;

create unique index mv_monthly_summary_uq
  on mv_monthly_summary (year_month, centro_costo_nombre, cuenta_nivel_1);

create index mv_monthly_summary_centro_idx
  on mv_monthly_summary (centro_costo_nombre);

revoke all on mv_monthly_summary from public, anon, authenticated;

create or replace function refresh_mv_monthly_summary()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view mv_monthly_summary;
end;
$$;

revoke all on function refresh_mv_monthly_summary() from public;
grant execute on function refresh_mv_monthly_summary() to service_role;

-- Dashboard RPC
create or replace function get_dashboard_summary(
  p_period       text,
  p_centro_costo text default null,
  p_compare      boolean default false
)
returns table (
  period_start  date,
  period_end    date,
  prev_start    date,
  prev_end      date,
  ingresos      numeric,
  costos        numeric,
  gastos        numeric,
  ingresos_prev numeric,
  costos_prev   numeric,
  gastos_prev   numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today      date := current_date;
  v_start      date;
  v_end        date := v_today;
  v_prev_start date;
  v_prev_end   date;
  v_span_days  integer;
begin
  case p_period
    when 'mtd' then v_start := date_trunc('month', v_today)::date;
    when '1w'  then v_start := v_today - interval '7 days';
    when '1m'  then v_start := v_today - interval '1 month';
    when '3m'  then v_start := v_today - interval '3 months';
    when '12m' then v_start := v_today - interval '12 months';
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  v_span_days  := (v_end - v_start);
  v_prev_end   := v_start - 1;
  v_prev_start := v_prev_end - v_span_days;

  return query
  with cur as (
    select cuenta_nivel_1, sum(monto_reporte) as total
    from accounting_entries
    where fecha >= v_start and fecha <= v_end
      and (p_centro_costo is null or centro_costo_nombre = p_centro_costo)
    group by cuenta_nivel_1
  ),
  prev as (
    select cuenta_nivel_1, sum(monto_reporte) as total
    from accounting_entries
    where p_compare
      and fecha >= v_prev_start and fecha <= v_prev_end
      and (p_centro_costo is null or centro_costo_nombre = p_centro_costo)
    group by cuenta_nivel_1
  )
  select
    v_start, v_end, v_prev_start, v_prev_end,
    coalesce((select total from cur  where cuenta_nivel_1 = 4), 0),
    coalesce((select total from cur  where cuenta_nivel_1 = 6), 0),
    coalesce((select total from cur  where cuenta_nivel_1 = 5), 0),
    coalesce((select total from prev where cuenta_nivel_1 = 4), 0),
    coalesce((select total from prev where cuenta_nivel_1 = 6), 0),
    coalesce((select total from prev where cuenta_nivel_1 = 5), 0);
end;
$$;

revoke all on function get_dashboard_summary(text, text, boolean) from public;
grant execute on function get_dashboard_summary(text, text, boolean) to authenticated;

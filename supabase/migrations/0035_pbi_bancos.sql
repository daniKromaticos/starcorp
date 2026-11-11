-- Informe Bancos v2: la fuente pasa de QuickBooks en vivo (qb-query por
-- realm) a la tabla curada BANCOS del dataset PBI Auxiliar (~13 filas:
-- EMPRESA, NUMERO DE CUENTA, SALDO, ESTADO, BANCO, ID CUENTA,
-- FECHA ACTUALIZACION). ESTADO indica el origen dentro de PBI
-- ('CONTROL' | 'SOLO QUICKBOOKS'); la app muestra todas.
--
-- El delta % del informe se conserva con el mismo mecanismo que el flujo
-- QB (bank_balance_snapshots) pero keyed por empresa: el sync diario
-- escribe bancos_snapshots y get_bancos_previous() devuelve el total por
-- empresa del snapshot más reciente anterior a hoy.
--
-- La infraestructura QB (qb-snapshot-bank-balances, bank_balance_snapshots,
-- bank_account_exclusions) queda intacta pero el informe ya no la usa.

-- ── Staging de la tabla BANCOS ───────────────────────────────────────
create table bancos (
  empresa text not null,
  numero_cuenta text not null,      -- "CK 6321339230" (ya viene con prefijo)
  saldo numeric not null default 0,
  estado text,                      -- 'CONTROL' | 'SOLO QUICKBOOKS'
  banco text,                       -- "CITIZENS", "TD BANK"…
  id_cuenta text,                   -- "CITIZENS CHECKING" (nombre display)
  fecha_actualizacion date,
  synced_at timestamptz not null,
  primary key (empresa, numero_cuenta)
);

alter table bancos enable row level security;
create policy "auth read bancos" on bancos
  for select to authenticated using (true);

-- ── Snapshot diario para el delta % ──────────────────────────────────
create table bancos_snapshots (
  id bigint generated always as identity primary key,
  snapshot_date date not null default current_date,
  empresa text not null,
  numero_cuenta text not null,
  saldo numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (snapshot_date, empresa, numero_cuenta)
);

-- Solo escribe el service role (edge function); sin políticas de lectura
-- para clientes — se consume vía RPC.
alter table bancos_snapshots enable row level security;

-- ── RPC: total por empresa del snapshot previo más reciente ──────────
create or replace function get_bancos_previous()
returns table (empresa text, previous_total numeric, snapshot_date date)
language sql
stable
security definer
set search_path = public
as $$
  with prev as (
    select max(s.snapshot_date) as d
    from bancos_snapshots s
    where s.snapshot_date < current_date
  )
  select s.empresa, sum(s.saldo) as previous_total, s.snapshot_date
  from bancos_snapshots s
  join prev p on s.snapshot_date = p.d
  group by s.empresa, s.snapshot_date;
$$;

revoke all on function get_bancos_previous() from public;
grant execute on function get_bancos_previous() to authenticated, service_role;

-- ── Cron: sync diario 6am Colombia (11:00 UTC), como los demás ───────
create or replace function trigger_pbi_sync_bancos()
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
  if v_url is null or v_secret is null then
    raise exception 'PROJECT_URL/PBI_SYNC_CRON_SECRET missing';
  end if;

  select net.http_post(
    url     := v_url || '/functions/v1/pbi-sync-bancos',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', v_secret
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) into v_req_id;
  return v_req_id;
end;
$$;

revoke all on function trigger_pbi_sync_bancos() from public;

select cron.schedule(
  'pbi-sync-bancos-daily',
  '0 11 * * *',
  'select trigger_pbi_sync_bancos();'
);

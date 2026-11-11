-- Staging de la tabla AuxiliarVAG de Power BI (compañía VAG, sección
-- "Otras compañías"). Mismo dataset/semantic model que el Auxiliar de
-- 5 Stars y BBM; la sincroniza el edge function pbi-sync-vag (historia
-- completa en cada corrida: ~7k filas de TODAS las clases — VAG necesita
-- balance además de P&L: activos 14/15, CxC 13, CxP 21/22/23).
--
-- Particularidades del origen (validadas 2026-07-10):
--   * La data cubre 2022-01-01 → 2024-09-30 (el reporte no está al día).
--   * ~la mitad de las filas son cortes "Saldo inicial ..." (TIPO null):
--     anuales en 2022/2023 y MENSUALES en 2024. Se marcan con
--     es_saldo_inicial para que los agregados de movimientos las excluyan.
--   * Saldo de una cuenta/tercero = SALDO INICIAL del último corte
--     + (DEBITO − CREDITO) de los movimientos posteriores al corte.
--   * La tabla TERCEROSVAG del modelo es un export estático (~feb 2023);
--     NO usarla como fuente de saldos.

create table vag_entries (
  id bigint generated always as identity primary key,
  fecha date not null,
  cuenta text not null,          -- CUENTA8 (cuenta contable completa)
  cuenta1 text not null,         -- clase PUC (1 activo … 8 orden)
  cuenta2 text not null,         -- grupo PUC de 2 dígitos
  cuenta4 text not null,         -- grupo PUC de 4 dígitos
  cuenta6 text not null,         -- grupo PUC de 6 dígitos
  tipo text,
  documento text,
  prefijo text,
  numero text,
  modulo text,
  nota text,
  tercero text,                  -- nit/cédula ('0' = sin tercero)
  nombre_tercero text,
  base numeric,
  debito numeric not null default 0,
  credito numeric not null default 0,
  saldo_inicial numeric,
  saldo_final numeric,
  es_saldo_inicial boolean not null default false,
  source_hash text not null unique,
  synced_at timestamptz not null
);

create index vag_entries_fecha_idx on vag_entries (fecha);
create index vag_entries_cuenta2_idx on vag_entries (cuenta2);
create index vag_entries_cuenta_idx on vag_entries (cuenta);

alter table vag_entries enable row level security;
create policy "auth read vag_entries" on vag_entries
  for select to authenticated using (true);

-- Plan de cuentas de VAG (tabla PUCVAG del modelo: los 5 niveles juntos,
-- nivel = longitud del código). Da nombre a lotes/inmuebles (los códigos
-- 1440xx/15xxxx traen ficha catastral FC y matrícula MI en el nombre).
create table vag_accounts (
  codigo text primary key,
  nombre text not null,
  nivel int not null,            -- longitud del código (1/2/4/6/8)
  synced_at timestamptz not null
);

alter table vag_accounts enable row level security;
create policy "auth read vag_accounts" on vag_accounts
  for select to authenticated using (true);

-- Disparo diario del sync (mismo patrón que los demás pbi-sync-*).
create or replace function trigger_pbi_sync_vag()
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
    url     := v_url || '/functions/v1/pbi-sync-vag',
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

-- 6am Colombia (11 UTC), junto a los demás syncs diarios.
select cron.schedule('pbi-sync-vag-daily', '0 11 * * *', 'select trigger_pbi_sync_vag();');

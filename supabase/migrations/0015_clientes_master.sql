-- Cliente master data (Power BI ListadoClientes5Stars) staging.
-- Source: Power BI 'ListadoClientes5Stars' table, mirrored verbatim
-- (SELECT *) into the `data` JSONB column so new fields appear without
-- needing a migration. Loaded by the pbi-sync-clientes edge function.
--
-- Key: id_centro_costo (matches accounting_entries.centro_costo_codigo).

create table if not exists clientes_master (
  id_centro_costo  text         primary key,
  data             jsonb        not null,
  synced_at        timestamptz  not null default now()
);

create index if not exists clientes_master_data_gin
  on clientes_master using gin (data);

alter table clientes_master enable row level security;

drop policy if exists "auth read clientes_master" on clientes_master;
create policy "auth read clientes_master" on clientes_master
  for select to authenticated using (true);

-- Writes happen via service_role only.

-- Extend get_client_metadata to also return the master record.
-- centro_costo_nombre is the URL-facing identifier; we resolve the code by
-- picking any matching accounting entry, then look up clientes_master.
drop function if exists get_client_metadata(text);

create or replace function get_client_metadata(p_centro_costo text)
returns table (
  n_terceros      int,
  n_cuentas       int,
  n_entries       int,
  first_fecha     date,
  last_fecha      date,
  id_centro_costo text,
  cliente_data    jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with agg as (
    select
      count(distinct nit) filter (where nit is not null)::int as n_terceros,
      count(distinct cuenta)::int                              as n_cuentas,
      count(*)::int                                            as n_entries,
      min(fecha)                                               as first_fecha,
      max(fecha)                                               as last_fecha,
      (array_agg(centro_costo_codigo) filter
        (where centro_costo_codigo is not null))[1]            as codigo
    from accounting_entries
    where centro_costo_nombre = p_centro_costo
  )
  select
    agg.n_terceros,
    agg.n_cuentas,
    agg.n_entries,
    agg.first_fecha,
    agg.last_fecha,
    agg.codigo,
    cm.data
  from agg
  left join clientes_master cm on cm.id_centro_costo = agg.codigo;
$$;

revoke all on function get_client_metadata(text) from public;
revoke execute on function get_client_metadata(text) from anon;
grant execute on function get_client_metadata(text) to authenticated;

-- Vault keys for the new sync (operator must set real values).
insert into starcorp_vault (key, value) values
  ('PBI_CLIENTES_DATASET_ID', 'CHANGE_ME'),
  ('PBI_CLIENTES_GROUP_ID',   'CHANGE_ME')
on conflict (key) do nothing;

-- Trigger function for the cron job (mirrors trigger_pbi_sync_auxiliar).
create or replace function trigger_pbi_sync_clientes()
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

  if v_url    is null then raise exception 'PROJECT_URL missing in starcorp_vault';            end if;
  if v_secret is null then raise exception 'PBI_SYNC_CRON_SECRET missing in starcorp_vault';   end if;
  if v_secret = 'CHANGE_ME_BEFORE_USE' then
    raise exception 'PBI_SYNC_CRON_SECRET is still the placeholder; set a real value';
  end if;

  select net.http_post(
    url     := v_url || '/functions/v1/pbi-sync-clientes',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', v_secret
    ),
    body    := jsonb_build_object('source', 'cron')
  ) into v_req_id;

  return v_req_id;
end;
$$;

revoke all on function trigger_pbi_sync_clientes() from public;

-- Lunes 08:30 UTC = 03:30 hora Bogota (offset 30 min from auxiliar sync).
select cron.schedule(
  'pbi-sync-clientes-weekly',
  '30 8 * * 1',
  $cron$select trigger_pbi_sync_clientes();$cron$
);

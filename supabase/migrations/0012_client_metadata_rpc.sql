-- All-time aggregate metadata for one centro_costo (cliente). Used by the
-- client detail screens to populate the stat boxes (terceros, movimientos,
-- vigencia).
create or replace function get_client_metadata(p_centro_costo text)
returns table (
  n_terceros  int,
  n_cuentas   int,
  n_entries   int,
  first_fecha date,
  last_fecha  date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(distinct nit) filter (where nit is not null)::int,
    count(distinct cuenta)::int,
    count(*)::int,
    min(fecha),
    max(fecha)
  from accounting_entries
  where centro_costo_nombre = p_centro_costo;
$$;

revoke all on function get_client_metadata(text) from public;
revoke execute on function get_client_metadata(text) from anon;
grant execute on function get_client_metadata(text) to authenticated;

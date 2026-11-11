-- Prune por lotes de accounting_entries.
--
-- El sync de Auxiliar termina borrando las filas del rango que quedaron con un
-- synced_at anterior a la corrida (versiones re-auditadas o líneas borradas en
-- el Auxiliar). Ese DELETE cubría ~90 días sin índice sobre synced_at y venía
-- expirando ("canceling statement due to statement timeout"), dejando la fila
-- vieja y la nueva conviviendo: los ingresos de un mes salían inflados hasta
-- un 30%.
--
-- Dos arreglos: el índice que el DELETE necesitaba, y una función que borra de
-- a lotes para que cada statement quede muy por debajo del statement_timeout.

create index if not exists accounting_entries_fecha_synced_at
  on public.accounting_entries (fecha, synced_at);

create or replace function public.prune_accounting_stale(
  p_from   date,
  p_to     date,          -- exclusivo, igual que el rango del sync
  p_before timestamptz,   -- synced_at de la corrida actual
  p_limit  integer default 2000
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_deleted integer;
begin
  if p_limit is null or p_limit <= 0 or p_limit > 20000 then
    raise exception 'p_limit fuera de rango: %', p_limit;
  end if;

  with victims as (
    select ctid
    from accounting_entries
    where fecha >= p_from
      and fecha <  p_to
      and synced_at < p_before
    limit p_limit
  )
  delete from accounting_entries e
  using victims v
  where e.ctid = v.ctid;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function public.prune_accounting_stale(date, date, timestamptz, integer) from public;
revoke all on function public.prune_accounting_stale(date, date, timestamptz, integer) from anon, authenticated;
grant execute on function public.prune_accounting_stale(date, date, timestamptz, integer) to service_role;

-- Consolida el contador "Empleados" de la ficha de cliente con el Informe
-- Asociados activos. Hasta ahora eran dos verdades distintas:
--
--   ficha de cliente  -> empleados_summary   (congelada desde 2026-05-15)
--   Informe Asociados -> empleados_detail    (sync diario)
--
-- La ficha sobre-contaba 275 personas (687 vs 412): empleados_summary es una
-- foto vieja y ademas usaba el corte antiguo de "activo". OKANA marcaba 112
-- donde el informe dice 72; GREAT WOLF 126 vs 89; LIVING GROUP 44 vs 8. Al
-- reves, clientes nuevos (HIGH PEAKS, CAPRA) no existian en la tabla vieja.
--
-- El corte de "activo" pasa a ser el mismo del informe, literalmente el mismo
-- predicado que get_asociados_snapshot: retirement_date null + codigoalterno
-- no vacio, deduplicado por persona quedandose con la asignacion vigente. Se
-- deja el retirement_date aunque hoy no descarte a nadie (empleadosHotel nunca
-- lo trae) para que si el origen empieza a llenarlo cambien los dos a la vez.
--
-- El join es empleados_detail.codigo = accounting_entries.centro_costo_codigo:
-- los 49 codigos de empleados_detail matchean 100% y codigo <-> sub_account es
-- 1:1, asi que agrupar por codigo aqui da los mismos clientes que agrupar por
-- sub_account alla.
--
-- empleados_summary queda huerfana (ningun otro RPC la lee) pero no se toca.

create or replace function public.get_client_metadata(p_centro_costo text)
returns table(
  n_terceros integer,
  n_cuentas integer,
  n_entries integer,
  first_fecha date,
  last_fecha date,
  id_centro_costo text,
  cliente_data jsonb,
  empleados_activos integer,
  empleados_total integer
)
language sql
stable security definer
set search_path to 'public'
as $function$
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
      and detalle is distinct from 'Cierre periodo fiscal'
  ),
  -- Identico al CTE persona de get_asociados_snapshot: una fila por persona,
  -- la de su asignacion vigente. La identidad es codigo_alterno, no
  -- id_employee: quien atiende varias cuentas tiene una fila por cliente y
  -- debe contar una sola vez, en el cliente donde esta hoy.
  persona as (
    select distinct on (codigo_alterno) codigo, codigo_alterno
    from public.empleados_detail
    where retirement_date is null
      and nullif(trim(codigo_alterno), '') is not null
    order by codigo_alterno,
             start_date_area desc nulls last,
             admission_date desc nulls last,
             id_employee
  ),
  emp_activos as (
    select codigo, count(*)::int as activos
    from persona
    group by codigo
  ),
  -- Universo sin el filtro de codigo: sirve para ver cuanta gente de ese
  -- cliente todavia no tiene codigoalterno asignado (activos < total).
  emp_total as (
    select codigo, count(distinct id_employee)::int as total
    from public.empleados_detail
    group by codigo
  )
  select
    agg.n_terceros,
    agg.n_cuentas,
    agg.n_entries,
    agg.first_fecha,
    agg.last_fecha,
    agg.codigo,
    cm.data,
    -- 0 = el cliente esta en empleadosHotel pero nadie tiene codigo vigente.
    -- null = el cliente no aparece en empleadosHotel (la UI muestra "XX").
    -- La distincion importa: "cero asociados" no es lo mismo que "sin datos".
    case when et.total is not null then coalesce(ea.activos, 0) end,
    et.total
  from agg
  left join clientes_master cm on cm.id_centro_costo = agg.codigo
  left join emp_activos     ea on ea.codigo          = agg.codigo
  left join emp_total       et on et.codigo          = agg.codigo;
$function$;

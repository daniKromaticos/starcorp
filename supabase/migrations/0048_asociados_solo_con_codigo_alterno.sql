-- get_asociados_snapshot: sólo empleados con codigoalterno asignado.
--
-- El informe contaba 878 asociados activos contra los ~317-386 de Power BI.
-- La causa: empleadosHotel nunca trae Retirement Date (0 filas con valor en
-- las ~11.800 crudas), así que el filtro `retirement_date is null` no
-- descartaba a nadie y la tabla arrastraba gente que ya no está vigente.
--
-- El corte acordado con negocio es codigoalterno: quien no lo tiene no entra
-- al informe. Deja el total en 331 (vs 878), coherente con el headcount que
-- reporta la otra tabla de PBI, HistoricoEmpXCli (376 en ago-2026, 386 en
-- jul, 413 en jun), que alimenta la vista de tendencia.
--
-- Efectos: 547 empleados salen del informe y 11 clientes desaparecen por
-- completo al quedarse sin ningún empleado con código (EFFIE 22, HOLIDAY
-- ISLE 13, SOUTHERN VACATION 12, HIGH PEAKS RESORT 6, CAPRA ENTERPRISES 5,
-- SOHO SUITES 5, COURTYARD MARRIOTT BETHLEHEM 3, INN AT COROLLA 2, GREAT
-- SMOKIES INN 2, ECHD OHIO 2, FRANKARL GREENHOUSES 1). Los clientes pasan
-- de 49 a 38.
--
-- Se mantiene el filtro de retirement_date: hoy no descarta nada, pero si el
-- origen empieza a poblar la columna vuelve a hacer su trabajo.

create or replace function public.get_asociados_snapshot()
returns json
language sql
stable security definer
set search_path to 'public'
as $function$
  select json_build_object(
    'updatedAt',
      coalesce((select max(synced_at)::date::text from public.empleados_detail),
               current_date::text),
    'clients',
      coalesce((
        select json_agg(c order by c->>'name')
        from (
          select json_build_object(
            'id',      regexp_replace(lower(coalesce(sub_account, 'sin-nombre')),
                                      '[^a-z0-9]+', '-', 'g'),
            'name',    coalesce(nullif(trim(sub_account), ''), 'Sin nombre'),
            'account', account,
            'employees', json_agg(
              json_build_object(
                'id',            id_employee,
                'name',          coalesce(nullif(trim(employee_name), ''), 'Sin nombre'),
                'area',          coalesce(nullif(trim(area), ''), 'Sin área'),
                'codigoInterno', coalesce(nullif(trim(codigo_alterno), ''), '—')
              )
              order by employee_name
            )
          ) as c
          from public.empleados_detail
          where retirement_date is null
            -- Sin codigoalterno no se considera asociado vigente.
            and nullif(trim(codigo_alterno), '') is not null
          group by
            regexp_replace(lower(coalesce(sub_account, 'sin-nombre')), '[^a-z0-9]+', '-', 'g'),
            sub_account,
            account
        ) t
      ), '[]'::json)
  );
$function$;

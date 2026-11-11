-- Los 6 RPCs del consolidado dejan de excluir los asientos de cierre fiscal.
--
-- El filtro `detalle is distinct from 'Cierre periodo fiscal'` venía de la
-- migración 0022, cuando se sumaba `saldo_final` con signo y el cierre de
-- dic-2024 dejaba los ingresos del mes en −23,3M. Con `saldo_final_ajustado`
-- (= ABS, migración 0041) ya no distorsiona el signo, pero sí suma: el
-- histórico de 12 meses (ago-24 → jul-25) queda 25.472.810,56 por debajo del
-- informe, porque dic-2024 trae 7.647 asientos de cierre.
--
-- Verificado con el cliente: su visual de 12 meses muestra 48.367.519,53 en el
-- histórico, o sea que SÍ los incluye. Se quita el filtro para que la app
-- muestre lo mismo.
--
-- Consecuencia a tener presente: cuando contabilidad contabilice el cierre de
-- 2025, diciembre de ese año va a pegar un salto de ~25M y el periodo corriente
-- de 12 meses con él. El informe hará lo mismo, así que seguirán espejados,
-- pero no es un error de la app.
--
-- `get_client_metadata` conserva el filtro: sólo cuenta registros y fechas, no
-- suma importes, y ahí el cierre sí ensuciaría los conteos.
--
-- Se aplica reescribiendo las definiciones vigentes en vez de volver a pegar
-- las seis funciones enteras: son ~600 líneas y el único cambio es borrar esa
-- línea. El bloque valida que cada función tenga exactamente los 2 filtros
-- esperados antes de tocarla, y que no quede ninguno después.

do $do$
declare
  v_names text[] := array[
    'get_dashboard_summary',
    'get_consolidated_timeseries',
    'get_top_clients',
    'get_consolidated_clients',
    'get_client_cost_groups',
    'get_group_terceros'
  ];
  r      record;
  v_new  text;
  v_hits integer;
  v_done integer := 0;
begin
  for r in
    select p.proname, pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname = any(v_names)
  loop
    v_hits := (length(r.def) - length(replace(r.def, 'Cierre periodo fiscal', '')))
              / length('Cierre periodo fiscal');
    if v_hits <> 2 then
      raise exception '%: se esperaban 2 filtros de cierre fiscal, hay %', r.proname, v_hits;
    end if;

    v_new := regexp_replace(
      r.def,
      $re$\s*and (ae\.)?detalle is distinct from 'Cierre periodo fiscal'$re$,
      '',
      'g'
    );

    if v_new like '%Cierre periodo fiscal%' then
      raise exception '%: no se pudo quitar el filtro', r.proname;
    end if;

    execute v_new;
    v_done := v_done + 1;
  end loop;

  if v_done <> array_length(v_names, 1) then
    raise exception 'se reescribieron % de % funciones', v_done, array_length(v_names, 1);
  end if;
end
$do$;

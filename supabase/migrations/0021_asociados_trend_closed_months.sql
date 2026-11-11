-- get_asociados_trend: sólo meses vencidos.
--
-- La tendencia de asociados (informe Asociados + mini-gráfica en la card de
-- Informes del dashboard) tomaba los últimos 12 meses con registros en
-- historico_emp_cli, incluyendo el mes en curso cuando el sync ya tenía
-- datos de ese mes. Se alinea con el criterio del dashboard consolidado
-- (1m/3m/12m = meses calendario cerrados): el mes en curso se excluye.

create or replace function public.get_asociados_trend()
returns json
language sql
stable security definer
set search_path to 'public'
as $function$
  with months as (
    -- Sólo meses vencidos: el mes en curso se excluye (igual que el
    -- filtro 1m/3m/12m del dashboard consolidado).
    select ym, m
    from (
      select distinct
        to_char(date_trunc('month', fecharegistro), 'YYYY-MM') as ym,
        date_trunc('month', fecharegistro)::date as m
      from public.historico_emp_cli
      where fecharegistro is not null
        and fecharegistro < date_trunc('month', current_date)
      order by m desc
      limit 12
    ) x
    order by m asc
  ),
  codigo_client as (
    select codigo,
           (array_agg(sub_account order by synced_at desc))[1] as sub_account
    from public.empleados_detail
    where codigo is not null
    group by codigo
  ),
  codigo_day as (
    select
      h.codigo,
      to_char(date_trunc('month', h.fecharegistro), 'YYYY-MM') as ym,
      h.fecharegistro,
      h.empleados
    from public.historico_emp_cli h
    where h.fecharegistro is not null
      and h.fecharegistro < date_trunc('month', current_date)
  ),
  -- Headcount del último día registrado de cada (codigo, mes).
  codigo_month as (
    select distinct on (codigo, ym)
      codigo, ym, empleados as cnt
    from codigo_day
    order by codigo, ym, fecharegistro desc
  ),
  -- Suma por cliente (sub_account): varios codigos pueden mapear a un cliente.
  monthly as (
    select
      coalesce(
        nullif(regexp_replace(lower(coalesce(trim(cc.sub_account), '')),
                              '[^a-z0-9]+', '-', 'g'), ''),
        regexp_replace(lower(coalesce(cm.codigo, 'sin-codigo')),
                       '[^a-z0-9]+', '-', 'g')
      ) as id,
      coalesce(nullif(trim(cc.sub_account), ''), cm.codigo, 'Sin nombre') as name,
      cm.ym,
      sum(cm.cnt)::int as cnt
    from codigo_month cm
    left join codigo_client cc on cc.codigo = cm.codigo
    group by 1, 2, 3
  ),
  series as (
    select d.id,
           d.name,
           json_agg(coalesce(mm.cnt, 0) order by mo.m) as counts
    from (select distinct id, name from monthly) d
    cross join months mo
    left join monthly mm on mm.id = d.id and mm.ym = mo.ym
    group by d.id, d.name
  )
  select json_build_object(
    'updatedAt',
      coalesce((select max(synced_at)::date::text from public.historico_emp_cli),
               current_date::text),
    'months',
      coalesce((select json_agg(ym order by m) from months), '[]'::json),
    'series',
      coalesce((select json_agg(s order by s.name) from series s), '[]'::json)
  );
$function$;

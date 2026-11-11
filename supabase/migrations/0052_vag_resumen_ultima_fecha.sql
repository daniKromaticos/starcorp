-- 0052: get_vag_resumen expone la fecha del último dato de cada card.
--
-- El sync de VAG trae la data tal como está en Power BI y cada bloque va a su
-- ritmo (Movimientos puede llegar a julio mientras Cuentas por cobrar quedó en
-- junio), así que el hub muestra en cada card hasta cuándo llega la data.
-- `ultima_fecha` = max(fecha) del mismo universo de filas que suma el total.

create or replace function public.get_vag_resumen()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
with mov_mes as (
  select date_trunc('month', max(fecha))::date as m
  from vag_movimientos
  where centro_costo is null
     or (centro_costo not ilike 'cuentas por cobrar' and centro_costo not ilike 'cuentas por pagar')
),
movs as (
  select
    coalesce(sum(v.valor) filter (where v.fecha >= mm.m), 0) as cur,
    coalesce(sum(v.valor) filter (
      where v.fecha >= (mm.m - interval '1 month')::date and v.fecha < mm.m
    ), 0) as prev,
    max(v.fecha) as ultima_fecha
  from vag_movimientos v
  cross join mov_mes mm
  where v.centro_costo is null
     or (v.centro_costo not ilike 'cuentas por cobrar' and v.centro_costo not ilike 'cuentas por pagar')
)
select jsonb_build_object(
  'activos', jsonb_build_object(
    'total', coalesce((select sum(valor_contable) from vag_activos), 0),
    'delta_pct', 0
  ),
  'movimientos', jsonb_build_object(
    'total', m.cur,
    'delta_pct', case when m.prev = 0 then 0
      else round((m.cur - m.prev) / abs(m.prev) * 100, 2) end,
    'ultima_fecha', m.ultima_fecha
  ),
  'cuentas_cobrar', jsonb_build_object(
    'total', coalesce((select sum(valor) from vag_movimientos where centro_costo ilike 'cuentas por cobrar'), 0),
    'delta_pct', 0,
    'ultima_fecha', (select max(fecha) from vag_movimientos where centro_costo ilike 'cuentas por cobrar')
  ),
  'cuentas_pagar', jsonb_build_object(
    'total', coalesce((select sum(valor) from vag_movimientos where centro_costo ilike 'cuentas por pagar'), 0),
    'delta_pct', 0,
    'ultima_fecha', (select max(fecha) from vag_movimientos where centro_costo ilike 'cuentas por pagar')
  )
)
from movs m;
$function$;

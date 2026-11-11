-- VAG: Cuentas por cobrar / por pagar ahora tienen fuente real. La tabla
-- curada MovimientosVag de Power BI agregó dos grupos nuevos bajo CENTRO DE
-- COSTO: "Cuentas por Cobrar" (Codigo 14) y "Cuentas por pagar" (Codigo 15)
-- — los mismos códigos que antes eran encabezados vacíos en ListadoActivosVag
-- (ver migración 0034). Cada fila = un tercero + concepto con VALOR = saldo
-- a la fecha de corte (OBSERVACIONES trae el corte, ej. "SALDO A 31 DE
-- DICIEMBRE DE 2025"); no son gastos del período, así que se excluyen de
-- get_vag_movimientos / get_vag_resumen (métrica "movimientos") y de
-- get_vag_empresa_summary, y se agregan por tercero para get_vag_cuentas
-- (antes eliminada en 0034, sin fuente — ahora se recrea).
--
-- pbi-sync-vag NO cambia: ya trae estas filas dentro de MovimientosVag sin
-- filtrar (mapMovimiento solo exige FECHA no nula).

create or replace function get_vag_cuentas(p_tipo text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.tercero_key,
    'nombre', g.tercero,
    'saldo', g.saldo,
    'cuenta', case when p_tipo = 'cobrar' then 'Cuentas por Cobrar' else 'Cuentas por Pagar' end,
    'direccion', null,
    'movimientos', g.movimientos
  ) order by g.saldo desc), '[]'::jsonb)
  from (
    select
      md5(lower(coalesce(v.tercero, 'sin-tercero'))) as tercero_key,
      coalesce(v.tercero, 'Sin tercero') as tercero,
      sum(v.valor) as saldo,
      jsonb_agg(jsonb_build_object(
        'id', v.id::text,
        'tipo', coalesce(v.concepto, 'Movimiento'),
        'monto', v.valor,
        'movimientoId', v.id::text
      ) order by v.valor desc) as movimientos
    from vag_movimientos v
    where v.centro_costo ilike (
      case when p_tipo = 'cobrar' then 'cuentas por cobrar' else 'cuentas por pagar' end
    )
    group by v.tercero
  ) g;
$$;

-- Movimientos: excluye las filas de cartera (no son gastos del período).
create or replace function get_vag_movimientos()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select coalesce(jsonb_agg(jsonb_build_object(
  'id', v.id,
  'nombre', coalesce(v.centro_costo, '--'),
  'tipo', coalesce(v.tipo, '--'),
  'fecha', v.fecha,
  'valor', v.valor,
  'subpartida', coalesce(v.subpartida, v.concepto, '--'),
  'tercero', coalesce(v.tercero, '--'),
  'observaciones', coalesce(v.observaciones, '--')
) order by v.fecha desc, v.id desc), '[]'::jsonb)
from vag_movimientos v
where v.centro_costo is null
   or (v.centro_costo not ilike 'cuentas por cobrar' and v.centro_costo not ilike 'cuentas por pagar');
$$;

-- Resumen del hub: cuentas por cobrar/pagar ahora salen de vag_movimientos
-- (sin histórico → delta 0, igual que activos); movimientos excluye cartera.
create or replace function get_vag_resumen()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
    ), 0) as prev
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
      else round((m.cur - m.prev) / abs(m.prev) * 100, 2) end
  ),
  'cuentas_cobrar', jsonb_build_object(
    'total', coalesce((select sum(valor) from vag_movimientos where centro_costo ilike 'cuentas por cobrar'), 0),
    'delta_pct', 0
  ),
  'cuentas_pagar', jsonb_build_object(
    'total', coalesce((select sum(valor) from vag_movimientos where centro_costo ilike 'cuentas por pagar'), 0),
    'delta_pct', 0
  )
)
from movs m;
$$;

-- Card de VAG en "Otras compañías": excluye cartera del total de gastos.
create or replace function get_vag_empresa_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_last date;
  v_cur numeric;
  v_prev numeric;
begin
  select date_trunc('month', max(fecha))::date into v_last
  from vag_movimientos
  where centro_costo is null
     or (centro_costo not ilike 'cuentas por cobrar' and centro_costo not ilike 'cuentas por pagar');
  if v_last is null then
    return null;
  end if;

  select coalesce(sum(valor), 0) into v_cur
  from vag_movimientos
  where fecha >= v_last and fecha < (v_last + interval '1 month')::date
    and (centro_costo is null
      or (centro_costo not ilike 'cuentas por cobrar' and centro_costo not ilike 'cuentas por pagar'));

  select coalesce(sum(valor), 0) into v_prev
  from vag_movimientos
  where fecha >= (v_last - interval '1 month')::date and fecha < v_last
    and (centro_costo is null
      or (centro_costo not ilike 'cuentas por cobrar' and centro_costo not ilike 'cuentas por pagar'));

  return jsonb_build_object(
    'year', extract(year from v_last)::int,
    'month', extract(month from v_last)::int,
    'total', v_cur,
    'delta_pct', case when v_prev = 0 then 0
                      else round(((v_cur - v_prev) / abs(v_prev)) * 100, 2) end
  );
end;
$$;

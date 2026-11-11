-- RPCs de la sección VAG (Otras compañías) sobre vag_entries/vag_accounts.
--
-- Convenciones (ver 0030_vag_entries.sql):
--   * "corte" = filas es_saldo_inicial; el último corte global es la base
--     de los saldos: saldo = SI(último corte) + movimientos posteriores.
--   * Saldos naturales: activos/deudores débito-positivo; pasivos
--     crédito-negativo en el origen → se invierte el signo para mostrar
--     cuentas por pagar en positivo.
--   * Cuentas por pagar = grupos 22 (proveedores) y 23 (CxP). El grupo 21
--     (obligaciones financieras) queda fuera: es deuda bancaria, no CxP
--     operativa.
--   * La vista Movimientos muestra filas reales de P&L (4/5/6) y de los
--     grupos de balance que la UI referencia (13/14/15/21/22/23); quedan
--     fuera 11 (bancos/caja: transferencias) y 3/8.

-- ── Resumen del hub (4 cards) ────────────────────────────────────────
create or replace function get_vag_resumen()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with cutoff as (
  select max(fecha) as f from vag_entries where es_saldo_inicial
),
prev_cutoff as (
  select max(v.fecha) as f
  from vag_entries v, cutoff c
  where v.es_saldo_inicial and v.fecha < c.f
),
saldos as (
  select
    v.cuenta2,
    coalesce(sum(v.saldo_inicial) filter (where v.es_saldo_inicial and v.fecha = c.f), 0)
      + coalesce(sum(v.debito - v.credito) filter (where not v.es_saldo_inicial and v.fecha >= c.f), 0) as cur,
    coalesce(sum(v.saldo_inicial) filter (where v.es_saldo_inicial and v.fecha = p.f), 0)
      + coalesce(sum(v.debito - v.credito) filter (where not v.es_saldo_inicial and v.fecha >= p.f and v.fecha < c.f), 0) as prev
  from vag_entries v
  cross join cutoff c
  cross join prev_cutoff p
  where v.cuenta2 in ('13', '14', '15', '22', '23')
  group by v.cuenta2
),
agg as (
  select
    coalesce(sum(cur)  filter (where cuenta2 in ('14', '15')), 0) as act_cur,
    coalesce(sum(prev) filter (where cuenta2 in ('14', '15')), 0) as act_prev,
    coalesce(sum(cur)  filter (where cuenta2 = '13'), 0) as cob_cur,
    coalesce(sum(prev) filter (where cuenta2 = '13'), 0) as cob_prev,
    -coalesce(sum(cur)  filter (where cuenta2 in ('22', '23')), 0) as pag_cur,
    -coalesce(sum(prev) filter (where cuenta2 in ('22', '23')), 0) as pag_prev
  from saldos
),
mov_mes as (
  select date_trunc('month', max(fecha))::date as m
  from vag_entries
  where not es_saldo_inicial
    and (cuenta1 in ('4', '5', '6')
      or cuenta2 in ('13', '14', '15', '21', '22', '23'))
),
movs as (
  select
    coalesce(sum(abs(v.debito - v.credito))
      filter (where v.fecha >= mm.m), 0) as cur,
    coalesce(sum(abs(v.debito - v.credito))
      filter (where v.fecha >= (mm.m - interval '1 month')::date and v.fecha < mm.m), 0) as prev
  from vag_entries v
  cross join mov_mes mm
  where not v.es_saldo_inicial
    and (v.cuenta1 in ('4', '5', '6')
      or v.cuenta2 in ('13', '14', '15', '21', '22', '23'))
),
delta as (
  select
    a.*, m.cur as mov_cur, m.prev as mov_prev,
    (select f from cutoff) as corte,
    (select m from mov_mes) as mes_mov
  from agg a, movs m
)
select jsonb_build_object(
  'as_of', (select max(fecha) from vag_entries),
  'activos', jsonb_build_object(
    'total', d.act_cur,
    'delta_pct', case when d.act_prev = 0 then 0
      else round((d.act_cur - d.act_prev) / abs(d.act_prev) * 100, 2) end
  ),
  'movimientos', jsonb_build_object(
    'total', d.mov_cur,
    'delta_pct', case when d.mov_prev = 0 then 0
      else round((d.mov_cur - d.mov_prev) / abs(d.mov_prev) * 100, 2) end
  ),
  'cuentas_cobrar', jsonb_build_object(
    'total', d.cob_cur,
    'delta_pct', case when d.cob_prev = 0 then 0
      else round((d.cob_cur - d.cob_prev) / abs(d.cob_prev) * 100, 2) end
  ),
  'cuentas_pagar', jsonb_build_object(
    'total', d.pag_cur,
    'delta_pct', case when d.pag_prev = 0 then 0
      else round((d.pag_cur - d.pag_prev) / abs(d.pag_prev) * 100, 2) end
  )
)
from delta d;
$$;

-- ── Activos (cuentas nivel 8 de los grupos 14 y 15) ──────────────────
-- Un "activo" = una cuenta de 8 dígitos bajo 14 (bienes raíces para la
-- venta) o 15 (PPE). matricula/ficha_catastral se extraen del nombre de
-- la cuenta cuando trae "MI ..." / "FC ..." (null si no).
create or replace function get_vag_activos()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with cutoff as (
  select max(fecha) as f from vag_entries where es_saldo_inicial
),
base as (
  select
    v.cuenta,
    coalesce(sum(v.saldo_inicial) filter (where v.es_saldo_inicial and v.fecha = c.f), 0)
      + coalesce(sum(v.debito - v.credito) filter (where not v.es_saldo_inicial and v.fecha >= c.f), 0) as saldo,
    count(*) filter (where not v.es_saldo_inicial) as n_movs,
    min(v.fecha) filter (where not v.es_saldo_inicial) as primera_fecha_mov,
    min(v.fecha) filter (where v.es_saldo_inicial and coalesce(v.saldo_inicial, 0) <> 0) as primera_fecha_si
  from vag_entries v
  cross join cutoff c
  where v.cuenta2 in ('14', '15')
  group by v.cuenta
),
det as (
  select
    b.*,
    coalesce(a8.nombre, 'Cuenta ' || b.cuenta) as nombre,
    initcap(coalesce(a4.nombre, 'Activo')) as tipo,
    coalesce(b.primera_fecha_mov, b.primera_fecha_si) as fecha_adq
  from base b
  left join vag_accounts a8 on a8.codigo = b.cuenta
  left join vag_accounts a4 on a4.codigo = left(b.cuenta, 4)
  where b.saldo <> 0 or b.n_movs > 0
),
adq as (
  select d.cuenta, sum(v.debito) as valor_adq
  from det d
  join vag_entries v
    on v.cuenta = d.cuenta
    and not v.es_saldo_inicial
    and v.fecha = d.primera_fecha_mov
  group by d.cuenta
),
movs as (
  select d.cuenta, jsonb_agg(sub.m order by sub.m_fecha desc, sub.m_id desc) as movimientos
  from det d
  cross join lateral (
    select
      v.id as m_id,
      v.fecha as m_fecha,
      jsonb_build_object(
        'id', v.id,
        'fecha', v.fecha,
        'nombre', coalesce(v.nota, trim(coalesce(v.tipo, '') || ' ' || coalesce(v.numero, '')), 'Movimiento'),
        'valor', v.debito - v.credito
      ) as m
    from vag_entries v
    where v.cuenta = d.cuenta and not v.es_saldo_inicial
    order by v.fecha desc, v.id desc
    limit 20
  ) sub
  group by d.cuenta
)
select coalesce(jsonb_agg(jsonb_build_object(
  'id', d.cuenta,
  'nombre', d.nombre,
  'tipo', d.tipo,
  'fecha_adquisicion', d.fecha_adq,
  'valor_adquisicion', coalesce(adq.valor_adq, d.saldo),
  'valor_contable', d.saldo,
  'matricula', substring(d.nombre from 'MI ([0-9\-\/]+)'),
  'ficha_catastral', substring(d.nombre from 'FC ([0-9]+)'),
  'movimientos', coalesce(movs.movimientos, '[]'::jsonb)
) order by d.saldo desc, d.cuenta), '[]'::jsonb)
from det d
left join adq on adq.cuenta = d.cuenta
left join movs on movs.cuenta = d.cuenta;
$$;

-- ── Movimientos (filas reales, para la vista con stepper de mes) ─────
create or replace function get_vag_movimientos()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select coalesce(jsonb_agg(jsonb_build_object(
  'id', v.id,
  'nombre', coalesce(a8.nombre, 'Cuenta ' || v.cuenta),
  'tipo', case v.cuenta1
    when '4' then 'Ingreso'
    when '5' then 'Gasto'
    when '6' then 'Costo'
    when '1' then 'Activo'
    else 'Pasivo' end,
  'fecha', v.fecha,
  'valor', case when v.cuenta1 in ('2', '3', '4')
    then v.credito - v.debito
    else v.debito - v.credito end,
  'subpartida', initcap(coalesce(a4.nombre, 'Cuenta ' || v.cuenta4)),
  'tercero', coalesce(v.nombre_tercero, v.tercero, '--'),
  'observaciones', coalesce(v.nota, '--')
) order by v.fecha desc, v.id desc), '[]'::jsonb)
from vag_entries v
left join vag_accounts a8 on a8.codigo = v.cuenta
left join vag_accounts a4 on a4.codigo = v.cuenta4
where not v.es_saldo_inicial
  and (v.cuenta1 in ('4', '5', '6')
    or v.cuenta2 in ('13', '14', '15', '21', '22', '23'));
$$;

-- ── Cuentas por cobrar / por pagar (grano cuenta×tercero) ────────────
create or replace function get_vag_cuentas(p_tipo text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with cutoff as (
  select max(fecha) as f from vag_entries where es_saldo_inicial
),
base as (
  select
    v.cuenta,
    coalesce(nullif(trim(v.tercero), ''), '0') as tercero,
    max(v.nombre_tercero) as nombre_tercero,
    coalesce(sum(v.saldo_inicial) filter (where v.es_saldo_inicial and v.fecha = c.f), 0)
      + coalesce(sum(v.debito - v.credito) filter (where not v.es_saldo_inicial and v.fecha >= c.f), 0) as saldo_nat
  from vag_entries v
  cross join cutoff c
  where (p_tipo = 'cobrar' and v.cuenta2 = '13')
     or (p_tipo = 'pagar' and v.cuenta2 in ('22', '23'))
  group by v.cuenta, coalesce(nullif(trim(v.tercero), ''), '0')
),
det as (
  select
    b.*,
    case when p_tipo = 'pagar' then -b.saldo_nat else b.saldo_nat end as saldo,
    coalesce(a8.nombre, 'Cuenta ' || b.cuenta) as cuenta_nombre,
    initcap(a4.nombre) as cuenta4_nombre
  from base b
  left join vag_accounts a8 on a8.codigo = b.cuenta
  left join vag_accounts a4 on a4.codigo = left(b.cuenta, 4)
  where round(b.saldo_nat, 2) <> 0
),
movs as (
  select d.cuenta, d.tercero, jsonb_agg(sub.m order by sub.m_fecha desc, sub.m_id desc) as movimientos
  from det d
  cross join lateral (
    select
      v.id as m_id,
      v.fecha as m_fecha,
      jsonb_build_object(
        'id', v.id,
        'tipo', coalesce(v.nota, trim(coalesce(v.tipo, '') || ' ' || coalesce(v.numero, '')), 'Movimiento'),
        'monto', case when p_tipo = 'pagar' then v.credito - v.debito else v.debito - v.credito end
      ) as m
    from vag_entries v
    where v.cuenta = d.cuenta
      and coalesce(nullif(trim(v.tercero), ''), '0') = d.tercero
      and not v.es_saldo_inicial
    order by v.fecha desc, v.id desc
    limit 10
  ) sub
  group by d.cuenta, d.tercero
)
select coalesce(jsonb_agg(jsonb_build_object(
  'id', d.cuenta || '-' || d.tercero,
  'nombre', coalesce(d.nombre_tercero, nullif(d.tercero, '0'), 'Sin tercero'),
  'saldo', d.saldo,
  'cuenta_nombre', d.cuenta_nombre,
  'servicio', case when p_tipo = 'pagar' then d.cuenta4_nombre else null end,
  'movimientos', coalesce(movs.movimientos, '[]'::jsonb)
) order by d.saldo desc, d.cuenta), '[]'::jsonb)
from det d
left join movs on movs.cuenta = d.cuenta and movs.tercero = d.tercero;
$$;

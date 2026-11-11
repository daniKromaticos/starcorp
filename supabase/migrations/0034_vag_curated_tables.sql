-- VAG v2: la fuente correcta son las tablas curadas del modelo PBI
-- ListadoActivosVag (ficha completa de cada activo) y MovimientosVag
-- (movimientos por centro de costo, data 2026 al día) — NO AuxiliarVAG.
-- Se reemplaza el staging contable (vag_entries/vag_accounts, data
-- reconstruible re-corriendo el sync viejo) por vag_activos y
-- vag_movimientos, y se rehacen los RPCs encima. Cuentas por cobrar /
-- por pagar aún no tienen fuente → la app usa mock (se elimina
-- get_vag_cuentas).
--
-- vag_activo_docs NO cambia de esquema, pero el activo_id pasa a ser el
-- CODIGO de ListadoActivosVag (la tabla estaba vacía, sin data que migrar).

-- ── Limpieza del staging del auxiliar ────────────────────────────────
drop function if exists get_vag_cuentas(text);
drop table if exists vag_entries;
drop table if exists vag_accounts;

-- ── Staging de las tablas curadas ────────────────────────────────────
create table vag_activos (
  codigo text primary key,        -- CODIGO del listado (id del activo en la app)
  nombre text not null,
  tipo text,
  fecha_adquisicion date,
  valor_adquisicion numeric,
  valor_estimado numeric,
  valor_contable numeric,
  avaluo_catastral numeric,
  valor_predial numeric,
  valor_seguro numeric,
  vigencia date,                  -- vigencia del seguro (null si "0"/vacía)
  aseguradora text,
  ciudad text,
  direccion text,
  numero_matricula text,
  ficha_catastral text,
  synced_at timestamptz not null
);

create table vag_movimientos (
  id bigint generated always as identity primary key,
  codigo text,                    -- Codigo del origen (NO es único)
  centro_costo text,              -- enlaza con vag_activos.nombre (por prefijo)
  fecha date not null,
  tipo text,                      -- TIPO MOVIMIENTO (Gasto…)
  subpartida text,
  concepto text,
  tercero text,
  valor numeric not null default 0,
  observaciones text,
  synced_at timestamptz not null
);

create index vag_movimientos_fecha_idx on vag_movimientos (fecha);

alter table vag_activos enable row level security;
create policy "auth read vag_activos" on vag_activos
  for select to authenticated using (true);

alter table vag_movimientos enable row level security;
create policy "auth read vag_movimientos" on vag_movimientos
  for select to authenticated using (true);

-- ── RPCs ─────────────────────────────────────────────────────────────

-- Activos con sus movimientos: un movimiento pertenece a un activo cuando
-- su centro de costo coincide con el nombre por prefijo (case-insensitive):
-- "Lote la Plata" ↔ "Lote La Plata #1..#5". Los centros generales
-- (Administrativos/Financieros) no matchean ningún activo y viven solo en
-- la vista Movimientos.
create or replace function get_vag_activos()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select coalesce(jsonb_agg(jsonb_build_object(
  'id', a.codigo,
  'nombre', a.nombre,
  'tipo', coalesce(a.tipo, 'Activo'),
  'fecha_adquisicion', a.fecha_adquisicion,
  'valor_adquisicion', a.valor_adquisicion,
  'valor_estimado', nullif(a.valor_estimado, 0),
  'valor_contable', a.valor_contable,
  'avaluo_catastral', nullif(a.avaluo_catastral, 0),
  'valor_predial', nullif(a.valor_predial, 0),
  'valor_seguro', nullif(a.valor_seguro, 0),
  'vigencia', a.vigencia,
  'aseguradora', a.aseguradora,
  'ciudad', a.ciudad,
  'direccion', a.direccion,
  'matricula', a.numero_matricula,
  'ficha_catastral', a.ficha_catastral,
  'movimientos', coalesce(m.movs, '[]'::jsonb)
) order by lpad(a.codigo, 6, '0')), '[]'::jsonb)
from vag_activos a
left join lateral (
  select jsonb_agg(sub.m order by sub.m_fecha desc, sub.m_id desc) as movs
  from (
    select
      v.id as m_id,
      v.fecha as m_fecha,
      jsonb_build_object(
        'id', v.id,
        'fecha', v.fecha,
        'nombre', coalesce(v.concepto, v.tipo, 'Movimiento'),
        'valor', v.valor
      ) as m
    from vag_movimientos v
    where v.centro_costo is not null
      and (a.nombre ilike v.centro_costo || '%'
        or v.centro_costo ilike a.nombre || '%')
    order by v.fecha desc, v.id desc
    limit 20
  ) sub
) m on true;
$$;

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
from vag_movimientos v;
$$;

-- Resumen del hub: activos = valor contable total (sin histórico → delta
-- 0); movimientos = total del último mes con datos + delta vs anterior.
-- Cuentas por cobrar/pagar no tienen fuente aún: las llena la app (mock).
create or replace function get_vag_resumen()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with mov_mes as (
  select date_trunc('month', max(fecha))::date as m from vag_movimientos
),
movs as (
  select
    coalesce(sum(v.valor) filter (where v.fecha >= mm.m), 0) as cur,
    coalesce(sum(v.valor) filter (
      where v.fecha >= (mm.m - interval '1 month')::date and v.fecha < mm.m
    ), 0) as prev
  from vag_movimientos v
  cross join mov_mes mm
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
  )
)
from movs m;
$$;

-- Card de VAG en la lista "Otras compañías": total de movimientos del
-- último mes con datos + delta % vs el anterior (la fuente curada solo
-- trae gastos, no ingresos). null si aún no hay sync.
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
  from vag_movimientos;
  if v_last is null then
    return null;
  end if;

  select coalesce(sum(valor), 0) into v_cur
  from vag_movimientos
  where fecha >= v_last and fecha < (v_last + interval '1 month')::date;

  select coalesce(sum(valor), 0) into v_prev
  from vag_movimientos
  where fecha >= (v_last - interval '1 month')::date and fecha < v_last;

  return jsonb_build_object(
    'year', extract(year from v_last)::int,
    'month', extract(month from v_last)::int,
    'total', v_cur,
    'delta_pct', case when v_prev = 0 then 0
                      else round(((v_cur - v_prev) / abs(v_prev)) * 100, 2) end
  );
end;
$$;

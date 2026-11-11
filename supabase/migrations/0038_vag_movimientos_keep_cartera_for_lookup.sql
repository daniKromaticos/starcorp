-- Fix de la 0037: get_vag_movimientos excluía las filas de Cuentas por
-- Cobrar/Pagar para no inflar el total de gastos del mes — pero esas
-- mismas filas son las que la flecha "ver movimiento" de una cuenta (VAG →
-- Cuentas por cobrar/pagar → expandir → tocar un movimiento) busca por id
-- en la vista Movimientos (`focus=<id>`, ver app/(tabs)/empresas/vag/
-- movimientos.tsx). Al excluirlas del RPC, ese lookup no encontraba nada.
--
-- Se revierte get_vag_movimientos a devolver TODO (igual que antes de
-- 0037); el filtrado para que la cartera no aparezca mezclada en el
-- listado mensual normal se hace en el cliente (movimientos.tsx), que sí
-- puede distinguir modo foco de modo listado. get_vag_resumen y
-- get_vag_empresa_summary NO cambian: son sumatorias agregadas, no
-- lookups por id, y ahí sí corresponde excluir la cartera.

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

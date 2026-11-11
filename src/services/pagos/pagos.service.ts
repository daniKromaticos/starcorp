/**
 * Pagos service — lee la tabla `pagos_bitacora` (snapshot de la tabla PBI
 * BITACORA, sincronizada por la edge function pbi-sync-pagos) y la transforma
 * en el `PagosSnapshot` que consume el Informe Pagos.
 *
 * Reemplaza al antiguo mock. Trae todas las filas paginando (la tabla ronda
 * las 10k filas, por encima del límite por request de PostgREST).
 */

import { supabase } from '@/src/config/supabase';
import { CHART_COLORS } from '@/src/theme/chart-palette';
import { OTROS_SEGMENT_COLOR } from '@/src/theme/gradients';
import type {
  CentroCostos,
  Empleado,
  EmpresaGeneradora,
  MontoBucket,
  Pago,
  PagosSnapshot,
} from '@/src/types/pagos.types';

interface PagoRow {
  id: number;
  fecha: string;
  empresa_generadora: string | null;
  banco: string | null;
  cuenta: string | null;
  centro_costos: string | null;
  empleado_hotel: string | null;
  concepto: string | null;
  total: number | string | null;
  tipo_pago: string | null;
  synced_at: string;
}

const PAGE = 1000;
/** Etiqueta para filas sin empresa/centro/empleado asignado. */
const UNASSIGNED = '—';

const COLUMNS =
  'id,fecha,empresa_generadora,banco,cuenta,centro_costos,empleado_hotel,concepto,total,tipo_pago,synced_at';

async function fetchAllRows(): Promise<PagoRow[]> {
  const out: PagoRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('pagos_bitacora')
      .select(COLUMNS)
      .order('fecha', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data ?? []) as PagoRow[];
    out.push(...batch);
    if (batch.length < PAGE) break;
  }
  return out;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Bucket por día (bajo/medio/alto) por percentiles 33/66 sobre los totales
 * diarios — misma lógica que usaba el mock, para colores estables del heatmap.
 */
function buildDayBuckets(pagos: Pago[]): Record<string, MontoBucket> {
  const totals = new Map<string, number>();
  for (const p of pagos) {
    totals.set(p.fecha, (totals.get(p.fecha) ?? 0) + p.monto);
  }
  const sorted = [...totals.values()].sort((a, b) => a - b);
  if (sorted.length === 0) return {};
  const p33 = sorted[Math.floor(sorted.length * 0.33)];
  const p66 = sorted[Math.floor(sorted.length * 0.66)];
  const out: Record<string, MontoBucket> = {};
  totals.forEach((total, fecha) => {
    out[fecha] = total <= p33 ? 'bajo' : total <= p66 ? 'medio' : 'alto';
  });
  return out;
}

export async function getPagosSnapshot(): Promise<PagosSnapshot> {
  const rows = await fetchAllRows();

  // Los nombres de BITACORA hacen de id (no hay ids propios); la UI compara
  // por id y los mapea de vuelta al nombre, así que id === name funciona.
  const pagos: Pago[] = rows.map((r) => ({
    id: String(r.id),
    empresaId: r.empresa_generadora ?? UNASSIGNED,
    centroCostosId: r.centro_costos ?? UNASSIGNED,
    empleadoId: r.empleado_hotel ?? UNASSIGNED,
    concepto: r.concepto ?? '',
    fecha: r.fecha,
    monto: Number(r.total) || 0,
    banco: r.banco,
    cuenta: r.cuenta,
    tipoPago: r.tipo_pago,
  }));

  // Empresas ordenadas por total desc; color por índice de la paleta canónica.
  const empresaTotals = new Map<string, number>();
  for (const p of pagos) {
    empresaTotals.set(p.empresaId, (empresaTotals.get(p.empresaId) ?? 0) + p.monto);
  }
  const empresas: EmpresaGeneradora[] = [...empresaTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name], i) => ({
      id: name,
      name,
      color:
        name === UNASSIGNED
          ? OTROS_SEGMENT_COLOR
          : CHART_COLORS[i % CHART_COLORS.length],
    }));

  const centrosCostos: CentroCostos[] = uniqueSorted(
    pagos.map((p) => p.centroCostosId),
  ).map((name) => ({ id: name, name }));

  const empleados: Empleado[] = uniqueSorted(
    pagos.map((p) => p.empleadoId),
  ).map((name) => ({ id: name, name }));

  const dayBuckets = buildDayBuckets(pagos);

  const updatedAt = rows.length
    ? rows[rows.length - 1].synced_at
    : new Date().toISOString();
  const maxFecha = pagos.reduce((m, p) => (p.fecha > m ? p.fecha : m), '');

  return {
    pagos,
    empresas,
    centrosCostos,
    empleados,
    dayBuckets,
    updatedAt,
    todayIso: maxFecha || new Date().toISOString().slice(0, 10),
  };
}

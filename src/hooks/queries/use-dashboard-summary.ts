import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/config/supabase';
import { queryKeys } from './query-keys';

export type DashboardSummaryPeriod = 'mtd' | '1w' | '1m' | '3m' | '12m';

interface DashboardSummaryRow {
  period_start: string;
  period_end: string;
  prev_start: string;
  prev_end: string;
  ingresos: number | string;
  costos: number | string;
  gastos: number | string;
  ingresos_prev: number | string;
  costos_prev: number | string;
  gastos_prev: number | string;
  utilidad: number | string;
  utilidad_prev: number | string;
}

export interface DashboardSummary {
  periodStart: string;
  periodEnd: string;
  prevStart: string;
  prevEnd: string;
  ingresos: number;
  costos: number;
  gastos: number;
  utilidad: number;
  ingresosPrev: number;
  costosPrev: number;
  gastosPrev: number;
  utilidadPrev: number;
  ingresosDeltaPercent: number;
  costosDeltaPercent: number;
  gastosDeltaPercent: number;
  utilidadDeltaPercent: number;
}

function pctDelta(curr: number, prev: number): number {
  if (!prev) return 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function useDashboardSummary(
  period: DashboardSummaryPeriod,
  options: { compare?: boolean; centroCosto?: string | null } = {},
) {
  const compare = options.compare ?? true;
  const centroCosto = options.centroCosto ?? null;

  return useQuery<DashboardSummary>({
    queryKey: queryKeys.dashboardSummary(period, centroCosto, compare),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_summary', {
        p_period: period,
        p_centro_costo: centroCosto,
        p_compare: compare,
      });
      if (error) throw error;

      const row = (Array.isArray(data) ? data[0] : data) as
        | DashboardSummaryRow
        | undefined;
      if (!row) throw new Error('Dashboard summary returned no rows');

      const ingresos = Number(row.ingresos);
      const costos = Number(row.costos);
      const gastos = Number(row.gastos);
      const ingresosPrev = Number(row.ingresos_prev);
      const costosPrev = Number(row.costos_prev);
      const gastosPrev = Number(row.gastos_prev);
      // La utilidad NO se deriva de los tres totales: el informe de Power BI la
      // saca de la medida [UTILIDAD], que suma `saldo_final` con signo, mientras
      // que ingresos/costos/gastos vienen de `saldo_final_ajustado` (= ABS). Por
      // eso el RPC la devuelve calculada aparte y aquí sólo se lee. Ver la
      // migración 0042_utilidad_con_signo.sql.
      const utilidad = Number(row.utilidad);
      const utilidadPrev = Number(row.utilidad_prev);

      return {
        periodStart: row.period_start,
        periodEnd: row.period_end,
        prevStart: row.prev_start,
        prevEnd: row.prev_end,
        ingresos,
        costos,
        gastos,
        utilidad,
        ingresosPrev,
        costosPrev,
        gastosPrev,
        utilidadPrev,
        ingresosDeltaPercent: compare ? pctDelta(ingresos, ingresosPrev) : 0,
        costosDeltaPercent: compare ? pctDelta(costos, costosPrev) : 0,
        gastosDeltaPercent: compare ? pctDelta(gastos, gastosPrev) : 0,
        utilidadDeltaPercent: compare ? pctDelta(utilidad, utilidadPrev) : 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/config/supabase';
import { queryKeys } from './query-keys';
import type { DashboardSummaryPeriod } from './use-dashboard-summary';

interface TimeseriesRow {
  bucket_idx: number;
  bucket_start: string;
  bucket_end: string;
  ingresos: number | string;
  costos: number | string;
  gastos: number | string;
  utilidad: number | string;
  ingresos_prev: number | string;
  costos_prev: number | string;
  gastos_prev: number | string;
  utilidad_prev: number | string;
}

export interface TimeseriesBucket {
  idx: number;
  start: string;
  end: string;
  ingresos: number;
  costos: number;
  gastos: number;
  utilidad: number;
  ingresosPrev: number;
  costosPrev: number;
  gastosPrev: number;
  utilidadPrev: number;
}

export function useDashboardTimeseries(
  period: DashboardSummaryPeriod,
  options: { compare?: boolean; centroCosto?: string | null } = {},
) {
  const compare = options.compare ?? true;
  const centroCosto = options.centroCosto ?? null;

  return useQuery<TimeseriesBucket[]>({
    queryKey: queryKeys.dashboardTimeseries(period, centroCosto, compare),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_consolidated_timeseries', {
        p_period: period,
        p_centro_costo: centroCosto,
        p_compare: compare,
      });
      if (error) throw error;
      const rows = (data ?? []) as TimeseriesRow[];
      return rows.map((r) => ({
        idx: r.bucket_idx,
        start: r.bucket_start,
        end: r.bucket_end,
        ingresos: Number(r.ingresos),
        costos: Number(r.costos),
        gastos: Number(r.gastos),
        utilidad: Number(r.utilidad),
        ingresosPrev: Number(r.ingresos_prev),
        costosPrev: Number(r.costos_prev),
        gastosPrev: Number(r.gastos_prev),
        utilidadPrev: Number(r.utilidad_prev),
      }));
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

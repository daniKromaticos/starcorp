/**
 * useTopClients — top N clientes by ingresos in the active period, with
 * previous-period delta. Backed by the get_top_clients RPC.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/config/supabase';
import { queryKeys } from './query-keys';
import { useFiltersStore } from '@/src/stores/filters.store';
import { tokens } from '@/src/theme/tokens';
import type { NormalizedClient, PeriodKey } from '@/src/types/domain.types';
import type { DashboardSummaryPeriod } from './use-dashboard-summary';

const RPC_PERIOD: Record<PeriodKey, DashboardSummaryPeriod> = {
  today: 'mtd',
  '1w': '1w',
  '1m': '1m',
  '3m': '3m',
  '12m': '12m',
};

interface TopClientRow {
  rank: number;
  centro_costo: string;
  revenue: number | string;
  revenue_prev: number | string;
  delta_percent: number | string;
}

interface TopClientsData {
  clients: NormalizedClient[];
  total: number;
  chartData: { value: number; color: string; label: string }[];
}

export function useTopClients(limit = 8) {
  const periodKey = useFiltersStore((s) => s.activePeriodKey);
  const period = RPC_PERIOD[periodKey];

  return useQuery<NormalizedClient[], Error, TopClientsData>({
    queryKey: queryKeys.topClients(periodKey, limit),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_clients', {
        p_period: period,
        p_limit: limit,
        p_compare: true,
      });
      if (error) throw error;
      // Un centro con asientos en el periodo pero que suman 0 no es un
      // cliente con ingreso: se descarta para que no ocupe un puesto del top.
      const rows = ((data ?? []) as TopClientRow[]).filter(
        (r) => Number(r.revenue) > 0,
      );
      const palette = tokens.color.chart;
      return rows.map((r, i) => ({
        id: r.centro_costo,
        name: r.centro_costo,
        revenue: Number(r.revenue),
        deltaPercent: Number(r.delta_percent),
        color: palette[i % palette.length],
        source: 'powerbi' as const,
      }));
    },
    select: (data) => ({
      clients: data,
      total: data.reduce((sum, c) => sum + c.revenue, 0),
      chartData: data.map((c) => ({
        value: c.revenue,
        color: c.color,
        label: c.name,
      })),
    }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

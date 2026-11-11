/**
 * useCostGroups — level-4 cuenta groups for a single client+category+period,
 * with previous-period delta. Backed by get_client_cost_groups RPC.
 *
 * Used by /costos/[clientId] and /gastos/[clientId] to render the bar chart
 * + group list view ("Costos administrativos").
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/config/supabase';
import { queryKeys } from './query-keys';
import { useFiltersStore } from '@/src/stores/filters.store';
import { tokens } from '@/src/theme/tokens';
import type {
  ConsolidadoCategoryId,
  CostGroup,
  PeriodKey,
} from '@/src/types/domain.types';
import type { DashboardSummaryPeriod } from './use-dashboard-summary';

const RPC_PERIOD: Record<PeriodKey, DashboardSummaryPeriod> = {
  today: 'mtd',
  '1w': '1w',
  '1m': '1m',
  '3m': '3m',
  '12m': '12m',
};

interface RpcRow {
  group_code: string;
  label: string;
  amount: number | string;
  amount_prev: number | string;
  delta_percent: number | string;
}

export function useCostGroups(
  categoryId: ConsolidadoCategoryId,
  clientId: string,
) {
  const periodKey = useFiltersStore((s) => s.activePeriodKey);
  const period = RPC_PERIOD[periodKey];
  const centroCosto = decodeURIComponent(clientId ?? '');
  // 'egresos' isn't a top-level PUC class; treat as costos for now.
  const cat = categoryId === 'egresos' ? 'costos' : categoryId;

  return useQuery<CostGroup[]>({
    queryKey: queryKeys.costGroups(periodKey, categoryId, clientId),
    queryFn: async () => {
      if (!centroCosto || (cat !== 'costos' && cat !== 'gastos')) return [];
      const { data, error } = await supabase.rpc('get_client_cost_groups', {
        p_centro_costo: centroCosto,
        p_category: cat,
        p_period: period,
        p_compare: true,
      });
      if (error) throw error;
      const rows = (data ?? []) as RpcRow[];
      const palette = tokens.color.chart;
      return rows.map((r, i) => ({
        id: r.group_code,
        label: r.label,
        icon: 'category',
        color: palette[i % palette.length],
        amount: Number(r.amount),
        deltaPercent: Number(r.delta_percent),
      }));
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

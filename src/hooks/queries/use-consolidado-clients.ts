/**
 * useConsolidadoClients — lists all centros (clientes) by category amount
 * in the active period, with previous-period delta. Backed by the
 * get_consolidated_clients RPC.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/config/supabase';
import { queryKeys } from './query-keys';
import { useFiltersStore } from '@/src/stores/filters.store';
import { tokens } from '@/src/theme/tokens';
import type {
  ConsolidadoCategoryId,
  ConsolidadoClient,
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

interface ClientRow {
  client_id: string;
  name: string;
  amount: number | string;
  amount_prev: number | string;
  delta_percent: number | string;
}

// 'egresos' isn't a top-level account class in PUC — fall back to costos.
function rpcCategory(c: ConsolidadoCategoryId): string {
  return c === 'egresos' ? 'costos' : c;
}

export function useConsolidadoClients(categoryId: ConsolidadoCategoryId) {
  const periodKey = useFiltersStore((s) => s.activePeriodKey);
  const period = RPC_PERIOD[periodKey];

  return useQuery<ConsolidadoClient[]>({
    queryKey: queryKeys.consolidadoClients(periodKey, categoryId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_consolidated_clients', {
        p_category: rpcCategory(categoryId),
        p_period: period,
        p_compare: true,
      });
      if (error) throw error;
      // El RPC ya descarta los montos exactamente en 0, pero quedan centros
      // con centavos sueltos (asientos "AJUSTE AL PESO" de $0,01–$0,08 en
      // centros sin nombre) que en pantalla se leen como $0 y no son
      // clientes: se ocultan los que redondean a 0.
      const rows = ((data ?? []) as ClientRow[]).filter(
        (r) => Math.round(Number(r.amount)) !== 0,
      );
      const palette = tokens.color.chart;
      return rows.map((r, i) => ({
        id: r.client_id,
        name: r.name,
        amount: Number(r.amount),
        deltaPercent: Number(r.delta_percent),
        color: palette[i % palette.length],
      }));
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

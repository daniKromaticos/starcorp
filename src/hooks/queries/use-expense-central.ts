/**
 * useExpenseCentral — total gastos consolidados (suma de cuenta nivel-5
 * de todos los clientes) en el periodo activo, con delta vs periodo anterior.
 * Backed by useDashboardSummary (no centro_costo filter = consolidated total).
 */

import { useFiltersStore } from '@/src/stores/filters.store';
import {
  useDashboardSummary,
  type DashboardSummaryPeriod,
} from './use-dashboard-summary';
import type { ExpenseCentral, PeriodKey } from '@/src/types/domain.types';

const RPC_PERIOD: Record<PeriodKey, DashboardSummaryPeriod> = {
  today: 'mtd',
  '1w': '1w',
  '1m': '1m',
  '3m': '3m',
  '12m': '12m',
};

export function useExpenseCentral() {
  const periodKey = useFiltersStore((s) => s.activePeriodKey);
  const period = RPC_PERIOD[periodKey];
  const summary = useDashboardSummary(period, { compare: true });

  const data: ExpenseCentral | undefined = summary.data
    ? {
        total: summary.data.gastos,
        deltaPercent: summary.data.gastosDeltaPercent,
      }
    : undefined;

  return {
    data,
    isLoading: summary.isPending,
    isPending: summary.isPending,
    isError: summary.isError,
    error: summary.error,
  };
}

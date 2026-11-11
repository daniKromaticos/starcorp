import { useQueries } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { useCompanies } from './use-companies';
import { useFiltersStore } from '@/src/stores/filters.store';
import {
  qbQuery,
  QBNotConnectedError,
  QBReauthRequiredError,
} from '@/src/services/quickbooks/client';
import { normalizeMetricsFromPnL } from '@/src/services/quickbooks/normalizer';
import { computePreviousPeriod } from '@/src/utils/date';
import { calculateDelta } from '@/src/utils/percentage';
import type { QBProfitAndLossRaw } from '@/src/types/api.types';
import type { PeriodRange } from '@/src/types/domain.types';
import type { CompanySummary } from '@/src/components/organisms/or-financiero-section';

const REALM_ID_PATTERN = /^\d{6,}$/;

function buildIngresosQuery(c: { id: string }, period: PeriodRange, tag: 'current' | 'previous') {
  return {
    queryKey: [
      ...queryKeys.companyMetrics(period.key, c.id),
      'summary',
      tag,
      period.start,
      period.end,
    ] as const,
    queryFn: async () => {
      try {
        const pnl = await qbQuery<QBProfitAndLossRaw>(
          'reports/ProfitAndLoss',
          { start_date: period.start, end_date: period.end },
          c.id,
        );
        return normalizeMetricsFromPnL(pnl);
      } catch (e) {
        if (
          e instanceof QBNotConnectedError ||
          e instanceof QBReauthRequiredError
        ) return null;
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000,
  };
}

/**
 * Fetches per-company P&L for every connected QuickBooks company in parallel
 * (current period + same-length previous window) and returns CompanySummary[]
 * with deltaPercent derived from the two periods' Ingresos totals.
 */
export function useCompanySummaries() {
  const { data: companies = [] } = useCompanies();
  const period = useFiltersStore((s) => s.activePeriod);
  const previous = computePreviousPeriod(period);

  const realmCompanies = companies.filter((c) => REALM_ID_PATTERN.test(c.id));

  const currentQueries = useQueries({
    queries: realmCompanies.map((c) => buildIngresosQuery(c, period, 'current')),
  });
  const previousQueries = useQueries({
    queries: realmCompanies.map((c) => buildIngresosQuery(c, previous, 'previous')),
  });

  const summaries: CompanySummary[] = realmCompanies.map((c, i) => {
    const cur = currentQueries[i]?.data;
    const prev = previousQueries[i]?.data;
    const currentValue = cur?.ingresos.value ?? 0;
    const previousValue = prev?.ingresos.value;
    return {
      id: c.id,
      name: c.name,
      totalLabel: 'Ingresos totales',
      totalValue: currentValue,
      deltaPercent: calculateDelta(currentValue, previousValue),
    };
  });

  return {
    summaries,
    isLoading:
      currentQueries.some((q) => q.isLoading) ||
      previousQueries.some((q) => q.isLoading),
    isError:
      currentQueries.some((q) => q.isError) ||
      previousQueries.some((q) => q.isError),
  };
}

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { useFiltersStore } from '@/src/stores/filters.store';
import {
  qbQuery,
  QBNotConnectedError,
  QBReauthRequiredError,
} from '@/src/services/quickbooks/client';
import { normalizeMetricsFromPnL } from '@/src/services/quickbooks/normalizer';
import type { QBProfitAndLossRaw } from '@/src/types/api.types';
import type { CompanyMetrics } from '@/src/types/domain.types';

const REALM_ID_PATTERN = /^\d{6,}$/;

function isRealmId(id: string): boolean {
  return REALM_ID_PATTERN.test(id);
}

export function useCompanyMetrics(companyId: string | undefined) {
  const period = useFiltersStore((s) => s.activePeriod);

  return useQuery<CompanyMetrics | undefined>({
    queryKey: queryKeys.companyMetrics(period.key, companyId ?? ''),
    queryFn: async () => {
      // Las empresas provienen de QuickBooks (useCompanies → realmId), así que
      // companyId siempre es un realmId. Un id no-realm no tiene métricas.
      if (!companyId || !isRealmId(companyId)) return undefined;

      try {
        const pnl = await qbQuery<QBProfitAndLossRaw>(
          'reports/ProfitAndLoss',
          { start_date: period.start, end_date: period.end },
          companyId,
        );
        return normalizeMetricsFromPnL(pnl);
      } catch (e) {
        if (
          e instanceof QBNotConnectedError ||
          e instanceof QBReauthRequiredError
        ) return undefined;
        throw e;
      }
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

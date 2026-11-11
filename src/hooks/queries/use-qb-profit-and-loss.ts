import { useQuery } from '@tanstack/react-query';
import {
  qbQuery,
  QBNotConnectedError,
  QBReauthRequiredError,
} from '@/src/services/quickbooks/client';
import { useQBStore } from '@/src/stores/qb.store';
import type { QBProfitAndLossRaw } from '@/src/types/api.types';
import { queryKeys } from './query-keys';

export function useQBProfitAndLoss(params: {
  start_date: string;
  end_date: string;
}) {
  const realmId = useQBStore((s) => s.activeRealmId);

  return useQuery({
    queryKey: [
      ...queryKeys.qbProfitAndLoss(params.start_date, params.end_date),
      realmId ?? 'default',
    ],
    queryFn: async () => {
      try {
        return await qbQuery<QBProfitAndLossRaw>(
          'reports/ProfitAndLoss',
          params,
          realmId ?? undefined,
        );
      } catch (e) {
        if (
          e instanceof QBNotConnectedError ||
          e instanceof QBReauthRequiredError
        ) return null;
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

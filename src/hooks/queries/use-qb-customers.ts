import { useQuery } from '@tanstack/react-query';
import {
  qbQuery,
  QBNotConnectedError,
  QBReauthRequiredError,
} from '@/src/services/quickbooks/client';
import { useQBStore } from '@/src/stores/qb.store';
import type { QBCustomersRaw } from '@/src/types/api.types';
import { queryKeys } from './query-keys';

export function useQBCustomers() {
  const realmId = useQBStore((s) => s.activeRealmId);

  return useQuery({
    queryKey: [...queryKeys.qbCustomers(), realmId ?? 'default'],
    queryFn: async () => {
      try {
        return await qbQuery<QBCustomersRaw>(
          'query',
          { query: 'select * from Customer maxresults 50' },
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

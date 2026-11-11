import { useQuery } from '@tanstack/react-query';
import {
  qbQuery,
  QBNotConnectedError,
  QBReauthRequiredError,
} from '@/src/services/quickbooks/client';
import { useQBStore } from '@/src/stores/qb.store';
import { queryKeys } from './query-keys';

interface QBCompanyInfoRaw {
  CompanyInfo: {
    CompanyName: string;
    LegalName?: string;
    Country?: string;
    Email?: { Address?: string };
    FiscalYearStartMonth?: string;
  };
}

export function useQBCompanyInfo() {
  const realmId = useQBStore((s) => s.activeRealmId);

  return useQuery({
    queryKey: [...queryKeys.qbCompanyInfo(), realmId ?? 'default'],
    queryFn: async () => {
      try {
        return await qbQuery<QBCompanyInfoRaw>(
          'companyinfo/0',
          undefined,
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

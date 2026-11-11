import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { useCompanies } from './use-companies';
import type { Company } from '@/src/types/domain.types';

export function useCompany(companyId: string | undefined) {
  const { data: companies } = useCompanies();
  return useQuery<Company | undefined>({
    queryKey: queryKeys.company(companyId ?? ''),
    queryFn: async () => companies?.find((c) => c.id === companyId),
    enabled: !!companyId && !!companies,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

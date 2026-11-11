import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import {
  qbStatus,
  type QBStatus,
} from '@/src/services/quickbooks/client';
import type { Company } from '@/src/types/domain.types';

const QB_STATUS_QUERY = {
  queryKey: queryKeys.qbStatus(),
  queryFn: qbStatus,
  staleTime: 5 * 60 * 1000,
} as const;

export function useQbStatus() {
  return useQuery<QBStatus>(QB_STATUS_QUERY);
}

export function useCompanies() {
  return useQuery<QBStatus, Error, Company[]>({
    ...QB_STATUS_QUERY,
    select: (status) =>
      status.companies.map((c) => ({
        id: c.realmId,
        name: c.name ?? `Empresa ${c.realmId.slice(-4)}`,
      })),
    placeholderData: (prev) => prev,
  });
}

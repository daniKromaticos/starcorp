/**
 * usePagos — Snapshot del Informe Pagos.
 */

import { useQuery } from '@tanstack/react-query';
import { getPagosSnapshot } from '@/src/services/pagos/pagos.service';
import type { PagosSnapshot } from '@/src/types/pagos.types';
import { queryKeys } from './query-keys';

export function usePagos() {
  return useQuery<PagosSnapshot>({
    queryKey: queryKeys.pagosSnapshot(),
    queryFn: getPagosSnapshot,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

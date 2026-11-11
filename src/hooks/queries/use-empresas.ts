/**
 * Hook: lista de "Otras compañías".
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/hooks/queries/query-keys';
import { getEmpresas } from '@/src/services/empresas/empresas.service';
import type { EmpresaListItem } from '@/src/types/empresas.types';

export function useEmpresas() {
  return useQuery<EmpresaListItem[]>({
    queryKey: queryKeys.otrasEmpresas(),
    queryFn: getEmpresas,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

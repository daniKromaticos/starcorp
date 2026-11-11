/**
 * Hook: detalle de una "Otra compañía" (Ingresos/Gastos).
 * Los filtros de período entran en la query key para que cambiar
 * año/mes refetchee (BBM es real; el resto ignora los filtros).
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/hooks/queries/query-keys';
import { getEmpresaDetail } from '@/src/services/empresas/empresas.service';
import type { EmpresaDetail, EmpresaFilters } from '@/src/types/empresas.types';

export function useEmpresaDetail(id: string, filters?: EmpresaFilters) {
  const period = filters ? `${filters.year}-${filters.month}` : 'default';
  return useQuery<EmpresaDetail | null>({
    queryKey: queryKeys.otrasEmpresaDetail(id, period),
    queryFn: () => getEmpresaDetail(id, filters),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

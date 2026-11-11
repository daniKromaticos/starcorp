/**
 * useAsociados — Snapshot del Informe Asociados activos.
 */

import { useQuery } from '@tanstack/react-query';
import { getAsociadosSnapshot } from '@/src/services/asociados/asociados.service';
import type { AsociadosSnapshot } from '@/src/types/asociados.types';
import { queryKeys } from './query-keys';

export function useAsociados() {
  return useQuery<AsociadosSnapshot>({
    queryKey: queryKeys.asociadosSnapshot(),
    queryFn: getAsociadosSnapshot,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

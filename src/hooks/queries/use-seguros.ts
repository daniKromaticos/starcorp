/**
 * useSeguros — Snapshot del Informe Seguros.
 *
 * El service intercala mock vs Notion vía EXPO_PUBLIC_USE_MOCKS.
 * Cuando se conecte el flujo real, los 3 tableros se piden en
 * paralelo desde la edge function `notion-query`.
 */

import { useQuery } from '@tanstack/react-query';
import { getSegurosSnapshot } from '@/src/services/seguros/seguros.service';
import type { SegurosSnapshot } from '@/src/types/seguros.types';
import { queryKeys } from './query-keys';

export function useSeguros() {
  return useQuery<SegurosSnapshot>({
    queryKey: queryKeys.segurosSnapshot(),
    queryFn: getSegurosSnapshot,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

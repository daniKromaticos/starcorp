/**
 * useCartera — Snapshot de Cartera (AR aging).
 *
 * El service intercala mock vs QuickBooks vía EXPO_PUBLIC_USE_MOCKS.
 * Real path: agrega facturas con balance > 0 de todos los Realms.
 */

import { useQuery } from '@tanstack/react-query';
import { getCarteraSnapshot } from '@/src/services/cartera/cartera.service';
import type { CarteraSnapshot } from '@/src/types/cartera.types';
import { queryKeys } from './query-keys';

interface UseCarteraOptions {
  /**
   * Permite diferir la carga en pantallas donde la cartera es secundaria
   * (p. ej. el single de cliente, que solo la necesita al seleccionar la
   * métrica). El informe la deja en true.
   */
  enabled?: boolean;
}

export function useCartera(options: UseCarteraOptions = {}) {
  return useQuery<CarteraSnapshot>({
    queryKey: queryKeys.carteraSnapshot(),
    queryFn: getCarteraSnapshot,
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

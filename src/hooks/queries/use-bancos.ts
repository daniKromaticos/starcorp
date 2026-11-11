/**
 * useBancos — Snapshot del Informe Bancos.
 *
 * El service intercala mock vs QuickBooks vía EXPO_PUBLIC_USE_MOCKS.
 * Real path: agrega saldos de cuentas tipo Bank de todos los Realms
 * conectados.
 */

import { useQuery } from '@tanstack/react-query';
import { getBancosSnapshot } from '@/src/services/bancos/bancos.service';
import type { BancosSnapshot } from '@/src/types/bancos.types';
import { queryKeys } from './query-keys';

export function useBancos() {
  return useQuery<BancosSnapshot>({
    queryKey: queryKeys.bancosSnapshot(),
    queryFn: getBancosSnapshot,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

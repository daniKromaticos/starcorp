/**
 * useAsociadosTrend — Serie de tendencia de asociados por cliente.
 * Fuente: RPC get_asociados_trend (PBI HistoricoEmpXCli → historico_emp_cli).
 */

import { useQuery } from '@tanstack/react-query';
import { getAsociadosTrend } from '@/src/services/asociados/asociados.service';
import type { AsociadosTrend } from '@/src/types/asociados.types';
import { queryKeys } from './query-keys';

export function useAsociadosTrend() {
  return useQuery<AsociadosTrend>({
    queryKey: queryKeys.asociadosTrend(),
    queryFn: getAsociadosTrend,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

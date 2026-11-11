/**
 * useNexiataskTarea
 *
 * Detalle de una tarea + avances históricos. El histórico viene de
 * `GET /api/integration/historial?tarea_id=<id>` (vía nexiatask-proxy);
 * con EXPO_PUBLIC_USE_MOCKS=true sale del mock.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { fetchTareaDetalle } from '@/src/services/nexiatask.service';

export function useNexiataskTarea(tareaId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.nexiataskTarea(tareaId ?? ''),
    queryFn: () => fetchTareaDetalle(tareaId!),
    enabled: !!tareaId,
    staleTime: 5 * 60 * 1000,
  });
}

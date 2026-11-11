/**
 * useNexiataskResponsibilities
 *
 * Árbol agrupado departamento → proyecto → tareas para la pantalla
 * "Lista de responsabilidades".
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { fetchResponsibilities } from '@/src/services/nexiatask.service';

export function useNexiataskResponsibilities() {
  return useQuery({
    queryKey: queryKeys.nexiataskResponsibilities(),
    queryFn: fetchResponsibilities,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

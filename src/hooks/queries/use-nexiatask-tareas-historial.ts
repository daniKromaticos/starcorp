/**
 * useNexiataskTareasHistorial
 *
 * Árbol departamento → tareas (cada una con su historial de avances)
 * para la lista de reportes. La lista muestra un drawer por tarea y sus
 * avances como subtareas. Combina `/avance` + `/historial` en el service.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { fetchTareasConHistorial } from '@/src/services/nexiatask.service';

export function useNexiataskTareasHistorial() {
  return useQuery({
    queryKey: queryKeys.nexiataskHistorial(),
    queryFn: fetchTareasConHistorial,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

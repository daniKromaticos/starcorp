/**
 * usePresupuesto
 *
 * Informe Presupuesto (tabla PROYECCION de Power BI) para un tipo
 * (ingreso/gasto) y período (mes corriente/pasado) dados.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { fetchPresupuesto } from '@/src/services/presupuesto/presupuesto.service';
import type { PresupuestoQuery } from '@/src/types/presupuesto.types';

export function usePresupuesto(query: PresupuestoQuery) {
  return useQuery({
    queryKey: queryKeys.presupuesto(query.tipo, query.periodo),
    queryFn: () => fetchPresupuesto(query),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

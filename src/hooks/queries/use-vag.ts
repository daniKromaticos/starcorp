/**
 * Hooks: VAG (hub + Activos, Movimientos, Ctas. por cobrar/pagar) y
 * documentos adjuntos de los activos.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/hooks/queries/query-keys';
import {
  getVagActivoDocs,
  uploadVagActivoDoc,
} from '@/src/services/empresas/vag-docs.service';
import {
  getVagActivos,
  getVagCuentas,
  getVagMovimientos,
  getVagResumen,
} from '@/src/services/empresas/vag.service';
import type {
  VagActivoDoc,
  VagCuentaTipo,
  VagDocUploadInput,
} from '@/src/types/vag.types';

const STALE = 5 * 60 * 1000;

export function useVagResumen() {
  return useQuery({
    queryKey: queryKeys.vagResumen(),
    queryFn: getVagResumen,
    staleTime: STALE,
  });
}

export function useVagActivos() {
  return useQuery({
    queryKey: queryKeys.vagActivos(),
    queryFn: getVagActivos,
    staleTime: STALE,
  });
}

export function useVagMovimientos() {
  return useQuery({
    queryKey: queryKeys.vagMovimientos(),
    queryFn: getVagMovimientos,
    staleTime: STALE,
  });
}

export function useVagCuentas(tipo: VagCuentaTipo) {
  return useQuery({
    queryKey: queryKeys.vagCuentas(tipo),
    queryFn: () => getVagCuentas(tipo),
    staleTime: STALE,
  });
}

/** Documentos adjuntos de los activos, indexados por activoId. */
export function useVagActivoDocs() {
  return useQuery({
    queryKey: queryKeys.vagActivoDocs(),
    queryFn: async () => {
      const docs = await getVagActivoDocs();
      return Object.fromEntries(docs.map((d) => [d.activoId, d])) as Record<
        string,
        VagActivoDoc
      >;
    },
    staleTime: STALE,
  });
}

export function useUploadVagActivoDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VagDocUploadInput) => uploadVagActivoDoc(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vagActivoDocs() });
      // La subida también se refleja en el Repositorio Alejandro
      // (apartado "Activos VAG") → refrescar apartados y archivos.
      queryClient.invalidateQueries({ queryKey: ['repositorio'] });
    },
  });
}

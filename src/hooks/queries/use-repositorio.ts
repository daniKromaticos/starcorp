/**
 * Hooks: Repositorio Alejandro
 *
 * Queries de apartados/archivos y mutations (crear/renombrar/borrar/subir).
 * Toda mutación invalida la lista de apartados (los counts cambian) y,
 * cuando aplica, los archivos del apartado tocado.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/src/hooks/queries/query-keys';
import {
  createApartado,
  deleteApartado,
  deleteArchivo,
  getApartado,
  getApartados,
  getArchivos,
  updateApartadoNombre,
  updateArchivoNombre,
  uploadArchivo,
} from '@/src/services/empresas/repositorio.service';
import type {
  RepoApartado,
  RepoArchivo,
  RepoUploadInput,
} from '@/src/types/repositorio.types';

export function useRepoApartados() {
  return useQuery<RepoApartado[]>({
    queryKey: queryKeys.repoApartados(),
    queryFn: getApartados,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useRepoApartado(id: string | undefined) {
  return useQuery<RepoApartado | null>({
    queryKey: queryKeys.repoApartado(id ?? ''),
    queryFn: () => getApartado(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRepoArchivos(apartadoId: string | undefined) {
  return useQuery<RepoArchivo[]>({
    queryKey: queryKeys.repoArchivos(apartadoId ?? ''),
    queryFn: () => getArchivos(apartadoId!),
    enabled: !!apartadoId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

function useInvalidateRepo() {
  const queryClient = useQueryClient();
  return (apartadoId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.repoApartados() });
    if (apartadoId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.repoArchivos(apartadoId),
      });
    }
  };
}

export function useCreateApartado() {
  const invalidate = useInvalidateRepo();
  return useMutation({
    mutationFn: (nombre: string) => createApartado(nombre),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateApartado() {
  const invalidate = useInvalidateRepo();
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      updateApartadoNombre(id, nombre),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useDeleteApartado() {
  const invalidate = useInvalidateRepo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApartado(id),
    onSuccess: (_data, id) => {
      invalidate(id);
      // Borrar archivos del Repositorio también desengancha documentos de
      // activos VAG (misma storage_path) → refrescar esa vista.
      queryClient.invalidateQueries({ queryKey: queryKeys.vagActivoDocs() });
    },
  });
}

export function useUploadArchivo() {
  const invalidate = useInvalidateRepo();
  return useMutation({
    mutationFn: (input: RepoUploadInput) => uploadArchivo(input),
    onSuccess: (_data, { apartadoId }) => invalidate(apartadoId),
  });
}

export function useUpdateArchivo() {
  const invalidate = useInvalidateRepo();
  return useMutation({
    mutationFn: ({
      id,
      nombre,
    }: {
      id: string;
      nombre: string;
      apartadoId: string;
    }) => updateArchivoNombre(id, nombre),
    onSuccess: (_data, { apartadoId }) => invalidate(apartadoId),
  });
}

export function useDeleteArchivo() {
  const invalidate = useInvalidateRepo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      storagePath,
    }: {
      id: string;
      storagePath: string;
      apartadoId: string;
    }) => deleteArchivo({ id, storagePath }),
    onSuccess: (_data, { apartadoId }) => {
      invalidate(apartadoId);
      // Borrar archivos del Repositorio también desengancha documentos de
      // activos VAG (misma storage_path) → refrescar esa vista.
      queryClient.invalidateQueries({ queryKey: queryKeys.vagActivoDocs() });
    },
  });
}

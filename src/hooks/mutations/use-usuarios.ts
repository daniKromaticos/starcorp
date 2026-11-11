/**
 * Mutations de gestión de usuarios (solo super_admin).
 * Invalidan la lista tras cada cambio.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createUsuario,
  deleteUsuario,
  updateUsuarioPermissions,
} from '@/src/services/usuarios/usuarios.service';
import { queryKeys } from '@/src/hooks/queries/query-keys';
import type { CreateUserInput } from '@/src/types/usuarios.types';

export function useCreateUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUsuario(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.usuarios() }),
  });
}

export function useUpdateUsuarioPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: string[];
    }) => updateUsuarioPermissions(userId, permissions),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.usuarios() }),
  });
}

export function useDeleteUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) => deleteUsuario(userId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.usuarios() }),
  });
}

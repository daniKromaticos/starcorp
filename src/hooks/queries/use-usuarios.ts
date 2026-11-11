/**
 * useUsuarios — lista de usuarios gestionados (solo super_admin).
 * Sirve la vista Usuarios y permisos vía la edge function admin-users.
 */

import { useQuery } from '@tanstack/react-query';
import { listUsuarios } from '@/src/services/usuarios/usuarios.service';
import { useAuthStore } from '@/src/stores/auth.store';
import type { ManagedUser } from '@/src/types/usuarios.types';
import { queryKeys } from './query-keys';

export function useUsuarios() {
  const isSuperAdmin = useAuthStore((s) => s.user?.role === 'super_admin');
  return useQuery<ManagedUser[]>({
    queryKey: queryKeys.usuarios(),
    queryFn: listUsuarios,
    enabled: isSuperAdmin,
    staleTime: 60 * 1000,
  });
}

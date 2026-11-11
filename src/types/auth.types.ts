/**
 * Auth types — sesión Supabase, perfil y roles.
 *
 * El rol vive en `app_metadata.role` (solo modificable server-side; lo
 * asigna el super admin al invitar). Fallback: 'usuario'. Los datos de
 * perfil (nombre, apellido, avatar) viven en `user_metadata`.
 */

import type { Session, User } from '@supabase/supabase-js';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

export type UserRole = 'super_admin' | 'usuario';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super admin',
  usuario: 'Usuario',
};

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** "Nombre Apellido" (o el email si no hay nombre) */
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  /** Claves del catálogo (src/config/permissions.ts); super_admin ve todo. */
  permissions: string[];
}

/** super_admin ve todo; 'usuario' solo lo concedido en app_metadata. */
export function hasPermission(user: AuthUser | null, key: string): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return user.permissions.includes(key);
}

export function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  const firstName = (meta.first_name as string | undefined) ?? '';
  const lastName = (meta.last_name as string | undefined) ?? '';
  const fullName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    ((meta.full_name as string | undefined) ?? '') ||
    ((meta.name as string | undefined) ?? '');
  const rawRole =
    (user.app_metadata?.role as string | undefined) ??
    (meta.role as string | undefined);

  const rawPermissions = user.app_metadata?.permissions;

  return {
    id: user.id,
    email: user.email ?? '',
    firstName,
    lastName,
    name: fullName || (user.email ?? ''),
    avatarUrl: (meta.avatar_url as string | undefined) ?? null,
    role: rawRole === 'super_admin' ? 'super_admin' : 'usuario',
    permissions: Array.isArray(rawPermissions)
      ? rawPermissions.filter((p): p is string => typeof p === 'string')
      : [],
  };
}

export type { Session };

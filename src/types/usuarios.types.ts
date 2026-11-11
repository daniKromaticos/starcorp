/**
 * Tipos de la gestión de usuarios (vista Usuarios, solo super_admin).
 * Datos servidos por la edge function admin-users.
 */

import type { UserRole } from './auth.types';

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** "Nombre Apellido" o '' si aún no completó su perfil */
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  permissions: string[];
  /** true = invitado que aún no inicia sesión ("Esperando confirmación") */
  pending: boolean;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  permissions: string[];
}

export interface CreateUserResult {
  userId: string;
  /** Contraseña temporal autogenerada — mostrarla al super admin. */
  tempPassword: string;
  /** true si la invitación por correo salió (requiere RESEND_API_KEY). */
  emailSent: boolean;
  /** Razón del fallo de envío cuando emailSent es false. */
  emailError: string | null;
}

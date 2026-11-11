/**
 * Mutations de autenticación (TanStack Query).
 *
 * Los errores llegan como AuthError con `message` en español listo
 * para mostrar (ver src/services/auth/auth.service.ts).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  changePassword,
  getSession,
  requestPasswordResetCode,
  signInWithPassword,
  signOut,
  updatePassword,
  updateProfile,
  uploadAvatar,
  verifyPasswordResetCode,
  type ProfileUpdate,
} from '@/src/services/auth/auth.service';
import { useAuthStore } from '@/src/stores/auth.store';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signInWithPassword(email, password),
    onSuccess: (session) => setSession(session),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      setSession(null);
      queryClient.clear();
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => requestPasswordResetCode(email),
  });
}

export function useVerifyResetCode() {
  const setPasswordRecovery = useAuthStore((s) => s.setPasswordRecovery);
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      verifyPasswordResetCode(email, code),
    // Marcar recovery ANTES de que onAuthStateChange refleje la sesión,
    // para que el gate no saque al usuario del grupo (auth).
    onMutate: () => setPasswordRecovery(true),
    onError: () => setPasswordRecovery(false),
  });
}

export function useUpdatePassword() {
  const setPasswordRecovery = useAuthStore((s) => s.setPasswordRecovery);
  return useMutation({
    mutationFn: ({ password }: { password: string }) => updatePassword(password),
    // Al limpiar el flag, el gate deja pasar a la app (la sesión ya existe).
    onSuccess: () => setPasswordRecovery(false),
  });
}

export interface SaveProfileInput extends ProfileUpdate {
  /** Si vienen ambas, primero se valida/cambia la contraseña. */
  currentPassword?: string;
  newPassword?: string;
}

/** Guarda datos personales y, si aplica, el cambio de contraseña. */
export function useSaveProfile() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: SaveProfileInput) => {
      // Contraseña primero: si la actual es incorrecta no se guarda nada.
      if (input.currentPassword && input.newPassword) {
        await changePassword(input.currentPassword, input.newPassword);
      }
      await updateProfile(input);
    },
    onSuccess: async () => {
      // Refrescar el user del store con los metadatos actualizados.
      setSession(await getSession());
    },
  });
}

export function useUploadAvatar() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ uri, contentType }: { uri: string; contentType: string }) =>
      uploadAvatar(uri, contentType),
    onSuccess: async () => {
      setSession(await getSession());
    },
  });
}

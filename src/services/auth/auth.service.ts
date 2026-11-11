/**
 * Auth service — sesión Supabase con email + contraseña.
 *
 * Flujo de recuperación de contraseña por código OTP:
 *   1. requestPasswordResetCode(email) → Supabase envía el correo de
 *      recovery. La plantilla "Reset Password" del proyecto debe incluir
 *      {{ .Token }} para que llegue el código de 6 dígitos (en vez del link).
 *   2. verifyPasswordResetCode(email, code) → verifyOtp type 'recovery'.
 *      Si el código es válido, Supabase crea una sesión (el usuario queda
 *      autenticado pero en modo recovery — ver passwordRecovery en el store).
 *   3. updatePassword(nueva) → updateUser({ password }) sobre esa sesión.
 *
 * Los errores de la API se traducen a mensajes en español vía AuthError.
 */

import { AuthApiError, type Session } from '@supabase/supabase-js';
import { supabase } from '@/src/config/supabase';

/** Error de autenticación con mensaje listo para mostrar en UI. */
export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Usuario o contraseña incorrectos.',
  email_not_confirmed: 'Tu correo aún no ha sido confirmado.',
  user_not_found: 'No existe una cuenta con ese correo.',
  user_banned: 'Esta cuenta está deshabilitada.',
  otp_expired: 'El código expiró o no es válido. Solicita uno nuevo.',
  otp_disabled: 'La verificación por código no está habilitada.',
  same_password: 'La nueva contraseña debe ser diferente a la actual.',
  weak_password: 'La contraseña no cumple los requisitos mínimos.',
  over_request_rate_limit:
    'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  over_email_send_rate_limit:
    'Ya enviamos un correo hace poco. Espera un momento antes de reenviar.',
  validation_failed: 'Revisa los datos ingresados.',
};

const GENERIC_MESSAGE = 'Ocurrió un error. Intenta de nuevo.';

function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthApiError) {
    const code = error.code ?? 'unknown';
    return new AuthError(code, ERROR_MESSAGES[code] ?? GENERIC_MESSAGE);
  }
  if (error instanceof Error) {
    return new AuthError('unknown', GENERIC_MESSAGE);
  }
  return new AuthError('unknown', GENERIC_MESSAGE);
}

/** Inicia sesión con email + contraseña. Devuelve la sesión creada. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw toAuthError(error);
  if (!data.session) throw new AuthError('no_session', GENERIC_MESSAGE);
  return data.session;
}

/** Cierra la sesión actual (local + revoca refresh token). */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAuthError(error);
}

/** Envía el correo de recuperación con el código OTP de 6 dígitos. */
export async function requestPasswordResetCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
  );
  if (error) throw toAuthError(error);
}

/**
 * Verifica el código OTP de recovery. Si es válido, Supabase crea una
 * sesión temporal con la que se puede llamar updatePassword().
 */
export async function verifyPasswordResetCode(
  email: string,
  code: string,
): Promise<Session> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'recovery',
  });
  if (error) throw toAuthError(error);
  if (!data.session) throw new AuthError('no_session', GENERIC_MESSAGE);
  return data.session;
}

/** Cambia la contraseña del usuario de la sesión activa. */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw toAuthError(error);
}

export interface ProfileUpdate {
  firstName: string;
  lastName: string;
  /** Si cambia, Supabase envía correos de confirmación a ambas direcciones. */
  email?: string;
}

/** Actualiza nombre/apellido (user_metadata) y opcionalmente el email. */
export async function updateProfile(update: ProfileUpdate): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    ...(update.email ? { email: update.email.trim().toLowerCase() } : {}),
    data: {
      first_name: update.firstName.trim(),
      last_name: update.lastName.trim(),
    },
  });
  if (error) throw toAuthError(error);
}

/**
 * Cambia la contraseña verificando primero la actual (Supabase no la
 * valida en updateUser, así que se re-autentica con signInWithPassword).
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const session = await getSession();
  const email = session?.user.email;
  if (!email) throw new AuthError('no_session', GENERIC_MESSAGE);

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) {
    throw new AuthError(
      'invalid_current_password',
      'La contraseña actual es incorrecta.',
    );
  }

  await updatePassword(newPassword);
}

/**
 * Sube la foto de perfil al bucket público `avatars` (carpeta del
 * usuario, ver políticas RLS) y guarda la URL en user_metadata.
 * Devuelve la URL pública (con cache-buster).
 */
export async function uploadAvatar(
  fileUri: string,
  contentType: string,
): Promise<string> {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) throw new AuthError('no_session', GENERIC_MESSAGE);

  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const arrayBuffer = await fetch(fileUri).then((res) => res.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType, upsert: true });
  if (uploadError) {
    throw new AuthError('avatar_upload', 'No se pudo subir la foto. Intenta de nuevo.');
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: url },
  });
  if (error) throw toAuthError(error);
  return url;
}

/** Sesión persistida (null si no hay). */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Suscripción a cambios de sesión. Devuelve el unsubscribe. */
export function onAuthStateChange(
  callback: (session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}

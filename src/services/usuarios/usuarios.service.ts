/**
 * Usuarios service — gestión de invitados (solo super_admin).
 *
 * Todas las operaciones pasan por la edge function `admin-users`, que
 * valida que el caller sea super_admin y usa la service role key para
 * el Admin API de GoTrue (nunca desde el cliente).
 */

import { getAccessToken } from '@/src/config/supabase';
import type {
  CreateUserInput,
  CreateUserResult,
  ManagedUser,
} from '@/src/types/usuarios.types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { error?: string }).error ?? `admin-users ${res.status}`,
    );
  }
  return json as T;
}

export async function listUsuarios(): Promise<ManagedUser[]> {
  const { users } = await invoke<{ users: ManagedUser[] }>({ action: 'list' });
  return users;
}

export async function createUsuario(
  input: CreateUserInput,
): Promise<CreateUserResult> {
  return invoke<CreateUserResult>({ action: 'create', ...input });
}

export async function updateUsuarioPermissions(
  userId: string,
  permissions: string[],
): Promise<void> {
  await invoke({ action: 'update_permissions', userId, permissions });
}

export async function deleteUsuario(userId: string): Promise<void> {
  await invoke({ action: 'delete', userId });
}

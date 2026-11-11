import * as WebBrowser from 'expo-web-browser';
import { getAccessToken } from '@/src/config/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export async function startQuickBooksOAuth() {
  const supabaseJwt = await getAccessToken();

  const initRes = await fetch(`${SUPABASE_URL}/functions/v1/qb-oauth-init`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseJwt}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });
  if (!initRes.ok) {
    throw new Error(`qb-oauth-init ${initRes.status}: ${await initRes.text()}`);
  }
  const { authUrl, error } = (await initRes.json()) as {
    authUrl?: string;
    error?: string;
  };
  if (!authUrl) throw new Error(`qb-oauth-init error: ${error ?? 'unknown'}`);

  return WebBrowser.openAuthSessionAsync(authUrl, 'starcorp://oauth/quickbooks');
}

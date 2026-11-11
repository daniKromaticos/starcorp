import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/src/config/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface SyncResult {
  ok: boolean;
  source?: 'cron' | 'manual';
  rows_fetched?: number;
  rows_upserted?: number;
  duration_ms?: number;
  error?: string;
}

export function useTriggerPbiSync() {
  const qc = useQueryClient();
  return useMutation<SyncResult, Error, void>({
    mutationFn: async () => {
      const accessToken = await getAccessToken();
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/pbi-sync-auxiliar`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ source: 'manual' }),
        },
      );
      const json = (await res.json()) as SyncResult;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `pbi-sync-auxiliar ${res.status}`);
      }
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['pbi', 'sync'] });
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { getAccessToken } from '@/src/config/supabase';
import type { PBIEmbedData } from '@/src/types/api.types';
import { queryKeys } from './query-keys';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

async function fetchEmbedToken(
  groupId: string,
  reportId: string,
): Promise<PBIEmbedData> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/powerbi-embed-token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId, reportId }),
    },
  );
  if (!res.ok) {
    throw new Error(`Embed token ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export function usePowerBIEmbed(groupId: string, reportId: string) {
  return useQuery({
    queryKey: queryKeys.powerBIEmbed(groupId, reportId),
    queryFn: () => fetchEmbedToken(groupId, reportId),
    enabled: !!groupId && !!reportId,
    staleTime: 55 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

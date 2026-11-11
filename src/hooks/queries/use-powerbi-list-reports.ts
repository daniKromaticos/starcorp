import { useQuery } from '@tanstack/react-query';
import { getAccessToken } from '@/src/config/supabase';
import type { PBIReportListItem } from '@/src/types/api.types';
import { queryKeys } from './query-keys';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface PBIListResponse {
  value: PBIReportListItem[];
}

async function fetchReports(groupId: string): Promise<PBIReportListItem[]> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/powerbi-list-reports`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId }),
    },
  );
  if (!res.ok) {
    throw new Error(`List reports ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as PBIListResponse;
  return json.value;
}

export function usePowerBIListReports(groupId: string) {
  return useQuery({
    queryKey: queryKeys.powerBIReports(groupId),
    queryFn: () => fetchReports(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
}

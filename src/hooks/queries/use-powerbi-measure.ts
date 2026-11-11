import { useQuery } from '@tanstack/react-query';
import { getAccessToken } from '@/src/config/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface UsePowerBIMeasureArgs {
  datasetId: string;
  daxQuery: string;
  groupId?: string;
}

interface DAXRaw {
  results?: { tables?: { rows?: Record<string, unknown>[] }[] }[];
}

async function executeQuery(
  datasetId: string,
  daxQuery: string,
  groupId?: string,
) {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/powerbi-execute-query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ datasetId, daxQuery, groupId }),
    },
  );
  if (!res.ok) {
    throw new Error(`execute-query ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as DAXRaw;
}

export function usePowerBIMeasure({
  datasetId,
  daxQuery,
  groupId,
}: UsePowerBIMeasureArgs) {
  return useQuery<number | null, Error>({
    queryKey: ['powerbi', 'measure', datasetId, daxQuery, groupId ?? ''],
    enabled: !!datasetId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const raw = await executeQuery(datasetId, daxQuery, groupId);
      const row = raw.results?.[0]?.tables?.[0]?.rows?.[0];
      if (!row) return null;
      const value = Object.values(row)[0];
      return typeof value === 'number' ? value : Number(value);
    },
  });
}

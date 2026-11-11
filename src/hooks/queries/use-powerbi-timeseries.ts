import { useQuery } from '@tanstack/react-query';
import { getAccessToken } from '@/src/config/supabase';
import { queryKeys } from './query-keys';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface UsePowerBITimeSeriesArgs {
  datasetId: string;
  daxQuery: string;
  groupId?: string;
}

interface DAXRaw {
  results?: {
    tables?: { rows?: Record<string, unknown>[] }[];
  }[];
}

export interface TimeSeriesRow {
  date: string;
  ingreso: number;
  egreso: number;
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

function pick(row: Record<string, unknown>, suffix: string): unknown {
  const key = Object.keys(row).find((k) => k.endsWith(suffix));
  return key ? row[key] : undefined;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toIsoDate(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return new Date(v).toISOString();
  if (v instanceof Date) return v.toISOString();
  return String(v ?? '');
}

export function usePowerBITimeSeries({
  datasetId,
  daxQuery,
  groupId,
}: UsePowerBITimeSeriesArgs) {
  return useQuery<TimeSeriesRow[], Error>({
    queryKey: [
      ...queryKeys.powerBITimeSeries(datasetId, daxQuery),
      groupId ?? '',
    ],
    enabled: !!datasetId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const raw = await executeQuery(datasetId, daxQuery, groupId);
      const rows = raw.results?.[0]?.tables?.[0]?.rows ?? [];
      return rows
        .map<TimeSeriesRow>((r) => ({
          date: toIsoDate(pick(r, '[Fecha]') ?? pick(r, '[Date]')),
          ingreso: toNumber(pick(r, '[Ingreso]')),
          egreso: toNumber(pick(r, '[Egreso]') ?? pick(r, '[EGRESOS]')),
        }))
        .filter((p) => p.date)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  qbQuery,
  QBNotConnectedError,
  QBReauthRequiredError,
} from '@/src/services/quickbooks/client';
import {
  normalizePnLSectionSeries,
  type PnLSection,
} from '@/src/services/quickbooks/normalizer';
import { useFiltersStore } from '@/src/stores/filters.store';
import { useQBStore } from '@/src/stores/qb.store';
import type { QBProfitAndLossRaw } from '@/src/types/api.types';
import type { PeriodKey, PeriodRange } from '@/src/types/domain.types';
import { computePreviousPeriod } from '@/src/utils/date';
import { queryKeys } from './query-keys';

/**
 * Granularidad de las columnas del P&L por periodo, alineada con los buckets
 * del consolidado (get_consolidated_timeseries): 3m/12m por mes, el resto en
 * pocos puntos que el chart pueda dibujar.
 */
const SUMMARIZE_BY: Record<PeriodKey, 'Days' | 'Week' | 'Month'> = {
  today: 'Days',
  '1w': 'Days',
  '1m': 'Week',
  '3m': 'Month',
  '12m': 'Month',
};

export interface QBTrendBucket {
  /** Rango (ISO, inclusivo) de la columna del periodo corriente. */
  start: string;
  end: string;
  current: number;
  previous: number;
}

function buildQuery(
  range: PeriodRange,
  summarize: string,
  realmId: string | null,
) {
  return {
    queryKey: [
      ...queryKeys.qbProfitAndLossByColumn(range.start, range.end, summarize),
      realmId ?? 'default',
    ],
    queryFn: async () => {
      try {
        return await qbQuery<QBProfitAndLossRaw>(
          'reports/ProfitAndLoss',
          {
            start_date: range.start,
            end_date: range.end,
            summarize_column_by: summarize,
          },
          realmId ?? undefined,
        );
      } catch (e) {
        if (
          e instanceof QBNotConnectedError ||
          e instanceof QBReauthRequiredError
        ) return null;
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev: QBProfitAndLossRaw | null | undefined) => prev,
  };
}

/**
 * Tendencia de una sección del P&L de QuickBooks (Income / COGS / Expenses)
 * para la empresa y el periodo activos, comparada contra la ventana histórica
 * de `computePreviousPeriod` (mismo criterio que el consolidado: 1m/3m/12m
 * contra el mismo tramo un año atrás).
 *
 * Son dos P&L con columnas por periodo; el histórico se alinea por posición
 * (columna i contra columna i). Si el histórico trae menos columnas (p. ej. una
 * semana menos en 1m), las que faltan quedan en 0; si trae más, se acumulan
 * en el último punto.
 */
export function useQBPnLTrend(section: PnLSection) {
  const period = useFiltersStore((s) => s.activePeriod);
  const realmId = useQBStore((s) => s.activeRealmId);
  const previous = computePreviousPeriod(period);
  const summarize = SUMMARIZE_BY[period.key];

  const [currentQuery, previousQuery] = useQueries({
    queries: [
      buildQuery(period, summarize, realmId),
      buildQuery(previous, summarize, realmId),
    ],
  });

  const buckets = useMemo<QBTrendBucket[]>(() => {
    const cur = normalizePnLSectionSeries(currentQuery.data ?? null, section);
    const prev = normalizePnLSectionSeries(previousQuery.data ?? null, section);
    // Si el histórico trae más columnas (1m: el mismo mes del año pasado
    // puede partir en una semana más), lo que sobra se suma al último punto
    // para que el total histórico no pierda montos.
    const overflow = prev
      .slice(cur.length)
      .reduce((s, p) => s + p.amount, 0);
    return cur.map((p, i) => ({
      start: p.start,
      end: p.end,
      current: p.amount,
      previous:
        (prev[i]?.amount ?? 0) + (i === cur.length - 1 ? overflow : 0),
    }));
  }, [currentQuery.data, previousQuery.data, section]);

  return {
    buckets,
    isMonthly: summarize === 'Month',
    isPending: currentQuery.isPending || previousQuery.isPending,
  };
}

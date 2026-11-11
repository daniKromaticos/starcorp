/**
 * Date utilities for period calculations
 */

import type { PeriodKey, PeriodRange } from "@/src/types/domain.types";

/**
 * Compute a PeriodRange from a PeriodKey.
 */
export function computePeriod(key: PeriodKey): PeriodRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (key) {
    case "today":
      // Label shows "Mes" → month-to-date: first day of current month → today.
      return { key, start: toISODate(new Date(y, m, 1)), end: toISODate(now) };
    case "1w":
      return { key, start: toISODate(addDays(now, -7)), end: toISODate(now) };
    // 1m / 3m / 12m span CLOSED calendar months: the in-progress current
    // month is excluded and the range covers the last N fully-closed months.
    // e.g. on any day of June: "1 mes" = all of May; "3 meses" = Mar–May.
    case "1m":
      return closedMonths(key, y, m, 1);
    case "3m":
      return closedMonths(key, y, m, 3);
    case "12m":
      return closedMonths(key, y, m, 12);
    default:
      return { key, start: toISODate(now), end: toISODate(now) };
  }
}

/**
 * Range covering the last `count` fully-closed calendar months relative to a
 * date in month (y, m). End is the last day of the previous month; start is the
 * first day of the month `count` months before that.
 */
function closedMonths(
  key: PeriodKey,
  y: number,
  m: number,
  count: number,
): PeriodRange {
  const start = new Date(y, m - count, 1);
  const end = new Date(y, m, 0); // day 0 of current month = last day of prev month
  return { key, start: toISODate(start), end: toISODate(end) };
}

/**
 * Ventana histórica contra la que se compara el periodo activo.
 *
 * 1m / 3m / 12m usan la MISMA ventana un año atrás (espejo): julio 2026 compara
 * contra julio 2025, no contra junio 2026. Es el mismo criterio que aplican los
 * RPCs del consolidado (migración 0045).
 *
 * `today` (mes corriente) y `1w` siguen comparando contra la ventana
 * inmediatamente anterior del mismo largo: una semana contra la misma semana
 * del año pasado no alinea los días de la semana y el delta sale ruidoso.
 */
export function computePreviousPeriod(current: PeriodRange): PeriodRange {
  if (current.key === '1m' || current.key === '3m' || current.key === '12m') {
    return {
      key: current.key,
      start: shiftIsoMonths(current.start, -12),
      end: shiftIsoMonths(current.end, -12),
    };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const startD = new Date(`${current.start}T00:00:00Z`);
  const endD = new Date(`${current.end}T00:00:00Z`);
  const lenDays = Math.max(
    0,
    Math.round((endD.getTime() - startD.getTime()) / dayMs),
  );
  const prevEnd = new Date(startD.getTime() - dayMs);
  const prevStart = new Date(prevEnd.getTime() - lenDays * dayMs);
  return {
    key: current.key,
    start: toISODate(prevStart),
    end: toISODate(prevEnd),
  };
}

/**
 * Desplaza una fecha ISO N meses, en UTC y por partes. Si el día no existe en
 * el mes destino (29-feb hacia un año no bisiesto) JS desborda al mes
 * siguiente, así que se corrige al último día del mes destino.
 */
function shiftIsoMonths(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const targetMonth = (m ?? 1) - 1 + months;
  const dt = new Date(Date.UTC(y ?? 1970, targetMonth, d ?? 1));
  const expectedMonth = ((targetMonth % 12) + 12) % 12;
  if (dt.getUTCMonth() !== expectedMonth) dt.setUTCDate(0);
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

const MONTH_SHORT_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/**
 * Format an ISO date ("2025-06-01") as a short X-axis label ("1 jun").
 * Parses the date by parts (not `new Date`) to avoid UTC→local day shifts.
 */
export function formatAxisDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTH_SHORT_ES[(m ?? 1) - 1] ?? ''}`;
}

const MONTH_LONG_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Nombre del mes de una fecha ISO, para rotular buckets mensuales sin día
 * ("1 oct" sugiere un punto en el tiempo, no el mes completo).
 * `short`: "Oct" (eje X); por defecto "Octubre" (tooltip).
 */
export function formatMonthLabel(iso: string, short = false): string {
  const m = Number(iso.slice(5, 7));
  const name = MONTH_LONG_ES[m - 1] ?? '';
  return short ? name.slice(0, 3) : name;
}

/**
 * Format an ISO date ("2026-06-30") as "30 jun 2026". Parses by parts (not
 * `new Date`) para no correr el día por zona horaria.
 */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTH_SHORT_ES[m - 1] ?? ''} ${y}`;
}

/**
 * ISO date shifted by `days`, parsed/formatted by parts in UTC to avoid
 * timezone day-shifts. Used to turn an exclusive bucket end (e.g. "2026-06-01")
 * into its inclusive last day ("2026-05-31").
 */
export function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

/**
 * Evenly-spaced subset of `arr` (always including the first and last items),
 * capped at `max` entries. Used to thin axis labels so they don't crowd.
 */
export function pickEvenly<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    out.push(arr[Math.round((i * (arr.length - 1)) / (max - 1))]);
  }
  return out;
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Mes cte.",
  "1w": "1 semana",
  "1m": "1 mes",
  "3m": "3 meses",
  "12m": "12 meses",
};

/**
 * Compact labels for the time-filter bar, where 5 pills share a tight row.
 * Full labels (PERIOD_LABELS) stay for standalone period chips/badges.
 */
export const PERIOD_SHORT_LABELS: Record<PeriodKey, string> = {
  today: "Mes cte.",
  "1w": "1 sem",
  "1m": "1 mes",
  "3m": "3 meses",
  "12m": "12 meses",
};

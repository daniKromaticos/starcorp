/**
 * QuickBooks Mock Data
 */

import type {
  NormalizedRevenue,
  NormalizedCategory,
  TimeSeriesPoint,
} from '@/src/types/domain.types';

// ─── Revenue ──────────────────────────────────────────────────

function generateRevenueSeries(): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    points.push({
      date: date.toISOString().split('T')[0],
      value: 40 + Math.random() * 60,
    });
  }
  return points;
}

export const mockRevenue: NormalizedRevenue = {
  total: 100000,
  currency: 'USD',
  deltaPercent: 1.87,
  deltaAbsolute: 78000,
  trend: 'up',
  series: generateRevenueSeries(),
  period: { start: '2026-01-01', end: '2026-04-14' },
};

// ─── Categories ───────────────────────────────────────────────

export const mockCategories: NormalizedCategory[] = [
  { id: 'income', label: 'Ingresos', icon: 'dollarsign.circle', total: 100000, actionLabel: 'Ver clientes' },
  { id: 'costs', label: 'Costos', icon: 'bag', total: 15000, actionLabel: 'Ver clientes' },
  { id: 'expenses', label: 'Gastos', icon: 'creditcard', total: 7000, actionLabel: 'Ver clientes' },
  { id: 'profit', label: 'Utilidad', icon: 'chart.line.uptrend.xyaxis', total: 78000, actionLabel: 'Ver detalle' },
];

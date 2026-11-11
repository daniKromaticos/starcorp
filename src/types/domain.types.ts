/**
 * Normalized Domain Models
 *
 * These are the canonical types consumed by all components.
 * They are source-agnostic: the normalizer layer maps
 * QuickBooks and Power BI raw responses into these shapes.
 */

export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface NormalizedRevenue {
  total: number;
  currency: string;
  deltaPercent: number;
  deltaAbsolute: number;
  trend: 'up' | 'down' | 'flat';
  series: TimeSeriesPoint[];
  period: { start: string; end: string };
}

export interface NormalizedClient {
  id: string;
  name: string;
  revenue: number;
  deltaPercent: number;
  color: string;
  source: 'quickbooks' | 'powerbi';
}

export interface NormalizedCategory {
  id: string;
  label: string;
  icon: string;
  total: number;
  actionLabel: string;
}

export type TrendDirection = 'up' | 'down' | 'flat';

export type PeriodKey = 'today' | '1w' | '1m' | '3m' | '12m';

export interface PeriodRange {
  key: PeriodKey;
  start: string;
  end: string;
}

// ─── Consolidados (Ingresos/Costos/Gastos/Utilidad) ─────────────

export type ConsolidadoCategoryId =
  | 'ingresos'
  | 'costos'
  | 'gastos'
  | 'utilidad'
  | 'egresos';

export interface ConsolidadoClient {
  id: string;
  name: string;
  amount: number;
  deltaPercent: number;
  color: string;
}

export interface ConsolidadoMetric {
  value: number;
  deltaPercent: number;
}

export interface ClientConsolidadoDetail {
  id: string;
  name: string;
  amount: number;
  deltaPercent: number;
  deltaAbsolute: number;
  series: TimeSeriesPoint[];
  location: string;
  employees: number;
  leader: number;
  vigencia: number;
  metrics: {
    ingreso: ConsolidadoMetric;
    costo: ConsolidadoMetric;
    gastos: ConsolidadoMetric;
    utilidadNeta: ConsolidadoMetric;
    utilidadBruta: ConsolidadoMetric;
    cartera: ConsolidadoMetric;
    margen: ConsolidadoMetric;
  };
}

export interface CostGroup {
  id: string;
  label: string;
  icon: string;
  color: string;
  amount: number;
  deltaPercent: number;
}

export interface ThirdParty {
  id: string;
  name: string;
  color: string;
  gradientColors: [string, string];
  amount: number;
  deltaPercent: number;
}

export interface ExpenseCentral {
  total: number;
  deltaPercent: number;
}

// ─── Financiero (companies) ─────────────────────────────────────

export interface Company {
  id: string;
  name: string;
}

export interface CompanyMetric {
  value: number;
  deltaPercent: number;
}

export interface CompanyMetrics {
  ingresos: CompanyMetric;
  costos: CompanyMetric;
  egresos: CompanyMetric;
  utilidadBruta: CompanyMetric;
  utilidadNeta: CompanyMetric;
}

export interface IngresoCliente {
  id: string;
  name: string;
  color: string;
  amount: number;
  deltaPercent: number;
}

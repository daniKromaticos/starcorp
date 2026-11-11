/**
 * Tipos del Informe Pagos.
 *
 * Cada Pago tiene una empresa generadora (Realm de QB que emite el
 * desembolso), un centro de costos, un empleado/hotel destinatario,
 * concepto y fecha. El `bucket` de monto se calcula en el mock para
 * mantener el calendario consistente (bajo/medio/alto = verde/amber/red).
 */

export type MontoBucket = 'bajo' | 'medio' | 'alto';

export const MONTO_BUCKET_LABEL: Record<MontoBucket, string> = {
  bajo: 'Monto bajo',
  medio: 'Monto medio',
  alto: 'Monto alto',
};

export const MONTO_BUCKET_COLOR: Record<
  MontoBucket,
  { bg: string; border: string; text: string; dot: string }
> = {
  bajo: { bg: '#DCFCE7', border: '#86EFAC', text: '#047857', dot: '#10B981' },
  medio: { bg: '#FEF3C7', border: '#FCD34D', text: '#B45309', dot: '#D97706' },
  alto: { bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C', dot: '#DC2626' },
};

export interface EmpresaGeneradora {
  id: string;
  name: string;
  color: string;
}

export interface CentroCostos {
  id: string;
  name: string;
}

export interface Empleado {
  id: string;
  name: string;
}

export interface Pago {
  id: string;
  empresaId: string;
  centroCostosId: string;
  empleadoId: string;
  concepto: string;
  fecha: string;
  monto: number;
  /** Campos de BITACORA almacenados pero aún no mostrados en la UI. */
  banco?: string | null;
  cuenta?: string | null;
  tipoPago?: string | null;
}

export interface PagosFilters {
  dateFrom: string | null;
  dateTo: string | null;
  empresaIds: string[];
  centroCostosIds: string[];
  empleadoIds: string[];
}

export const EMPTY_PAGOS_FILTERS: PagosFilters = {
  dateFrom: null,
  dateTo: null,
  empresaIds: [],
  centroCostosIds: [],
  empleadoIds: [],
};

export interface DayBucket {
  /** ISO yyyy-mm-dd */
  fecha: string;
  total: number;
  bucket: MontoBucket;
}

export interface PagosSnapshot {
  pagos: Pago[];
  empresas: EmpresaGeneradora[];
  centrosCostos: CentroCostos[];
  empleados: Empleado[];
  /** Buckets fijos por día (para que el calendario tenga colores estables). */
  dayBuckets: Record<string, MontoBucket>;
  updatedAt: string;
  todayIso: string;
}

export function formatFullDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00');
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const dia = date.getUTCDay();
  const mes = date.getUTCMonth();
  const num = date.getUTCDate();
  const year = date.getUTCFullYear();
  const nombre = dias[dia].charAt(0).toUpperCase() + dias[dia].slice(1);
  return `${nombre}, ${num} de ${meses[mes]} de ${year}`;
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

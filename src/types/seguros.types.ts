/**
 * Tipos del Informe Seguros.
 *
 * 3 dominios independientes: Compañías (pólizas de cada Realm de QB,
 * tipo General Liability/Umbrella/Worker Compensation), Vehículos y
 * Propiedades. Cada póliza tiene `vigenciaFin` desde donde se deriva
 * su estado (`activa | por_vencer | vencida`).
 */

export type PolizaStatus = 'activa' | 'por_vencer' | 'vencida';

/**
 * Estado declarado en la columna "Estado" de Notion (ACTIVA / INACTIVA).
 * Independiente del estado derivado por fecha: las INACTIVA salen de las
 * vistas principales y viven sólo en el histórico. El porqué está en la
 * columna "Motivo Inactividad" (FALTA DE PAGO / AUDITORIA / NO RENOVADA /
 * VENCIDA / CANCELADA). `null` = columna vacía o valor no reconocido.
 */
export type PolizaEstadoNotion = 'activa' | 'inactiva' | null;

export function isInactiva(p: { estado?: PolizaEstadoNotion }): boolean {
  return p.estado === 'inactiva';
}

/** Etiqueta del badge de una póliza inactiva: "Inactiva · MOTIVO". */
export function inactivaLabel(p: {
  motivoInactividad?: string | null;
}): string {
  return p.motivoInactividad
    ? `Inactiva · ${p.motivoInactividad}`
    : 'Inactiva';
}

/**
 * Opciones del filtro por chips de estado de póliza (Vigente / Por vencer /
 * Vencido). Compartido por el detalle de compañía y el histórico para
 * unificar el diseño. Orden = orden de los chips.
 */
export const POLIZA_STATUS_FILTERS: readonly {
  key: PolizaStatus;
  label: string;
}[] = [
  { key: 'activa', label: 'Vigente' },
  { key: 'por_vencer', label: 'Por vencer' },
  { key: 'vencida', label: 'Vencido' },
];

export interface PolizaCompania {
  id: string;
  empresaId: string;
  empresaName: string;
  nombre: string;
  aseguradora: string;
  broker: string;
  numero: string;
  vigenciaInicio: string;
  vigenciaFin: string;
  cobertura: number;
  payroll: number | null;
  costo: number;
  estado?: PolizaEstadoNotion;
  /** Valor crudo de "Motivo Inactividad" en Notion (en MAYÚSCULAS). */
  motivoInactividad?: string | null;
}

export interface PolizaVehiculo {
  id: string;
  nombre: string;
  asignacion: string;
  /** LLC dueña de la póliza (columna "LLC" de Notion). */
  empresaId: string;
  /** Nombre de la LLC. '' cuando la fila no la trae. */
  empresaName: string;
  aseguradora: string;
  broker: string;
  numero: string;
  costo: number;
  vigenciaFin: string;
  estado?: PolizaEstadoNotion;
  motivoInactividad?: string | null;
}

/**
 * Póliza de propiedad — filas con `Tipo de Seguro = CASA`. Salen del
 * mismo tablero que Compañías y Vehículos, así que traen las mismas
 * columnas (Aseguradora / Broker / Numero de Poliza / Costo Total / LLC).
 */
export interface PolizaPropiedad {
  id: string;
  nombre: string;
  /** LLC dueña de la póliza (columna "LLC" de Notion). */
  empresaId: string;
  /** Nombre de la LLC. '' cuando la fila no la trae. */
  empresaName: string;
  aseguradora: string;
  broker: string;
  numero: string;
  costo: number;
  vigenciaFin: string;
  estado?: PolizaEstadoNotion;
  motivoInactividad?: string | null;
}

export interface SeguroEmpresa {
  id: string;
  name: string;
  polizas: PolizaCompania[];
}

export interface SegurosSnapshot {
  empresas: SeguroEmpresa[];
  vehiculos: PolizaVehiculo[];
  propiedades: PolizaPropiedad[];
  updatedAt: string;
  todayIso: string;
}

/** LLC del carousel de Vehículos. */
export interface VehiculoLlc {
  id: string;
  name: string;
}

/**
 * LLCs presentes en un set de pólizas de vehículo, en orden de aparición
 * y sin repetir. Alimenta el carousel de Vehículos igual que
 * `SegurosSnapshot.empresas` alimenta el de Compañías.
 */
export function llcsDeVehiculos(vehiculos: PolizaVehiculo[]): VehiculoLlc[] {
  const out: VehiculoLlc[] = [];
  const seen = new Set<string>();
  for (const v of vehiculos) {
    if (seen.has(v.empresaId)) continue;
    seen.add(v.empresaId);
    out.push({ id: v.empresaId, name: v.empresaName || 'Sin LLC' });
  }
  return out;
}

/** Umbral de "por vencer" en días. */
export const POR_VENCER_DAYS = 60;

export function diffInDays(targetIso: string, todayIso: string): number {
  const t = new Date(targetIso).getTime();
  const n = new Date(todayIso).getTime();
  return Math.round((t - n) / 86400000);
}

export function polizaStatus(
  vigenciaFin: string,
  todayIso: string,
): PolizaStatus {
  const diff = diffInDays(vigenciaFin, todayIso);
  if (diff < 0) return 'vencida';
  if (diff <= POR_VENCER_DAYS) return 'por_vencer';
  return 'activa';
}

export function formatVigenciaDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

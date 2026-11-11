/**
 * Otras compañías — tipos
 *
 * Sección "Otras compañías" del navbar (drawer). Lista de compañías con su
 * ingreso del periodo y, por compañía, un detalle Ingresos/Gastos con
 * donut por categoría y lista de terceros. Datos mock por ahora (ver
 * `src/services/mock/empresas.mock.ts`).
 */

/** Item de la lista de compañías. */
export interface EmpresaListItem {
  id: string;
  name: string;
  /** Métrica del periodo. `null` = sin métrica (ej. "Repositorio Alejandro"). */
  ingresos: number | null;
  /** Variación % vs periodo previo. `null` = no aplica. */
  deltaPercent: number | null;
  /** Etiqueta de la métrica en la card (default "Ingresos"; VAG muestra
   * "Movimientos" porque su fuente curada solo trae gastos). */
  metricLabel?: string;
  /** Si tiene vista de detalle navegable (Ingresos/Gastos). */
  hasDetail: boolean;
}

/** Una categoría del donut (Honorarios, Otros, Arrendamientos, …). */
export interface EmpresaCategory {
  id: string;
  label: string;
  /** Color base del slice (el donut le aplica profundidad). */
  color: string;
  amount: number;
}

/** Una fila de tercero en la lista. */
export interface EmpresaTercero {
  id: string;
  name: string;
  color: string;
  amount: number;
}

/** Vínculo categoría↔tercero (monto del tercero dentro de la categoría),
 *  para el cross-filtrado torta↔lista. Solo BBM real lo trae. */
export interface EmpresaCategoriaTercero {
  categoryId: string;
  terceroId: string;
  amount: number;
}

/** Bloque financiero de un tipo (ingresos o gastos). */
export interface EmpresaFinancials {
  total: number;
  categories: EmpresaCategory[];
  terceros: EmpresaTercero[];
  /** Total mostrado en el footer navy. */
  tercerosTotal: number;
  /** Desglose categoría×tercero; undefined en las compañías mock (el
   *  cross-filtrado se degrada a solo resaltar). */
  links?: EmpresaCategoriaTercero[];
}

/** Detalle de una compañía. */
export interface EmpresaDetail {
  id: string;
  name: string;
  /** Período resuelto por el backend (ej. "último mes con datos"); el chip
   *  de la UI lo usa cuando existe. Mock: undefined. */
  period?: { year: number; month: number } | null;
  ingresos: EmpresaFinancials;
  gastos: EmpresaFinancials;
}

export type EmpresaTipo = 'ingresos' | 'gastos';

/** Filtros de periodo (solo UI: actualizan el chip y el conteo). */
export interface EmpresaFilters {
  /** 'corriente' | '2022' | '2023' | '2024' | '2025' */
  year: string;
  /** 'ultimo' | '1'..'12' */
  month: string;
}

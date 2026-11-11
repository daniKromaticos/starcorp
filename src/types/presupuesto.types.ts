/**
 * Presupuesto (Informe) Types
 *
 * Tipos del Informe Presupuesto, alimentado por la tabla `PROYECCION` de
 * Power BI. Columnas relevantes (ver mapeo en presupuesto.service.ts):
 *   EMPRESA, TIPO DE MOVIMIENTO, CENTRO DE COSTOS, CONCEPTO, CATEGORIA,
 *   PROYECTADO (agg), EJECUTADO (agg), PorcentajeEje (agg), COMENTARIO,
 *   AÑO, MES, SEMANA.
 *
 * La UI agrupa por EMPRESA → CENTRO DE COSTOS, filtrando por TIPO DE
 * MOVIMIENTO (Ingresos/Gastos) y período (mes corriente / mes pasado).
 */

/** TIPO DE MOVIMIENTO de PROYECCION (filtro Ingresos/Gastos). */
export type PresupuestoTipo = 'ingreso' | 'gasto';

/** Selector de período (mes corriente vs mes pasado). */
export type PresupuestoPeriodo = 'corriente' | 'pasado';

/** Una fila de PROYECCION ya en shape UI (un centro de costos). */
export interface PresupuestoCentroCosto {
  id: string;
  /** CENTRO DE COSTOS ("Echid Ohio") */
  centroCostos: string;
  /** PROYECTADO */
  proyectado: number;
  /** EJECUTADO */
  ejecutado: number;
  /** CONCEPTO ("Ingresos") */
  concepto: string;
  /** CATEGORIA ("Ingresos") */
  categoria: string;
  /** PorcentajeEje, 0–100 */
  porcentajeEje: number;
  /** COMENTARIO ("Anticipo retiro utilidades") */
  comentario: string;
}

/** Una EMPRESA con sus centros de costos (fila desplegable de la lista). */
export interface PresupuestoEmpresa {
  id: string;
  /** EMPRESA ("5 Stars") */
  empresa: string;
  tipo: PresupuestoTipo;
  /** Etiqueta legible del tipo ("Ingreso" / "Gasto"). */
  tipoLabel: string;
  /** Suma de PROYECTADO de sus centros. */
  proyectado: number;
  /** Suma de EJECUTADO de sus centros. */
  ejecutado: number;
  centrosCosto: PresupuestoCentroCosto[];
}

/** Resumen de ejecución para el gauge "Ejecución". */
export interface PresupuestoEjecucion {
  /** Valor grande al centro del gauge (EJECUTADO totalizado). */
  ejecutado: number;
  proyectado: number;
  /** Proporción ejecutado/proyectado, ya clampeada a 0–1 (relleno naranja). */
  fraction: number;
  /** % ejecutado real, SIN clampear: puede pasar de 100 (sobre-ejecución). */
  pctReal: number;
  /** Variación % vs período anterior (badge). */
  deltaPct: number;
}

/** Payload completo del Informe Presupuesto para un tipo + período dados. */
export interface PresupuestoData {
  tipo: PresupuestoTipo;
  periodo: PresupuestoPeriodo;
  /**
   * Mes concreto que se está mostrando ("Junio 2026"). El período se resuelve
   * contra los datos cargados en PROYECCION, así que no coincide con el mes
   * calendario; la UI lo muestra para que no haya ambigüedad.
   */
  periodoLabel: string;
  ejecucion: PresupuestoEjecucion;
  empresas: PresupuestoEmpresa[];
  /** Totales del pie ("Total" fijo). */
  totalProyectado: number;
  totalEjecutado: number;
}

/** Args del fetch/hook. */
export interface PresupuestoQuery {
  tipo: PresupuestoTipo;
  periodo: PresupuestoPeriodo;
}

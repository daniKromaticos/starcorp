/**
 * VAG — tipos
 *
 * La compañía VAG (sección "Otras compañías") tiene su propio hub con 4
 * vistas: Activos, Movimientos, Cuentas por cobrar y Cuentas por pagar.
 * Fuente real: RPCs get_vag_* sobre vag_entries (sync diario de la tabla
 * AuxiliarVAG de Power BI). Los campos sin fuente contable (avalúo,
 * seguro, ciudad…) son null y la UI muestra '--'.
 */

/** Métrica de una card del hub. */
export interface VagMetric {
  total: number;
  deltaPct: number;
  /**
   * Fecha ISO del último dato que alimenta la métrica (max(fecha) de las
   * mismas filas que suma el total). Cada bloque llega de Power BI a su
   * propio ritmo, así que la card muestra hasta cuándo hay data. Null
   * cuando no hay filas o la métrica no la expone (Activos).
   */
  ultimaFecha?: string | null;
}

/** Resumen del hub (4 cards). */
export interface VagResumen {
  activos: VagMetric;
  movimientos: VagMetric;
  cuentasCobrar: VagMetric;
  cuentasPagar: VagMetric;
}

/** Item de un grupo de "Movimientos consolidados" de un activo. */
export interface VagActivoGrupoItem {
  id: string;
  nombre: string;
  monto: number;
  /** Movimiento al que navega la flecha (vista Movimientos con foco). */
  movimientoId?: string;
}

/** Grupo de movimientos consolidados (Activos / Administrativos / Financieros). */
export interface VagActivoGrupo {
  id: string;
  titulo: string;
  subpartida: string;
  /** Monto de la subpartida; opcional (el mockup solo lo muestra en algunos grupos). */
  monto?: number;
  items: VagActivoGrupoItem[];
}

/** Un activo de VAG (tarjeta expandible de la vista Activos). */
export interface VagActivo {
  id: string;
  nombre: string;
  tipo: string;
  fechaAdquisicion: string;
  valorAdquisicion: number;
  valorEstimado: number | null;
  valorContable: number;
  avaluoCatastral: number | null;
  valorPredial: number | null;
  valorSeguro: number | null;
  vigencia: string | null;
  aseguradora: string | null;
  ciudad: string | null;
  direccion: string | null;
  numeroMatricula: string | null;
  fichaCatastral: { numero: string } | null;
  gruposMovimientos: VagActivoGrupo[];
}

/** Un movimiento (fila expandible de la vista Movimientos). */
export interface VagMovimiento {
  id: string;
  nombre: string;
  tipo: string;
  /** ISO yyyy-mm-dd. */
  fecha: string;
  valor: number;
  subpartida: string;
  tercero: string;
  observaciones: string;
}

/** Movimiento resumido dentro de una cuenta por cobrar/pagar. */
export interface VagCuentaMovimiento {
  id: string;
  tipo: string;
  monto: number;
  movimientoId?: string;
}

/** Una cuenta por cobrar o por pagar (fila expandible). */
export interface VagCuenta {
  id: string;
  /** Tercero (nombre del deudor/acreedor). */
  nombre: string;
  saldo: number;
  /** Nombre de la cuenta contable (ej. "PROVEEDORES"). */
  cuenta: string;
  direccion: string | null;
  /** Solo cuentas por pagar. */
  servicio?: string;
  movimientos: VagCuentaMovimiento[];
}

export type VagCuentaTipo = 'cobrar' | 'pagar';

/** Documento adjunto de un activo (ficha catastral / escritura…).
 * Uno por activo; re-subir reemplaza. */
export interface VagActivoDoc {
  activoId: string;
  archivoOriginal: string | null;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  updatedAt: string;
}

/** Input del picker para subir/reemplazar el documento de un activo. */
export interface VagDocUploadInput {
  activoId: string;
  /** Nombre del activo — nombre visible del archivo en el Repositorio. */
  activoNombre: string;
  fileUri: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  /** En web el picker entrega el File del browser; se sube directo. */
  webFile?: Blob;
  /** Path del documento anterior; se borra tras reemplazarlo. */
  previousStoragePath?: string | null;
}

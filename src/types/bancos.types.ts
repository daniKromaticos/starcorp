/**
 * Tipos del Informe Bancos.
 *
 * Una empresa = un valor de EMPRESA en la tabla curada BANCOS de Power BI
 * (staging en Supabase `bancos`, sync diario vía pbi-sync-bancos). Cada
 * empresa agrupa cuentas bancarias con saldo en USD. `balance` puede ser
 * null cuando la empresa no tiene cuentas con datos.
 */

export interface BancoCuenta {
  id: string;
  name: string;
  /** Código corto mostrado bajo el nombre (ej. "CK 0932"). */
  code: string;
  /** Color sólido del dot en la lista (primer color del degradado). */
  color: string;
  /** Degradado completo de la barra (primer color arriba → último abajo). */
  gradient?: readonly string[];
  /** Saldo en USD. */
  balance: number;
  /** Origen del saldo en PBI ('CONTROL' | 'SOLO QUICKBOOKS'). */
  estado?: string;
}

export interface BancoEmpresa {
  id: string;
  name: string;
  /** Saldo agregado de las cuentas; null si la empresa no tiene cuentas conectadas. */
  balance: number | null;
  /** Variación porcentual vs periodo anterior. */
  deltaPct: number;
  /**
   * Fecha ISO de la última actualización de las cuentas (máx.
   * FECHA ACTUALIZACION en PBI). null si no hay cuentas con datos.
   */
  lastUpdatedAt: string | null;
  cuentas: BancoCuenta[];
}

export interface BancosSnapshot {
  /** Suma de todas las balances no-null de todas las empresas. */
  totalizado: number;
  /** Delta del totalizado. */
  deltaPct: number;
  /** Fecha de corte (ISO yyyy-mm-dd). */
  updatedAt: string;
  empresas: BancoEmpresa[];
}

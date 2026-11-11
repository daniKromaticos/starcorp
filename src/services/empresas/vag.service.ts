/**
 * Service: VAG
 *
 * Fuente real: RPCs get_vag_* sobre vag_activos/vag_movimientos (sync
 * diario de las tablas curadas ListadoActivosVag y MovimientosVag de
 * Power BI vía pbi-sync-vag). Cuentas por cobrar/por pagar salen de
 * vag_movimientos filtrado por CENTRO DE COSTO = "Cuentas por Cobrar" /
 * "Cuentas por pagar" y agrupado por tercero (get_vag_cuentas, migración
 * 0037); esas filas son saldos de corte, no gastos, así que
 * get_vag_movimientos/get_vag_resumen las excluyen del cálculo normal.
 */

import { supabase } from '@/src/config/supabase';
import { withMock } from '@/src/services/mock/mock-adapter';
import {
  getVagActivosMock,
  getVagCuentasMock,
  getVagMovimientosMock,
  getVagResumenMock,
} from '@/src/services/mock/vag.mock';
import type {
  VagActivo,
  VagCuenta,
  VagCuentaTipo,
  VagMovimiento,
  VagResumen,
} from '@/src/types/vag.types';

// ── Formas crudas de los RPCs ────────────────────────────────────────
interface RpcMetric {
  total: number;
  delta_pct: number;
  ultima_fecha?: string | null;
}

interface RpcResumen {
  activos: RpcMetric;
  movimientos: RpcMetric;
  cuentas_cobrar: RpcMetric;
  cuentas_pagar: RpcMetric;
}

interface RpcActivoMovimiento {
  id: number;
  fecha: string;
  nombre: string;
  valor: number;
}

interface RpcActivo {
  id: string;
  nombre: string;
  tipo: string;
  fecha_adquisicion: string | null;
  valor_adquisicion: number | null;
  valor_estimado: number | null;
  valor_contable: number | null;
  avaluo_catastral: number | null;
  valor_predial: number | null;
  valor_seguro: number | null;
  vigencia: string | null;
  aseguradora: string | null;
  ciudad: string | null;
  direccion: string | null;
  matricula: string | null;
  ficha_catastral: string | null;
  movimientos: RpcActivoMovimiento[];
}

interface RpcMovimiento {
  id: number;
  nombre: string;
  tipo: string;
  fecha: string;
  valor: number;
  subpartida: string;
  tercero: string;
  observaciones: string;
}

interface RpcCuentaMovimiento {
  id: string;
  tipo: string;
  monto: number;
  movimientoId: string;
}

interface RpcCuenta {
  id: string;
  nombre: string;
  saldo: number;
  cuenta: string;
  direccion: string | null;
  movimientos: RpcCuentaMovimiento[];
}

/** ISO yyyy-mm-dd → dd/mm/yyyy (formato de las cards). */
function formatFecha(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── Fetchers reales ──────────────────────────────────────────────────
async function fetchResumen(): Promise<VagResumen> {
  const { data, error } = await supabase.rpc('get_vag_resumen');
  if (error) throw new Error(`get_vag_resumen: ${error.message}`);
  const r = data as RpcResumen;
  const metric = (m: RpcMetric) => ({
    total: Number(m.total),
    deltaPct: Number(m.delta_pct),
    ultimaFecha: m.ultima_fecha ?? null,
  });
  return {
    activos: metric(r.activos),
    movimientos: metric(r.movimientos),
    cuentasCobrar: metric(r.cuentas_cobrar),
    cuentasPagar: metric(r.cuentas_pagar),
  };
}

async function fetchActivos(): Promise<VagActivo[]> {
  const { data, error } = await supabase.rpc('get_vag_activos');
  if (error) throw new Error(`get_vag_activos: ${error.message}`);
  return (data as RpcActivo[]).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    tipo: a.tipo,
    fechaAdquisicion: formatFecha(a.fecha_adquisicion) ?? '--',
    valorAdquisicion: Number(a.valor_adquisicion ?? 0),
    valorEstimado: a.valor_estimado == null ? null : Number(a.valor_estimado),
    valorContable: Number(a.valor_contable ?? 0),
    avaluoCatastral:
      a.avaluo_catastral == null ? null : Number(a.avaluo_catastral),
    valorPredial: a.valor_predial == null ? null : Number(a.valor_predial),
    valorSeguro: a.valor_seguro == null ? null : Number(a.valor_seguro),
    vigencia: formatFecha(a.vigencia),
    aseguradora: a.aseguradora,
    ciudad: a.ciudad,
    direccion: a.direccion,
    numeroMatricula: a.matricula,
    fichaCatastral: a.ficha_catastral ? { numero: a.ficha_catastral } : null,
    gruposMovimientos: a.movimientos.length
      ? [
          {
            id: `${a.id}-movs`,
            titulo: 'Movimientos',
            subpartida: a.tipo,
            items: a.movimientos.map((m) => ({
              id: String(m.id),
              nombre: m.nombre,
              monto: Number(m.valor),
              movimientoId: String(m.id),
            })),
          },
        ]
      : [],
  }));
}

async function fetchCuentas(tipo: VagCuentaTipo): Promise<VagCuenta[]> {
  const { data, error } = await supabase.rpc('get_vag_cuentas', {
    p_tipo: tipo,
  });
  if (error) throw new Error(`get_vag_cuentas: ${error.message}`);
  return (data as RpcCuenta[]).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    saldo: Number(c.saldo),
    cuenta: c.cuenta,
    direccion: c.direccion,
    movimientos: c.movimientos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      monto: Number(m.monto),
      movimientoId: m.movimientoId,
    })),
  }));
}

async function fetchMovimientos(): Promise<VagMovimiento[]> {
  const { data, error } = await supabase.rpc('get_vag_movimientos');
  if (error) throw new Error(`get_vag_movimientos: ${error.message}`);
  return (data as RpcMovimiento[]).map((m) => ({
    id: String(m.id),
    nombre: m.nombre,
    tipo: m.tipo,
    fecha: m.fecha,
    valor: Number(m.valor),
    subpartida: m.subpartida,
    tercero: m.tercero,
    observaciones: m.observaciones,
  }));
}

// ── API pública (mock-aware, mismo criterio que el resto de servicios) ─
export function getVagResumen(): Promise<VagResumen> {
  return withMock(fetchResumen, getVagResumenMock);
}

export function getVagActivos(): Promise<VagActivo[]> {
  return withMock(fetchActivos, getVagActivosMock);
}

export function getVagMovimientos(): Promise<VagMovimiento[]> {
  return withMock(fetchMovimientos, getVagMovimientosMock);
}

export function getVagCuentas(tipo: VagCuentaTipo): Promise<VagCuenta[]> {
  return withMock(() => fetchCuentas(tipo), () => getVagCuentasMock(tipo));
}

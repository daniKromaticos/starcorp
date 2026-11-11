/**
 * Bancos service.
 *
 * Real path: lee la tabla `bancos` de Supabase — staging de la tabla
 * curada BANCOS del dataset PBI Auxiliar (EMPRESA, NUMERO DE CUENTA,
 * SALDO, ESTADO, BANCO, ID CUENTA, FECHA ACTUALIZACION), sincronizada
 * a diario por la edge function pbi-sync-bancos. Ya no consulta
 * QuickBooks en vivo.
 *
 * Mock path: getBancosMock() del mock existente.
 *
 * El delta % compara el saldo actual contra el snapshot diario más
 * reciente anterior a hoy (tabla bancos_snapshots, poblada por el mismo
 * sync). Se lee con el RPC get_bancos_previous(); si una empresa no
 * tiene snapshot previo (primer día en la tabla) el delta queda en 0.
 */

import { withMock } from '@/src/services/mock/mock-adapter';
import { getBancosMock } from '@/src/services/mock/bancos.mock';
import { supabase } from '@/src/config/supabase';
import type {
  BancoCuenta,
  BancoEmpresa,
  BancosSnapshot,
} from '@/src/types/bancos.types';
import { CHART_COLORS, CHART_GRADIENTS } from '@/src/theme/chart-palette';

/** Fila de la tabla `bancos` (staging de PBI BANCOS). */
interface PbiBancoRow {
  empresa: string;
  numero_cuenta: string;
  saldo: number | string;
  estado: string | null;
  banco: string | null;
  id_cuenta: string | null;
  fecha_actualizacion: string | null;
}

function slugify(name: string, fallback: string): string {
  if (!name) return fallback;
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

/** "CK 6321339230" → "CK 9230"; "SV 8751" → "SV 8751". */
function buildCode(numeroCuenta: string): string {
  const m = numeroCuenta.trim().match(/^([A-Za-z]+)\s*(.*)$/);
  const prefix = m?.[1]?.toUpperCase() ?? 'CK';
  const digits = (m?.[2] ?? numeroCuenta).replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return last4 ? `${prefix} ${last4}` : numeroCuenta;
}

interface PreviousBalanceRow {
  empresa: string;
  previous_total: number | string;
  snapshot_date: string;
}

/** deltaPct entre el saldo actual y el snapshot previo; 0 si no hay base. */
function computeDeltaPct(current: number | null, previous: number | undefined): number {
  if (current == null || !previous) return 0;
  return ((current - previous) / previous) * 100;
}

async function fetchPreviousBalances(): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('get_bancos_previous');
  if (error) {
    console.warn('[bancos] get_bancos_previous failed', error);
    return new Map();
  }
  const rows = (data as PreviousBalanceRow[] | null) ?? [];
  return new Map(rows.map((r) => [r.empresa, Number(r.previous_total)]));
}

function buildEmpresa(
  name: string,
  rows: PbiBancoRow[],
  previousByEmpresa: Map<string, number>,
): BancoEmpresa {
  const empresaId = slugify(name, name);

  // Cuentas ordenadas por saldo desc; los colores del chart se asignan
  // por índice, igual que hacía el flujo QB.
  const sorted = [...rows].sort((a, b) => Number(b.saldo) - Number(a.saldo));
  const cuentas: BancoCuenta[] = sorted.map((row, idx) => ({
    id: `${empresaId}-acc-${slugify(row.numero_cuenta, String(idx))}`,
    name: row.id_cuenta ?? row.banco ?? row.numero_cuenta,
    code: buildCode(row.numero_cuenta),
    color: CHART_COLORS[idx % CHART_COLORS.length],
    gradient: CHART_GRADIENTS[idx % CHART_GRADIENTS.length],
    balance: Number(row.saldo) || 0,
    estado: row.estado ?? undefined,
  }));

  const balance = cuentas.length
    ? cuentas.reduce((s, c) => s + c.balance, 0)
    : null;

  const lastUpdatedAt = rows
    .map((r) => r.fecha_actualizacion)
    .filter((d): d is string => d != null)
    .sort()
    .pop() ?? null;

  return {
    id: empresaId,
    name,
    balance,
    deltaPct: computeDeltaPct(balance, previousByEmpresa.get(name)),
    lastUpdatedAt,
    cuentas,
  };
}

async function fetchFromPbi(): Promise<BancosSnapshot> {
  const [{ data, error }, previousByEmpresa] = await Promise.all([
    supabase.from('bancos').select('*'),
    fetchPreviousBalances(),
  ]);
  if (error) throw error;

  const rows = (data as PbiBancoRow[] | null) ?? [];
  const todayIso = new Date().toISOString().slice(0, 10);

  if (rows.length === 0) {
    // Sync aún no corrió → snapshot vacío. La UI muestra el hero en 0 y
    // la lista vacía.
    return { totalizado: 0, deltaPct: 0, updatedAt: todayIso, empresas: [] };
  }

  const byEmpresa = new Map<string, PbiBancoRow[]>();
  for (const row of rows) {
    const list = byEmpresa.get(row.empresa);
    if (list) list.push(row);
    else byEmpresa.set(row.empresa, [row]);
  }

  const empresas = [...byEmpresa.entries()]
    .map(([name, list]) => buildEmpresa(name, list, previousByEmpresa))
    .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));

  const totalizado = empresas.reduce((s, e) => s + (e.balance ?? 0), 0);
  const totalPrevious = [...previousByEmpresa.values()].reduce((s, v) => s + v, 0);

  // Fecha de corte = FECHA ACTUALIZACION más reciente entre las cuentas;
  // fallback a hoy si el origen no trae fechas.
  const latestUpdate = empresas
    .map((e) => e.lastUpdatedAt)
    .filter((t): t is string => t != null)
    .sort()
    .pop();

  return {
    totalizado,
    deltaPct: computeDeltaPct(totalizado, totalPrevious),
    updatedAt: latestUpdate ?? todayIso,
    empresas,
  };
}

export async function getBancosSnapshot(): Promise<BancosSnapshot> {
  return withMock(fetchFromPbi, () => getBancosMock());
}

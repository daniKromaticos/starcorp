/**
 * asociados.service — Snapshot del Informe Asociados activos.
 *
 * Real path: RPC get_asociados_snapshot (Supabase), que agrupa los empleados
 * activos de empleados_detail por cliente (Sub Account). Datos sincronizados
 * de PBI empleadosHotel por la edge function pbi-sync-empleados.
 *
 * "Activo" = tiene codigoalterno. empleadosHotel nunca trae Retirement Date,
 * así que ese filtro no descarta a nadie y la tabla arrastra gente que ya no
 * está vigente (migración 0048). Además la identidad de persona es
 * codigoalterno, no id_employee: quien atiende varias cuentas tiene una fila
 * por cliente, y el RPC deduplica quedándose con la asignación vigente
 * (migración 0049). El color de cada cliente se asigna aquí (la paleta es
 * presentación, no dato del RPC).
 */

import { supabase } from '@/src/config/supabase';
import { withMock } from '@/src/services/mock/mock-adapter';
import {
  getAsociadosMock,
  getAsociadosTrendMock,
} from '@/src/services/mock/asociados.mock';
import { SEGMENT_PALETTE as PALETTE } from '@/src/theme/gradients';
import type {
  AsociadoClient,
  AsociadosSnapshot,
  AsociadosTrend,
} from '@/src/types/asociados.types';

interface RpcEmployee {
  id: string;
  name: string;
  area: string;
  codigoInterno: string;
}

interface RpcClient {
  id: string;
  name: string;
  account: string | null;
  employees: RpcEmployee[];
}

interface RpcSnapshot {
  updatedAt: string;
  clients: RpcClient[];
}

async function fetchFromPBI(): Promise<AsociadosSnapshot> {
  const { data, error } = await supabase.rpc('get_asociados_snapshot');
  if (error) throw error;
  const snap = (data ?? { updatedAt: '', clients: [] }) as RpcSnapshot;

  // El RPC ya ordena clientes por nombre, así que el color por índice es
  // estable entre cargas.
  const clients: AsociadoClient[] = (snap.clients ?? []).map((c, i) => ({
    id: c.id,
    name: c.name,
    account: c.account ?? null,
    color: PALETTE[i % PALETTE.length],
    employees: c.employees ?? [],
  }));

  return { updatedAt: snap.updatedAt, clients };
}

export async function getAsociadosSnapshot(): Promise<AsociadosSnapshot> {
  return withMock(fetchFromPBI, () => getAsociadosMock());
}

/**
 * Serie de tendencia de asociados por cliente.
 * Real path: RPC get_asociados_trend (historico_emp_cli, de PBI
 * HistoricoEmpXCli vía pbi-sync-historico).
 */
async function fetchTrendFromPBI(): Promise<AsociadosTrend> {
  const { data, error } = await supabase.rpc('get_asociados_trend');
  if (error) throw error;
  const trend = (data ?? {
    updatedAt: '',
    months: [],
    series: [],
  }) as AsociadosTrend;
  return {
    updatedAt: trend.updatedAt ?? '',
    months: trend.months ?? [],
    series: (trend.series ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      counts: (s.counts ?? []).map((n) => Number(n) || 0),
    })),
  };
}

export async function getAsociadosTrend(): Promise<AsociadosTrend> {
  // Sin fallback a mock: si el RPC viene vacío (sync caído), la vista muestra
  // su estado vacío. Rellenarlo con datos inventados ocultaba la falla.
  return withMock(fetchTrendFromPBI, () => getAsociadosTrendMock());
}

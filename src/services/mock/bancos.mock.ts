/**
 * Mock data del Informe Bancos.
 *
 * 8 empresas (Realms de QuickBooks). Las primeras 6 tienen cuentas y
 * saldos; las últimas 2 muestran "--" porque aún no están conectadas.
 * Los montos coinciden con los del mockup del informe.
 */

import type { BancoEmpresa, BancosSnapshot } from '@/src/types/bancos.types';
import { CHART_COLORS, CHART_GRADIENTS } from '@/src/theme/chart-palette';

const CUENTAS_POR_EMPRESA: Record<string, { name: string; code: string; balance: number }[]> = {
  '5-stars': [
    { name: 'Chase Checking', code: 'CK 0932', balance: 5271.89 },
    { name: 'Chase Saving', code: 'SW 8751', balance: 3060.78 },
  ],
  'one-a': [
    { name: 'BofA Checking', code: 'CK 4421', balance: 4980.12 },
    { name: 'BofA Saving', code: 'SW 1108', balance: 2486.88 },
  ],
  'seasons-solutions': [
    { name: 'Wells Fargo Checking', code: 'CK 7720', balance: 21340.5 },
    { name: 'Wells Fargo Saving', code: 'SW 3318', balance: 12100.25 },
    { name: 'Chase Operations', code: 'CK 9941', balance: 6099.25 },
  ],
  mcs: [
    { name: 'Chase Checking', code: 'CK 0044', balance: 24500.0 },
    { name: 'Chase Payroll', code: 'CK 6612', balance: 11200.4 },
    { name: 'Chase Reserves', code: 'SW 2210', balance: 4964.6 },
  ],
  'clean-with-me': [
    { name: 'BofA Checking', code: 'CK 1450', balance: 3120.0 },
    { name: 'BofA Saving', code: 'SW 5588', balance: 1680.0 },
  ],
  'blue-solutions': [
    { name: 'Chase Checking', code: 'CK 7301', balance: 880.4 },
    { name: 'Chase Saving', code: 'SW 9920', balance: 466.6 },
  ],
};

const EMPRESAS_INPUT: { id: string; name: string; deltaPct: number; connected: boolean }[] = [
  { id: '5-stars', name: '5 Stars', deltaPct: 1.87, connected: true },
  { id: 'one-a', name: 'One A', deltaPct: -1.87, connected: true },
  { id: 'seasons-solutions', name: 'Seasons Solutions', deltaPct: 2.5, connected: true },
  { id: 'mcs', name: 'MCS', deltaPct: 1.2, connected: true },
  { id: 'clean-with-me', name: 'Clean with me', deltaPct: 3.0, connected: true },
  { id: 'blue-solutions', name: 'Blue Solutions', deltaPct: 1.95, connected: true },
  { id: 'living-group', name: 'Living Group', deltaPct: 1.65, connected: false },
  { id: 'best-services', name: 'Best Services', deltaPct: 1.0, connected: false },
];

function buildSnapshot(): BancosSnapshot {
  const empresas: BancoEmpresa[] = EMPRESAS_INPUT.map((e) => {
    if (!e.connected) {
      return {
        id: e.id,
        name: e.name,
        balance: null,
        deltaPct: e.deltaPct,
        lastUpdatedAt: null,
        cuentas: [],
      };
    }
    const cuentasRaw = CUENTAS_POR_EMPRESA[e.id] ?? [];
    const cuentas = cuentasRaw.map((c, idx) => ({
      id: `${e.id}-acc-${idx + 1}`,
      name: c.name,
      code: c.code,
      color: CHART_COLORS[idx % CHART_COLORS.length],
      gradient: CHART_GRADIENTS[idx % CHART_GRADIENTS.length],
      balance: c.balance,
    }));
    const balance = cuentas.reduce((s, c) => s + c.balance, 0);
    return {
      id: e.id,
      name: e.name,
      balance,
      deltaPct: e.deltaPct,
      lastUpdatedAt: '2026-04-07T12:00:00Z',
      cuentas,
    };
  });

  const totalizado = empresas.reduce((s, e) => s + (e.balance ?? 0), 0);

  return {
    totalizado,
    deltaPct: 1.87,
    updatedAt: '2026-04-07',
    empresas,
  };
}

const SNAPSHOT = buildSnapshot();

export async function getBancosMock(): Promise<BancosSnapshot> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return SNAPSHOT;
}

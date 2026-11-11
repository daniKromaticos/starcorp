/**
 * Mock data del Informe Asociados activos.
 */

import type {
  AsociadoClient,
  AsociadoEmployee,
  AsociadosSnapshot,
  AsociadosTrend,
} from '@/src/types/asociados.types';

const PALETTE = [
  '#9B2C2C', // wine
  '#1A2B6D', // navy
  '#0E7490', // teal
  '#65A30D', // lime
  '#D9E021', // yellow-lime
  '#3B82F6', // azure
  '#0B1F4A', // dark navy
  '#F6AD55', // amber
  '#7C3AED', // purple
  '#DC2626', // red
  '#059669', // emerald
  '#A16207', // ochre
];

const FIRST_NAMES = [
  'Abigail',
  'Arasu',
  'Adolfo',
  'Amalia',
  'Andrea',
  'Andrés',
  'Beatriz',
  'Camilo',
  'Daniela',
  'Eduardo',
  'Fernanda',
  'Gabriel',
  'Helena',
  'Iván',
  'Julieta',
  'Kevin',
  'Laura',
  'Mateo',
  'Nicolás',
  'Olivia',
  'Pablo',
  'Rocío',
  'Santiago',
  'Tamara',
];

const LAST_NAMES = [
  'Vera',
  'Coette',
  'Zambrano',
  'Contreras',
  'Jaramillo',
  'Cardona',
  'López',
  'Pérez',
  'Hernández',
  'Ramírez',
  'González',
  'Torres',
  'Morales',
  'Castro',
  'Mendoza',
  'Vásquez',
  'Salazar',
  'Rojas',
];

const AREA_CYCLE: string[] = [
  'HOUSEKEEPING',
  'STEWARD',
  'LINE COOK',
  'TRANSPORTE',
  'ROOM ATTENDANT',
  'SUPERVISOR',
];

const CLIENT_NAMES = [
  'Administrative Team Stars',
  'Administrative Team Patriot',
  'Benchmark',
  'Best Beach Getaways',
  'Camelback',
  'Courtyard Marriot Bethlehem',
  'Done Rite Building Services',
  'Echid Ohio',
  'Elements',
  'Ford',
  'Great Wolf Resort',
  'Okana Resort',
];

const COUNTS = [1, 6, 3, 1, 48, 2, 2, 2, 3, 2, 25, 18];

function pickName(seed: number): string {
  const first = FIRST_NAMES[seed % FIRST_NAMES.length];
  const last = LAST_NAMES[(seed * 7) % LAST_NAMES.length];
  return `${first} ${last}`;
}

function buildEmployees(clientId: string, count: number, seed: number): AsociadoEmployee[] {
  const employees: AsociadoEmployee[] = [];
  for (let i = 0; i < count; i++) {
    const area = AREA_CYCLE[(seed + i) % AREA_CYCLE.length];
    const codigoBase = 1000 + ((seed * 137 + i * 53) % 9000);
    employees.push({
      id: `${clientId}-emp-${i + 1}`,
      name: pickName(seed + i),
      area,
      codigoInterno: String(codigoBase),
    });
  }
  return employees;
}

const SNAPSHOT: AsociadosSnapshot = {
  updatedAt: '2026-04-07',
  clients: CLIENT_NAMES.map((name, idx) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return {
      id,
      name,
      account: null,
      color: PALETTE[idx % PALETTE.length],
      employees: buildEmployees(id, COUNTS[idx] ?? 5, idx + 1),
    } as AsociadoClient;
  }),
};

export async function getAsociadosMock(): Promise<AsociadosSnapshot> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return SNAPSHOT;
}

// ─── Tendencia (mock con forma de HistoricoEmpXCli) ───────────────────────────

const TREND_MONTHS = [
  '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
];

// Serie determinista alrededor del conteo actual: leve oscilación + tendencia
// ascendente suave (sin Math.random para mantenerla estable entre cargas).
function buildTrendCounts(base: number, seed: number): number[] {
  return TREND_MONTHS.map((_, m) => {
    const wobble = Math.round(base * 0.22 * Math.sin((m + seed) * 0.85));
    const trend = Math.round((base * 0.12 * m) / (TREND_MONTHS.length - 1));
    return Math.max(0, base - Math.round(base * 0.12) + wobble + trend);
  });
}

const TREND: AsociadosTrend = {
  updatedAt: '2026-04-07',
  months: TREND_MONTHS,
  series: CLIENT_NAMES.map((name, idx) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    counts: buildTrendCounts(COUNTS[idx] ?? 5, idx + 1),
  })),
};

export async function getAsociadosTrendMock(): Promise<AsociadosTrend> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return TREND;
}

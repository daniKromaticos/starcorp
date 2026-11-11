/**
 * Mock data del Informe Pagos.
 *
 * Genera ~80 pagos distribuidos durante marzo 2026 con varias empresas
 * generadoras, centros de costos, empleados y conceptos. El bucket
 * (bajo/medio/alto) por día queda precalculado en el snapshot para que
 * el heatmap del calendario tenga colores estables entre renders.
 */

import type {
  CentroCostos,
  DayBucket,
  Empleado,
  EmpresaGeneradora,
  MontoBucket,
  Pago,
  PagosSnapshot,
} from '@/src/types/pagos.types';
import { CHART_COLORS } from '@/src/theme/chart-palette';
import { OTROS_SEGMENT_COLOR } from '@/src/theme/gradients';

const TODAY_ISO = '2026-05-28';

// Colores del donut homologados a la paleta canónica (ciclo por índice).
// El bucket "Otros" usa el gris neutro como en los demás donuts de informes.
const EMPRESAS: EmpresaGeneradora[] = [
  { id: 'blue-star', name: 'Blue star', color: CHART_COLORS[0] },
  { id: 'clean-with-me', name: 'Clean with me', color: CHART_COLORS[1] },
  { id: 'mcs', name: 'MCS', color: CHART_COLORS[2] },
  { id: 'living-group', name: 'Living group', color: CHART_COLORS[3] },
  { id: 'anchorage-inn', name: 'Anchorage inn', color: CHART_COLORS[4] },
  { id: 'back-9-golf', name: 'Back 9 golf and entertainment', color: CHART_COLORS[5] },
  { id: 'kona-village', name: 'Kona Village', color: CHART_COLORS[6] },
  { id: 'great-wolf', name: 'Great Wolf resort holding', color: CHART_COLORS[7] },
  { id: 'kalahari', name: 'Kalahari developement LLC', color: CHART_COLORS[0] },
  { id: 'innvite', name: 'Innvite hospitality', color: CHART_COLORS[1] },
  { id: 'otros', name: 'Otros', color: OTROS_SEGMENT_COLOR },
];

const CENTROS_COSTOS: CentroCostos[] = [
  { id: 'living-group-cc', name: 'Living Group' },
  { id: 'admin-team', name: 'Admin team' },
  { id: 'best-beach', name: 'Best Beach' },
  { id: 'camelback', name: 'Camelback' },
  { id: 'okana-resort', name: 'Okana Resort' },
  { id: 'great-wolf-cc', name: 'Great Wolf' },
];

const EMPLEADOS: Empleado[] = [
  { id: 'gio-lopez', name: 'Gio Lopez' },
  { id: 'alejandro-carvajal', name: 'Alejandro Carvajal' },
  { id: 'helena-vera', name: 'Helena Vera' },
  { id: 'pablo-coette', name: 'Pablo Coette' },
  { id: 'andrea-zambrano', name: 'Andrea Zambrano' },
  { id: 'kevin-jaramillo', name: 'Kevin Jaramillo' },
];

const CONCEPTOS = [
  'Celular corporativo',
  'Gasolina',
  'Hospedaje',
  'Mantenimiento',
  'Servicios públicos',
  'Suministros',
];

const MARZO = '2026-03';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function buildPagos(): Pago[] {
  const pagos: Pago[] = [];
  // Días con pago (un día puede tener varios pagos). Inspirado en el mockup.
  const diasConPagos = [2, 3, 4, 5, 6, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 30, 31];
  let counter = 0;
  diasConPagos.forEach((dia) => {
    // 3–5 pagos por día.
    const n = 3 + (dia % 3);
    for (let i = 0; i < n; i++) {
      const empresa = pick(EMPRESAS, counter);
      const cc = pick(CENTROS_COSTOS, counter + 1);
      const emp = pick(EMPLEADOS, counter + 2);
      const concepto = pick(CONCEPTOS, counter + dia);
      // Montos: la mayoría chicos ($60–$5k), un par grandes para teñir días
      // de rojo en el heatmap (días 3 y 4).
      let monto = 60;
      if (dia === 3) monto = i === 0 ? 24000 : 5000;
      else if (dia === 4) monto = i === 0 ? 35000 : 7000;
      else monto = 60 + ((counter * 137) % 4000);
      pagos.push({
        id: `pago-${MARZO}-${pad(dia)}-${i}`,
        empresaId: empresa.id,
        centroCostosId: cc.id,
        empleadoId: emp.id,
        concepto,
        fecha: `${MARZO}-${pad(dia)}`,
        monto,
      });
      counter++;
    }
  });
  return pagos;
}

const PAGOS = buildPagos();

function buildDayBuckets(pagos: Pago[]): Record<string, MontoBucket> {
  // Agrupamos por fecha y categorizamos por percentiles (33/66) sobre los
  // totales diarios. Resultado: cada día con pagos queda en bajo/medio/alto.
  const totalsByDate = new Map<string, number>();
  for (const p of pagos) {
    totalsByDate.set(p.fecha, (totalsByDate.get(p.fecha) ?? 0) + p.monto);
  }
  const sortedTotals = [...totalsByDate.values()].sort((a, b) => a - b);
  if (sortedTotals.length === 0) return {};
  const p33 = sortedTotals[Math.floor(sortedTotals.length * 0.33)];
  const p66 = sortedTotals[Math.floor(sortedTotals.length * 0.66)];
  const buckets: Record<string, MontoBucket> = {};
  totalsByDate.forEach((total, fecha) => {
    if (total <= p33) buckets[fecha] = 'bajo';
    else if (total <= p66) buckets[fecha] = 'medio';
    else buckets[fecha] = 'alto';
  });
  return buckets;
}

const DAY_BUCKETS = buildDayBuckets(PAGOS);

const SNAPSHOT: PagosSnapshot = {
  pagos: PAGOS,
  empresas: EMPRESAS,
  centrosCostos: CENTROS_COSTOS,
  empleados: EMPLEADOS,
  dayBuckets: DAY_BUCKETS,
  updatedAt: TODAY_ISO,
  todayIso: TODAY_ISO,
};

export async function getPagosMock(): Promise<PagosSnapshot> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return SNAPSHOT;
}

/** Totaliza por día y devuelve la lista para un mes (yyyy-mm). */
export function getDayTotals(pagos: Pago[], yearMonth: string): DayBucket[] {
  const filtered = pagos.filter((p) => p.fecha.startsWith(yearMonth));
  const map = new Map<string, number>();
  for (const p of filtered) {
    map.set(p.fecha, (map.get(p.fecha) ?? 0) + p.monto);
  }
  return [...map.entries()].map(([fecha, total]) => ({
    fecha,
    total,
    bucket: 'medio',
  }));
}

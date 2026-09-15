/**
 * Mock data del Informe Seguros.
 *
 * Reusamos los nombres de las empresas de Bancos. Cada empresa tiene
 * las 3 pólizas estándar (General Liability, Umbrella, Worker Comp).
 * Algunas vigencias se setean a (today + pocos días) para mostrar
 * "Por vencer", y otras a (today − 320) para mostrar "Vencidas".
 */

import type {
  PolizaCompania,
  PolizaPropiedad,
  PolizaVehiculo,
  SeguroEmpresa,
  SegurosSnapshot,
} from '@/src/types/seguros.types';

const TODAY_ISO = '2026-05-28';

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const POLIZA_NAMES = ['General Liability', 'Umbrella', 'Worker Compensation'];

const EMPRESAS_INPUT: { id: string; name: string }[] = [
  { id: '5-stars', name: '5 Stars' },
  { id: 'one-a', name: 'One A' },
  { id: 'seasons-solutions', name: 'Seasons solutions' },
  { id: 'mcs', name: 'MCS' },
  { id: 'clean-with-me', name: 'Clean with me' },
  { id: 'blue-solutions', name: 'Blue Solutions' },
  { id: 'living-group', name: 'Living Group' },
  { id: 'best-services', name: 'Best Services' },
];

// Mezcla por empresa: cada empresa expone 3 pólizas con un patrón
// distinto de vigencia (por vencer / vencida / activa) para que la
// pantalla principal tenga ejemplos en ambas listas.
const VIGENCIA_OFFSETS_BY_EMPRESA: Record<string, [number, number, number]> = {
  '5-stars': [-3, -3, -320],
  'one-a': [-2, 14, -120],
  'seasons-solutions': [22, -1, -45],
  mcs: [40, 8, -200],
  'clean-with-me': [-12, 50, -250],
  'blue-solutions': [3, -90, 90],
  'living-group': [180, 200, -10],
  'best-services': [-30, 60, 365],
};

// Pólizas con Estado=INACTIVA en Notion (empresa → índice de póliza y
// Motivo Inactividad). No aparecen en el informe principal, sólo en el
// histórico.
const INACTIVAS_BY_EMPRESA: Record<string, { index: number; motivo: string }> =
  {
    '5-stars': { index: 2, motivo: 'CANCELADA' },
    'clean-with-me': { index: 2, motivo: 'FALTA DE PAGO' },
  };

function buildPolizas(empresa: { id: string; name: string }): PolizaCompania[] {
  const offsets = VIGENCIA_OFFSETS_BY_EMPRESA[empresa.id] ?? [-3, 14, -320];
  return POLIZA_NAMES.map((nombre, i) => {
    const vigenciaFin = addDays(TODAY_ISO, offsets[i]);
    const vigenciaInicio = addDays(vigenciaFin, -365);
    const inactiva = INACTIVAS_BY_EMPRESA[empresa.id];
    const estado =
      inactiva?.index === i ? ('inactiva' as const) : ('activa' as const);
    const motivoInactividad =
      inactiva?.index === i ? inactiva.motivo : null;
    return {
      id: `${empresa.id}-pol-${i + 1}`,
      empresaId: empresa.id,
      empresaName: empresa.name,
      nombre,
      aseguradora: 'State Farm',
      broker: 'Albert',
      numero: '98-G5-L283-9',
      vigenciaInicio,
      vigenciaFin,
      cobertura: 10_000_000,
      payroll: null,
      costo: 5_895,
      estado,
      motivoInactividad,
    };
  });
}

const EMPRESAS: SeguroEmpresa[] = EMPRESAS_INPUT.map((e) => ({
  id: e.id,
  name: e.name,
  polizas: buildPolizas(e),
}));

const VEHICULOS: PolizaVehiculo[] = [
  {
    id: 'veh-1',
    nombre: 'Ford Trans 350 Negra',
    asignacion: 'Camelback',
    empresaId: '5-stars',
    empresaName: '5 Stars',
    aseguradora: 'Progressive',
    broker: 'Albert',
    numero: '77-V2-K104-1',
    costo: 2_450,
    vigenciaFin: addDays(TODAY_ISO, -3),
  },
  {
    id: 'veh-2',
    nombre: 'Ford Trans 350 Negra',
    asignacion: 'Camelback',
    empresaId: '5-stars',
    empresaName: '5 Stars',
    aseguradora: 'Progressive',
    broker: 'Albert',
    numero: '77-V2-K104-2',
    costo: 2_450,
    vigenciaFin: addDays(TODAY_ISO, 18),
  },
  {
    id: 'veh-3',
    nombre: 'Ford Trans 350 Negra',
    asignacion: 'Camelback',
    empresaId: 'one-a',
    empresaName: 'One A',
    aseguradora: 'GEICO',
    broker: 'Marta',
    numero: '77-V2-K104-3',
    costo: 1_980,
    vigenciaFin: addDays(TODAY_ISO, -320),
  },
  {
    id: 'veh-4',
    nombre: 'Chevy Express 2500',
    asignacion: 'Best Beach',
    empresaId: 'best-services',
    empresaName: 'Best Services',
    aseguradora: 'State Farm',
    broker: 'Albert',
    numero: '51-C8-B770-4',
    costo: 3_120,
    vigenciaFin: addDays(TODAY_ISO, 45),
  },
  {
    id: 'veh-5',
    nombre: 'Toyota Hiace',
    asignacion: 'Okana Resort',
    empresaId: 'mcs',
    empresaName: 'MCS',
    aseguradora: 'GEICO',
    broker: 'Marta',
    numero: '51-C8-B770-5',
    costo: 2_760,
    vigenciaFin: addDays(TODAY_ISO, -120),
    estado: 'inactiva',
    motivoInactividad: 'NO RENOVADA',
  },
];

const PROPIEDADES: PolizaPropiedad[] = [
  { id: 'prop-1', nombre: 'Nitarry', empresaId: '5-stars', empresaName: '5 Stars', aseguradora: 'Travelers', broker: 'Assurance Group', numero: 'CASA-1001', costo: 4200, vigenciaFin: addDays(TODAY_ISO, -3) },
  { id: 'prop-2', nombre: 'Mount Pocono', empresaId: 'mcs', empresaName: 'MCS', aseguradora: 'Chubb', broker: 'Assurance Group', numero: 'CASA-1002', costo: 3850, vigenciaFin: addDays(TODAY_ISO, -320), estado: 'inactiva', motivoInactividad: 'VENCIDA' },
  { id: 'prop-3', nombre: 'Camelback', empresaId: 'one-a', empresaName: 'One A', aseguradora: 'Nationwide', broker: 'Brown & Brown', numero: 'CASA-1003', costo: 5100, vigenciaFin: addDays(TODAY_ISO, 22) },
  { id: 'prop-4', nombre: 'Great Wolf', empresaId: '5-stars', empresaName: '5 Stars', aseguradora: 'Travelers', broker: 'Brown & Brown', numero: 'CASA-1004', costo: 6400, vigenciaFin: addDays(TODAY_ISO, 90) },
];

const SNAPSHOT: SegurosSnapshot = {
  empresas: EMPRESAS,
  vehiculos: VEHICULOS,
  propiedades: PROPIEDADES,
  updatedAt: TODAY_ISO,
  todayIso: TODAY_ISO,
};

export async function getSegurosMock(): Promise<SegurosSnapshot> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return SNAPSHOT;
}

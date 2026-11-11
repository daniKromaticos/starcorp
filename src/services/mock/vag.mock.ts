/**
 * Mock: VAG (hub + Activos, Movimientos, Ctas. por cobrar, Ctas. por pagar)
 *
 * Datos estáticos que calzan con los mockups. Cuando exista la fuente real,
 * reemplazar en `vag.service.ts`.
 */

import type {
  VagActivo,
  VagCuenta,
  VagCuentaTipo,
  VagMovimiento,
  VagResumen,
} from '@/src/types/vag.types';

const RESUMEN: VagResumen = {
  activos: { total: 100000, deltaPct: 1.87 },
  movimientos: { total: 100000, deltaPct: 1.87, ultimaFecha: '2026-07-28' },
  cuentasCobrar: {
    total: 100000000,
    deltaPct: 1.87,
    ultimaFecha: '2026-06-30',
  },
  cuentasPagar: { total: 100000000, deltaPct: 1.87, ultimaFecha: '2026-08-01' },
};

function buildGrupos(prefix: string): VagActivo['gruposMovimientos'] {
  return [
    {
      id: `${prefix}-g1`,
      titulo: 'Activos',
      subpartida: 'Cubierta',
      monto: 20000000,
      items: [
        { id: `${prefix}-g1-i1`, nombre: 'Gastos de mantenimiento', monto: 20000000, movimientoId: 'mov-1' },
        { id: `${prefix}-g1-i2`, nombre: 'Gastos de nómina', monto: 20000000, movimientoId: 'mov-2' },
      ],
    },
    {
      id: `${prefix}-g2`,
      titulo: 'Administrativos',
      subpartida: 'Cubierta',
      items: [
        { id: `${prefix}-g2-i1`, nombre: 'Gastos de mantenimiento', monto: 20000000, movimientoId: 'mov-3' },
        { id: `${prefix}-g2-i2`, nombre: 'Gastos de nómina', monto: 20000000, movimientoId: 'mov-4' },
      ],
    },
    {
      id: `${prefix}-g3`,
      titulo: 'Financieros',
      subpartida: 'Cubierta',
      items: [
        { id: `${prefix}-g3-i1`, nombre: 'Gastos de mantenimiento', monto: 20000000, movimientoId: 'mov-5' },
        { id: `${prefix}-g3-i2`, nombre: 'Gastos de nómina', monto: 20000000, movimientoId: 'mov-1' },
      ],
    },
  ];
}

const ACTIVOS: VagActivo[] = [
  {
    id: 'act-1',
    nombre: 'Clínica Guadalupe',
    tipo: 'Local comercial',
    fechaAdquisicion: '2021',
    valorAdquisicion: 400000000,
    valorEstimado: 1500000000,
    valorContable: 550000000,
    avaluoCatastral: 200000000,
    valorPredial: 2000000,
    valorSeguro: 2000000,
    vigencia: 'dic 2026',
    aseguradora: 'Sura',
    ciudad: 'Dosquebradas',
    direccion: null,
    numeroMatricula: '260-15490',
    fichaCatastral: { numero: '79790428579834652' },
    gruposMovimientos: buildGrupos('act-1'),
  },
  {
    id: 'act-2',
    nombre: 'Lote La Plata',
    tipo: 'Lote',
    fechaAdquisicion: '2019',
    valorAdquisicion: 250000000,
    valorEstimado: 800000000,
    valorContable: 320000000,
    avaluoCatastral: 150000000,
    valorPredial: 1500000,
    valorSeguro: 1200000,
    vigencia: 'jun 2026',
    aseguradora: 'Sura',
    ciudad: 'Pereira',
    direccion: 'Km 4 vía La Plata',
    numeroMatricula: '290-08211',
    fichaCatastral: { numero: '66170428579100341' },
    gruposMovimientos: buildGrupos('act-2'),
  },
  {
    id: 'act-3',
    nombre: 'Apartamento Pinares',
    tipo: 'Vivienda',
    fechaAdquisicion: '2023',
    valorAdquisicion: 380000000,
    valorEstimado: 520000000,
    valorContable: 400000000,
    avaluoCatastral: 210000000,
    valorPredial: 1800000,
    valorSeguro: 1600000,
    vigencia: 'mar 2027',
    aseguradora: 'Bolívar',
    ciudad: 'Pereira',
    direccion: 'Av. Circunvalar 12-40',
    numeroMatricula: '290-33107',
    fichaCatastral: { numero: '66001428579277119' },
    gruposMovimientos: buildGrupos('act-3'),
  },
];

const MOVIMIENTOS: VagMovimiento[] = [
  {
    id: 'mov-1',
    nombre: 'Lote La Plata',
    tipo: 'Gasto',
    fecha: '2026-01-07',
    valor: 20000000,
    subpartida: 'Cubierta',
    tercero: 'Intechos',
    observaciones: 'Anticipo retiro utilidades',
  },
  {
    id: 'mov-2',
    nombre: 'Movimiento 2',
    tipo: 'Gasto',
    fecha: '2026-01-07',
    valor: 20000000,
    subpartida: 'Cubierta',
    tercero: 'Intechos',
    observaciones: 'Anticipo retiro utilidades',
  },
  {
    id: 'mov-3',
    nombre: 'Movimiento 3',
    tipo: 'Gasto',
    fecha: '2026-01-07',
    valor: 20000000,
    subpartida: 'Cubierta',
    tercero: 'Intechos',
    observaciones: 'Anticipo retiro utilidades',
  },
  {
    id: 'mov-4',
    nombre: 'Movimiento 4',
    tipo: 'Gasto',
    fecha: '2026-01-07',
    valor: 20000000,
    subpartida: 'Cubierta',
    tercero: 'Intechos',
    observaciones: 'Anticipo retiro utilidades',
  },
  {
    id: 'mov-5',
    nombre: 'Movimiento 5',
    tipo: 'Gasto',
    fecha: '2026-01-07',
    valor: 20000000,
    subpartida: 'Cubierta',
    tercero: 'Intechos',
    observaciones: 'Anticipo retiro utilidades',
  },
  {
    id: 'mov-6',
    nombre: 'Clínica Guadalupe',
    tipo: 'Gasto',
    fecha: '2025-12-15',
    valor: 12500000,
    subpartida: 'Cubierta',
    tercero: 'Intechos',
    observaciones: 'Mantenimiento cubierta diciembre',
  },
];

function buildCuentas(tipo: VagCuentaTipo): VagCuenta[] {
  return Array.from({ length: 4 }, (_, i) => ({
    id: `${tipo}-${i + 1}`,
    nombre: `Nombre cuenta por ${tipo === 'cobrar' ? 'cobrar' : 'pagar'}`,
    saldo: 400000,
    cuenta: 'Nombre de la cuenta',
    direccion: 'Nombre de la dirección',
    ...(tipo === 'pagar' ? { servicio: 'Nombre del servicio' } : {}),
    movimientos: [
      { id: `${tipo}-${i + 1}-m1`, tipo: 'Gasto', monto: 20000000, movimientoId: 'mov-1' },
      { id: `${tipo}-${i + 1}-m2`, tipo: 'Gasto', monto: 20000000, movimientoId: 'mov-2' },
    ],
  }));
}

const CUENTAS: Record<VagCuentaTipo, VagCuenta[]> = {
  cobrar: buildCuentas('cobrar'),
  pagar: buildCuentas('pagar'),
};

export function getVagResumenMock(): VagResumen {
  return RESUMEN;
}

export function getVagActivosMock(): VagActivo[] {
  return ACTIVOS;
}

export function getVagMovimientosMock(): VagMovimiento[] {
  return MOVIMIENTOS;
}

export function getVagCuentasMock(tipo: VagCuentaTipo): VagCuenta[] {
  return CUENTAS[tipo];
}

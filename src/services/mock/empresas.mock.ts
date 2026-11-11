/**
 * Mock: Otras compañías
 *
 * Lista de compañías + detalle Ingresos/Gastos (donut por categoría +
 * terceros). Datos estáticos que calzan con los mockups. Cuando exista
 * backend, reemplazar en `empresas.service.ts` (EXPO_PUBLIC_USE_MOCKS).
 */

import type {
  EmpresaDetail,
  EmpresaListItem,
  EmpresaTercero,
} from '@/src/types/empresas.types';

const CATEGORY_COLORS = {
  honorarios: '#1E40C8',
  otros: '#7A2E54',
  arrendamientos: '#4E8A3A',
  personal: '#E8952E',
} as const;

// Lista de terceros compartida por los mockups (mismos nombres/montos en
// Ingresos y Gastos). Colores cíclicos para los dots.
const TERCEROS_BASE: { name: string; amount: number; color: string }[] = [
  { name: 'Suramerica comercial', amount: 52487, color: '#215EF7' },
  { name: 'Servicios nacionales de aprendizaje', amount: 630000, color: '#1938A5' },
  { name: 'Seguros de vida Sudamericana S.A', amount: 300000, color: '#4E8A3A' },
  { name: 'Santiago Castrillon Flores', amount: 265300, color: '#74AC34' },
  {
    name: 'Salud total entidad promotora salud del régimen contributivo y del régimen S',
    amount: 78,
    color: '#E8952E',
  },
  { name: 'Rosa Suroeste S.A.S', amount: 0, color: '#7A2E54' },
  { name: 'Ribisoft S.A.S', amount: 1000000, color: '#FFB74A' },
  { name: 'Organización GL', amount: 58222, color: '#215EF7' },
  { name: 'Mateo Valencia Gómez', amount: 1258225, color: '#1938A5' },
];

function buildTerceros(prefix: string): EmpresaTercero[] {
  return TERCEROS_BASE.map((t, i) => ({
    id: `${prefix}-t${i + 1}`,
    name: t.name,
    color: t.color,
    amount: t.amount,
  }));
}

const TERCEROS_TOTAL = 58584123;

function buildDetail(id: string, name: string): EmpresaDetail {
  return {
    id,
    name,
    ingresos: {
      total: 77630,
      categories: [
        { id: 'honorarios', label: 'Honorarios', color: CATEGORY_COLORS.honorarios, amount: 28000 },
        { id: 'otros', label: 'Otros', color: CATEGORY_COLORS.otros, amount: 9630 },
        { id: 'arrendamientos', label: 'Arrendamientos', color: CATEGORY_COLORS.arrendamientos, amount: 12000 },
        { id: 'personal', label: 'Gastos de personal', color: CATEGORY_COLORS.personal, amount: 28000 },
      ],
      terceros: buildTerceros(`${id}-ing`),
      tercerosTotal: TERCEROS_TOTAL,
    },
    gastos: {
      total: 854265,
      categories: [
        { id: 'honorarios', label: 'Honorarios', color: CATEGORY_COLORS.honorarios, amount: 250000 },
        { id: 'otros', label: 'Otros', color: CATEGORY_COLORS.otros, amount: 104265 },
        { id: 'arrendamientos', label: 'Arrendamientos', color: CATEGORY_COLORS.arrendamientos, amount: 150000 },
        { id: 'personal', label: 'Gastos de personal', color: CATEGORY_COLORS.personal, amount: 350000 },
      ],
      terceros: buildTerceros(`${id}-gas`),
      tercerosTotal: TERCEROS_TOTAL,
    },
  };
}

const LIST: EmpresaListItem[] = [
  { id: 'bbm', name: 'BBM', ingresos: 77630, deltaPercent: 1.87, hasDetail: true },
  { id: 'vag', name: 'Grupo Orion Holding', ingresos: 77630, deltaPercent: 1.87, hasDetail: true },
  // Sin métricas, pero navega a su ruta estática /empresas/repositorio-alejandro.
  { id: 'repositorio-alejandro', name: 'Repositorio Alejandro', ingresos: null, deltaPercent: null, hasDetail: true },
];

const DETAILS: Record<string, EmpresaDetail> = {
  bbm: buildDetail('bbm', 'BBM'),
  vag: buildDetail('vag', 'Grupo Orion Holding'),
};

export function getEmpresasMock(): EmpresaListItem[] {
  return LIST;
}

export function getEmpresaDetailMock(id: string): EmpresaDetail | null {
  return DETAILS[id] ?? null;
}

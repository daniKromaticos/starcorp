/**
 * Service: Otras compañías
 *
 * BBM es real: la tabla AuxiliarBBM de Power BI se sincroniza a diario a
 * `bbm_entries` (edge function pbi-sync-bbm) y aquí se consumen los RPCs
 * `get_bbm_empresa_detail` / `get_bbm_empresa_summary`. Las demás
 * compañías siguen en mock hasta que exista su fuente.
 *
 * Convención de signos (PUC): ingresos = cuenta 4 (crédito − débito);
 * gastos = cuentas 5 y 6 (débito − crédito). El RPC ya lo aplica.
 */

import { supabase } from '@/src/config/supabase';
import {
  getEmpresaDetailMock,
  getEmpresasMock,
} from '@/src/services/mock/empresas.mock';
import type {
  EmpresaCategoriaTercero,
  EmpresaCategory,
  EmpresaDetail,
  EmpresaFilters,
  EmpresaFinancials,
  EmpresaListItem,
  EmpresaTercero,
} from '@/src/types/empresas.types';

// ── Etiquetas PUC ────────────────────────────────────────────────────
// AuxiliarBBM no trae nombre de cuenta, solo códigos; etiquetamos el
// grupo de 4 dígitos (CUENTA4) con el PUC estándar. Grupos equivalentes
// de admin (51xx) y ventas (52xx) comparten etiqueta y se fusionan en una
// sola categoría. Códigos sin mapa muestran "Cuenta NNNN".
const PUC_LABELS: Record<string, string> = {
  '4135': 'Comercio al por mayor y menor',
  '4155': 'Actividades inmobiliarias',
  '4175': 'Devoluciones en ventas',
  '4210': 'Financieros',
  '4220': 'Arrendamientos',
  '4250': 'Recuperaciones',
  '4295': 'Diversos',
  '5105': 'Gastos de personal',
  '5205': 'Gastos de personal',
  '5110': 'Honorarios',
  '5210': 'Honorarios',
  '5115': 'Impuestos',
  '5215': 'Impuestos',
  '5120': 'Arrendamientos',
  '5220': 'Arrendamientos',
  '5125': 'Contribuciones y afiliaciones',
  '5225': 'Contribuciones y afiliaciones',
  '5130': 'Seguros',
  '5230': 'Seguros',
  '5135': 'Servicios',
  '5235': 'Servicios',
  '5140': 'Gastos legales',
  '5240': 'Gastos legales',
  '5145': 'Mantenimiento y reparaciones',
  '5245': 'Mantenimiento y reparaciones',
  '5150': 'Adecuación e instalación',
  '5155': 'Gastos de viaje',
  '5255': 'Gastos de viaje',
  '5160': 'Depreciaciones',
  '5260': 'Depreciaciones',
  '5195': 'Diversos',
  '5295': 'Diversos',
  '5395': 'Diversos',
  '5305': 'Financieros',
  '5315': 'Gastos extraordinarios',
  '5405': 'Impuesto de renta',
  '6135': 'Costo de ventas',
};

// Top 3 categorías + "Otros", como el mockup del donut.
const MAX_CATEGORIES = 3;
const CATEGORY_PALETTE = ['#1E40C8', '#4E8A3A', '#E8952E', '#215EF7', '#74AC34', '#FFB74A'];
const OTROS_COLOR = '#7A2E54';

const TERCERO_COLORS = ['#215EF7', '#1938A5', '#4E8A3A', '#74AC34', '#E8952E', '#7A2E54', '#FFB74A'];

interface BbmRpcFinancials {
  total: number;
  categories: { cuenta4: string; amount: number }[];
  terceros: { tercero: string; nombre: string | null; amount: number }[];
  /** Desglose cuenta4×tercero para el cross-filtrado torta↔lista. */
  matrix?: { cuenta4: string; tercero: string; amount: number }[];
}

interface BbmRpcDetail {
  period: { year: number; month: number } | null;
  ingresos: BbmRpcFinancials;
  gastos: BbmRpcFinancials;
}

interface BbmRpcSummary {
  year: number;
  month: number;
  ingresos: number;
  delta_pct: number;
}

/** get_vag_empresa_summary: total de movimientos del último mes (la
 *  fuente curada de VAG solo trae gastos, no ingresos). */
interface VagRpcSummary {
  year: number;
  month: number;
  total: number;
  delta_pct: number;
}

function pucLabel(cuenta4: string): string {
  return PUC_LABELS[cuenta4] ?? `Cuenta ${cuenta4}`;
}

/** "Gastos de personal" → "cat-gastos-de-personal"; "Otros" → "cat-otros".
 *  Id estable por etiqueta (no por índice) para que la selección de la
 *  torta sobreviva a recálculos y se pueda cruzar con `links`. */
function categoryId(label: string): string {
  return (
    'cat-' +
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

const OTROS_CATEGORY_ID = categoryId('Otros');

/** Fusiona grupos con la misma etiqueta, ordena desc y arma top-N + Otros.
 *  Solo entran montos > 0: un monto negativo (ej. devoluciones) no se puede
 *  dibujar como sector; el total del bloque sí los incluye. */
function buildCategories(raw: BbmRpcFinancials['categories']): EmpresaCategory[] {
  const byLabel = new Map<string, number>();
  for (const c of raw) {
    const label = pucLabel(c.cuenta4);
    byLabel.set(label, (byLabel.get(label) ?? 0) + Number(c.amount));
  }
  const sorted = [...byLabel.entries()]
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  const categories: EmpresaCategory[] = sorted
    .slice(0, MAX_CATEGORIES)
    .map(([label, amount], i) => ({
      id: categoryId(label),
      label,
      color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
      amount,
    }));

  const restSum = sorted
    .slice(MAX_CATEGORIES)
    .reduce((s, [, amount]) => s + amount, 0);
  if (restSum > 0) {
    categories.push({ id: OTROS_CATEGORY_ID, label: 'Otros', color: OTROS_COLOR, amount: restSum });
  }
  return categories;
}

/** matrix (cuenta4×tercero) → links (categoryId×terceroId), agregando por
 *  etiqueta PUC y mandando a "Otros" las categorías fuera del top-N. Las
 *  categorías que no se dibujan (monto total ≤ 0) no generan vínculo. */
function buildLinks(
  prefix: string,
  categories: EmpresaCategory[],
  matrix: BbmRpcFinancials['matrix'],
): EmpresaCategoriaTercero[] | undefined {
  if (!matrix) return undefined;
  const drawnIds = new Set(categories.map((c) => c.id));
  const byKey = new Map<string, EmpresaCategoriaTercero>();
  for (const row of matrix) {
    const amount = Number(row.amount);
    if (amount === 0) continue;
    let catId = categoryId(pucLabel(row.cuenta4));
    if (!drawnIds.has(catId)) {
      if (!drawnIds.has(OTROS_CATEGORY_ID)) continue;
      catId = OTROS_CATEGORY_ID;
    }
    const terceroId = `bbm-${prefix}-${row.tercero}`;
    const key = `${catId}|${terceroId}`;
    const prev = byKey.get(key);
    if (prev) prev.amount += amount;
    else byKey.set(key, { categoryId: catId, terceroId, amount });
  }
  return [...byKey.values()];
}

/** El dot de cada tercero usa el color de su categoría dominante (la de
 *  mayor monto en `links`), para que la lista lea como leyenda de la
 *  torta. Sin vínculo (o sin matrix) cae al color cíclico de siempre. */
function buildTerceros(
  prefix: string,
  raw: BbmRpcFinancials['terceros'],
  categories: EmpresaCategory[],
  links?: EmpresaCategoriaTercero[],
): EmpresaTercero[] {
  const colorByCategory = new Map(categories.map((c) => [c.id, c.color]));
  const dominant = new Map<string, { categoryId: string; amount: number }>();
  for (const l of links ?? []) {
    const prev = dominant.get(l.terceroId);
    if (!prev || l.amount > prev.amount) {
      dominant.set(l.terceroId, { categoryId: l.categoryId, amount: l.amount });
    }
  }
  return raw.map((t, i) => {
    const id = `bbm-${prefix}-${t.tercero}`;
    const catId = dominant.get(id)?.categoryId;
    return {
      id,
      name: t.nombre ?? (t.tercero && t.tercero !== '0' ? t.tercero : 'Sin tercero'),
      color:
        (catId != null ? colorByCategory.get(catId) : undefined) ??
        TERCERO_COLORS[i % TERCERO_COLORS.length],
      amount: Number(t.amount),
    };
  });
}

function mapFinancials(prefix: string, f: BbmRpcFinancials): EmpresaFinancials {
  const total = Number(f.total);
  const categories = buildCategories(f.categories);
  const links = buildLinks(prefix, categories, f.matrix);
  return {
    total,
    categories,
    terceros: buildTerceros(prefix, f.terceros, categories, links),
    tercerosTotal: total,
    links,
  };
}

/** EmpresaFilters → parámetros del RPC. 'corriente'+'ultimo' va sin
 *  parámetros para que el backend resuelva el último mes con datos
 *  (aunque el año corriente aún no tenga movimientos). */
function resolveRpcParams(filters?: EmpresaFilters): { p_year: number | null; p_month: number | null } {
  const year = filters?.year ?? 'corriente';
  const month = filters?.month ?? 'ultimo';
  if (year === 'corriente' && month === 'ultimo') {
    return { p_year: null, p_month: null };
  }
  return {
    p_year: year === 'corriente' ? new Date().getFullYear() : Number(year),
    p_month: month === 'ultimo' ? null : Number(month),
  };
}

async function fetchBbmDetail(filters?: EmpresaFilters): Promise<EmpresaDetail> {
  const { data, error } = await supabase.rpc('get_bbm_empresa_detail', resolveRpcParams(filters));
  if (error) throw new Error(`get_bbm_empresa_detail: ${error.message}`);
  const detail = data as BbmRpcDetail;
  return {
    id: 'bbm',
    name: 'BBM',
    period: detail.period,
    ingresos: mapFinancials('ing', detail.ingresos),
    gastos: mapFinancials('gas', detail.gastos),
  };
}

// Pequeña latencia simulada para que los estados de carga de los mocks
// se vean naturales.
function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Métrica + delta reales de una compañía; null si el RPC falla (la
 *  card de esa compañía conserva los valores base de la lista). */
async function fetchSummary<T>(rpc: string): Promise<T | null> {
  try {
    const { data, error } = await supabase.rpc(rpc);
    if (error || !data) return null;
    return data as T;
  } catch {
    return null;
  }
}

export async function getEmpresas(): Promise<EmpresaListItem[]> {
  const list = getEmpresasMock();
  const [bbm, vag] = await Promise.all([
    fetchSummary<BbmRpcSummary>('get_bbm_empresa_summary'),
    fetchSummary<VagRpcSummary>('get_vag_empresa_summary'),
  ]);
  return list.map((e) => {
    if (e.id === 'bbm' && bbm) {
      return { ...e, ingresos: Number(bbm.ingresos), deltaPercent: Number(bbm.delta_pct) };
    }
    if (e.id === 'vag' && vag) {
      return {
        ...e,
        ingresos: Number(vag.total),
        deltaPercent: Number(vag.delta_pct),
        metricLabel: 'Movimientos',
      };
    }
    return e;
  });
}

export function getEmpresaDetail(
  id: string,
  filters?: EmpresaFilters,
): Promise<EmpresaDetail | null> {
  if (id === 'bbm') return fetchBbmDetail(filters);
  return delay(getEmpresaDetailMock(id));
}

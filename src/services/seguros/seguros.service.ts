/**
 * Seguros service — single-table Notion.
 *
 * Toda la data vive en UN tablero (`NOTION_DB_SEGUROS`) con una columna
 * "Tipo de Seguro" que discrimina entre Compañía / Vehículo / Propiedad.
 * Pegamos 1 vez al tablero, bucketeamos por tipo, y normalizamos.
 *
 * Columnas reales de Notion (case-sensitive):
 *   Aa Nombre                Title
 *   📎 Archivos Adjuntos     Files
 *   ≡  Aseguradora           Rich text
 *   ⊙  Broker                Select
 *   #  Costo Total           Number
 *   ⊙  Estado                Select (ACTIVA / INACTIVA)
 *   ⊙  Motivo Inactividad    Select (FALTA DE PAGO / AUDITORIA /
 *                                    NO RENOVADA / VENCIDA / CANCELADA)
 *                            — OPCIONAL: si el tablero no la tiene, el
 *                              motivo se deriva de "Estado" (los valores
 *                              VENCIDA / CANCELADA también son inactivas).
 *   📅 Fin Vigencia          Date
 *   📅 Inicio Vigencia       Date
 *   ↗  LLC                   Relation (→ empresa)
 *   ≡  Novedades             Rich text
 *   ≡  Numero de Poliza      Rich text
 *   ↗  Plan Póliza           Relation
 *   ⊙  Tipo de Seguro        Select (discriminador)
 *
 * LLC es una relation: la API sólo devuelve ids de página. Los nombres
 * salen de un segundo tablero (`NOTION_DB_LLC`, columna "Nombre LLC")
 * que consultamos en paralelo y cruzamos por id. Un rollup "Empresa" en
 * el tablero de pólizas, si existe, gana sobre eso.
 */

import { withMock } from '@/src/services/mock/mock-adapter';
import { getSegurosMock } from '@/src/services/mock/seguros.mock';
import { notionQueryAll } from '@/src/services/notion/client';
import {
  normalizeRows,
  pickField,
  type NormalizedRow,
} from '@/src/services/notion/normalize';
import type {
  PolizaCompania,
  PolizaEstadoNotion,
  PolizaPropiedad,
  PolizaVehiculo,
  SeguroEmpresa,
  SegurosSnapshot,
} from '@/src/types/seguros.types';

const DB_SEGUROS = process.env.EXPO_PUBLIC_NOTION_DB_SEGUROS;
const DB_LLC = process.env.EXPO_PUBLIC_NOTION_DB_LLC;

// ─── Mapeo Tipo de Seguro → bucket ─────────────────────────────
type Bucket = 'compania' | 'vehiculo' | 'propiedad';

const TIPO_TO_BUCKET: Record<string, Bucket> = {
  GL: 'compania',
  Umbrella: 'compania',
  WC: 'compania',
  'Worker Compensation': 'compania',
  'General Liability': 'compania',
  Vehic: 'vehiculo',
  Vehiculo: 'vehiculo',
  Vehículo: 'vehiculo',
  Auto: 'vehiculo',
  Prop: 'propiedad',
  Propiedad: 'propiedad',
  Property: 'propiedad',
  // El tablero rotula las pólizas de propiedad como "CASA".
  CASA: 'propiedad',
  Casa: 'propiedad',
};

const TIPO_TO_NOMBRE_POLIZA: Record<string, string> = {
  GL: 'General Liability',
  WC: 'Worker Compensation',
};

function bucketize(tipo: string | null): Bucket | null {
  if (!tipo) return null;
  const direct = TIPO_TO_BUCKET[tipo];
  if (direct) return direct;
  // Heurística por substring (case-insensitive) para tolerar variantes
  const lower = tipo.toLowerCase();
  if (lower.includes('veh') || lower.includes('auto')) return 'vehiculo';
  if (lower.includes('prop') || lower.includes('casa') || lower.includes('hogar'))
    return 'propiedad';
  // Resto se considera póliza de compañía
  return 'compania';
}

// ─── Nombres de columnas en Notion ─────────────────────────────
const COL_NOMBRE = ['Nombre'];
const COL_ASEGURADORA = ['Aseguradora'];
const COL_BROKER = ['Broker'];
const COL_NUMERO = ['Numero de Poliza', 'Número de Póliza'];
const COL_VIGENCIA_INICIO = ['Inicio Vigencia'];
const COL_VIGENCIA_FIN = ['Fin Vigencia'];
const COL_COSTO = ['Costo Total'];
const COL_TIPO = ['Tipo de Seguro'];
const COL_ESTADO = ['Estado'];
const COL_MOTIVO_INACTIVIDAD = ['Motivo Inactividad', 'Motivo de Inactividad'];
const COL_LLC = ['LLC'];
// Fallback opcionales si el usuario agrega rollups/columnas extra
const COL_EMPRESA_NOMBRE = ['Empresa', 'LLC nombre', 'Nombre LLC'];
const COL_COBERTURA = ['Cobertura', 'Coverage'];
const COL_PAYROLL = ['Payroll'];
const COL_ASIGNACION = ['Asignación', 'Asignacion'];
// Columna título del tablero de LLCs
const COL_LLC_NOMBRE = ['Nombre LLC', 'Nombre', 'Name'];

// ─── Helpers ───────────────────────────────────────────────────
function toStr(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return fallback;
}

const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Acepta "27 de junio de 2026", "27/06/2026", "2026-06-27", ISO Notion. */
function parseLooseDate(input: unknown): string {
  if (typeof input !== 'string') return '';
  const t = input.trim();
  if (!t) return '';

  // ISO directo (Notion date prop) "2026-06-27" o "2026-06-27T..."
  const isoMatch = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // Español "27 de junio de 2026"
  const esMatch = t
    .toLowerCase()
    .match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/);
  if (esMatch) {
    const day = parseInt(esMatch[1], 10);
    const month = SPANISH_MONTHS[esMatch[2]];
    const year = parseInt(esMatch[3], 10);
    if (month && Number.isFinite(day) && Number.isFinite(year)) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  // dd/mm/yyyy o dd-mm-yyyy
  const dmyMatch = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  return '';
}

function toDate(v: unknown): string {
  return parseLooseDate(v);
}

/** Normaliza la columna "Estado" de Notion (ACTIVA / INACTIVA). Los
 * valores legacy (VENCIDA / CANCELADA) se tratan como inactivas. */
function parseEstado(v: unknown): PolizaEstadoNotion {
  if (typeof v !== 'string') return null;
  const t = v
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (!t) return null;
  if (t.startsWith('inactiv')) return 'inactiva';
  if (t.startsWith('cancel') || t.startsWith('venc')) return 'inactiva';
  if (t.startsWith('activ')) return 'activa';
  return null;
}

/** Valor crudo de "Motivo Inactividad" (select en MAYÚSCULAS). */
function parseMotivoInactividad(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.toUpperCase() : null;
}

/**
 * Motivo de inactividad de la póliza.
 *
 * El tablero no tiene la columna "Motivo Inactividad": el porqué viene
 * dentro de "Estado" (VENCIDA / CANCELADA), que `parseEstado` colapsa a
 * 'inactiva'. Sin esto el badge del histórico dice sólo "Inactiva" y se
 * pierde la distinción. Si algún día se agrega la columna, esa gana.
 */
function resolveMotivoInactividad(row: NormalizedRow): string | null {
  const explicit = parseMotivoInactividad(
    pickField(row, COL_MOTIVO_INACTIVIDAD),
  );
  if (explicit) return explicit;

  const estado = parseMotivoInactividad(pickField(row, COL_ESTADO));
  // ACTIVA / INACTIVA describen el estado, no el motivo.
  if (!estado || estado === 'ACTIVA' || estado === 'INACTIVA') return null;
  return estado;
}

/** Acepta "5091,00 US$", "5,091.00 USD", "$1.000.000", number. */
function parseLooseNumber(input: unknown): number {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input !== 'string') return NaN;
  const t = input.trim();
  if (!t) return NaN;

  // Limpia: deja solo dígitos, coma, punto y signo.
  const cleaned = t.replace(/[^\d,.\-]/g, '');
  if (!cleaned) return NaN;

  // Determina separador decimal: el último separador encontrado.
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    normalized = cleaned;
  } else if (lastDot > lastComma) {
    // Punto es decimal, coma es miles → eliminar comas
    normalized = cleaned.replace(/,/g, '');
  } else {
    // Coma es decimal, punto es miles → eliminar puntos, cambiar coma a punto
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function toNum(v: unknown, fallback = 0): number {
  const n = parseLooseNumber(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Extrae el nombre limpio de un valor tipo "EMPRESA (https://...)". */
function stripParenUrl(v: unknown): string {
  const s = toStr(v);
  if (!s) return '';
  // Remueve cualquier paréntesis con URL o (id) al final
  return s
    .replace(/\s*\((?:https?:\/\/|app\.notion|www\.notion)[^)]*\)\s*$/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
}

function slugify(v: string, fallback: string): string {
  if (!v) return fallback;
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Id de página Notion sin guiones — las relations y las filas del
 * tablero de LLCs no siempre usan el mismo formato. */
function pageKey(id: string): string {
  return id.replace(/-/g, '').toLowerCase();
}

/**
 * Nombres de las LLC indexados por id de página. Sin este mapa el
 * carousel mostraría "Empresa 34119c" en vez de "BLUE SOLUTION LLC".
 * Vacío si `EXPO_PUBLIC_NOTION_DB_LLC` no está configurado.
 */
async function fetchLlcNames(): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (!DB_LLC) return names;
  const resp = await notionQueryAll({ database_id: DB_LLC });
  for (const row of normalizeRows(resp.results)) {
    const name = toStr(pickField(row, COL_LLC_NOMBRE));
    if (name) names.set(pageKey(row.id), name);
  }
  return names;
}

/** LLC puede venir como relation (array de ids), o como rich_text con
 * "NOMBRE (url)" cuando el campo fue exportado/importado vía CSV. */
function resolveEmpresa(
  row: NormalizedRow,
  llcNames: Map<string, string>,
): { id: string; name: string } {
  // 1. Si el usuario expone un rollup explícito, usamos ese
  const explicitName = toStr(pickField(row, COL_EMPRESA_NOMBRE));
  if (explicitName) {
    const clean = stripParenUrl(explicitName);
    return { id: slugify(clean, 'empresa'), name: clean };
  }

  // 2. Relation real: array de ids → nombre del tablero de LLCs
  const raw = row[COL_LLC[0]];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
    const name = llcNames.get(pageKey(raw[0]));
    if (name) return { id: slugify(name, 'empresa'), name };
    // Sin el tablero de LLCs a mano, al menos agrupamos por id.
    const short = pageKey(raw[0]).slice(0, 6);
    return { id: raw[0], name: `Empresa ${short}` };
  }

  // 3. Rich text con formato "NOMBRE (url)" (caso CSV importado)
  if (typeof raw === 'string' && raw.trim()) {
    const clean = stripParenUrl(raw);
    return { id: slugify(clean, 'empresa'), name: clean };
  }

  return { id: 'sin-empresa', name: 'Sin empresa' };
}

// ─── Normalizers por bucket ────────────────────────────────────
function buildPolizaCompania(
  row: NormalizedRow,
  llcNames: Map<string, string>,
): PolizaCompania {
  const empresa = resolveEmpresa(row, llcNames);
  const tipo = toStr(pickField(row, COL_TIPO));
  const nombreRaw = toStr(pickField(row, COL_NOMBRE));
  // Cuando el "Nombre" viene vacío, fallback al label legible del tipo
  const nombre = nombreRaw || TIPO_TO_NOMBRE_POLIZA[tipo] || tipo || 'Póliza';
  return {
    id: row.id,
    empresaId: empresa.id,
    empresaName: empresa.name,
    nombre,
    aseguradora: toStr(pickField(row, COL_ASEGURADORA)),
    broker: toStr(pickField(row, COL_BROKER)),
    numero: toStr(pickField(row, COL_NUMERO)),
    vigenciaInicio: toDate(pickField(row, COL_VIGENCIA_INICIO)),
    vigenciaFin: toDate(pickField(row, COL_VIGENCIA_FIN)),
    cobertura: toNum(pickField(row, COL_COBERTURA)),
    payroll: ((): number | null => {
      const v = pickField(row, COL_PAYROLL);
      if (v === null || v === undefined || v === '') return null;
      return toNum(v);
    })(),
    costo: toNum(pickField(row, COL_COSTO)),
    estado: parseEstado(pickField(row, COL_ESTADO)),
    motivoInactividad: resolveMotivoInactividad(row),
  };
}

function buildPolizaVehiculo(
  row: NormalizedRow,
  llcNames: Map<string, string>,
): PolizaVehiculo {
  // Mismo tablero que Compañías: la fila de un vehículo también trae
  // Aseguradora / Broker / Numero de Poliza / Costo Total / LLC.
  const empresa = resolveEmpresa(row, llcNames);
  return {
    id: row.id,
    nombre: toStr(pickField(row, COL_NOMBRE)),
    asignacion: toStr(pickField(row, COL_ASIGNACION)),
    empresaId: empresa.id,
    // Sin LLC preferimos ocultar el campo antes que pintar "Sin empresa".
    empresaName: empresa.id === 'sin-empresa' ? '' : empresa.name,
    aseguradora: toStr(pickField(row, COL_ASEGURADORA)),
    broker: toStr(pickField(row, COL_BROKER)),
    numero: toStr(pickField(row, COL_NUMERO)),
    costo: toNum(pickField(row, COL_COSTO)),
    vigenciaFin: toDate(pickField(row, COL_VIGENCIA_FIN)),
    estado: parseEstado(pickField(row, COL_ESTADO)),
    motivoInactividad: resolveMotivoInactividad(row),
  };
}

function buildPolizaPropiedad(
  row: NormalizedRow,
  llcNames: Map<string, string>,
): PolizaPropiedad {
  // Mismo tablero que Compañías y Vehículos: la fila de una casa también
  // trae Aseguradora / Broker / Numero de Poliza / Costo Total / LLC.
  const empresa = resolveEmpresa(row, llcNames);
  return {
    id: row.id,
    nombre: toStr(pickField(row, COL_NOMBRE)),
    empresaId: empresa.id,
    // Sin LLC preferimos ocultar el campo antes que pintar "Sin empresa".
    empresaName: empresa.id === 'sin-empresa' ? '' : empresa.name,
    aseguradora: toStr(pickField(row, COL_ASEGURADORA)),
    broker: toStr(pickField(row, COL_BROKER)),
    numero: toStr(pickField(row, COL_NUMERO)),
    costo: toNum(pickField(row, COL_COSTO)),
    vigenciaFin: toDate(pickField(row, COL_VIGENCIA_FIN)),
    estado: parseEstado(pickField(row, COL_ESTADO)),
    motivoInactividad: resolveMotivoInactividad(row),
  };
}

// ─── Fetch real ────────────────────────────────────────────────
async function fetchFromNotion(): Promise<SegurosSnapshot> {
  if (!DB_SEGUROS) {
    throw new Error(
      'Seguros: falta EXPO_PUBLIC_NOTION_DB_SEGUROS en .env',
    );
  }

  // En paralelo: el runtime de las edge functions corta a los ~25s, así
  // que encadenar las dos consultas es pedir un timeout.
  const [resp, llcNames] = await Promise.all([
    notionQueryAll({ database_id: DB_SEGUROS }),
    fetchLlcNames(),
  ]);
  const rows = normalizeRows(resp.results);

  const companiaRows: NormalizedRow[] = [];
  const vehiculoRows: NormalizedRow[] = [];
  const propiedadRows: NormalizedRow[] = [];

  for (const r of rows) {
    const tipo = toStr(pickField(r, COL_TIPO));
    const bucket = bucketize(tipo);
    if (bucket === 'compania') companiaRows.push(r);
    else if (bucket === 'vehiculo') vehiculoRows.push(r);
    else if (bucket === 'propiedad') propiedadRows.push(r);
    // null bucket → fila sin Tipo de Seguro, la ignoramos
  }

  // Compañías: agrupar por empresa
  const empresasMap = new Map<string, SeguroEmpresa>();
  for (const r of companiaRows) {
    const p = buildPolizaCompania(r, llcNames);
    let empresa = empresasMap.get(p.empresaId);
    if (!empresa) {
      empresa = { id: p.empresaId, name: p.empresaName, polizas: [] };
      empresasMap.set(p.empresaId, empresa);
    }
    empresa.polizas.push(p);
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  return {
    empresas: [...empresasMap.values()],
    vehiculos: vehiculoRows.map((r) => buildPolizaVehiculo(r, llcNames)),
    propiedades: propiedadRows.map((r) => buildPolizaPropiedad(r, llcNames)),
    updatedAt: todayIso,
    todayIso,
  };
}

export async function getSegurosSnapshot(): Promise<SegurosSnapshot> {
  return withMock(fetchFromNotion, () => getSegurosMock());
}

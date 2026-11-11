/**
 * Cartera service — AR aging.
 *
 * Real path: para cada Realm de QB consulta el reporte nativo
 * `AgedReceivableDetail` ("as of" hoy) en vez de reconstruir el aging desde
 * Invoice/CreditMemo por separado. El reporte ya viene agrupado por QB en
 * secciones por bucket de vencimiento (Current / 1-30 / 31-60 / 61-90 / 91+)
 * y cada línea trae su "Open Balance" ya neteado — incluye no solo Invoice,
 * sino cualquier otro tipo de transacción que afecte la cartera del cliente
 * (CreditMemo, Payment sin aplicar, JournalEntry, etc.), con el signo
 * correcto. Reconstruir eso a mano requería adivinar qué tipos de objeto
 * podían aparecer: se probó con Invoice+CreditMemo y quedó un caso real sin
 * cubrir (Payment recibido sin factura del ciclo aún, visto en ONEA/Patriot
 * LLC: PJW Allentown/Bethlehem, Urbn Bristol/Echo/Moya, ~$40K). Usar el
 * reporte evita perseguir cada tipo de transacción uno por uno.
 *
 * Solo se consultan los realms de `CARTERA_REALM_IDS` (5 STARS, ONEA,
 * Seasons), no todas las empresas conectadas.
 *
 * Las invocaciones por realm corren en paralelo. Los clientes se
 * identifican por `${realmId}-${customerId}` para evitar colisiones entre
 * Realms.
 *
 * Mock path: getCarteraMock() del mock existente.
 *
 * Notes:
 *   - `daysOverdue` = dueDate - hoy (positivo = corriente, negativo =
 *     vencida), solo para mostrarlo en el detalle de factura; el bucket en
 *     sí ya no se recalcula localmente, se toma directo de la sección del
 *     reporte (es el mismo criterio que usa QB para el Aging Summary).
 *   - El reporte no trae nota/memo por línea (a diferencia de Invoice), así
 *     que `note` queda siempre vacío.
 *   - QB Customers de distintos realms aparecen como entries separadas.
 *     Si necesitamos merge por nombre, lo hacemos en una segunda fase.
 *   - Las empresas del grupo se facturan entre sí, así que cada una está
 *     dada de alta como Customer en el QB de las otras. Esa deuda
 *     intercompañía se filtra con la tabla `qb_customer_exclusions`
 *     (match por nombre normalizado, no por customerId: los ids cambian
 *     entre realms).
 *   - Esa misma tabla también permite exclusiones puntuales por
 *     `client_id` (`${realmId}-${customerId}`, ver 0058) para el caso de
 *     un cliente externo real que aparece en dos tarjetas con el mismo
 *     nombre (otra empresa del grupo le factura también, o hay un
 *     duplicado/sub-cliente en el mismo QB) y solo una de ellas debe
 *     ocultarse sin tocar el saldo real de la otra.
 *   - El nombre de cliente del reporte viene calificado por jerarquía de
 *     sub-cliente ("PATRIOT LLC:URBN BRISTOL"): se usa solo el último
 *     segmento, igual que mostraba el path de Invoice antes.
 *   - Las columnas se resuelven por `ColType` (resp.Columns.Column), NO por
 *     índice fijo: el orden default de QB es
 *     tx_date, txn_type, doc_num, cust_name, due_date, subt_open_bal,
 *     subt_amount — Open Balance ANTES de Amount. Asumir índice fijo
 *     (5=Amount, 6=Open Balance) hizo que el informe sumara el monto
 *     original de la factura en vez del saldo neto, inflando sobre todo el
 *     bucket 91+ (las facturas viejas acumulan abonos parciales; las
 *     corrientes casi nunca, por eso ahí no se notaba). Bug real visto
 *     2026-10-20: Cartera 91+ en 195.782,46 vs 130.075,64 de QB.
 */

import { withMock } from '@/src/services/mock/mock-adapter';
import { supabase } from '@/src/config/supabase';
import { getCarteraMock } from '@/src/services/mock/cartera.mock';
import { SEGMENT_PALETTE as PALETTE } from '@/src/theme/gradients';
import {
  qbQuery,
  qbStatus,
  QBNotConnectedError,
  QBReauthRequiredError,
} from '@/src/services/quickbooks/client';
import type {
  QBAgedReceivableDetailRaw,
  QBTransactionListRow,
} from '@/src/types/api.types';
import type {
  AgingBucket,
  CarteraClient,
  CarteraInvoice,
  CarteraSnapshot,
} from '@/src/types/cartera.types';

/**
 * Encabezado de sección del reporte -> bucket interno. Texto exacto que
 * devuelve QB (confirmado en vivo, 2026-10-19); si un encabezado no matchea
 * ninguno de estos (cambio de wording de QB) la sección se descarta con un
 * warning en vez de ubicarla mal.
 */
const BUCKET_LABEL_MAP: Record<string, AgingBucket> = {
  Current: 'corriente',
  '1 - 30 days past due': '0-30',
  '31 - 60 days past due': '31-60',
  '61 - 90 days past due': '61-90',
  '91 or more days past due': '91+',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function diffInDays(targetIso: string, base: Date): number {
  const t = new Date(`${targetIso}T00:00:00Z`).getTime();
  return Math.round((t - base.getTime()) / 86400000);
}

function emptyBuckets(): Record<AgingBucket, number> {
  return { corriente: 0, '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 };
}

function parseIsoDate(value: string | undefined): string {
  if (!value) return '';
  // QB devuelve las fechas como yyyy-mm-dd
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/**
 * Clave de match de exclusiones: mayúsculas y solo alfanuméricos, para que
 * "ONE A SOLUTIONS LLC" y "ONEA SOLUTIONS LLC" caigan en la misma clave.
 */
export function customerKey(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** "PATRIOT LLC:URBN BRISTOL" -> "URBN BRISTOL" */
function leafCustomerName(fullName: string): string {
  const parts = fullName.split(':');
  return parts[parts.length - 1].trim();
}

/**
 * Índices de columna resueltos por ColType en vez de posición fija — el
 * orden exacto de columnas de AgedReceivableDetail no está garantizado (y
 * cambia si la empresa tiene multimoneda: subt_home_open_bal en vez de
 * subt_open_bal). `openBalance` es el único campo donde el orden importa de
 * verdad: si no viene (reporte viejo sin ese ColType) se cae a `amount`,
 * que es el monto original de la factura, no el saldo neto.
 */
interface AgedReportColumnIndex {
  dueDate?: number;
  customer?: number;
  openBalance?: number;
  amount?: number;
}

const COLTYPE_ALIASES: Record<keyof AgedReportColumnIndex, string[]> = {
  dueDate: ['due_date'],
  customer: ['cust_name'],
  openBalance: ['subt_open_bal', 'subt_home_open_bal'],
  amount: ['subt_amount', 'subt_home_amount'],
};

/**
 * Texto de `ColTitle` a buscar cuando `ColType` no matchea ningún alias
 * (p. ej. si Intuit usa un ColType distinto al documentado en conectores
 * de terceros, que es de donde salió COLTYPE_ALIASES). ColTitle es el label
 * que se ve en el reporte, menos estable entre locales pero más confiable
 * como respaldo que asumir un índice fijo.
 */
const COLTITLE_FALLBACK: Record<keyof AgedReportColumnIndex, string> = {
  dueDate: 'due date',
  customer: 'customer',
  openBalance: 'open balance',
  amount: 'amount',
};

function buildColumnIndex(
  columns: { ColTitle?: string; ColType?: string }[] | undefined,
): AgedReportColumnIndex {
  const idx: AgedReportColumnIndex = {};
  const cols = columns ?? [];
  const fields = Object.keys(COLTYPE_ALIASES) as (keyof AgedReportColumnIndex)[];

  cols.forEach((col, i) => {
    for (const field of fields) {
      if (col.ColType && COLTYPE_ALIASES[field].includes(col.ColType)) {
        idx[field] = i;
      }
    }
  });

  // Respaldo por ColTitle para los campos que ColType no resolvió. "Amount"
  // se busca con match exacto (no .includes) porque "Open Balance" también
  // contendría "balance" pero no "amount", así que no hay colisión, pero sí
  // la habría al revés si "Open Balance" matcheara por substring de "Balance".
  cols.forEach((col, i) => {
    const title = col.ColTitle?.toLowerCase().trim();
    if (!title) return;
    for (const field of fields) {
      if (idx[field] != null) continue;
      if (title === COLTITLE_FALLBACK[field]) idx[field] = i;
    }
  });

  if (cols.length && idx.openBalance == null && idx.amount == null) {
    console.warn(
      '[cartera] no se pudo resolver Open Balance ni Amount por columna, columnas recibidas:',
      cols.map((c) => `${c.ColTitle ?? '?'}(${c.ColType ?? '?'})`),
    );
  }

  return idx;
}

/**
 * Realms de QB que cuentan para Cartera: 5 STARS, ONEA y Seasons. Las otras
 * empresas conectadas (MCS, Blue Star, Clean With Me) siguen conectadas
 * para el resto de la app, pero su AR no es cartera del grupo.
 */
export const CARTERA_REALM_IDS: readonly string[] = [
  '9130357845952726', // 5 STARS SOLUTIONSS LLC
  '9130353874610006', // ONEA SOLUTIONS LLC
  '9130353890052036', // Seasons Solutions LLC
];

export interface QBExclusions {
  /** Nombres (normalizados) excluidos en todos los realms: intercompañía. */
  names: Set<string>;
  /** `${realmId}-${customerId}` excluidos puntualmente, sin importar el nombre. */
  clientIds: Set<string>;
}

/**
 * Customers que no son cartera real (las empresas del grupo facturándose
 * entre sí, o tarjetas puntuales ocultadas por `client_id`). Si la tabla no
 * se puede leer se propaga el error en vez de seguir: es preferible que el
 * informe falle a que los saldos intercompañía reaparezcan inflando el
 * total sin que se note.
 */
export async function fetchExclusions(): Promise<QBExclusions> {
  const { data, error } = await supabase
    .from('qb_customer_exclusions')
    .select('customer_name, client_id');
  if (error) throw new Error(`load qb_customer_exclusions: ${error.message}`);
  const rows = (data ?? []) as { customer_name: string; client_id: string | null }[];
  return {
    names: new Set(
      rows.filter((r) => !r.client_id).map((r) => customerKey(r.customer_name)),
    ),
    clientIds: new Set(rows.filter((r) => r.client_id).map((r) => r.client_id!)),
  };
}

interface RealmAgedReceivable {
  rows: QBTransactionListRow[];
  columnIndex: AgedReportColumnIndex;
}

async function fetchRealmAgedReceivable(
  realmId: string,
): Promise<RealmAgedReceivable> {
  try {
    const resp = await qbQuery<QBAgedReceivableDetailRaw>(
      'reports/AgedReceivableDetail',
      undefined,
      realmId,
    );
    const columnIndex = buildColumnIndex(resp.Columns?.Column);
    if (__DEV__) {
      console.log(`[cartera] realm ${realmId} columnas`, {
        raw: (resp.Columns?.Column ?? []).map(
          (c) => `${c.ColTitle ?? '?'}(${c.ColType ?? '?'})`,
        ),
        resolved: columnIndex,
      });
    }
    return {
      rows: resp.Rows?.Row ?? [],
      columnIndex,
    };
  } catch (e) {
    if (
      e instanceof QBNotConnectedError ||
      e instanceof QBReauthRequiredError
    ) {
      return { rows: [], columnIndex: {} };
    }
    console.warn(`[cartera] realm ${realmId} fetch failed`, e);
    return { rows: [], columnIndex: {} };
  }
}

async function fetchFromQB(): Promise<CarteraSnapshot> {
  const [status, exclusions] = await Promise.all([
    qbStatus(),
    fetchExclusions(),
  ]);
  const companies = status.companies.filter((c) =>
    CARTERA_REALM_IDS.includes(c.realmId),
  );
  if (companies.length === 0) {
    return { clients: [], updatedAt: todayIso() };
  }

  const today = new Date(`${todayIso()}T00:00:00Z`);

  // Invocaciones por realm en paralelo
  const sectionsByRealm = await Promise.all(
    companies.map(async (c) => {
      const { rows, columnIndex } = await fetchRealmAgedReceivable(
        c.realmId,
      );
      return { company: c, sections: rows, columnIndex };
    }),
  );

  const clientsMap = new Map<string, CarteraClient>();
  let colorIdx = 0;

  function getOrCreateClient(
    realmId: string,
    customerId: string,
    customerName: string,
  ): CarteraClient {
    const clientKey = `${realmId}-${customerId}`;
    let client = clientsMap.get(clientKey);
    if (!client) {
      client = {
        id: clientKey,
        name: customerName,
        color: PALETTE[colorIdx % PALETTE.length],
        buckets: emptyBuckets(),
        total: 0,
        invoices: [],
      };
      clientsMap.set(clientKey, client);
      colorIdx += 1;
    }
    return client;
  }

  for (const { company, sections, columnIndex } of sectionsByRealm) {
    for (const section of sections) {
      const bucketLabel = section.Header?.ColData?.[0]?.value;
      const bucket = bucketLabel ? BUCKET_LABEL_MAP[bucketLabel] : undefined;
      if (!bucket) {
        // Fila sin Header reconocido: es el total general del reporte (sin
        // Rows anidadas), o un encabezado nuevo que no mapeamos — en ambos
        // casos se ignora en vez de ubicarla mal.
        if (bucketLabel) {
          console.warn(`[cartera] bucket desconocido: "${bucketLabel}"`);
        }
        continue;
      }

      for (const line of section.Rows?.Row ?? []) {
        if (line.type !== 'Data') continue;
        const cols = line.ColData ?? [];
        // Columnas fijas (no dependen de ColType): 0 Date, 1 Transaction
        // Type (+id), 2 Num. Customer / Due Date / Open Balance se resuelven
        // por `columnIndex` (ColType) porque su posición no es confiable —
        // ver nota en el header del archivo.
        const txnDate = parseIsoDate(cols[0]?.value);
        const txnType = cols[1]?.value || 'Txn';
        const txnId = cols[1]?.id ?? '';
        const docNum = cols[2]?.value || txnId;
        const customerIdx = columnIndex.customer ?? 3;
        const customerFullName = cols[customerIdx]?.value ?? '';
        const customerId = cols[customerIdx]?.id ?? 'unknown';
        const dueDate =
          parseIsoDate(cols[columnIndex.dueDate ?? 4]?.value) || txnDate;
        const balanceIdx = columnIndex.openBalance ?? columnIndex.amount ?? 6;
        const openBalance = Number(cols[balanceIdx]?.value ?? '0');
        if (!openBalance) continue;

        const customerName =
          leafCustomerName(customerFullName) ||
          `Cliente ${customerId.slice(-4)}`;
        if (exclusions.names.has(customerKey(customerName))) continue;
        if (exclusions.clientIds.has(`${company.realmId}-${customerId}`)) continue;

        const client = getOrCreateClient(company.realmId, customerId, customerName);

        const daysOverdue = dueDate ? diffInDays(dueDate, today) : 0;

        const carteraInvoice: CarteraInvoice = {
          id: `${company.realmId}-${txnType}-${txnId}`,
          date: txnDate,
          dueDate,
          daysOverdue,
          invoiceNumber: docNum,
          note: undefined,
          amount: openBalance,
          bucket,
        };

        client.invoices.push(carteraInvoice);
        client.buckets[bucket] += openBalance;
        client.total += openBalance;
      }
    }
  }

  // Ordenar invoices de cada cliente por fecha de vencimiento y, a igual
  // vencimiento, por número de factura (comparación numérica: F-9 < F-10).
  for (const client of clientsMap.values()) {
    client.invoices.sort(
      (a, b) =>
        a.daysOverdue - b.daysOverdue ||
        a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, {
          numeric: true,
        }),
    );
  }

  return {
    clients: [...clientsMap.values()],
    updatedAt: todayIso(),
  };
}

export async function getCarteraSnapshot(): Promise<CarteraSnapshot> {
  return withMock(fetchFromQB, () => getCarteraMock());
}

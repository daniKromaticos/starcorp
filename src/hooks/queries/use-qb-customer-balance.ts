/**
 * useQBCustomerBalance — outstanding balance of a single QB Customer
 * resolved by DisplayName.
 *
 * Source of the name: `clientes_master.data.Quickbook` (PBI master). The
 * master values are often short marketing names (e.g. "ANCHORAGE"), while
 * the QB Customer's DisplayName is the full legal/business name
 * ("ANCHORAGE INN"). QB's query language is case-sensitive and literal,
 * so server-side LIKEs miss variants like "Okana Resort" vs "OKANA
 * RESORT". Escalation order:
 *   1. server-side: exact → starts-with → contains (cheap, literal)
 *   2. server-side por token + match client-side normalizado (case y
 *      acentos insensible, en ambas direcciones)
 *   3. escaneo paginado de Customers + match normalizado
 *   4. repetir en los otros realms de Cartera (`CARTERA_REALM_IDS`; el
 *      customer puede vivir en otra compañía del grupo)
 * Los Customers de `qb_customer_exclusions` se saltan, igual que en el
 * Informe Cartera (intercompañía por nombre, tarjetas puntuales por
 * `${realmId}-${customerId}`, ver 0058).
 * Null cuando ninguna variante matchea.
 */

import { useQuery } from '@tanstack/react-query';
import {
  CARTERA_REALM_IDS,
  customerKey,
  fetchExclusions,
  type QBExclusions,
} from '@/src/services/cartera/cartera.service';
import {
  qbQuery,
  qbStatus,
  QBNotConnectedError,
  QBReauthRequiredError,
} from '@/src/services/quickbooks/client';
import { useQBStore } from '@/src/stores/qb.store';
import type { QBCustomersRaw } from '@/src/types/api.types';
import { queryKeys } from './query-keys';

/** Escape single quotes for QB's SQL-like query language. */
function escapeQBString(value: string): string {
  return value.replace(/'/g, "''");
}

/** Case/acentos/puntuación-insensible: "Okana Resort & Spa" → "OKANA RESORT SPA". */
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

interface QBCustomerLite {
  Id?: string;
  DisplayName?: string;
  Balance?: number;
}

/** Best normalized match: exact → starts-with → contains → contained-in. */
function pickBestMatch(
  customers: QBCustomerLite[],
  target: string,
): QBCustomerLite | null {
  const t = normalizeName(target);
  if (!t) return null;
  const named = customers
    .filter((c) => !!c.DisplayName)
    .map((c) => ({ c, n: normalizeName(c.DisplayName!) }));
  return (
    (named.find(({ n }) => n === t) ??
      named.find(({ n }) => n.startsWith(t)) ??
      named.find(({ n }) => n.includes(t)) ??
      // Master name longer than QB name ("OKANA RESORT" vs "OKANA")
      named.find(({ n }) => n.length >= 4 && t.includes(n)))?.c ?? null
  );
}

function isExcluded(
  c: QBCustomerLite,
  realmId: string,
  exclusions: QBExclusions,
): boolean {
  if (c.DisplayName && exclusions.names.has(customerKey(c.DisplayName))) {
    return true;
  }
  return !!c.Id && exclusions.clientIds.has(`${realmId}-${c.Id}`);
}

async function queryCustomers(
  where: string,
  realmId: string | undefined,
): Promise<QBCustomerLite[]> {
  const res = await qbQuery<QBCustomersRaw>(
    'query',
    { query: `select Id, DisplayName, Balance from Customer ${where}` },
    realmId,
  );
  return res.QueryResponse?.Customer ?? [];
}

const SCAN_PAGE_SIZE = 1000;
const SCAN_MAX = 3000;

async function findCustomer(
  trimmed: string,
  realmId: string,
  exclusions: QBExclusions,
): Promise<QBCustomerLite | null> {
  const escaped = escapeQBString(trimmed);
  const allowed = (customers: QBCustomerLite[]) =>
    customers.filter((c) => !isExcluded(c, realmId, exclusions));

  // 1) Server-side literales (case-sensitive) — cubren el caso 1:1 barato.
  //    maxresults > 1 porque el primer match puede ser un Customer excluido.
  const variants = [
    `DisplayName = '${escaped}'`,
    `DisplayName LIKE '${escaped}%'`,
    `DisplayName LIKE '%${escaped}%'`,
  ];
  for (const where of variants) {
    const [customer] = allowed(
      await queryCustomers(`where ${where} maxresults 10`, realmId),
    );
    if (customer) return customer;
  }

  // 2) Token distintivo del nombre + match normalizado client-side. Atrapa
  //    diferencias de mayúsculas/orden/palabras extra ("OKANA RESORT" vs
  //    "Okana Resort & Indoor Waterpark") siempre que el token coincida
  //    literal en alguna parte del DisplayName.
  const token = trimmed.split(/\s+/).find((w) => w.length >= 4);
  if (token) {
    const candidates = await queryCustomers(
      `where DisplayName LIKE '%${escapeQBString(token)}%' maxresults 100`,
      realmId,
    );
    const hit = pickBestMatch(allowed(candidates), trimmed);
    if (hit) return hit;
  }

  // 3) Último recurso: escaneo paginado con match normalizado (case y
  //    acentos ya no importan). Cap en SCAN_MAX customers por realm.
  for (let start = 1; start <= SCAN_MAX; start += SCAN_PAGE_SIZE) {
    const page = await queryCustomers(
      `startposition ${start} maxresults ${SCAN_PAGE_SIZE}`,
      realmId,
    );
    const hit = pickBestMatch(allowed(page), trimmed);
    if (hit) return hit;
    if (page.length < SCAN_PAGE_SIZE) break;
  }

  return null;
}

function toBalance(customer: QBCustomerLite | null): number | null {
  if (!customer || customer.Balance == null) return null;
  const n = Number(customer.Balance);
  return Number.isFinite(n) ? n : null;
}

export function useQBCustomerBalance(qbName: string | null | undefined) {
  const realmId = useQBStore((s) => s.activeRealmId);
  const trimmed = qbName?.trim() ?? '';
  const enabled = trimmed.length > 0;

  return useQuery<number | null>({
    queryKey: [
      ...queryKeys.qbCustomerBalance(trimmed),
      realmId ?? 'default',
    ],
    enabled,
    queryFn: async () => {
      try {
        const [{ companies }, exclusions] = await Promise.all([
          qbStatus(),
          fetchExclusions(),
        ]);
        // 4) Solo los realms de Cartera; el activo primero si es uno de
        //    ellos, después los demás (el customer puede vivir en otra
        //    compañía del grupo).
        const realms = companies
          .filter(
            (c) => CARTERA_REALM_IDS.includes(c.realmId) && !c.reauthRequired,
          )
          .map((c) => c.realmId)
          .sort((a, b) => Number(b === realmId) - Number(a === realmId));
        for (const realm of realms) {
          const customer = await findCustomer(trimmed, realm, exclusions);
          if (customer) return toBalance(customer);
        }
        return null;
      } catch (e) {
        if (
          e instanceof QBNotConnectedError ||
          e instanceof QBReauthRequiredError
        ) return null;
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

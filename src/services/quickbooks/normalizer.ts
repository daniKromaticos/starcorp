/**
 * QuickBooks raw → normalized domain types.
 * Pure functions: no I/O, no React.
 */

import type {
  QBProfitAndLossRaw,
  QBReportRow,
  QBTransactionListRaw,
  QBTransactionListRow,
} from "@/src/types/api.types";
import type {
  Company,
  CompanyMetrics,
  NormalizedRevenue,
} from "@/src/types/domain.types";

interface QBCompanyInfoRaw {
  CompanyInfo?: {
    CompanyName?: string;
    LegalName?: string;
  };
}

export function normalizeCompany(
  raw: QBCompanyInfoRaw | null,
  realmId: string,
): Company | null {
  const name = raw?.CompanyInfo?.CompanyName ?? raw?.CompanyInfo?.LegalName;
  if (!name) return null;
  return { id: realmId, name };
}

/**
 * QB Profit & Loss report has hierarchical rows. Section rows carry a `group`
 * tag ("Income", "COGS", "GrossProfit", "Expenses", "NetIncome"...) and a
 * Summary.ColData where the LAST entry is the period total.
 */
function findGroupTotal(
  rows: QBReportRow[] | undefined,
  group: string,
): number {
  if (!rows) return 0;
  for (const row of rows) {
    if (row.group === group && row.Summary?.ColData?.length) {
      const cols = row.Summary.ColData;
      const last = cols[cols.length - 1]?.value;
      const n = Number(last);
      return Number.isFinite(n) ? n : 0;
    }
    const nested = findGroupTotal(row.Rows?.Row, group);
    if (nested) return nested;
  }
  return 0;
}

/**
 * Same as findGroupTotal but tries multiple group tag variants.
 * QB Online sometimes emits different tags depending on company setup.
 */
function findGroupTotalAny(
  rows: QBReportRow[] | undefined,
  ...groups: string[]
): number {
  for (const g of groups) {
    const v = findGroupTotal(rows, g);
    if (v !== 0) return v;
  }
  return 0;
}

export function normalizeRevenueFromPnL(
  pnl: QBProfitAndLossRaw | null,
  period: { start: string; end: string },
): NormalizedRevenue {
  const income = findGroupTotal(pnl?.Rows?.Row, "Income");
  return {
    total: income,
    currency: pnl?.Header?.Currency ?? "USD",
    deltaPercent: 0,
    deltaAbsolute: 0,
    trend: "flat",
    series: [],
    period,
  };
}

/** A single line item under an Income / COGS / Expenses section. */
export interface PnLLineItem {
  id: string;
  label: string;
  amount: number;
  color: string;
}

interface RawWithExtras {
  type?: string;
  group?: string;
  Header?: { ColData?: { value: string; id?: string }[] };
  ColData?: { value: string; id?: string }[];
  Summary?: { ColData?: { value: string }[] };
  Rows?: { Row?: RawWithExtras[] };
}

const SECTION_PALETTE = [
  "#1A2B6D",
  "#E8952E",
  "#4A7FD4",
  "#38A169",
  "#3182CE",
  "#9F7AEA",
  "#D53F8C",
  "#DD6B20",
] as const;

function toAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function lastColValue(
  cols: { value: string }[] | undefined,
): string | undefined {
  if (!cols || cols.length === 0) return undefined;
  return cols[cols.length - 1]?.value;
}

function findSectionRow(
  rows: RawWithExtras[] | undefined,
  group: string,
): RawWithExtras | undefined {
  if (!rows) return undefined;
  for (const row of rows) {
    if (row.group === group) return row;
    const nested = findSectionRow(row.Rows?.Row, group);
    if (nested) return nested;
  }
  return undefined;
}

/**
 * Secciones logicas del P&L y los grupos de QB que las componen.
 *
 * QB parte el P&L en dos mitades: lo operacional (Income / COGS / Expenses,
 * que cierra en "Net Operating Income") y lo no operacional (OtherIncome /
 * OtherExpenses); solo el "Net Income" del final suma las dos.
 *
 * Financiero muestra 5 cards y no mas, asi que los bloques Other* no tienen
 * card propia: se absorben en Ingresos y Egresos. La prioridad es que la
 * aritmetica cierre en pantalla, no clavar el renglon de QB:
 *
 *   ingresos = Income + OtherIncome      (QB titula "Total Income" solo al 1ro)
 *   egresos  = Expenses + OtherExpenses  (QB titula "Total Expenses" solo al 1ro)
 *   bruta    = ingresos - costos
 *   neta     = bruta - egresos
 *
 * Con ese reparto `neta` da EXACTO el "Net Income" de QB en las 6 empresas,
 * porque NetIncome = Income + OtherIncome - COGS - Expenses - OtherExpenses.
 * Lo que si se separa del reporte es `bruta`: QB calcula su "Gross Profit" sin
 * OtherIncome, asi que en una empresa con otros ingresos la card queda por
 * encima de ese renglon (ONEA ago-2025 -> jul-2026: 924.331,85 de diferencia).
 * Es el precio de que la resta cuadre en pantalla, y es deliberado.
 *
 * Magnitudes reales del bloque Other* (ago-2025 -> jul-2026): OtherExpenses
 * MCS 36.641,10 (Vehicle expenses, Home office, Pending to identify,
 * Reconciliation Discrepancies) y 5 STARS 1.001,58 -- esta ultima es la
 * diferencia entre 358.306,73 y 359.308,31; OtherIncome ONEA 924.331,85 y
 * 5 STARS 212,42; en el resto son centimos.
 *
 * Esta tabla es la UNICA fuente de verdad: la usan tanto las cards
 * (`normalizeMetricsFromPnL`) como el drill-down, para que una card y su
 * detalle no se puedan separar.
 */
export type PnLSection = "Income" | "COGS" | "Expenses";

const SECTION_GROUPS: Record<PnLSection, string[]> = {
  Income: ["Income", "OtherIncome"],
  COGS: ["COGS"],
  Expenses: ["Expenses", "OtherExpenses"],
};

/** Variantes del tag que QB Online emite segun como este configurada la empresa. */
const GROUP_ALIASES: Record<string, string[]> = {
  Income: ["Income", "TotalIncome"],
  OtherIncome: ["OtherIncome", "TotalOtherIncome", "OtherIncomeExpense"],
  COGS: ["COGS", "TotalCOGS"],
  Expenses: ["Expenses", "TotalExpenses"],
  OtherExpenses: ["OtherExpenses", "TotalOtherExpenses"],
};

/** Filas hijas de una seccion, concatenando los grupos que la componen. */
function sectionChildren(
  pnl: QBProfitAndLossRaw | null,
  section: PnLSection,
): RawWithExtras[] {
  const rows = pnl?.Rows?.Row as RawWithExtras[] | undefined;
  return SECTION_GROUPS[section].flatMap(
    (g) => findSectionRow(rows, g)?.Rows?.Row ?? [],
  );
}

/** Total de una seccion: suma del total de cada grupo que la compone. */
function sectionTotal(
  rows: QBReportRow[] | undefined,
  section: PnLSection,
): number {
  return SECTION_GROUPS[section].reduce(
    (sum, g) => sum + findGroupTotalAny(rows, ...(GROUP_ALIASES[g] ?? [g])),
    0,
  );
}

/** One period column of a P&L section (P&L pedido con summarize_column_by). */
export interface PnLSeriesPoint {
  /** Fechas ISO inclusivas de la columna, tal como las manda QB. */
  start: string;
  end: string;
  amount: number;
}

function findGroupRowAny(
  rows: QBReportRow[] | undefined,
  groups: string[],
): QBReportRow | undefined {
  if (!rows) return undefined;
  for (const row of rows) {
    if (row.group && groups.includes(row.group) && row.Summary?.ColData) {
      return row;
    }
    const nested = findGroupRowAny(row.Rows?.Row, groups);
    if (nested) return nested;
  }
  return undefined;
}

/**
 * Serie por columna de una sección del P&L: suma, columna a columna, el
 * Summary de cada grupo de SECTION_GROUPS (misma tabla que las cards, así la
 * suma de la serie da el total de la card). Solo se toman las columnas con
 * StartDate/EndDate; la de "Total" y la del nombre de cuenta se descartan.
 */
export function normalizePnLSectionSeries(
  pnl: QBProfitAndLossRaw | null,
  section: PnLSection,
): PnLSeriesPoint[] {
  const columns = pnl?.Columns?.Column ?? [];
  const meta = (
    col: (typeof columns)[number],
    name: string,
  ): string | undefined =>
    col.MetaData?.find((m) => m.Name === name)?.Value ?? undefined;

  const periodCols = columns
    .map((col, idx) => ({
      idx,
      start: meta(col, "StartDate"),
      end: meta(col, "EndDate"),
      key: meta(col, "ColKey"),
    }))
    .filter(
      (c) =>
        c.start &&
        c.end &&
        c.key?.toLowerCase() !== "total" &&
        columns[c.idx]?.ColTitle !== "Total",
    );
  if (periodCols.length === 0) return [];

  const rows = pnl?.Rows?.Row;
  const sectionRows = SECTION_GROUPS[section]
    .map((g) => findGroupRowAny(rows, GROUP_ALIASES[g] ?? [g]))
    .filter((r): r is QBReportRow => r != null);

  return periodCols.map((c) => ({
    start: c.start!.slice(0, 10),
    end: c.end!.slice(0, 10),
    amount: sectionRows.reduce(
      (sum, r) => sum + toAmount(r.Summary?.ColData?.[c.idx]?.value),
      0,
    ),
  }));
}

/**
 * Flattens immediate descendants of a P&L section (Income, COGS, Expenses)
 * into a list of leaf line items so we can render them in a detail screen.
 */
export function normalizePnLSection(
  pnl: QBProfitAndLossRaw | null,
  group: PnLSection,
): PnLLineItem[] {
  const children = sectionChildren(pnl, group);

  return children.map((row, idx) => {
    const label =
      row.Header?.ColData?.[0]?.value ??
      row.ColData?.[0]?.value ??
      `Cuenta ${idx + 1}`;
    const amount = row.Summary?.ColData
      ? toAmount(lastColValue(row.Summary.ColData))
      : toAmount(lastColValue(row.ColData));
    const id =
      row.Header?.ColData?.[0]?.id ?? row.ColData?.[0]?.id ?? `${group}-${idx}`;
    return {
      id: String(id),
      label,
      amount,
      color: SECTION_PALETTE[idx % SECTION_PALETTE.length],
    };
  });
}

/** A single leaf account inside a P&L category. */
export interface PnLAccount {
  id: string;
  label: string;
  amount: number;
}

/** A first-level category under a P&L section. May contain >=1 accounts. */
export interface PnLCategory extends PnLLineItem {
  /** Leaf accounts under this category. Categories with no sub-accounts
   *  surface themselves as a single account (id/label/amount mirror the
   *  category) so the UI can render a 1-item accordion uniformly. */
  accounts: PnLAccount[];
}

function rowLabel(row: RawWithExtras, fallback: string): string {
  return row.Header?.ColData?.[0]?.value ?? row.ColData?.[0]?.value ?? fallback;
}

function rowAmount(row: RawWithExtras): number {
  return row.Summary?.ColData
    ? toAmount(lastColValue(row.Summary.ColData))
    : toAmount(lastColValue(row.ColData));
}

function rowId(row: RawWithExtras, fallback: string): string {
  return String(
    row.Header?.ColData?.[0]?.id ?? row.ColData?.[0]?.id ?? fallback,
  );
}

function collectLeaves(
  rows: RawWithExtras[] | undefined,
  out: PnLAccount[],
  pathFallback: string,
): void {
  if (!rows) return;
  rows.forEach((row, idx) => {
    const hasChildren = (row.Rows?.Row?.length ?? 0) > 0;
    if (hasChildren) {
      collectLeaves(row.Rows!.Row, out, `${pathFallback}-${idx}`);
    } else {
      out.push({
        id: rowId(row, `${pathFallback}-${idx}`),
        label: rowLabel(row, `Cuenta ${idx + 1}`),
        amount: rowAmount(row),
      });
    }
  });
}

/**
 * Hierarchical view of a P&L section: top-level categories with their leaf
 * accounts. Categories with no sub-accounts include themselves as the only
 * account so the accordion stays uniform.
 */
export function normalizePnLSectionHierarchical(
  pnl: QBProfitAndLossRaw | null,
  group: PnLSection,
): PnLCategory[] {
  const children = sectionChildren(pnl, group);

  return children.map((row, idx) => {
    const label = rowLabel(row, `Cuenta ${idx + 1}`);
    const amount = rowAmount(row);
    const id = rowId(row, `${group}-${idx}`);
    const accounts: PnLAccount[] = [];
    const hasChildren = (row.Rows?.Row?.length ?? 0) > 0;
    if (hasChildren) {
      collectLeaves(row.Rows!.Row, accounts, `${group}-${idx}`);
    }
    if (accounts.length === 0) {
      accounts.push({ id, label, amount });
    }
    return {
      id,
      label,
      amount,
      color: SECTION_PALETTE[idx % SECTION_PALETTE.length],
      accounts,
    };
  });
}

/**
 * Finds a leaf account anywhere under a P&L section by its QB id. Used by the
 * level-2 detail screens to resolve an account selected from the accordion.
 */
export function findPnLLeafById(
  pnl: QBProfitAndLossRaw | null,
  group: PnLSection,
  leafId: string,
): PnLAccount | null {
  const categories = normalizePnLSectionHierarchical(pnl, group);
  for (const cat of categories) {
    const hit = cat.accounts.find((a) => a.id === leafId);
    if (hit) return hit;
  }
  return null;
}

/** One row of a QB TransactionList report (a posting against an account). */
export interface QBTransaction {
  id: string;
  date: string;
  type: string;
  num: string;
  name: string;
  memo: string;
  amount: number;
}

/** Map QB ColType (or ColTitle fallback) to our normalized fields. */
const TX_COLUMN_MAP: Record<string, keyof QBTransaction> = {
  tx_date: "date",
  txn_type: "type",
  doc_num: "num",
  vend_name: "name",
  cust_name: "name",
  name: "name",
  memo: "memo",
  subt_nat_amount: "amount",
  subt_nat_home_amount: "amount",
  amount: "amount",
};

function resolveTxField(
  col: { ColTitle?: string; ColType?: string } | undefined,
): keyof QBTransaction | null {
  if (!col) return null;
  const byType = col.ColType ? TX_COLUMN_MAP[col.ColType] : undefined;
  if (byType) return byType;
  const titleKey = col.ColTitle?.toLowerCase();
  if (!titleKey) return null;
  if (titleKey.includes("date") || titleKey.includes("fecha")) return "date";
  if (titleKey.includes("type") || titleKey.includes("tipo")) return "type";
  if (titleKey.includes("num")) return "num";
  if (titleKey.includes("name") || titleKey.includes("nombre")) return "name";
  if (titleKey.includes("memo") || titleKey.includes("descripci"))
    return "memo";
  if (titleKey.includes("amount") || titleKey.includes("monto"))
    return "amount";
  return null;
}

function mapTxRow(
  columns: { ColTitle?: string; ColType?: string }[],
  row: QBTransactionListRow,
  rowIdx: number,
): QBTransaction {
  const cols = row.ColData ?? [];
  const tx: QBTransaction = {
    id: "",
    date: "",
    type: "",
    num: "",
    name: "",
    memo: "",
    amount: 0,
  };
  cols.forEach((cell, i) => {
    const field = resolveTxField(columns[i]);
    if (!field) return;
    const value = cell.value ?? "";
    if (field === "amount") {
      const n = Number(value);
      tx.amount = Number.isFinite(n) ? n : 0;
    } else {
      tx[field] = value;
    }
    if (!tx.id && cell.id) tx.id = String(cell.id);
  });
  if (!tx.id) tx.id = `tx-${rowIdx}-${tx.date}-${tx.num}`;
  return tx;
}

/** GeneralLedger antepone una fila "Beginning Balance" en cuentas de
 *  balance; no es una transacción. */
function isBeginningBalanceRow(row: QBTransactionListRow): boolean {
  return /beginning balance/i.test(row.ColData?.[0]?.value ?? "");
}

/** Las transacciones de una cuenta dentro de un reporte GeneralLedger. */
export interface QBAccountTransactions {
  accountId: string;
  accountName: string;
  transactions: QBTransaction[];
}

/**
 * GeneralLedger multi-cuenta → transacciones agrupadas por cuenta. El
 * reporte anida las filas bajo secciones cuyo Header trae nombre e id de
 * la cuenta; las secciones sin id (agrupadores intermedios) heredan el
 * contexto del padre. OJO: GL devuelve una fila por LÍNEA de asiento.
 */
export function normalizeGeneralLedgerByAccount(
  raw: QBTransactionListRaw | null,
): QBAccountTransactions[] {
  if (!raw) return [];
  const columns = raw.Columns?.Column ?? [];
  const out: QBAccountTransactions[] = [];

  const walk = (
    rows: QBTransactionListRow[] | undefined,
    current: QBAccountTransactions | null,
  ): void => {
    if (!rows) return;
    for (const row of rows) {
      let ctx = current;
      const header = row.Header?.ColData?.[0];
      if (header?.id != null || header?.value) {
        ctx = {
          accountId: String(header.id ?? header.value),
          accountName: header.value ?? "",
          transactions: [],
        };
        out.push(ctx);
      }
      if (row.ColData?.length && ctx && !isBeginningBalanceRow(row)) {
        ctx.transactions.push(mapTxRow(columns, row, ctx.transactions.length));
      }
      walk(row.Rows?.Row, ctx);
    }
  };
  walk(raw.Rows?.Row, null);

  return out.filter((acc) => acc.transactions.length > 0);
}

export function normalizeMetricsFromPnL(
  pnl: QBProfitAndLossRaw | null,
): CompanyMetrics {
  const rows = pnl?.Rows?.Row;

  // Las tres primeras salen de SECTION_GROUPS, la misma tabla que consume el
  // drill-down: si una card y su detalle se separan, el bug esta en esa tabla.
  const ingresos = sectionTotal(rows, "Income");
  const costos = sectionTotal(rows, "COGS");
  const egresos = sectionTotal(rows, "Expenses");

  // Derivadas, NO leidas del reporte: es lo unico que garantiza que en pantalla
  // se vea neta = bruta - egresos con las 5 cards. Aun asi `utilidadNeta` da el
  // "Net Income" de QB al centavo; `utilidadBruta` puede quedar por encima de
  // su "Gross Profit" cuando la empresa tiene OtherIncome (ver arriba).
  const utilidadBruta = ingresos - costos;
  const utilidadNeta = utilidadBruta - egresos;

  const flat = (value: number) => ({ value, deltaPercent: 0 });
  return {
    ingresos: flat(ingresos),
    costos: flat(costos),
    egresos: flat(egresos),
    utilidadBruta: flat(utilidadBruta),
    utilidadNeta: flat(utilidadNeta),
  };
}

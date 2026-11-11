/**
 * Currency formatting utilities
 */

const defaultLocale = 'es-AR';
const defaultCurrency = 'USD';

/**
 * Format a number as currency string: $100.000
 */
export function formatCurrency(
  value: number,
  options?: { locale?: string; currency?: string; compact?: boolean },
): string {
  const locale = options?.locale ?? defaultLocale;
  const currency = options?.currency ?? defaultCurrency;

  if (options?.compact) {
    return formatCompactCurrency(value, locale, currency);
  }

  // Use narrowSymbol so USD renders as "$" instead of "US$" in es-* locales.
  const sign = value < 0 ? '-' : '';
  const abs = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  return `${sign}$${abs}`;
}

/**
 * Format with two decimals and es-AR separators: $17.958,25
 * (Informe Presupuesto: columnas Proyectado/Ejecutado).
 */
export function formatMoney2(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${sign}$${abs}`;
}

/**
 * Format as compact currency: $1.4M, $38k
 */
function formatCompactCurrency(
  value: number,
  locale: string,
  currency: string,
): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

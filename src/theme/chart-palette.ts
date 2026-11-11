/**
 * Paleta canónica de gráficas — FUENTE ÚNICA de color para todos los charts.
 *
 * Los 8 degradados oficiales (ver `docs/colors.ts`). Cada gráfica los cicla
 * por índice. Convenciones:
 *   - El PRIMER color de cada array es el tono dominante/sólido: se usa cuando
 *     una gráfica solo necesita un color (donut categórico, línea de área,
 *     dots/swatches de leyenda).
 *   - En degradados verticales (barras, gauge) el primer color va ARRIBA y el
 *     último ABAJO.
 *
 * No importar nada en este módulo: es la base de la que dependen
 * `src/theme/tokens.ts` y `src/theme/gradients.ts` (evita ciclos de import).
 */
export const CHART_GRADIENTS: readonly (readonly string[])[] = [
  ['#DF6434', '#FFB74A', '#F2C87A'], // 0 · naranja claro
  ['#04113F', '#1938A5'],            // 1 · azul intermedio
  ['#143860', '#4B9BF4'],            // 2 · azul grisáceo
  ['#74AC34', '#FFFF40'],            // 3 · verde claro
  ['#294316', '#294316'],            // 4 · verde oscuro
  ['#05284C', '#479281'],            // 5 · verde azulada
  ['#0F2674', '#215EF7'],            // 6 · azul claro
  ['#531D40', '#C94E80'],            // 7 · remolacha
];

/** Tono sólido de cada degradado = primer color del array. */
export const CHART_COLORS: readonly string[] = CHART_GRADIENTS.map((g) => g[0]);

const mod = (i: number, n: number): number => ((i % n) + n) % n;

/** Degradado completo (multi-stop) en la posición `i`, ciclando. */
export const chartGradientAt = (i: number): readonly string[] =>
  CHART_GRADIENTS[mod(i, CHART_GRADIENTS.length)];

/** Tono sólido (primer color) en la posición `i`, ciclando. */
export const chartColorAt = (i: number): string =>
  CHART_COLORS[mod(i, CHART_COLORS.length)];

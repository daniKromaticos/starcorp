import { CHART_COLORS, CHART_GRADIENTS } from './chart-palette';

/**
 * Gradientes del design system.
 * Agregar gradientes adicionales aquí cuando estén disponibles.
 *
 * Uso con react-native-svg LinearGradient dentro de victory-native charts,
 * o con expo experimental_backgroundImage para Views.
 */
export const gradients = {
  // Cards de categoría (del mockup — navy oscuro)
  cardNavy: {
    colors: ['#1A2B6D', '#0F1B4A'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  // Gráfico de área principal
  chartArea: {
    colors: [`${CHART_COLORS[0]}40`, `${CHART_COLORS[0]}05`] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  // Brand navy (iconos, acentos navy) — vertical, claro → oscuro
  brandNavy: {
    colors: ['#20307E', '#0A1537'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  // Brand orange (icono "Consolidado", acentos cálidos) — vertical, claro → oscuro
  brandOrange: {
    colors: ['#F2C87A', '#FFB74A', '#DF6434'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  // Botón azul intermedio — vertical, claro (top) → oscuro (bottom)
  buttonBlue: {
    colors: ['#1938A5', '#04113F'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
} as const;

export type GradientName = keyof typeof gradients;

/**
 * Paleta de gradientes para barras (ingresos / costos / egresos / terceros).
 * Se cicla por índice. Dirección vertical: primer color arriba → último abajo.
 *
 * Homologada a los 8 degradados canónicos (ver chart-palette.ts).
 */
export const BAR_GRADIENTS: readonly (readonly string[])[] = CHART_GRADIENTS;

/**
 * Paleta de "segmentos": tono sólido de las rodajas de los donuts de informes
 * (cartera, asociados) y de los donuts de terceros en gastos / costos. El
 * DonutChart le aplica profundidad automáticamente; aquí solo vive el color
 * base = primer color de cada degradado canónico. Se cicla por índice.
 */
export const SEGMENT_PALETTE: readonly string[] = CHART_COLORS;

/**
 * Color del bucket "Otros" en los donuts de segmentos = último degradado
 * canónico (remolacha). Reservado: los sectores con nombre solo usan los
 * índices 0–6, así "Otros" (índice 7) nunca colisiona.
 */
export const OTROS_SEGMENT_COLOR = CHART_COLORS[7];

/**
 * Gradientes para leyendas de clientes (C1–C8) — swatches y barras.
 * Homologada a los 8 degradados canónicos (ver chart-palette.ts).
 */
export const CLIENT_LEGEND_GRADIENTS: readonly (readonly string[])[] =
  CHART_GRADIENTS;

/**
 * Helpers de tortas (donut) — reglas de color homologadas.
 *
 * Regla única para TODAS las tortas del proyecto:
 *   - El color arranca en naranja (degradado canónico 0) y avanza por índice.
 *   - Máximo 8 sectores: los 7 mayores con los colores 0–6 y el resto agrupado
 *     en un sector "Otros" con remolacha (índice 7).
 *
 * El color se asigna por POSICIÓN (orden mayor→menor), no por identidad del
 * item, para garantizar que el sector más grande siempre sea naranja.
 */
import { CHART_COLORS } from '@/src/theme/chart-palette';
import { OTROS_SEGMENT_COLOR } from '@/src/theme/gradients';

/** Sectores con nombre antes de colapsar en "Otros". */
export const DONUT_MAX_NAMED = 7;

/**
 * Color de torta por posición (orden mayor→menor):
 *   0–6 → degradados canónicos (empieza en naranja)
 *   7+  → remolacha ("Otros")
 */
export function donutColorAt(rank: number): string {
  return rank < DONUT_MAX_NAMED ? CHART_COLORS[rank] : OTROS_SEGMENT_COLOR;
}

export interface DonutSlice {
  id: string;
  value: number;
  label: string;
  color: string;
}

interface DonutItem {
  id: string;
  value: number;
  label: string;
}

/**
 * Construye los sectores de una torta a partir de items YA ORDENADOS
 * (mayor→menor). Devuelve hasta 8 sectores: top 7 (colores 0–6) y, si sobran,
 * un sector "Otros" (remolacha) que suma el resto.
 *
 * `otrosIds` lista los ids agrupados bajo "Otros" (vacío si no hubo colapso),
 * útil para filtrar la lista cuando se selecciona ese sector.
 */
export function buildDonutSlices(
  sorted: readonly DonutItem[],
  otros: { id: string; label: string } = { id: 'otros', label: 'Otros' },
): { slices: DonutSlice[]; otrosIds: string[] } {
  if (sorted.length <= DONUT_MAX_NAMED) {
    return {
      slices: sorted.map((s, i) => ({ ...s, color: CHART_COLORS[i] })),
      otrosIds: [],
    };
  }
  const head = sorted.slice(0, DONUT_MAX_NAMED);
  const tail = sorted.slice(DONUT_MAX_NAMED);
  return {
    slices: [
      ...head.map((s, i) => ({ ...s, color: CHART_COLORS[i] })),
      {
        id: otros.id,
        label: otros.label,
        value: tail.reduce((acc, s) => acc + s.value, 0),
        color: OTROS_SEGMENT_COLOR,
      },
    ],
    otrosIds: tail.map((s) => s.id),
  };
}

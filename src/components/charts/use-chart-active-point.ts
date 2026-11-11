/**
 * Hook: useChartActivePoint
 *
 * Maneja la selección del "punto activo" de una gráfica de tendencia a
 * partir del toque. Devuelve el índice activo y los handlers de responder
 * que se esparcen sobre una capa transparente encima del plot.
 *
 * - Toque (tap) → selecciona el punto más cercano al dedo.
 * - Arrastre (scrub) → actualiza el punto mientras el dedo se mueve.
 * - El tooltip queda visible tras soltar (persistente) hasta el próximo
 *   toque; volver a tocar el mismo punto lo oculta.
 *
 * Solo reclama el responder en `onStart` (tap), así el scroll vertical de
 * la página sigue funcionando al arrastrar sobre la gráfica.
 */

import { useCallback, useMemo, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';

export interface ChartActivePoint {
  activeIndex: number | null;
  clear: () => void;
  handlers: {
    onStartShouldSetResponder: () => boolean;
    onResponderGrant: (e: GestureResponderEvent) => void;
    onResponderMove: (e: GestureResponderEvent) => void;
    onResponderTerminationRequest: () => boolean;
  };
}

export function useChartActivePoint(count: number, width: number): ChartActivePoint {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const indexFromX = useCallback(
    (x: number): number => {
      if (count < 2 || width <= 0) return 0;
      const step = width / (count - 1);
      const idx = Math.round(x / step);
      return Math.max(0, Math.min(count - 1, idx));
    },
    [count, width],
  );

  const clear = useCallback(() => setActiveIndex(null), []);

  const handlers = useMemo(
    () => ({
      onStartShouldSetResponder: () => count >= 2,
      onResponderGrant: (e: GestureResponderEvent) => {
        const next = indexFromX(e.nativeEvent.locationX);
        // Tocar de nuevo el mismo punto lo oculta.
        setActiveIndex((prev) => (prev === next ? null : next));
      },
      onResponderMove: (e: GestureResponderEvent) => {
        setActiveIndex(indexFromX(e.nativeEvent.locationX));
      },
      onResponderTerminationRequest: () => true,
    }),
    [count, indexFromX],
  );

  return { activeIndex, clear, handlers };
}

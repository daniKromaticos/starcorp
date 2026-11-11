/**
 * Chart: GaugeChart
 *
 * Medidor semicircular (180°) de dos segmentos:
 *   - segmento "lleno" (naranja, amber arriba → naranja abajo) de izquierda
 *     hasta `fraction`
 *   - segmento "restante" (azul) hasta el extremo derecho
 * con un pequeño gap entre ambos y extremos planos. Usado en el card de
 * Presupuestos/Seguros. Visual por ahora — `fraction` es decorativo hasta
 * que se conecte la fuente real.
 */

import React, { memo } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { CHART_GRADIENTS } from '@/src/theme/chart-palette';

// Segmentos del medidor, homologados a los degradados canónicos:
// lleno = naranja claro (índice 0), restante = azul claro (índice 6).
const FILL_STOPS = CHART_GRADIENTS[0];
const REST_STOPS = CHART_GRADIENTS[6];

interface GaugeChartProps {
  width: number;
  /** Grosor del arco. */
  trackWidth?: number;
  /** Proporción 0–1 donde termina el naranja y empieza el azul. */
  fraction?: number;
  /** Separación angular (grados) entre los dos segmentos. */
  gapDeg?: number;
  gradientId?: string;
}

function pointAt(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const s = pointAt(cx, cy, r, startDeg);
  const e = pointAt(cx, cy, r, endDeg);
  const largeArc = Math.abs(startDeg - endDeg) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

export const GaugeChart = memo<GaugeChartProps>(
  ({
    width,
    trackWidth = 26,
    fraction = 0.8,
    gapDeg = 4,
    gradientId = 'gauge',
  }) => {
    const r = (width - trackWidth) / 2;
    const cx = width / 2;
    const cy = r + trackWidth / 2;
    const height = cy + trackWidth / 2;

    const f = Math.max(0, Math.min(1, fraction));
    // Ángulos de medidor: 180° = izquierda, 0° = derecha.
    const splitDeg = 180 * (1 - f);
    const half = gapDeg / 2;

    // Naranja: de 180° hasta el split (lado izquierdo / mayoritario).
    const fillD = arcPath(cx, cy, r, 180, Math.max(splitDeg + half, half));
    // Azul: del split hasta 0° (extremo derecho).
    const restD = arcPath(cx, cy, r, Math.max(splitDeg - half, 0), 0);

    return (
      <Svg width={width} height={height}>
        <Defs>
          {/* Segmento lleno (naranja) — primer color arriba → último abajo */}
          <LinearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
            {FILL_STOPS.map((c, i) => (
              <Stop
                key={i}
                offset={FILL_STOPS.length > 1 ? i / (FILL_STOPS.length - 1) : 0}
                stopColor={c}
              />
            ))}
          </LinearGradient>
          {/* Segmento restante (azul) — primer color arriba → último abajo */}
          <LinearGradient id={`${gradientId}-rest`} x1="0" y1="0" x2="0" y2="1">
            {REST_STOPS.map((c, i) => (
              <Stop
                key={i}
                offset={REST_STOPS.length > 1 ? i / (REST_STOPS.length - 1) : 0}
                stopColor={c}
              />
            ))}
          </LinearGradient>
        </Defs>

        {/* Segmento restante (azul) primero, para que el naranja quede encima
            en el punto de unión si llegaran a solaparse. */}
        <Path
          d={restD}
          stroke={`url(#${gradientId}-rest)`}
          strokeWidth={trackWidth}
          fill="none"
          strokeLinecap="butt"
        />
        <Path
          d={fillD}
          stroke={`url(#${gradientId}-fill)`}
          strokeWidth={trackWidth}
          fill="none"
          strokeLinecap="butt"
        />
      </Svg>
    );
  },
);

GaugeChart.displayName = 'GaugeChart';

/**
 * Chart: AreaChart
 *
 * Lightweight area chart built with react-native-svg.
 * Supports both smooth (Catmull-Rom) and sharp (polyline) rendering and
 * optional multi-stop linear gradient fills.
 *
 * Interactividad opcional:
 *  - `showPoints` dibuja un círculo en cada vértice (puntos de interés).
 *  - `activeIndex` resalta un punto (guía vertical + círculo) — el padre
 *    lo controla con `useChartActivePoint` y muestra el tooltip de
 *    fecha/valor encima.
 */

import React, { memo, useMemo } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';

export interface AreaGradientStop {
  offset: number;
  color: string;
  opacity?: number;
}

export interface AreaGradient {
  stops: AreaGradientStop[];
  direction?: 'vertical' | 'horizontal';
}

interface Point {
  x: number;
  y: number;
}

interface AreaChartProps {
  data: number[];
  width: number;
  height: number;
  color: string;
  fillOpacity?: number;
  strokeWidth?: number;
  gradientId?: string;
  smooth?: boolean;
  fillGradient?: AreaGradient;
  strokeOpacity?: number;
  yMin?: number;
  yMax?: number;
  /** Dibuja un círculo en cada vértice (útil con pocos puntos). */
  showPoints?: boolean;
  pointRadius?: number;
  /** Índice del punto resaltado (guía vertical + dot). null = ninguno. */
  activeIndex?: number | null;
}

/**
 * Calcula la posición (x, y) de cada dato. La x se reparte uniforme por
 * índice; la y respeta `yMin/yMax` si vienen (escala fija) o auto-escala
 * con un pequeño padding vertical.
 */
function computePoints(
  data: number[],
  width: number,
  height: number,
  yMin?: number,
  yMax?: number,
): Point[] {
  if (data.length === 0) return [];

  const hasFixedScale = yMin !== undefined && yMax !== undefined;
  const min = hasFixedScale ? yMin! : Math.min(...data);
  const max = hasFixedScale ? yMax! : Math.max(...data);
  const range = max - min || 1;
  const scaleY = hasFixedScale ? 1 : 0.85;
  const padY = hasFixedScale ? 0 : height * 0.05;
  const denom = data.length > 1 ? data.length - 1 : 1;

  return data.map((value, i) => ({
    x: (i / denom) * width,
    y: height - ((value - min) / range) * height * scaleY - padY,
  }));
}

function buildLinePath(points: Point[], smooth: boolean): string {
  if (points.length < 2) return '';

  if (!smooth) {
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

export const AreaChart = memo<AreaChartProps>(
  ({
    data,
    width,
    height,
    color,
    fillOpacity = 0.15,
    strokeWidth = 2,
    gradientId = 'areaGrad',
    smooth = true,
    fillGradient,
    strokeOpacity = 1,
    yMin,
    yMax,
    showPoints = false,
    pointRadius = 3,
    activeIndex = null,
  }) => {
    const points = useMemo(
      () => computePoints(data, width, height, yMin, yMax),
      [data, width, height, yMin, yMax],
    );

    const linePath = useMemo(
      () => buildLinePath(points, smooth),
      [points, smooth],
    );

    const areaPath = useMemo(() => {
      if (!linePath) return '';
      return `${linePath} L ${width} ${height} L 0 ${height} Z`;
    }, [linePath, width, height]);

    const stops = useMemo<AreaGradientStop[]>(
      () =>
        fillGradient?.stops ?? [
          { offset: 0, color, opacity: fillOpacity },
          { offset: 1, color, opacity: 0.01 },
        ],
      [fillGradient, color, fillOpacity],
    );

    const horizontal = fillGradient?.direction === 'horizontal';

    if (data.length < 2) return null;

    const active =
      activeIndex != null && activeIndex >= 0 && activeIndex < points.length
        ? points[activeIndex]
        : null;

    return (
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2={horizontal ? '1' : '0'}
            y2={horizontal ? '0' : '1'}
          >
            {stops.map((s, i) => (
              <Stop
                key={i}
                offset={s.offset}
                stopColor={s.color}
                stopOpacity={s.opacity ?? 1}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill={`url(#${gradientId})`} />
        <Path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {showPoints &&
          points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={pointRadius} fill={color} />
          ))}

        {active && (
          <>
            <Line
              x1={active.x}
              y1={0}
              x2={active.x}
              y2={height}
              stroke={color}
              strokeWidth={1}
              strokeOpacity={0.45}
              strokeDasharray="3 3"
            />
            <Circle
              cx={active.x}
              cy={active.y}
              r={5}
              fill={color}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          </>
        )}
      </Svg>
    );
  },
);

AreaChart.displayName = 'AreaChart';

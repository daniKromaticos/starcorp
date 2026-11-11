/**
 * Chart: DonutChart
 *
 * Lightweight donut/pie built with react-native-svg.
 * Each slice renders two concentric bands — outer wider band and a
 * thinner inner "shadow" band. Both bands use per-slice vertical
 * LinearGradients (bright → darker) to give each color a glossy depth.
 *
 * Pass `centerBackground` to fill the hole with a radial navy gradient
 * (the "bubble" behind the total in the top clients card).
 *
 * La selección por toque NO usa el `onPress` de los `Path` de
 * react-native-svg: en Android no dispara de forma fiable. En su lugar se
 * superpone una capa transparente con el responder de RN (mismo patrón que
 * `use-chart-active-point`) y se resuelve el sector por geometría.
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Svg, {
  Path,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import { darkenHex } from '@/src/utils/color';

interface DonutSlice {
  value: number;
  color: string;
  innerColor?: string;
  label?: string;
}

export interface DonutCenterBackground {
  from: string;
  to: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size: number;
  innerRadius?: number;
  padAngle?: number;
  ringSplit?: number;
  centerBackground?: DonutCenterBackground;
  children?: React.ReactNode;
  /** Called with the slice index when a slice is tapped. */
  onSlicePress?: (index: number) => void;
  /** Index of the currently selected slice (for visual emphasis). */
  selectedIndex?: number | null;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export const DonutChart = memo<DonutChartProps>(
  ({
    data,
    size,
    innerRadius = 0.55,
    padAngle = 2,
    ringSplit = 0.22,
    centerBackground,
    children,
    onSlicePress,
    selectedIndex = null,
  }) => {
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 4;
    const holeR = outerR * innerRadius;
    const midR = holeR + (outerR - holeR) * ringSplit;

    const slices = useMemo(() => {
      const total = data.reduce((sum, d) => sum + d.value, 0);
      if (total === 0) return [];

      let currentAngle = 0;
      return data.map((slice, i) => {
        const sliceAngle = (slice.value / total) * 360;
        const startAngle = currentAngle + padAngle / 2;
        const endAngle = currentAngle + sliceAngle - padAngle / 2;
        currentAngle += sliceAngle;

        const base = slice.color;
        const inner = slice.innerColor ?? darkenHex(base, 0.55);

        return {
          startAngle,
          endAngle,
          // Límites sin `padAngle`: el hit-test cubre también los huecos
          // entre sectores, para que no haya franjas muertas al tocar.
          hitStart: currentAngle - sliceAngle,
          hitEnd: currentAngle,
          outerTop: base,
          outerBottom: darkenHex(base, 0.82),
          innerTop: inner,
          innerBottom: darkenHex(inner, 0.78),
          outerGradId: `donut-outer-${i}`,
          innerGradId: `donut-inner-${i}`,
        };
      });
    }, [data, padAngle]);

    /**
     * Sector bajo el dedo, o null si el toque cae fuera del anillo (hueco
     * central o esquinas del cuadrado). Ángulos en la convención del donut:
     * 0° arriba, creciendo en sentido horario.
     */
    const sliceAt = useCallback(
      (x: number, y: number): number | null => {
        if (slices.length === 0) return null;

        const dx = x - cx;
        const dy = y - cy;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < holeR || r > outerR) return null;

        const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 450) % 360;
        const i = slices.findIndex(
          (s) => angle >= s.hitStart && angle < s.hitEnd,
        );
        // Los ángulos acumulados pueden quedarse una milésima por debajo de
        // 360: el borde final pertenece al último sector.
        return i >= 0 ? i : slices.length - 1;
      },
      [slices, cx, cy, holeR, outerR],
    );

    // Sector donde empezó el toque: sólo se confirma la selección si el dedo
    // se levanta sobre el mismo sector (así un scroll que arranca encima del
    // donut no dispara el filtro).
    const pressedSlice = useRef<number | null>(null);

    const touchHandlers = useMemo(() => {
      if (!onSlicePress) return null;
      return {
        onStartShouldSetResponder: (e: GestureResponderEvent) => {
          const i = sliceAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
          pressedSlice.current = i;
          return i != null;
        },
        onResponderTerminationRequest: () => true,
        onResponderRelease: (e: GestureResponderEvent) => {
          const i = sliceAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
          if (i != null && i === pressedSlice.current) onSlicePress(i);
          pressedSlice.current = null;
        },
        onResponderTerminate: () => {
          pressedSlice.current = null;
        },
      };
    }, [onSlicePress, sliceAt]);

    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            {centerBackground && (
              <RadialGradient
                id="donutCenter"
                cx="50%"
                cy="42%"
                r="55%"
                fx="50%"
                fy="42%"
              >
                <Stop offset="0" stopColor={centerBackground.from} />
                <Stop offset="1" stopColor={centerBackground.to} />
              </RadialGradient>
            )}
            {slices.map((s) => (
              <React.Fragment key={s.outerGradId}>
                <LinearGradient
                  id={s.outerGradId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={s.outerTop} />
                  <Stop offset="1" stopColor={s.outerBottom} />
                </LinearGradient>
                <LinearGradient
                  id={s.innerGradId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={s.innerTop} />
                  <Stop offset="1" stopColor={s.innerBottom} />
                </LinearGradient>
              </React.Fragment>
            ))}
          </Defs>

          {/* Inner (shadow) thinner band */}
          <G>
            {slices.map((s, i) => (
              <Path
                key={`i-${i}`}
                d={describeArc(
                  cx,
                  cy,
                  midR,
                  holeR,
                  s.startAngle,
                  s.endAngle,
                )}
                fill={`url(#${s.innerGradId})`}
                opacity={
                  selectedIndex == null || selectedIndex === i ? 1 : 0.4
                }
              />
            ))}
          </G>

          {/* Outer wider band */}
          <G>
            {slices.map((s, i) => (
              <Path
                key={`o-${i}`}
                d={describeArc(
                  cx,
                  cy,
                  outerR,
                  midR,
                  s.startAngle,
                  s.endAngle,
                )}
                fill={`url(#${s.outerGradId})`}
                opacity={
                  selectedIndex == null || selectedIndex === i ? 1 : 0.4
                }
              />
            ))}
          </G>

          {centerBackground && (
            <Circle cx={cx} cy={cy} r={holeR} fill="url(#donutCenter)" />
          )}
        </Svg>

        {/* El contenido central cubre todo el cuadrado del donut: sin
            `pointerEvents="none"` se traga los toques sobre el anillo en
            cuanto aparece (p. ej. al mostrar el % del sector elegido). */}
        {children && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {children}
          </View>
        )}

        {/* Capa de toque, siempre encima del resto. */}
        {touchHandlers && (
          <View
            {...touchHandlers}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}
      </View>
    );
  },
);

DonutChart.displayName = 'DonutChart';

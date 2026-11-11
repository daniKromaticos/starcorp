/**
 * Organism: OrBarChart
 *
 * Bar chart for consolidated views (Costos/Gastos by groups).
 * Uses RN views for bars (no SVG). Supports values that cross zero —
 * positive bars grow up from the zero line, negative bars grow down.
 */

import React, { memo, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { tokens } from '@/src/theme/tokens';
import { BAR_GRADIENTS } from '@/src/theme/gradients';

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface OrBarChartProps {
  data: BarDataPoint[];
  height?: number;
  className?: string;
  /** When true, renders dashed horizontal gridlines at each Y-axis tick */
  dashedGridlines?: boolean;
  /** Override the gradient palette cycled per bar. Defaults to BAR_GRADIENTS. */
  palette?: readonly (readonly string[])[];
}

function formatAxis(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return v === 0 ? '0' : `${sign}${Math.round(abs)}`;
}

export const OrBarChart = memo<OrBarChartProps>(
  ({ data, height = 200, className, dashedGridlines = false, palette = BAR_GRADIENTS }) => {
    const { yMin, yMax, range, zeroFromTop } = useMemo(() => {
      const values = data.map((d) => d.value);
      const peak = Math.max(0, ...values);
      const trough = Math.min(0, ...values);
      const yMin = trough;
      const yMax = peak || 1;
      const range = yMax - yMin || 1;
      const zeroFromTop = (yMax / range) * height;
      return { yMin, yMax, range, zeroFromTop };
    }, [data, height]);

    const yLabels = useMemo(() => {
      if (yMin >= 0) return [yMax, yMax / 2, 0].map(formatAxis);
      if (yMax <= 0) return [0, yMin / 2, yMin].map(formatAxis);
      return [yMax, 0, yMin].map(formatAxis);
    }, [yMin, yMax]);

    return (
      <View className={`gap-2 ${className ?? ''}`}>
        <View className="flex-row" style={{ height }}>
          {/* Y-axis labels */}
          <View className="justify-between pr-2" style={{ width: 50 }}>
            {yLabels.map((label, i) => (
              <AtTypography key={i} variant="label" color="#8892A4">
                {label}
              </AtTypography>
            ))}
          </View>

          {/* Bars area with zero reference line + optional dashed gridlines */}
          <View className="flex-1" style={{ position: 'relative', height }}>
            {/* Zero baseline (only visible when range crosses zero) */}
            {yMin < 0 && yMax > 0 && (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: zeroFromTop,
                  height: 1,
                  backgroundColor: tokens.color.border.subtle,
                }}
              />
            )}

            {/* Dashed gridlines at the two intermediate Y-tick positions */}
            {dashedGridlines && [height * 0, height * 0.5].map((tickTop, ti) => (
              <View
                key={`grid-${ti}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: tickTop,
                  height: 1,
                  borderStyle: 'dashed',
                  borderTopWidth: 1,
                  borderColor: 'rgba(136, 146, 164, 0.35)',
                }}
              />
            ))}

            <View className="flex-row gap-1" style={{ height }}>
              {data.map((item, i) => {
                const barHeight =
                  (Math.abs(item.value) / range) * height;
                const top =
                  item.value >= 0
                    ? Math.max(0, zeroFromTop - barHeight)
                    : zeroFromTop;
                const gradient = palette[i % palette.length];
                return (
                  <View
                    key={i}
                    className="flex-1 items-center"
                    style={{ position: 'relative', height }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        top,
                        width: '70%',
                        height: barHeight,
                      }}
                    >
                      <LinearGradient
                        colors={gradient as readonly [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderTopLeftRadius: 6,
                          borderTopRightRadius: 6,
                          borderBottomLeftRadius: 2,
                          borderBottomRightRadius: 2,
                          borderCurve: 'continuous' as const,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  },
);

OrBarChart.displayName = 'OrBarChart';

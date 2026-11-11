/**
 * Organism: OrAgingBarChart
 *
 * Bar chart de aging de Cartera: una barra por bucket
 * (corriente / 0-30 / 31-60 / 61-90 / 91+), coloreada por severidad.
 * Lo usan la mini-gráfica del dashboard (OrInformesSection) y la
 * segmentación por cliente del Informe Cartera.
 */

import React, { memo, useMemo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { BarChart } from '@/src/components/charts/bar-chart';
import { AGING_BUCKETS, type AgingBucket } from '@/src/types/cartera.types';
import { formatCompact } from '@/src/utils/number';
import { tokens } from '@/src/theme/tokens';

/**
 * Rampa de severidad de aging: corriente (verde) → 91+ (rojo).
 * Pasos diferenciados (verde → amarillo → naranja → naranja intenso → rojo)
 * para que cada bucket se distinga; tonos alineados a la paleta del proyecto.
 */
export const AGING_BUCKET_COLOR: Record<AgingBucket, string> = {
  corriente: '#3FB97A',
  '0-30': '#F2C94C',
  '31-60': '#F2994A',
  '61-90': '#E8602E',
  '91+': '#D7443E',
};

/**
 * Etiquetas compactas del eje X:
 * sin espacios alrededor del guion para que quepan en una sola línea.
 * (Las etiquetas largas de `AGING_BUCKET_LABEL` se usan en la lista/tabs.)
 */
const AGING_BUCKET_SHORT_LABEL: Record<AgingBucket, string> = {
  corriente: 'Corriente',
  '0-30': '1-30',
  '31-60': '31-60',
  '61-90': '61-90',
  '91+': '+91',
};

function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

export const OrAgingBarChart = memo<{
  buckets: Record<AgingBucket, number>;
  width: number;
}>(({ buckets, width }) => {
  const yAxisWidth = 36;
  const chartWidth = Math.max(40, width - yAxisWidth);
  const chartHeight = 110;

  const values = useMemo(
    () => AGING_BUCKETS.map((b) => buckets[b]),
    [buckets],
  );
  const yMax = useMemo(() => niceCeil(Math.max(...values, 0)), [values]);
  const yTicks = useMemo(() => [yMax, yMax / 2, 0], [yMax]);
  const barData = useMemo(
    () =>
      AGING_BUCKETS.map((b) => ({
        value: buckets[b],
        color: AGING_BUCKET_COLOR[b],
      })),
    [buckets],
  );

  return (
    <View style={{ width, height: chartHeight + 22 }}>
      {/* Y-axis labels */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: chartHeight,
          width: yAxisWidth - 4,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 1,
        }}
      >
        {yTicks.map((t, i) => (
          <AtTypography key={i} variant="label" color="#8892A4">
            {t === 0 ? '0' : formatCompact(t)}
          </AtTypography>
        ))}
      </View>

      <View style={{ marginLeft: yAxisWidth, position: 'relative' }}>
        {/* Dashed grid lines */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: chartHeight,
            justifyContent: 'space-between',
          }}
        >
          {yTicks.map((_, i) => (
            <View
              key={i}
              style={{
                height: 1,
                borderTopWidth: 1,
                borderTopColor: tokens.color.border.default,
                borderStyle: 'dashed',
              }}
            />
          ))}
        </View>

        {/* Bars */}
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <BarChart
            data={barData}
            width={chartWidth}
            height={chartHeight}
            gap={10}
          />
        </View>

        {/* X-axis bucket labels */}
        <View
          style={{
            position: 'absolute',
            top: chartHeight + 4,
            left: 0,
            right: 0,
            flexDirection: 'row',
          }}
        >
          {AGING_BUCKETS.map((b) => (
            <View key={b} style={{ flex: 1, alignItems: 'center' }}>
              <AtTypography
                variant="label"
                color="#8892A4"
                numberOfLines={1}
                style={{ fontSize: 10, lineHeight: 14, letterSpacing: 0 }}
              >
                {AGING_BUCKET_SHORT_LABEL[b]}
              </AtTypography>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});
OrAgingBarChart.displayName = 'OrAgingBarChart';

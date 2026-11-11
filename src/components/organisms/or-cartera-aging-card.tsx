/**
 * Organism: OrCarteraAgingCard
 *
 * Segmentación de la deuda de un cliente (o del grupo "Otros") por bucket de
 * aging: la misma gráfica de barras del dashboard (OrAgingBarChart) más una
 * fila por bucket con monto y % del total, para ver qué compone su cartera.
 *
 * Con `onBack` muestra un "Volver" en el header (el Informe Cartera lo usa
 * para regresar al donut de distribución).
 */

import React, { memo, useState } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import {
  AGING_BUCKET_COLOR,
  OrAgingBarChart,
} from '@/src/components/organisms/or-aging-bar-chart';
import {
  AGING_BUCKETS,
  AGING_BUCKET_LABEL,
  type AgingBucket,
} from '@/src/types/cartera.types';

interface OrCarteraAgingCardProps {
  title: string;
  /** Nombre del cliente (o "Otros") y su color en el donut. */
  name: string;
  color: string;
  buckets: Record<AgingBucket, number>;
  valueFormatter: (value: number) => string;
  onBack?: () => void;
}

export const OrCarteraAgingCard = memo<OrCarteraAgingCardProps>(
  ({ title, name, color, buckets, valueFormatter, onBack }) => {
    const [chartWidth, setChartWidth] = useState(0);
    const total = AGING_BUCKETS.reduce((s, b) => s + buckets[b], 0);

    return (
      <View
        className="bg-bg-card rounded-lg px-3 py-4 gap-3"
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.06)',
        }}
      >
        <View className="flex-row items-center justify-between gap-2">
          <AtTypography variant="bodyBold" className="flex-1">
            {title}
          </AtTypography>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              className="flex-row items-center gap-1 rounded-full bg-bg-secondary px-3 py-1.5"
              accessibilityRole="button"
              accessibilityLabel="Volver a la distribución por cliente"
            >
              <AtIcon name="arrow-back" size="sm" color="#1A3FE8" />
              <AtTypography variant="captionBold" color="#1A3FE8">
                Volver
              </AtTypography>
            </Pressable>
          )}
        </View>

        <View className="flex-row items-center gap-2">
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: color,
            }}
          />
          <AtTypography variant="captionBold" className="flex-1" numberOfLines={1}>
            {name}
          </AtTypography>
          <AtTypography
            variant="bodyBold"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {valueFormatter(total)}
          </AtTypography>
        </View>

        <View onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
          {chartWidth > 0 && (
            <OrAgingBarChart buckets={buckets} width={chartWidth} />
          )}
        </View>

        <View className="gap-2">
          {AGING_BUCKETS.map((b) => {
            const pct = total !== 0 ? (buckets[b] / total) * 100 : 0;
            return (
              <View key={b} className="flex-row items-center gap-2">
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: AGING_BUCKET_COLOR[b],
                  }}
                />
                <AtTypography variant="caption" color="#4A5568" className="flex-1">
                  {AGING_BUCKET_LABEL[b]}
                </AtTypography>
                <AtTypography
                  variant="caption"
                  color="#8892A4"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {`${pct.toFixed(1)}%`}
                </AtTypography>
                <AtTypography
                  variant="captionBold"
                  color="#1A1F36"
                  style={{ fontVariant: ['tabular-nums'], minWidth: 96, textAlign: 'right' }}
                >
                  {valueFormatter(buckets[b])}
                </AtTypography>
              </View>
            );
          })}
        </View>
      </View>
    );
  },
);
OrCarteraAgingCard.displayName = 'OrCarteraAgingCard';

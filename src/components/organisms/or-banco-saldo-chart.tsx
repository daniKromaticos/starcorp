/**
 * Organism: OrBancoSaldoChart
 *
 * Card blanca del detalle de empresa Bancos: título + delta pequeño,
 * monto total grande, y bar chart con gridlines y labels del eje Y.
 *
 * El bar chart usa el átomo `BarChart` (react-native-svg) y por encima
 * se superponen los gridlines punteados con sus labels.
 */

import React, { memo, useMemo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { BarChart, type BarDatum } from '@/src/components/charts/bar-chart';
import { formatCurrency } from '@/src/utils/currency';

interface OrBancoSaldoChartProps {
  title?: string;
  total: number;
  deltaPct: number;
  data: BarDatum[];
  height?: number;
  axisLabelWidth?: number;
}

function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const n = value / base;
  let nice: number;
  if (n <= 1) nice = 1;
  else if (n <= 2) nice = 2;
  else if (n <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

function formatAxisTick(value: number): string {
  if (value === 0) return '$0';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)} mil`;
  return `$${value}`;
}

export const OrBancoSaldoChart = memo<OrBancoSaldoChartProps>(
  ({
    title = 'Saldo por número de cuentas',
    total,
    deltaPct,
    data,
    height = 180,
    axisLabelWidth = 56,
  }) => {
    const { ticks, top } = useMemo(() => {
      const max = Math.max(...data.map((d) => d.value), 1);
      const t = niceCeil(max);
      return { ticks: [t, t / 2, 0], top: t };
    }, [data]);

    return (
      <View
        className="bg-white rounded-lg p-4"
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.06)',
        }}
      >
        <View className="flex-row items-center gap-2">
          <AtTypography
            variant="bodyBold"
            color="#5A8A9B"
            style={{ flexShrink: 1 }}
          >
            {title}
          </AtTypography>
          <AtDeltaIndicator value={deltaPct} size="sm" />
        </View>
        <AtTypography
          variant="h2"
          color="#1A1F36"
          style={{ fontVariant: ['tabular-nums'], marginTop: 2 }}
        >
          {formatCurrency(total)}
        </AtTypography>

        <View
          className="mt-4 flex-row"
          style={{ height }}
          onLayout={() => undefined}
        >
          <View
            style={{
              width: axisLabelWidth,
              justifyContent: 'space-between',
            }}
          >
            {ticks.map((t) => (
              <AtTypography
                key={t}
                variant="caption"
                color="#8892A4"
                style={{ textAlign: 'right' }}
              >
                {formatAxisTick(t)}
              </AtTypography>
            ))}
          </View>

          <View className="flex-1 ml-2">
            {ticks.map((t, i) => {
              const topOffset = (i / (ticks.length - 1)) * height;
              return (
                <View
                  key={t}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: topOffset - 1,
                    borderTopWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: '#D1D5DB',
                  }}
                />
              );
            })}
            <ChartFill data={data} top={top} height={height} />
          </View>
        </View>
      </View>
    );
  },
);

OrBancoSaldoChart.displayName = 'OrBancoSaldoChart';

interface ChartFillProps {
  data: BarDatum[];
  top: number;
  height: number;
}

const ChartFill = memo<ChartFillProps>(({ data, top, height }) => {
  const [width, setWidth] = React.useState(0);
  // Normalize values to [0, 1] relative to `top` so BarChart's internal
  // max becomes 1 and bars scale against the same ceiling as the gridlines.
  const scaled = useMemo<BarDatum[]>(() => {
    if (top <= 0) return data;
    return data.map((d) => ({ ...d, value: d.value / top }));
  }, [data, top]);

  return (
    <View
      className="flex-1"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <View style={{ position: 'absolute', left: 0, top: 0 }}>
          <BarChart
            data={scaled}
            width={width}
            height={height}
            gap={24}
            cornerRadius={8}
          />
        </View>
      )}
    </View>
  );
});

ChartFill.displayName = 'ChartFill';

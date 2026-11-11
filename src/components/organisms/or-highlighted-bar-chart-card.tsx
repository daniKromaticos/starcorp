/**
 * Organism: OrHighlightedBarChartCard
 *
 * White rounded card: entity label + amount + dark delta chip,
 * with an OrBarChart below. One bar is visually emphasized with
 * a small "Hoy" pill overlay above it.
 *
 * Reused by the Ingreso-by-clientes view and the Costo/Egreso terceros view.
 */

import React, { memo, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import { BAR_GRADIENTS } from '@/src/theme/gradients';

export interface HighlightedBarChartPoint {
  id: string;
  label: string;
  value: number;
  color?: string;
}

interface OrHighlightedBarChartCardProps {
  title: string;
  amount: number;
  /** Null/undefined = sin comparativo: el chip de delta no se renderiza. */
  deltaPercent?: number | null;
  bars: HighlightedBarChartPoint[];
  highlightedId?: string;
  /** Multiple bar IDs to mark — used by 'dot' mode when one selection in the
   *  list maps to several bars (e.g. all invoices for one vendor). */
  highlightedIds?: string[];
  highlightLabel?: string;
  /** 'pill' renders a labeled chip above the (single) highlighted bar — the
   *  default. 'dot' renders a small circular indicator on every highlighted
   *  bar instead. */
  highlightMode?: 'pill' | 'dot';
  height?: number;
  className?: string;
}

export const OrHighlightedBarChartCard = memo<OrHighlightedBarChartCardProps>(
  ({
    title,
    amount,
    deltaPercent,
    bars,
    highlightedId,
    highlightedIds,
    highlightLabel = 'Hoy',
    highlightMode = 'pill',
    height = 180,
    className,
  }) => {
    // Use magnitude so negative-valued series (e.g. QB expense transactions
    // returned as negatives) still render visible bars.
    const maxValue = useMemo(
      () => Math.max(...bars.map((b) => Math.abs(b.value)), 1),
      [bars],
    );
    const highlightSet = useMemo(() => {
      const set = new Set<string>(highlightedIds ?? []);
      if (highlightedId) set.add(highlightedId);
      return set;
    }, [highlightedId, highlightedIds]);

    return (
      <View
        className={`bg-bg-card rounded-lg p-4 gap-3 mx-4 ${className ?? ''}`}
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.08)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        <View className="gap-1">
          <AtTypography variant="captionBold" color="#1A1F36">
            {title}
          </AtTypography>
          {/* 320dp: monto lg + delta no caben en una línea; el delta baja. */}
          <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
            <AtMetricValue value={amount} size="lg" />
            {deltaPercent != null && (
              <AtDeltaIndicator value={deltaPercent} size="sm" appearance="dark" />
            )}
          </View>
        </View>

        <View style={{ height }} className="flex-row items-end gap-2 pt-4">
          {bars.map((bar, i) => {
            const barHeight = (Math.abs(bar.value) / maxValue) * (height - 24);
            const gradient = BAR_GRADIENTS[i % BAR_GRADIENTS.length];
            const isHighlighted = highlightSet.has(bar.id);
            return (
              <View
                key={bar.id}
                className="flex-1 items-center justify-end"
                style={{ height }}
              >
                {isHighlighted && highlightMode === 'pill' && (
                  <View
                    className="rounded-full px-2.5 py-0.5 mb-1"
                    style={{ backgroundColor: '#1A2B6D', borderCurve: 'continuous' }}
                  >
                    <AtTypography variant="label" color="#FFFFFF">
                      {highlightLabel}
                    </AtTypography>
                  </View>
                )}
                {isHighlighted && highlightMode === 'dot' && (
                  <View
                    className="mb-1.5"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#1A2B6D',
                    }}
                  />
                )}
                <LinearGradient
                  colors={gradient as readonly [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    width: '80%',
                    height: barHeight,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    borderCurve: 'continuous',
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
    );
  },
);

OrHighlightedBarChartCard.displayName = 'OrHighlightedBarChartCard';

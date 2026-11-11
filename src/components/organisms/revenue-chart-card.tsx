/**
 * Organism: RevenueChartCard
 *
 * Main "Empresas (Consolidado)" card from mockup.
 * Combines metric header + stacked area charts using custom SVG components.
 */

import React, { memo, useMemo } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { Text } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';
import { shadows } from '@/src/theme/shadows';
import { StatusBadge } from '@/src/components/atoms/status-badge';
import { DeltaIndicator } from '@/src/components/atoms/delta-indicator';
import { MetricValue } from '@/src/components/atoms/metric-value';
import { Skeleton } from '@/src/components/atoms/skeleton';
import { AreaChart } from '@/src/components/charts/area-chart';
import { useRevenue } from '@/src/hooks/queries/use-revenue';
import type { NormalizedRevenue, TimeSeriesPoint } from '@/src/types/domain.types';

interface RevenueChartCardProps {
  onPress?: () => void;
}

export const RevenueChartCard = memo<RevenueChartCardProps>(({ onPress }) => {
  const { data, isLoading } = useRevenue();

  if (isLoading || !data) {
    return (
      <View
        style={{
          backgroundColor: tokens.color.background.card,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
          marginHorizontal: tokens.spacing.lg,
          boxShadow: shadows.card,
          gap: tokens.spacing.md,
        }}
      >
        <Skeleton width={200} height={16} />
        <Skeleton width={140} height={36} />
        <Skeleton width={100} height={16} />
        <Skeleton width="100%" height={160} borderRadius={tokens.radius.md} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: tokens.color.background.card,
        borderRadius: tokens.radius.lg,
        borderCurve: 'continuous',
        padding: tokens.spacing.lg,
        marginHorizontal: tokens.spacing.lg,
        boxShadow: pressed ? shadows.cardHover : shadows.card,
        gap: tokens.spacing.sm,
      })}
    >
      <RevenueHeader data={data} />
      <RevenueChartArea series={data.series} deltaAbsolute={data.deltaAbsolute} />
    </Pressable>
  );
});

/** Header sub-component */
const RevenueHeader = memo<{ data: NormalizedRevenue }>(({ data }) => (
  <View style={{ gap: tokens.spacing.xs }}>
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: tokens.spacing.xs,
      }}
    >
      <Text
        style={{
          ...tokens.typography.caption,
          color: tokens.color.ink.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        Ingresos
      </Text>
      <StatusBadge label="Hoy" variant="accent" size="sm" />
    </View>
    <MetricValue value={data.total} size="lg" />
    <DeltaIndicator value={data.deltaPercent} absolute={data.deltaAbsolute} />
  </View>
));

/** Chart sub-component using custom SVG AreaChart */
const RevenueChartArea = memo<{
  series: TimeSeriesPoint[];
  deltaAbsolute: number;
}>(({ series, deltaAbsolute }) => {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - tokens.spacing.lg * 4 - 36;
  const chartHeight = 140;

  // Generate multi-series data (stacked effect from mockup)
  const primaryData = useMemo(() => series.map((p) => p.value), [series]);
  const secondaryData = useMemo(
    () => series.map((p, i) => Math.max(0, p.value * 0.6 + Math.sin(i * 0.5) * 15)),
    [series],
  );
  const tertiaryData = useMemo(
    () => series.map((p, i) => Math.max(0, p.value * 0.3 + Math.cos(i * 0.3) * 10)),
    [series],
  );

  return (
    <View style={{ height: chartHeight + 20, marginTop: tokens.spacing.sm }}>
      {/* Y-axis labels */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 4,
          bottom: 20,
          justifyContent: 'space-between',
          zIndex: 1,
        }}
      >
        {['100%', '50%', '20%'].map((label) => (
          <Text
            key={label}
            style={{
              fontSize: 11,
              color: tokens.color.ink.tertiary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Stacked area charts */}
      <View style={{ marginLeft: 36, position: 'relative' }}>
        {/* Background grid lines */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'space-between',
          }}
        >
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                height: 1,
                backgroundColor: tokens.color.border.subtle,
                marginTop: i === 0 ? chartHeight * 0.05 : 0,
              }}
            />
          ))}
        </View>

        {/* Tertiary area (orange) */}
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <AreaChart
            data={tertiaryData}
            width={chartWidth}
            height={chartHeight}
            color={tokens.color.chart[3]}
            fillOpacity={0.12}
            strokeWidth={1}
            gradientId="grad3"
          />
        </View>

        {/* Secondary area (blue medium) */}
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <AreaChart
            data={secondaryData}
            width={chartWidth}
            height={chartHeight}
            color={tokens.color.chart[1]}
            fillOpacity={0.15}
            strokeWidth={1.5}
            gradientId="grad2"
          />
        </View>

        {/* Primary area (navy) */}
        <AreaChart
          data={primaryData}
          width={chartWidth}
          height={chartHeight}
          color={tokens.color.chart[0]}
          fillOpacity={0.2}
          strokeWidth={2}
          gradientId="grad1"
        />

        {/* Floating tooltip badge */}
        <View
          style={{
            position: 'absolute',
            right: tokens.spacing.md,
            top: tokens.spacing.lg,
            backgroundColor: tokens.color.semantic.positiveLight,
            paddingHorizontal: tokens.spacing.sm,
            paddingVertical: tokens.spacing.xs,
            borderRadius: tokens.radius.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text style={{ color: tokens.color.semantic.positive, fontSize: 12 }}>
            ↗
          </Text>
          <Text
            selectable
            style={{
              color: tokens.color.semantic.positive,
              fontSize: 12,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
            }}
          >
            +{deltaAbsolute >= 1000 ? `${(deltaAbsolute / 1000).toFixed(0)}.000` : deltaAbsolute}
          </Text>
        </View>
      </View>
    </View>
  );
});

RevenueChartCard.displayName = 'RevenueChartCard';
RevenueHeader.displayName = 'RevenueHeader';
RevenueChartArea.displayName = 'RevenueChartArea';

/**
 * Organism: OrDonutChart
 *
 * Donut/pie chart with percentage labels for Costos/Gastos by terceros.
 * Wraps the existing DonutChart component with additional labeling.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import { DonutChart } from '@/src/components/charts/donut-chart';

interface DonutChartData {
  value: number;
  color: string;
  label?: string;
}

interface OrDonutChartProps {
  title?: string;
  totalValue?: number;
  deltaPercent?: number;
  data: DonutChartData[];
  size?: number;
  className?: string;
}

export const OrDonutChart = memo<OrDonutChartProps>(
  ({ title, totalValue, deltaPercent, data, size = 200, className }) => {
    return (
      <View className={`items-center gap-3 ${className ?? ''}`}>
        {title && (
          <AtTypography variant="caption" color="#8892A4">
            {title}
          </AtTypography>
        )}

        {totalValue != null && (
          <View className="items-center gap-1">
            <AtMetricValue value={totalValue} size="md" />
            {deltaPercent != null && (
              <AtDeltaIndicator value={deltaPercent} size="sm" />
            )}
          </View>
        )}

        <DonutChart
          data={data}
          size={size}
          innerRadius={0.6}
          padAngle={2}
        >
          {totalValue != null && (
            <>
              <AtTypography variant="metricSmall" selectable>
                ${totalValue.toLocaleString()}
              </AtTypography>
              <AtTypography variant="caption" color="#8892A4">
                Total
              </AtTypography>
            </>
          )}
        </DonutChart>
      </View>
    );
  },
);

OrDonutChart.displayName = 'OrDonutChart';

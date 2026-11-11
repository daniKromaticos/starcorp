import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { OrBarChart } from '@/src/components/organisms/or-bar-chart';
import { CLIENT_LEGEND_GRADIENTS } from '@/src/theme/gradients';
import type { CostGroup } from '@/src/types/domain.types';

interface OrCostGroupsChartCardProps {
  title: string;
  total: number;
  deltaPercent: number;
  groups: CostGroup[];
  sectionTitle?: string;
}

export const OrCostGroupsChartCard = memo<OrCostGroupsChartCardProps>(
  ({ title, total, deltaPercent, groups, sectionTitle = 'Costos administrativos' }) => {
    const bars = groups.map((g) => ({
      label: g.label,
      value: g.amount,
      color: g.color,
    }));
    return (
      <View className="gap-3">
        <AtTypography variant="h3" className="px-4 text-center">
          {sectionTitle}
        </AtTypography>
        <View
          className="bg-bg-card mx-4 rounded-lg p-4 gap-3"
          style={{
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.08)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Header row: client name (left) + soft delta chip (right) */}
          <View className="flex-row items-center justify-between">
            <AtTypography variant="captionBold" color="#1A1F36">
              {title}
            </AtTypography>
            <AtDeltaIndicator value={deltaPercent} size="sm" appearance="soft" />
          </View>

          {/* Large metric value */}
          <AtMetricValue value={total} size="lg" />

          {/* Bar chart with 8-client palette and dashed gridlines */}
          <OrBarChart
            data={bars}
            height={160}
            palette={CLIENT_LEGEND_GRADIENTS}
            dashedGridlines
          />
        </View>
      </View>
    );
  },
);

OrCostGroupsChartCard.displayName = 'OrCostGroupsChartCard';

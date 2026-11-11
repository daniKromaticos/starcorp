import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { usePowerBIMeasure } from '@/src/hooks/queries/use-powerbi-measure';

interface OrPowerBIMetricCardProps {
  datasetId: string;
  daxQuery: string;
  label: string;
  groupId?: string;
}

export const OrPowerBIMetricCard = memo<OrPowerBIMetricCardProps>(
  ({ datasetId, daxQuery, label, groupId }) => {
    const { data, isLoading, error } = usePowerBIMeasure({
      datasetId,
      daxQuery,
      groupId,
    });

    return (
      <View
        className="bg-bg-card mx-4 rounded-lg p-4 gap-1"
        style={{
          borderCurve: 'continuous',
          boxShadow:
            '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        <AtTypography variant="overline" color="#4A5568">
          {label}
        </AtTypography>
        {isLoading ? (
          <AtSkeleton width={140} height={36} />
        ) : error ? (
          <AtTypography variant="body" color="#DC2626">
            {error.message}
          </AtTypography>
        ) : data == null ? (
          <AtTypography variant="body" color="#8892A4">
            Sin datos
          </AtTypography>
        ) : (
          <AtMetricValue value={data} size="lg" />
        )}
      </View>
    );
  },
);

OrPowerBIMetricCard.displayName = 'OrPowerBIMetricCard';

/**
 * Organism: OrExpenseCentralCard
 *
 * "Gastos central" card at the top of /gastos. Vertical navy gradient
 * highlighted by a thin blue stroke; label on the left, delta chip on the
 * right, big metric amount below.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { LinearGradient } from 'expo-linear-gradient';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import { AtTypography } from '@/src/components/atoms/at-typography';

interface OrExpenseCentralCardProps {
  total: number;
  deltaPercent: number;
  label?: string;
}

export const OrExpenseCentralCard = memo<OrExpenseCentralCardProps>(
  ({ total, deltaPercent, label = 'Gastos central' }) => {
    return (
      <View
        className="mx-4"
        style={{
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: '#3A5BC4',
          borderCurve: 'continuous',
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={['#20307E', '#0A1537']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            gap: 6,
          }}
        >
          <View className="flex-row justify-between items-center">
            <AtTypography variant="caption" color="rgba(255,255,255,0.7)">
              {label}
            </AtTypography>
            <AtDeltaIndicator
              value={deltaPercent}
              size="md"
              appearance="dark"
            />
          </View>
          <AtMetricValue value={total} size="lg" color="#FFFFFF" />
        </LinearGradient>
      </View>
    );
  },
);

OrExpenseCentralCard.displayName = 'OrExpenseCentralCard';

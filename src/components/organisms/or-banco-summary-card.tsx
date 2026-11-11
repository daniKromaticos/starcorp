/**
 * Organism: OrBancoSummaryCard
 *
 * Hero card del Informe Bancos, con el mismo estilo que "Gastos central"
 * (OrExpenseCentralCard): gradiente navy vertical con borde azul fino,
 * label + delta arriba y el monto grande debajo.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { LinearGradient } from 'expo-linear-gradient';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';

interface OrBancoSummaryCardProps {
  label?: string;
  total: number;
  deltaPct: number;
}

export const OrBancoSummaryCard = memo<OrBancoSummaryCardProps>(
  ({ label = 'Bancos totalizado', total, deltaPct }) => {
    return (
      <View
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
            <AtDeltaIndicator value={deltaPct} size="md" appearance="dark" />
          </View>
          <AtMetricValue value={total} size="lg" color="#FFFFFF" />
        </LinearGradient>
      </View>
    );
  },
);

OrBancoSummaryCard.displayName = 'OrBancoSummaryCard';

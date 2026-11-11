import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { formatCurrency } from '@/src/utils/currency';

interface MlConsolidadoClientCardProps {
  name: string;
  amountLabel: string;
  amount: number;
  deltaPercent: number;
  onPress?: () => void;
}

export const MlConsolidadoClientCard = memo<MlConsolidadoClientCardProps>(
  ({ name, amountLabel, amount, deltaPercent, onPress }) => {
    return (
      <Pressable
        onPress={onPress}
        className="rounded-lg px-4 py-3 mx-4"
        style={{ borderCurve: 'continuous', backgroundColor: '#0A1432' }}
      >
        <View className="flex-row justify-between items-start gap-3">
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-1">
              <AtTypography
                variant="bodyBold"
                color="#FFFFFF"
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {name}
              </AtTypography>
              <AtIcon name="arrow-forward" size={14} color="rgba(255,255,255,0.7)" />
            </View>
            <AtTypography variant="captionBold" color="#FFFFFF">
              {amountLabel}: {formatCurrency(amount)}
            </AtTypography>
          </View>
          <AtDeltaIndicator value={deltaPercent} size="md" appearance="dark" />
        </View>
      </Pressable>
    );
  },
);

MlConsolidadoClientCard.displayName = 'MlConsolidadoClientCard';

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';

interface MlLocationCardProps {
  label?: string;
  value: string;
}

export const MlLocationCard = memo<MlLocationCardProps>(
  ({ label = 'Ubicación', value }) => {
    return (
      <View
        className="flex-row items-center gap-3 bg-[#0E173C] rounded-lg px-4 py-3 mx-4"
        style={{ borderCurve: 'continuous' }}
      >
        <AtIcon name="place" size="lg" color="#FFFFFF" />
        <View className="flex-1">
          <AtTypography variant="captionBold" color="#FFFFFF">
            {label}
          </AtTypography>
          <AtTypography variant="caption" color="rgba(255,255,255,0.7)">
            {value}
          </AtTypography>
        </View>
      </View>
    );
  },
);

MlLocationCard.displayName = 'MlLocationCard';

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { LinearGradient } from 'expo-linear-gradient';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { formatCurrency } from '@/src/utils/currency';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MlMetricGradientRowProps {
  label: string;
  value: number;
  deltaPercent: number;
  icon: MaterialIconName;
  gradient: readonly [string, string, ...string[]];
  selected?: boolean;
  onPress?: () => void;
}

export const MlMetricGradientRow = memo<MlMetricGradientRowProps>(
  ({ label, value, deltaPercent, icon, gradient, selected = false, onPress }) => {
    return (
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 px-1"
        style={
          selected
            ? {
                borderWidth: 1.5,
                borderColor: '#6366F1',
                borderRadius: 14,
                padding: 4,
                borderCurve: 'continuous',
              }
            : undefined
        }
      >
        <LinearGradient
          colors={gradient as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 14,
            borderRadius: 10,
            borderCurve: 'continuous',
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AtIcon name={icon} size="sm" color="#FFFFFF" />
          </View>
          <AtTypography variant="bodyBold" color="#FFFFFF" className="flex-1">
            {label}
          </AtTypography>
        </LinearGradient>
        <View className="items-end gap-1" style={{ minWidth: 96 }}>
          <AtDeltaIndicator value={deltaPercent} size="sm" />
          <AtTypography
            variant="captionBold"
            color="#1A1F36"
            selectable
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatCurrency(value)}
          </AtTypography>
        </View>
      </Pressable>
    );
  },
);

MlMetricGradientRow.displayName = 'MlMetricGradientRow';

import React, { memo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { formatCurrency } from '@/src/utils/currency';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MlCostGroupRowProps {
  label: string;
  amount: number;
  deltaPercent: number;
  icon: MaterialIconName;
  color: string;
  onPress?: () => void;
}

export const MlCostGroupRow = memo<MlCostGroupRowProps>(
  ({ label, amount, deltaPercent, icon, color, onPress }) => {
    // 320dp: delta + monto en la misma fila dejan el label en ~64px;
    // en pantallas angostas el monto baja bajo el label (como
    // MlCostGroupAccordionRow) y el delta queda a la derecha.
    const { width: windowWidth } = useWindowDimensions();
    const narrow = windowWidth < 360;
    const amountText = (
      <AtTypography
        variant={narrow ? 'caption' : 'body'}
        color={narrow ? '#8892A4' : '#4A5568'}
        selectable
        numberOfLines={1}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {formatCurrency(amount)}
      </AtTypography>
    );
    return (
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 py-3 px-4"
      >
        <View
          className="w-9 h-9 rounded-md items-center justify-center"
          style={{ backgroundColor: color, borderCurve: 'continuous' }}
        >
          <AtIcon name={icon} size="sm" color="#FFFFFF" />
        </View>
        {narrow ? (
          <>
            <View className="flex-1 gap-0.5">
              <AtTypography variant="bodyBold" numberOfLines={1}>
                {label} {'→'}
              </AtTypography>
              {amountText}
            </View>
            <AtDeltaIndicator value={deltaPercent} size="sm" />
          </>
        ) : (
          <>
            <AtTypography variant="bodyBold" className="flex-1" numberOfLines={1}>
              {label} {'→'}
            </AtTypography>
            <View className="flex-row items-center gap-2">
              <AtDeltaIndicator value={deltaPercent} size="sm" />
              {amountText}
            </View>
          </>
        )}
      </Pressable>
    );
  },
);

MlCostGroupRow.displayName = 'MlCostGroupRow';

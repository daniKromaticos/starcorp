/**
 * Molecule: MlCategoryTab
 *
 * Dark navy card with icon, label, action link and a radio button in the
 * top-right corner. Pressing the card selects the category — the radio
 * indicator reflects the selected state.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MlCategoryTabProps {
  label: string;
  icon: MaterialIconName;
  actionLabel: string;
  selected?: boolean;
  onSelect?: () => void;
  onActionPress?: () => void;
  radioColor?: string;
}

export const MlCategoryTab = memo<MlCategoryTabProps>(
  ({
    label,
    icon,
    actionLabel,
    selected = false,
    onSelect,
    onActionPress,
    radioColor = '#E8952E',
  }) => {
    return (
      <Pressable
        onPress={onSelect}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        className="bg-[#0A1432] rounded-lg p-4 w-[130px] gap-3 justify-between"
        style={{ borderCurve: 'continuous' }}
      >
        <View className="flex-row justify-between items-center">
          <AtIcon name={icon} size="xl" color="#FFFFFF" />
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 2,
              borderColor: radioColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: radioColor,
                }}
              />
            )}
          </View>
        </View>

        <AtTypography variant="bodyBold" color="#FFFFFF">
          {label}
        </AtTypography>

        <View
          style={{
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.15)',
            marginVertical: 2,
          }}
        />

        <Pressable onPress={onActionPress} hitSlop={8}>
          <View className="flex-row items-center gap-1">
            <AtTypography variant="captionBold" color="rgba(255,255,255,0.7)">
              {actionLabel}
            </AtTypography>
            <AtIcon name="arrow-forward" size={14} color="rgba(255,255,255,0.7)" />
          </View>
        </Pressable>
      </Pressable>
    );
  },
);

MlCategoryTab.displayName = 'MlCategoryTab';

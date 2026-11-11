/**
 * Molecule: MlReportCategoryRow
 *
 * Sidebar row used inside the Informes card. Shows a colored rounded
 * icon tile on the left (colored by the corresponding bar, acting as
 * legend) and the category label on the right. Selected rows bold the
 * label; unselected rows dim it.
 */

import React, { memo } from 'react';
import { Pressable } from '@/src/tw';
import { LinearGradient } from 'expo-linear-gradient';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { darkenHex } from '@/src/utils/color';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MlReportCategoryRowProps {
  label: string;
  icon: MaterialIconName;
  color: string;
  selected?: boolean;
  onPress?: () => void;
}

export const MlReportCategoryRow = memo<MlReportCategoryRowProps>(
  ({ label, icon, color, selected = false, onPress }) => {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        className="flex-row items-center gap-1.5 px-1 py-2 rounded-md"
        style={{
          borderCurve: 'continuous',
          backgroundColor: selected ? 'rgba(15, 27, 74, 0.04)' : 'transparent',
        }}
      >
        <LinearGradient
          colors={[color, darkenHex(color, 0.72)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            alignItems: 'center',
            justifyContent: 'center',
            borderCurve: 'continuous',
          }}
        >
          <AtIcon name={icon} size={14} color="#FFFFFF" />
        </LinearGradient>
        <AtTypography
          variant="captionBold"
          color={selected ? '#1A1F36' : '#4A5568'}
          numberOfLines={1}
        >
          {label}
        </AtTypography>
      </Pressable>
    );
  },
);

MlReportCategoryRow.displayName = 'MlReportCategoryRow';

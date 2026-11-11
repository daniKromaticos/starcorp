/**
 * Molecule: MlCategoryRow
 *
 * Row with colored icon, label, amount, and edit action.
 * Used in consolidated detail views (Ingreso, Costo, Gastos rows).
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MlCategoryRowProps {
  label: string;
  amount: number;
  icon?: MaterialIconName;
  color?: string;
  onPress?: () => void;
  onEdit?: () => void;
  className?: string;
}

export const MlCategoryRow = memo<MlCategoryRowProps>(
  ({ label, amount, icon = 'circle', color = '#1A2B6D', onPress, onEdit, className }) => {
    return (
      <Pressable
        onPress={onPress}
        className={`flex-row items-center py-3 px-4 gap-3 ${className ?? ''}`}
      >
        <View
          className="w-8 h-8 rounded-md items-center justify-center"
          style={{ backgroundColor: color, borderCurve: 'continuous' }}
        >
          <AtIcon name={icon} size="sm" color="#FFFFFF" />
        </View>

        <View className="flex-1 flex-row items-center">
          <AtTypography variant="bodyBold" className="flex-1">
            {label}
          </AtTypography>
          <AtTypography
            variant="body"
            selectable
            style={{ fontVariant: ['tabular-nums'] }}
          >
            ${amount.toLocaleString()}
          </AtTypography>
        </View>

        {onEdit && (
          <Pressable onPress={onEdit} hitSlop={8}>
            <AtIcon name="edit" size="sm" color="#8892A4" />
          </Pressable>
        )}
      </Pressable>
    );
  },
);

MlCategoryRow.displayName = 'MlCategoryRow';

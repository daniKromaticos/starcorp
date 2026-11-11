/**
 * Molecule: MlReportRow
 *
 * Report/informe row with colored icon and label.
 * Used in Informes section (Cartera, Empleados, Bancos, etc.).
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MlReportRowProps {
  label: string;
  icon?: MaterialIconName;
  iconColor?: string;
  iconBgColor?: string;
  onPress?: () => void;
  className?: string;
}

export const MlReportRow = memo<MlReportRowProps>(
  ({ label, icon = 'description', iconColor = '#FFFFFF', iconBgColor = '#1A2B6D', onPress, className }) => {
    return (
      <Pressable
        onPress={onPress}
        className={`flex-row items-center gap-3 py-3 px-4 ${className ?? ''}`}
      >
        <View
          className="w-8 h-8 rounded-md items-center justify-center"
          style={{ backgroundColor: iconBgColor, borderCurve: 'continuous' }}
        >
          <AtIcon name={icon} size="sm" color={iconColor} />
        </View>

        <AtTypography variant="body" className="flex-1">
          {label}
        </AtTypography>

        <AtIcon name="chevron-right" size="md" color="#8892A4" />
      </Pressable>
    );
  },
);

MlReportRow.displayName = 'MlReportRow';

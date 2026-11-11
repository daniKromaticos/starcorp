/**
 * Molecule: MlAsociadoClientRow
 *
 * Fila simple para la lista principal del Informe Asociados:
 * dot color + nombre + arrow → + count alineado a la derecha.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';

interface MlAsociadoClientRowProps {
  name: string;
  color: string;
  count: number;
  onPress: () => void;
}

export const MlAsociadoClientRow = memo<MlAsociadoClientRowProps>(
  ({ name, color, count, onPress }) => {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="bg-bg-card rounded-lg flex-row items-center px-4 py-3 gap-3"
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.06)',
        }}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: color,
          }}
        />
        <View className="flex-row items-center gap-1 flex-1">
          <AtTypography variant="bodyBold" numberOfLines={2}>
            {name}
          </AtTypography>
          <AtIcon name="arrow-forward" size="sm" color="#1A1F36" />
        </View>
        <AtTypography variant="body" color="#4A5568">
          {count}
        </AtTypography>
      </Pressable>
    );
  },
);

MlAsociadoClientRow.displayName = 'MlAsociadoClientRow';

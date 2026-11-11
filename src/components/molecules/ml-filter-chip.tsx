/**
 * Molecule: MlFilterChip
 *
 * Pill con degradado azul, label y botón X para remover. Usada en la barra
 * de filtros aplicados y dentro del bottom sheet de filtros.
 */

import React, { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { gradients } from '@/src/theme/gradients';

interface MlFilterChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export const MlFilterChip = memo<MlFilterChipProps>(
  ({ label, onRemove, className }) => {
    return (
      <View
        className={className}
        style={{
          borderRadius: 999,
          borderCurve: 'continuous',
          overflow: 'hidden',
          // Un label largo no debe sacar la X de la pantalla.
          maxWidth: '100%',
        }}
      >
        <LinearGradient
          colors={gradients.buttonBlue.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 12,
            paddingRight: 8,
            paddingVertical: 6,
          }}
        >
          <AtTypography
            variant="captionBold"
            color="#FFFFFF"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {label}
          </AtTypography>
          <Pressable onPress={onRemove} hitSlop={8}>
            <AtIcon name="close" size="sm" color="#FFFFFF" />
          </Pressable>
        </LinearGradient>
      </View>
    );
  },
);

MlFilterChip.displayName = 'MlFilterChip';

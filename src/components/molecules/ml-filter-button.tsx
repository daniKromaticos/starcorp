/**
 * Molecule: MlFilterButton
 *
 * Botón cuadrado (icono "filter-list") con degradado para abrir el sheet de
 * filtros en los informes. Naranja cuando hay filtros activos, navy en reposo.
 */

import React, { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { gradients } from '@/src/theme/gradients';

interface MlFilterButtonProps {
  active?: boolean;
  onPress?: () => void;
}

export const MlFilterButton = memo<MlFilterButtonProps>(
  ({ active = false, onPress }) => {
    const g = active ? gradients.brandOrange : gradients.brandNavy;
    return (
      <Pressable
        onPress={onPress}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          borderCurve: 'continuous',
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={g.colors}
          start={g.start}
          end={g.end}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <AtIcon name="filter-list" size="md" color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    );
  },
);

MlFilterButton.displayName = 'MlFilterButton';

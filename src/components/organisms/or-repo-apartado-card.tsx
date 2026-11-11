/**
 * Organism: OrRepoApartadoCard
 *
 * Card navy de la lista de apartados del Repositorio Alejandro:
 * nombre a la izquierda y "Ver documentos →" a la derecha.
 */

import React, { memo } from 'react';
import { Pressable } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';

const NAVY = '#0F1B4A';

interface OrRepoApartadoCardProps {
  nombre: string;
  onPress: () => void;
}

export const OrRepoApartadoCard = memo<OrRepoApartadoCardProps>(
  ({ nombre, onPress }) => {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={nombre}
        className="flex-row items-center justify-between px-4"
        style={{
          backgroundColor: NAVY,
          borderRadius: 12,
          borderCurve: 'continuous',
          paddingVertical: 16,
          boxShadow: '0 2px 6px rgba(15, 27, 74, 0.25)',
        }}
      >
        <AtTypography
          variant="bodyBold"
          color="#FFFFFF"
          numberOfLines={1}
          className="flex-1 mr-3"
        >
          {nombre}
        </AtTypography>
        <AtTypography variant="captionBold" color="#FFFFFF" className="mr-1.5">
          Ver documentos
        </AtTypography>
        <AtIcon name="arrow-forward" size="sm" color="#FFFFFF" />
      </Pressable>
    );
  },
);

OrRepoApartadoCard.displayName = 'OrRepoApartadoCard';

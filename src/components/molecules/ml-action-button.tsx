/**
 * Molecule: MlActionButton
 *
 * Botón de acción del Repositorio: `primary` (degradado navy de los
 * botones principales — gradients.buttonBlue — texto blanco) y `outline`
 * (fondo blanco, borde y texto azul). Soporta estado de carga (spinner)
 * y disabled.
 */

import React, { memo } from 'react';
import { ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { gradients } from '@/src/theme/gradients';

const BLUE = '#1A3FE8';

interface MlActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const MlActionButton = memo<MlActionButtonProps>(
  ({ label, onPress, variant = 'primary', disabled, loading, className }) => {
    const isPrimary = variant === 'primary';
    const inactive = disabled || loading;

    const content = loading ? (
      <ActivityIndicator size="small" color={isPrimary ? '#FFFFFF' : BLUE} />
    ) : (
      <AtTypography variant="bodyBold" color={isPrimary ? '#FFFFFF' : BLUE}>
        {label}
      </AtTypography>
    );

    if (isPrimary) {
      return (
        <Pressable
          onPress={onPress}
          disabled={inactive}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: !!inactive }}
          className={`rounded-lg overflow-hidden ${className ?? ''}`}
          style={{
            borderCurve: 'continuous',
            opacity: inactive ? 0.6 : 1,
            boxShadow: '0 2px 6px rgba(15, 27, 74, 0.25)',
          }}
        >
          <LinearGradient
            colors={gradients.buttonBlue.colors}
            start={gradients.buttonBlue.start}
            end={gradients.buttonBlue.end}
            style={{
              // flexGrow: si el Pressable se estira (fila junto a un botón
              // más alto), el degradado llena todo el alto y no queda una
              // franja del fondo visible bajo el botón.
              flexGrow: 1,
              paddingVertical: 14,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {content}
          </LinearGradient>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={onPress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!inactive }}
        className={`rounded-lg items-center justify-center px-4 ${className ?? ''}`}
        style={{
          borderCurve: 'continuous',
          paddingVertical: 14,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: 'rgba(26, 63, 232, 0.45)',
          opacity: inactive ? 0.6 : 1,
        }}
      >
        {content}
      </Pressable>
    );
  },
);

MlActionButton.displayName = 'MlActionButton';

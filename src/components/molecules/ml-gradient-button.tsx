/**
 * Molecule: MlGradientButton
 *
 * Botón primario de las pantallas de auth: gradiente navy vertical
 * (gradients.buttonBlue del mockup), texto blanco, spinner en loading.
 */

import React, { memo } from 'react';
import { ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { gradients } from '@/src/theme/gradients';

interface MlGradientButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const MlGradientButton = memo<MlGradientButtonProps>(
  ({ label, onPress, disabled, loading, className }) => {
    const inactive = disabled || loading;

    return (
      <Pressable
        onPress={onPress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!inactive }}
        className={className}
        style={{ opacity: inactive ? 0.6 : 1 }}
      >
        <LinearGradient
          colors={gradients.buttonBlue.colors}
          start={gradients.buttonBlue.start}
          end={gradients.buttonBlue.end}
          style={{
            borderRadius: 10,
            borderCurve: 'continuous',
            paddingVertical: 14,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(15, 27, 74, 0.25)',
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <AtTypography variant="bodyBold" color="#FFFFFF">
              {label}
            </AtTypography>
          )}
        </LinearGradient>
      </Pressable>
    );
  },
);

MlGradientButton.displayName = 'MlGradientButton';

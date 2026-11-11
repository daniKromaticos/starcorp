/**
 * Molecule: MlSegmentedToggle
 *
 * Control segmentado de 2+ opciones: contenedor blanco tipo pill y la
 * opción activa como pill con degradado (naranja para Ingresos/Gastos,
 * azul para Mes corriente/pasado). Texto activo blanco, inactivo gris.
 */

import React, { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { gradients, type GradientName } from '@/src/theme/gradients';

export interface SegmentedOption {
  value: string;
  label: string;
}

interface MlSegmentedToggleProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  /** Degradado del pill activo. Default: azul. */
  gradient?: GradientName;
}

const CONTAINER_BG = '#FFFFFF';

export const MlSegmentedToggle = memo<MlSegmentedToggleProps>(
  ({ options, value, onChange, gradient = 'buttonBlue' }) => {
    const grad = gradients[gradient];
    return (
      <View
        className="flex-row p-1.5 rounded-full"
        style={{
          backgroundColor: CONTAINER_BG,
          borderCurve: 'continuous',
          boxShadow: '0 2px 6px rgba(15, 27, 74, 0.08)',
        }}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className="flex-1"
              style={{ borderRadius: 999, overflow: 'hidden' }}
            >
              {active ? (
                <LinearGradient
                  colors={grad.colors}
                  start={grad.start}
                  end={grad.end}
                  style={{
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    borderCurve: 'continuous',
                  }}
                >
                  <AtTypography variant="bodyBold" color="#FFFFFF">
                    {opt.label}
                  </AtTypography>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AtTypography variant="bodyBold" color="#4A5568">
                    {opt.label}
                  </AtTypography>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  },
);

MlSegmentedToggle.displayName = 'MlSegmentedToggle';

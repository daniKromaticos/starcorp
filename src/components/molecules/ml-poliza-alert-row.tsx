/**
 * Molecule: MlPolizaAlertRow
 *
 * Card usada en las listas "Pólizas por vencer / vencidas" del index
 * de Seguros. Icono warning (amber para por vencer, red para vencida) +
 * nombre + vigencia/días vencidos + flecha →.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';

interface MlPolizaAlertRowProps {
  /** Línea principal (bold 14): empresa en Compañías, nombre en Vehículos/Propiedades. */
  title: string;
  /** Línea secundaria opcional (12): nombre de póliza, asignación, etc. */
  subtitle?: string;
  /** Texto secundario (ej. "Vigencia: 25/05/2026" o "Vigencia: -320 días"). */
  subline: string;
  variant: 'por_vencer' | 'vencida';
  onPress?: () => void;
}

const COLORS = {
  por_vencer: { icon: '#D97706', subline: '#8892A4' },
  vencida: { icon: '#DC2626', subline: '#DC2626' },
} as const;

export const MlPolizaAlertRow = memo<MlPolizaAlertRowProps>(
  ({ title, subtitle, subline, variant, onPress }) => {
    const tone = COLORS[variant];
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        className="flex-row items-center px-3 py-3 gap-3"
        style={{
          backgroundColor: '#F5F5F7',
          borderRadius: 16,
          borderCurve: 'continuous',
        }}
      >
        <View
          className="items-center justify-center"
          style={{
            width: 48,
            height: 48,
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            borderCurve: 'continuous',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <AtIcon name="warning-amber" size={24} color={tone.icon} />
        </View>
        <View className="flex-1">
          <AtTypography
            variant="bodyBold"
            color="#1A1F36"
            numberOfLines={1}
            style={{ fontSize: 15, lineHeight: 20 }}
          >
            {title}
          </AtTypography>
          {subtitle && (
            <AtTypography
              variant="bodyBold"
              color="#1A1F36"
              numberOfLines={1}
              style={{ fontSize: 13, lineHeight: 18 }}
            >
              {subtitle}
            </AtTypography>
          )}
          <AtTypography variant="caption" color={tone.subline}>
            {subline}
          </AtTypography>
        </View>
        <AtIcon name="arrow-forward" size="sm" color="#4A5568" />
      </Pressable>
    );
  },
);

MlPolizaAlertRow.displayName = 'MlPolizaAlertRow';

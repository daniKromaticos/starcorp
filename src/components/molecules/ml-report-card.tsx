/**
 * Molecule: MlReportCard
 *
 * Tarjeta navy oscura usada en el grid de Informes.
 * Icono azul claro arriba-izquierda, título a 2 líneas, divisor sutil
 * y footer con CTA "Ver cuentas →".
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const ICON_COLOR = '#5B8AF0';

interface MlReportCardProps {
  title: string;
  iconName: MaterialIconName;
  ctaLabel?: string;
  onPress?: () => void;
  className?: string;
}

export const MlReportCard = memo<MlReportCardProps>(
  ({ title, iconName, ctaLabel = 'Ver cuentas', onPress, className }) => {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${ctaLabel}`}
        className={`rounded-lg p-4 gap-3 ${className ?? ''}`}
        style={{
          backgroundColor: '#1C224D',
          borderCurve: 'continuous',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        }}
      >
        <AtIcon name={iconName} size="lg" color={ICON_COLOR} />

        <AtTypography
          variant="bodyBold"
          color="#FFFFFF"
          numberOfLines={2}
          // 320dp: "Informe Asociados activos" pide 3 líneas en ~106px;
          // se encoge un poco en vez de cortarse.
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{ minHeight: 44 }}
        >
          {title}
        </AtTypography>

        <View
          className="h-px"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)' }}
        />

        <View className="flex-row items-center justify-between">
          <AtTypography variant="caption" color="#FFFFFF">
            {ctaLabel}
          </AtTypography>
          <AtIcon name="arrow-forward" size="sm" color="#FFFFFF" />
        </View>
      </Pressable>
    );
  },
);

MlReportCard.displayName = 'MlReportCard';

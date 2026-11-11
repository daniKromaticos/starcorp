/**
 * Organism: OrEmpresaCard
 *
 * Card navy de la lista "Otras compañías". Muestra el nombre + flecha y,
 * cuando aplica, el ingreso del periodo con su chip de variación. Las
 * compañías sin métrica (ej. "Repositorio Alejandro") muestran solo el
 * nombre y no navegan.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { formatMoney2 } from '@/src/utils/currency';

const NAVY_BG = '#0F1B4A';

interface OrEmpresaCardProps {
  name: string;
  ingresos?: number | null;
  deltaPercent?: number | null;
  /** Etiqueta de la métrica (default "Ingresos"). */
  metricLabel?: string;
  onPress?: () => void;
}

export const OrEmpresaCard = memo<OrEmpresaCardProps>(
  ({ name, ingresos, deltaPercent, metricLabel = 'Ingresos', onPress }) => {
    const hasIngresos = ingresos != null;

    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={name}
        className="rounded-lg px-4 py-3.5 gap-2"
        style={{
          backgroundColor: NAVY_BG,
          borderCurve: 'continuous',
          boxShadow: '0 4px 12px rgba(15, 27, 74, 0.18)',
        }}
      >
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-1.5 flex-1">
            {/* flexShrink: un nombre largo empujaba la flecha sobre el delta */}
            <AtTypography
              variant="bodyBold"
              color="#FFFFFF"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {name}
            </AtTypography>
            <AtIcon name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
          {deltaPercent != null && (
            <AtDeltaIndicator
              value={deltaPercent}
              size="sm"
              appearance="dark"
            />
          )}
        </View>

        {hasIngresos && (
          <AtTypography variant="bodyBold" color="#FFFFFF">
            {metricLabel}: {formatMoney2(ingresos!)}
          </AtTypography>
        )}
      </Pressable>
    );
  },
);

OrEmpresaCard.displayName = 'OrEmpresaCard';

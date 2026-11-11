/**
 * Molecule: MlAsociadoCargoRow
 *
 * Fila del resumen por cargo del single de Asociados:
 *   • Nombre del cargo (bodyBold) + barra con su % del total del cliente
 *   • Cantidad de asociados + chevron (tocar abre la lista de ese cargo)
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';

interface MlAsociadoCargoRowProps {
  cargo: string;
  count: number;
  /** Participación del cargo en el total del cliente, 0–100. */
  percent: number;
  color: string;
  onPress: () => void;
}

export const MlAsociadoCargoRow = memo<MlAsociadoCargoRowProps>(
  ({ cargo, count, percent, color, onPress }) => (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 bg-bg-card rounded-lg px-4 py-3"
      style={{
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
      }}
      accessibilityRole="button"
      accessibilityLabel={`${cargo}: ${count} asociados`}
    >
      <View className="flex-1 gap-1.5">
        <AtTypography variant="bodyBold" numberOfLines={1}>
          {cargo}
        </AtTypography>
        <View
          className="bg-bg-secondary rounded-full overflow-hidden"
          style={{ height: 6 }}
        >
          <View
            className="rounded-full"
            style={{
              height: 6,
              width: `${Math.max(2, Math.min(100, percent))}%`,
              backgroundColor: color,
            }}
          />
        </View>
      </View>
      <View className="items-end">
        <AtTypography
          variant="bodyBold"
          color="#1A1F36"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {count}
        </AtTypography>
        <AtTypography
          variant="caption"
          color="#8892A4"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {`${percent.toFixed(0)}%`}
        </AtTypography>
      </View>
      <AtIcon name="chevron-right" size="sm" color="#8892A4" />
    </Pressable>
  ),
);

MlAsociadoCargoRow.displayName = 'MlAsociadoCargoRow';

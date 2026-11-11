/**
 * Molecule: MlAsociadoEmployeeRow
 *
 * Fila del single de Asociados:
 *   • Nombre (bodyBold)
 *   • "Área: HOUSEKEEPING" (caption)
 *   • Código interno alineado a la derecha
 *
 * variant: 'card' (default) → fondo blanco + borde
 *          'plain'          → transparente, sin borde (para el patrón zebra
 *                              que alterna con 'card')
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';

interface MlAsociadoEmployeeRowProps {
  name: string;
  area: string;
  codigoInterno: string;
  variant?: 'card' | 'plain';
}

export const MlAsociadoEmployeeRow = memo<MlAsociadoEmployeeRowProps>(
  ({ name, area, codigoInterno, variant = 'card' }) => {
    const isCard = variant === 'card';
    return (
      <View
        className={`flex-row items-center justify-between px-4 py-3 ${
          isCard ? 'bg-bg-card rounded-lg' : ''
        }`}
        style={
          isCard
            ? {
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.06)',
              }
            : undefined
        }
      >
        <View className="flex-1 gap-0.5">
          <AtTypography variant="bodyBold" numberOfLines={1}>
            {name}
          </AtTypography>
          <AtTypography variant="caption" color="#4A5568" numberOfLines={1}>
            Área: {area}
          </AtTypography>
        </View>
        <AtTypography variant="body" color="#4A5568">
          {codigoInterno}
        </AtTypography>
      </View>
    );
  },
);

MlAsociadoEmployeeRow.displayName = 'MlAsociadoEmployeeRow';

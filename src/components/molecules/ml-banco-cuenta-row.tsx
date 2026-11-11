/**
 * Molecule: MlBancoCuentaRow
 *
 * Fila de cuenta bancaria en el detalle de empresa. Dot color + nombre +
 * código (subtítulo) + saldo a la derecha. Variantes plain/card para
 * intercalar fondo (igual que ml-asociado-employee-row).
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { formatCurrency } from '@/src/utils/currency';

interface MlBancoCuentaRowProps {
  name: string;
  code: string;
  color: string;
  balance: number;
  variant?: 'plain' | 'card';
}

function formatBalance(value: number): string {
  const base = formatCurrency(value);
  const decimals = value
    .toFixed(2)
    .split('.')[1];
  return `${base},${decimals}`;
}

export const MlBancoCuentaRow = memo<MlBancoCuentaRowProps>(
  ({ name, code, color, balance, variant = 'plain' }) => {
    const isCard = variant === 'card';
    return (
      <View
        className={`flex-row items-center gap-3 px-4 py-3 ${
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
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
        <View className="flex-1">
          <AtTypography variant="bodyBold" color="#1A1F36">
            {name}
          </AtTypography>
          <AtTypography variant="caption" color="#8892A4">
            {code}
          </AtTypography>
        </View>
        <AtTypography
          variant="body"
          color="#1A1F36"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {formatBalance(balance)}
        </AtTypography>
      </View>
    );
  },
);

MlBancoCuentaRow.displayName = 'MlBancoCuentaRow';

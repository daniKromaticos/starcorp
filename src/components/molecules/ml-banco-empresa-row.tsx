/**
 * Molecule: MlBancoEmpresaRow
 *
 * Card oscura para la lista del Informe Bancos. Muestra nombre + arrow,
 * monto (o "--" si la empresa no tiene cuentas) y delta pill arriba a la
 * derecha.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { formatCurrency } from '@/src/utils/currency';

interface MlBancoEmpresaRowProps {
  name: string;
  balance: number | null;
  deltaPct: number;
  onPress: () => void;
}

export const MlBancoEmpresaRow = memo<MlBancoEmpresaRowProps>(
  ({ name, balance, deltaPct, onPress }) => {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="rounded-lg p-4"
        style={{
          backgroundColor: '#0F1B4A',
          borderCurve: 'continuous',
        }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1.5">
            <View className="flex-row items-center gap-1.5">
              {/* flexShrink: un nombre largo empujaba la flecha contra el
                  badge de delta (320dp). */}
              <AtTypography
                variant="bodyBold"
                color="#FFFFFF"
                numberOfLines={2}
                style={{ flexShrink: 1 }}
              >
                {name}
              </AtTypography>
              <AtIcon name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
            <AtTypography variant="bodyBold" color="#FFFFFF">
              {balance == null ? '--' : formatCurrency(balance)}
            </AtTypography>
          </View>
          <AtDeltaIndicator value={deltaPct} size="sm" appearance="dark" />
        </View>
      </Pressable>
    );
  },
);

MlBancoEmpresaRow.displayName = 'MlBancoEmpresaRow';

/**
 * Molecule: MlClientCardDark
 *
 * Dark navy client card used in the Clientes list. Shows the client
 * name + arrow on top, the metric line below ("Ingresos: $100.000"),
 * and a delta pill in the top-right.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { formatCurrency } from '@/src/utils/currency';

interface MlClientCardDarkProps {
  name: string;
  amountLabel?: string;
  amount: number;
  deltaPercent: number;
  currency?: string;
  onPress?: () => void;
}

export const MlClientCardDark = memo<MlClientCardDarkProps>(
  ({ name, amountLabel = 'Ingresos', amount, deltaPercent, currency = 'USD', onPress }) => {
    const isPositive = deltaPercent >= 0;
    const arrow = isPositive ? '↗' : '↘';
    const textColor = isPositive ? '#5CF094' : '#FF1E1E';
    const pillBg = isPositive ? '#0D1D1F' : '#1B0F1A';

    return (
      <Pressable
        onPress={onPress}
        className="rounded-md p-4"
        style={{
          backgroundColor: '#0F1B2E',
          borderCurve: 'continuous',
          boxShadow: '0 4px 12px rgba(15, 27, 46, 0.18)',
        }}
      >
        <View className="flex-row justify-between items-start gap-3">
          <View className="flex-1 gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <AtTypography variant="bodyBold" color="#FFFFFF">
                {name}
              </AtTypography>
              <AtIcon name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
            <AtTypography variant="bodyBold" color="#FFFFFF">
              {amountLabel}: {formatCurrency(amount, { currency })}
            </AtTypography>
          </View>

          <View
            className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg self-start"
            style={{ backgroundColor: pillBg, borderCurve: 'continuous' }}
          >
            <AtTypography variant="captionBold" color={textColor}>
              {arrow}
            </AtTypography>
            <AtTypography
              variant="captionBold"
              color={textColor}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {Math.abs(deltaPercent).toFixed(2)}%
            </AtTypography>
          </View>
        </View>
      </Pressable>
    );
  },
);

MlClientCardDark.displayName = 'MlClientCardDark';

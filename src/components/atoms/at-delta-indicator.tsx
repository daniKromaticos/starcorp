/**
 * Atom: AtDeltaIndicator
 *
 * Shows a percentage change with directional arrow and color coding.
 * `appearance="dark"` renders a dark navy chip with a bright green text —
 * matches the delta pill in the Empresas (Consolidado) mockup.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from './at-typography';
import { AtIcon } from './at-icon';
import { formatCompact } from '@/src/utils/number';

interface AtDeltaIndicatorProps {
  value: number;
  absolute?: number;
  size?: 'sm' | 'md' | 'lg';
  appearance?: 'soft' | 'dark';
  /**
   * Unidad del delta. '%' (default) para variaciones relativas; 'pp' para
   * diferencias entre dos porcentajes (ej. Margen: 18% → 21% son 3 pp, no
   * un 3%), donde rotularlo como % sería incorrecto.
   */
  unit?: '%' | 'pp';
}

const palette = {
  soft: {
    positiveBg: 'bg-positive-light',
    negativeBg: 'bg-negative-light',
    positiveText: '#38A169',
    negativeText: '#E53E3E',
  },
  dark: {
    positiveBg: '',
    negativeBg: '',
    positiveText: '#5CF094',
    negativeText: '#FF1E1E',
  },
} as const;

export const AtDeltaIndicator = memo<AtDeltaIndicatorProps>(
  ({ value, absolute, size = 'md', appearance = 'soft', unit = '%' }) => {
    const isPositive = value >= 0;
    const arrowIcon = isPositive ? 'north-east' : 'south-east';
    const iconSize = size === 'lg' ? 16 : 12;
    const variant =
      size === 'sm' ? 'label' : size === 'lg' ? 'bodyBold' : 'captionBold';
    const tones = palette[appearance];
    const textColor = isPositive ? tones.positiveText : tones.negativeText;
    const isDark = appearance === 'dark';

    const darkBg = isPositive ? '#0D1D1F' : '#1B0F1A';

    const chipClass = isDark
      ? size === 'lg'
        ? 'flex-row items-center px-3.5 py-1.5 rounded-lg gap-1.5'
        : 'flex-row items-center px-2.5 py-1 rounded-lg gap-1'
      : `flex-row items-center px-2 py-0.5 rounded-md gap-0.5 ${
          isPositive ? tones.positiveBg : tones.negativeBg
        }`;

    return (
      <View className="flex-row items-center gap-1">
        <View
          className={chipClass}
          style={isDark ? { backgroundColor: darkBg } : undefined}
        >
          <AtIcon name={arrowIcon} size={iconSize} color={textColor} />
          <AtTypography
            variant={variant}
            color={textColor}
            selectable
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {Math.abs(value).toFixed(2)}
            {unit === 'pp' ? ' pp' : '%'}
          </AtTypography>
        </View>
        {absolute != null && (
          <AtTypography
            variant={variant}
            color={textColor}
            selectable
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {isPositive ? '+' : ''}
            {formatCompact(absolute)}
          </AtTypography>
        )}
      </View>
    );
  },
);

AtDeltaIndicator.displayName = 'AtDeltaIndicator';

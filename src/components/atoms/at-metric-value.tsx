/**
 * Atom: AtMetricValue
 *
 * Renders a formatted currency/percent value with tabular-nums.
 * Uses AtTypography internally (eliminates duplicated sizeMap).
 * Migrated to NativeWind.
 */

import React, { memo } from 'react';
import { AtTypography, type TypographyVariant } from './at-typography';
import { formatCurrency } from '@/src/utils/currency';

interface AtMetricValueProps {
  value: number;
  size?: 'lg' | 'md' | 'sm';
  currency?: string;
  compact?: boolean;
  color?: string;
  className?: string;
  /** Currency by default; 'percent' renders e.g. "42.3%" (mismo criterio
   *  que MlMetricBar, para métricas de ratio como Margen). */
  format?: 'currency' | 'percent';
  /** Una sola línea: achica la fuente hasta 60% antes de partir el número
   *  (columnas angostas a 320dp). */
  fit?: boolean;
}

const sizeToVariant: Record<string, TypographyVariant> = {
  lg: 'metric',
  md: 'metricSmall',
  sm: 'bodyBold',
};

export const AtMetricValue = memo<AtMetricValueProps>(
  ({
    value,
    size = 'lg',
    currency = 'USD',
    compact = false,
    color,
    className,
    format = 'currency',
    fit = false,
  }) => {
    return (
      <AtTypography
        variant={sizeToVariant[size]}
        color={color}
        selectable
        className={className}
        numberOfLines={fit ? 1 : undefined}
        adjustsFontSizeToFit={fit || undefined}
        minimumFontScale={fit ? 0.6 : undefined}
        style={[{ fontVariant: ['tabular-nums'] }, fit ? { flexShrink: 1 } : null]}
      >
        {format === 'percent'
          ? `${value.toFixed(1)}%`
          : formatCurrency(value, { currency, compact })}
      </AtTypography>
    );
  },
);

AtMetricValue.displayName = 'AtMetricValue';

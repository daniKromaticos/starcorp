/**
 * Atom: MetricValue
 *
 * Renders a formatted currency/number value with tabular-nums.
 * Used for: $100.000 in metric cards.
 */

import React, { memo } from 'react';
import { type TextStyle } from 'react-native';
import { Text } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';
import { formatCurrency } from '@/src/utils/currency';

interface MetricValueProps {
  value: number;
  size?: 'lg' | 'md' | 'sm';
  currency?: string;
  compact?: boolean;
  color?: string;
}

const sizeMap: Record<string, TextStyle> = {
  lg: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  md: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  sm: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
};

export const MetricValue = memo<MetricValueProps>(
  ({ value, size = 'lg', currency = 'USD', compact = false, color }) => {
    return (
      <Text
        selectable
        style={{
          ...sizeMap[size],
          color: color ?? tokens.color.ink.primary,
        }}
      >
        {formatCurrency(value, { currency, compact })}
      </Text>
    );
  },
);

MetricValue.displayName = 'MetricValue';

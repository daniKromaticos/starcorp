/**
 * Atom: DeltaIndicator
 *
 * Shows a percentage change with directional arrow and color coding.
 * Used for: ↗ 1,87% indicators in metric cards.
 */

import React, { memo } from 'react';
import { View } from 'react-native';
import { Text } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';
import { formatCompact } from '@/src/utils/number';

interface DeltaIndicatorProps {
  value: number;
  absolute?: number;
  size?: 'sm' | 'md';
}

export const DeltaIndicator = memo<DeltaIndicatorProps>(
  ({ value, absolute, size = 'md' }) => {
    const isPositive = value >= 0;
    const color = isPositive
      ? tokens.color.semantic.positive
      : tokens.color.semantic.negative;
    const bgColor = isPositive
      ? tokens.color.semantic.positiveLight
      : tokens.color.semantic.negativeLight;
    const arrow = isPositive ? '↗' : '↘';
    const fs = size === 'sm' ? 11 : 13;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.xs,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: bgColor,
            paddingHorizontal: tokens.spacing.sm,
            paddingVertical: 2,
            borderRadius: tokens.radius.sm,
            gap: 2,
          }}
        >
          <Text style={{ color, fontSize: fs }}>{arrow}</Text>
          <Text
            selectable
            style={{
              color,
              fontSize: fs,
              fontWeight: '600',
              fontVariant: ['tabular-nums'],
            }}
          >
            {Math.abs(value).toFixed(2)}%
          </Text>
        </View>
        {absolute != null && (
          <Text
            selectable
            style={{
              color,
              fontSize: fs,
              fontWeight: '600',
              fontVariant: ['tabular-nums'],
            }}
          >
            {isPositive ? '+' : ''}
            {formatCompact(absolute)}
          </Text>
        )}
      </View>
    );
  },
);

DeltaIndicator.displayName = 'DeltaIndicator';

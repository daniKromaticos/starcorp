/**
 * Atom: StatusBadge
 *
 * Pill-shaped label with semantic coloring.
 * Used for: "Hoy", status indicators, period labels.
 * Zero business logic — purely presentational.
 */

import React, { memo } from 'react';
import { View } from 'react-native';
import { Text } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';

type BadgeVariant = 'positive' | 'negative' | 'neutral' | 'accent';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  positive: {
    bg: tokens.color.semantic.positiveLight,
    text: tokens.color.semantic.positive,
  },
  negative: {
    bg: tokens.color.semantic.negativeLight,
    text: tokens.color.semantic.negative,
  },
  neutral: {
    bg: tokens.color.background.tertiary,
    text: tokens.color.ink.secondary,
  },
  accent: {
    bg: tokens.color.accent.primary,
    text: tokens.color.ink.inverse,
  },
};

const sizeMap = {
  sm: { ph: tokens.spacing.sm, pv: 2, fs: 11 },
  md: { ph: tokens.spacing.md, pv: tokens.spacing.xs, fs: 13 },
};

export const StatusBadge = memo<StatusBadgeProps>(
  ({ label, variant = 'neutral', size = 'md' }) => {
    const colors = variantStyles[variant];
    const s = sizeMap[size];

    return (
      <View
        style={{
          backgroundColor: colors.bg,
          paddingHorizontal: s.ph,
          paddingVertical: s.pv,
          borderRadius: tokens.radius.full,
          borderCurve: 'continuous',
          alignSelf: 'flex-start',
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: s.fs,
            fontWeight: '600',
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      </View>
    );
  },
);

StatusBadge.displayName = 'StatusBadge';

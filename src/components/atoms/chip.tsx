/**
 * Atom: Chip
 *
 * Selectable pill for filter bars (Hoy, 1 semana, 1 mes, etc.)
 */

import React, { memo } from 'react';
import { Pressable } from 'react-native';
import { Text } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export const Chip = memo<ChipProps>(({ label, selected = false, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected
          ? tokens.color.accent.primary
          : pressed
            ? tokens.color.background.tertiary
            : tokens.color.background.secondary,
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
        borderRadius: tokens.radius.full,
        borderCurve: 'continuous',
      })}
    >
      <Text
        style={{
          color: selected
            ? tokens.color.ink.inverse
            : tokens.color.ink.secondary,
          fontSize: 13,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

Chip.displayName = 'Chip';

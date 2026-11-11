/**
 * Molecule: ClientRow
 *
 * Single client row in the Top Clients list.
 * avatar color + name + revenue + delta
 */

import React, { memo } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';

interface ClientRowProps {
  name: string;
  color: string;
  revenue?: number;
  deltaPercent?: number;
  onPress?: () => void;
  selected?: boolean;
}

export const ClientRow = memo<ClientRowProps>(
  ({ name, color, revenue, deltaPercent, onPress, selected = false }) => {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.lg,
          backgroundColor: selected
            ? tokens.color.background.secondary
            : pressed
              ? tokens.color.background.secondary
              : 'transparent',
          borderRadius: tokens.radius.md,
        })}
      >
        {/* Color avatar */}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: tokens.radius.sm,
            borderCurve: 'continuous',
            backgroundColor: color,
          }}
        />

        {/* Name */}
        <Text
          style={{
            ...tokens.typography.body,
            color: tokens.color.ink.primary,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
      </Pressable>
    );
  },
);

ClientRow.displayName = 'ClientRow';

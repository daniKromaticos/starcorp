/**
 * Molecule: CategoryTab
 *
 * Dark card with icon, label, and action link.
 * Used in the horizontal category carousel (Ingresos, Costos, Gastos, Utilidad).
 */

import React, { memo } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';

interface CategoryTabProps {
  label: string;
  icon: string;
  actionLabel: string;
  onPress?: () => void;
  statusColor?: string;
}

export const CategoryTab = memo<CategoryTabProps>(
  ({
    label,
    icon,
    actionLabel,
    onPress,
    statusColor = tokens.color.accent.primary,
  }) => {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#0F1B4A' : '#1A2B6D',
          borderRadius: tokens.radius.lg,
          borderCurve: 'continuous',
          padding: tokens.spacing.lg,
          width: 130,
          gap: tokens.spacing.md,
          justifyContent: 'space-between',
        })}
      >
        {/* Icon + Status dot */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 22, color: tokens.color.ink.inverse }}>
            {icon === 'dollarsign.circle'
              ? '💰'
              : icon === 'bag'
                ? '🛍️'
                : icon === 'creditcard'
                  ? '💳'
                  : '📊'}
          </Text>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: statusColor,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          />
        </View>

        {/* Label */}
        <Text
          style={{
            ...tokens.typography.bodyBold,
            color: tokens.color.ink.inverse,
          }}
        >
          {label}
        </Text>

        {/* Action link */}
        <Text
          style={{
            ...tokens.typography.caption,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {actionLabel} →
        </Text>
      </Pressable>
    );
  },
);

CategoryTab.displayName = 'CategoryTab';

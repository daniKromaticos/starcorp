/**
 * Molecule: MlMetricCard
 *
 * Card with icon, label, amount, and delta indicator.
 * Used in Financiero section for Ingresos/Costos/Gastos summary.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MlMetricCardProps {
  label: string;
  value: number;
  deltaPercent?: number;
  icon?: MaterialIconName;
  iconColor?: string;
  onPress?: () => void;
  className?: string;
  ctaLabel?: string;
  variant?: 'light' | 'dark';
}

export const MlMetricCard = memo<MlMetricCardProps>(
  ({
    label,
    value,
    deltaPercent,
    icon,
    iconColor,
    onPress,
    className,
    ctaLabel,
    variant = 'dark',
  }) => {
    const isDark = variant === 'dark';
    const labelColor = isDark ? '#FFFFFF' : '#8892A4';
    const valueColor = isDark ? '#FFFFFF' : undefined;
    const defaultIconColor = isDark ? '#4C64FF' : '#1A2B6D';
    const ctaColor = isDark ? '#FFFFFF' : '#4A5568';
    const dividerColor = isDark
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(0, 0, 0, 0.08)';

    return (
      <Pressable
        onPress={onPress}
        className={`rounded-lg p-4 gap-2 ${isDark ? '' : 'bg-bg-card'} ${className ?? ''}`}
        style={{
          borderCurve: 'continuous',
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? undefined : 'rgba(0, 0, 0, 0.08)',
          backgroundColor: isDark ? '#1C224D' : undefined,
          boxShadow: isDark
            ? '0 2px 6px rgba(0, 0, 0, 0.15)'
            : '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        {icon && (
          <View className="items-center pt-1">
            <AtIcon name={icon} size="lg" color={defaultIconColor} />
          </View>
        )}
        <AtTypography
          variant="bodyBold"
          color={labelColor}
          className="text-center"
        >
          {label}
        </AtTypography>
        <View className="items-center">
          <AtMetricValue value={value} size="md" color={valueColor} />
        </View>
        {deltaPercent != null && (
          <View className="items-center">
            <AtDeltaIndicator value={deltaPercent} size="sm" appearance="dark" />
          </View>
        )}
        {ctaLabel && (
          <View
            className="flex-row items-center justify-between pt-3 mt-1"
            style={{
              borderTopWidth: 1,
              borderTopColor: dividerColor,
            }}
          >
            <AtTypography variant="captionBold" color={ctaColor}>
              {ctaLabel}
            </AtTypography>
            <AtIcon name="arrow-forward" size="sm" color={ctaColor} />
          </View>
        )}
      </Pressable>
    );
  },
);

MlMetricCard.displayName = 'MlMetricCard';

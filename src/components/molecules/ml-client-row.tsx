/**
 * Molecule: MlClientRow
 *
 * Single client row with color dot, name, revenue, and delta.
 * Fixed: revenue and deltaPercent now rendered (were dead props).
 * Migrated to NativeWind + AtTypography.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtColorDot } from '@/src/components/atoms/at-color-dot';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { formatCurrency } from '@/src/utils/currency';

interface MlClientRowProps {
  name: string;
  color: string;
  /** Explicit [fromColor, toColor] gradient pair for the swatch.
   *  When provided renders a vertical gradient (default xl/28px). */
  gradientColors?: [string, string];
  revenue?: number;
  deltaPercent?: number;
  onPress?: () => void;
  selected?: boolean;
  /** When true and `selected`, render a blue outline instead of the default
   *  background highlight. Used by the financiero per-section row list. */
  outlined?: boolean;
  /** Use the costos/gastos terceros-list spacing model: no internal horizontal
   *  padding, and—when `selected`—a soft-indigo fill + border highlight that
   *  bleeds 8px past the row. Takes precedence over `outlined`. Expects the
   *  parent list to provide the `px-4` gutter. */
  highlighted?: boolean;
  /** Override the swatch size. Defaults to xl (28) when gradientColors is
   *  provided, lg (16) otherwise. */
  swatchSize?: 'md' | 'lg' | 'xl';
  /** When true, render a small arrow-forward icon next to the name to
   *  hint at a drill-down. */
  showArrow?: boolean;
  className?: string;
  /** When true, the name text is centered within the remaining flex-1 space. */
  centerTitle?: boolean;
  /** Padding y gap reducidos (px-2 / gap-2) para columnas angostas como la
   *  lista del Top 8: con px-4 + gap-3 al nombre le quedaban ~65px. */
  dense?: boolean;
}

export const MlClientRow = memo<MlClientRowProps>(
  ({ name, color, gradientColors, revenue, deltaPercent, onPress, selected = false, outlined = false, highlighted = false, swatchSize, showArrow = false, className, centerTitle = false, dense = false }) => {
    const useHighlight = selected && highlighted;
    const useOutline = selected && outlined && !highlighted;
    const resolvedSwatchSize = swatchSize ?? (gradientColors ? 'xl' : 'lg');
    return (
      <Pressable
        onPress={onPress}
        className={`flex-row items-center py-2 rounded-md ${
          dense ? 'gap-2' : 'gap-3'
        } ${highlighted ? '' : dense ? 'px-2' : 'px-4'} ${
          selected && !outlined && !highlighted ? 'bg-bg-secondary' : ''
        } ${className ?? ''}`}
        style={
          useHighlight
            ? {
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(99, 102, 241, 0.4)',
                borderRadius: 10,
                borderCurve: 'continuous',
                paddingHorizontal: 8,
                marginHorizontal: -8,
              }
            : useOutline
              ? { borderWidth: 1.5, borderColor: '#3A5BC4', borderCurve: 'continuous' }
              : undefined
        }
      >
        <AtColorDot
          color={color}
          size={resolvedSwatchSize}
          shape="square"
          gradient={!gradientColors}
          gradientColors={gradientColors}
        />

        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1">
            <AtTypography variant="body" numberOfLines={1} style={centerTitle ? { textAlign: 'center' } : undefined}>
              {name}
            </AtTypography>
            {showArrow && (
              <AtIcon name="arrow-forward" size="sm" color="#1A1F36" />
            )}
          </View>
          {revenue != null && (
            <AtTypography variant="caption" color="#4A5568">
              {formatCurrency(revenue, { currency: 'USD', compact: false })}
            </AtTypography>
          )}
        </View>

        {deltaPercent != null && (
          <AtDeltaIndicator value={deltaPercent} size="sm" />
        )}
      </Pressable>
    );
  },
);

MlClientRow.displayName = 'MlClientRow';

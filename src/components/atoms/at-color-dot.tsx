/**
 * Atom: AtColorDot
 *
 * Small colored square/circle indicator for lists (client/category/terceros).
 * With `gradient`, the dot renders a top-left → bottom-right linear
 * gradient from the base color into an auto-darkened variant — matches
 * the donut slice colors in the dashboard legend.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { LinearGradient } from 'expo-linear-gradient';
import { darkenHex } from '@/src/utils/color';

type DotShape = 'square' | 'circle';
type DotSize = 'sm' | 'md' | 'lg' | 'xl';

interface AtColorDotProps {
  color: string;
  shape?: DotShape;
  size?: DotSize;
  gradient?: boolean;
  /** Explicit [fromColor, toColor] pair. When provided, overrides the auto-darken
   *  gradient and renders a vertical (top → bottom) gradient. */
  gradientColors?: [string, string];
  className?: string;
}

const sizeMap: Record<DotSize, number> = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
};

export const AtColorDot = memo<AtColorDotProps>(
  ({ color, shape = 'square', size = 'md', gradient = false, gradientColors, className }) => {
    const dimension = sizeMap[size];
    const borderRadius = shape === 'circle' ? dimension / 2 : 2;

    if (gradientColors) {
      // Radius scaled to size — keeps 28px legend swatch at ~7 and 16px row
      // swatch at ~4, so corners read as a rounded square at every size.
      const gradientRadius = Math.max(3, Math.round(dimension * 0.25));
      return (
        <View
          className={className}
          style={{
            width: dimension,
            height: dimension,
            borderRadius: gradientRadius,
            overflow: 'hidden',
            borderCurve: 'continuous' as const,
          }}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>
      );
    }

    if (gradient) {
      return (
        <View
          className={className}
          style={{
            width: dimension,
            height: dimension,
            borderRadius,
            overflow: 'hidden',
            borderCurve: 'continuous' as const,
          }}
        >
          <LinearGradient
            colors={[color, darkenHex(color, 0.6)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>
      );
    }

    return (
      <View
        className={className}
        style={{
          width: dimension,
          height: dimension,
          backgroundColor: color,
          borderRadius,
          borderCurve: 'continuous' as const,
        }}
      />
    );
  },
);

AtColorDot.displayName = 'AtColorDot';

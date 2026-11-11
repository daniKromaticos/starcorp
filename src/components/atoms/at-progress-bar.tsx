/**
 * Atom: AtProgressBar
 *
 * Horizontal progress bar. Si se pasa `colors` (par de strings), el fill
 * se renderiza con `LinearGradient` horizontal (oscuro → claro). Si solo
 * se pasa `color`, fill plano.
 */

import React, { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from '@/src/tw';

interface AtProgressBarProps {
  /** Value between 0 and 1 */
  progress: number;
  color?: string;
  /** Stops del degradado (start → end). Tiene prioridad sobre `color`. */
  colors?: readonly [string, string];
  trackColor?: string;
  height?: number;
  className?: string;
}

export const AtProgressBar = memo<AtProgressBarProps>(
  ({ progress, color = '#E8952E', colors, trackColor = '#EBEBF0', height = 6, className }) => {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const radius = height / 2;

    const fillStyle = {
      width: `${clampedProgress * 100}%` as const,
      height: '100%' as const,
      borderRadius: radius,
      borderCurve: 'continuous' as const,
    };

    return (
      <View
        className={`w-full overflow-hidden ${className ?? ''}`}
        style={{
          height,
          backgroundColor: trackColor,
          borderRadius: radius,
          borderCurve: 'continuous' as const,
        }}
      >
        {colors ? (
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={fillStyle}
          />
        ) : (
          <View style={{ ...fillStyle, backgroundColor: color }} />
        )}
      </View>
    );
  },
);

AtProgressBar.displayName = 'AtProgressBar';

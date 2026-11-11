/**
 * Atom: AtTypography
 *
 * Centralized text component with Roboto font family
 * and predefined variant styles mapped to the design system.
 */

import React, { memo } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Text } from '@/src/tw';

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'captionBold'
  | 'metric'
  | 'metricSmall'
  | 'label'
  | 'overline';

export interface AtTypographyProps {
  variant?: TypographyVariant;
  color?: string;
  className?: string;
  selectable?: boolean;
  numberOfLines?: number;
  /** Achica la fuente para caber en una línea (con numberOfLines={1}). */
  adjustsFontSizeToFit?: boolean;
  /** Escala mínima al achicar (default de RN: 0.01). */
  minimumFontScale?: number;
  /** Dónde va el "…" al truncar ('head' conserva el final del texto). */
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

const variantStyles: Record<TypographyVariant, TextStyle> = {
  h1: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  h2: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 22,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  h3: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Roboto_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: 'Roboto_500Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: 'Roboto_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  captionBold: {
    fontFamily: 'Roboto_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  metric: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 32,
    lineHeight: 38,
    fontVariant: ['tabular-nums'],
  },
  metricSmall: {
    fontFamily: 'Roboto_700Bold',
    fontSize: 20,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: 'Roboto_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  overline: {
    fontFamily: 'Roboto_500Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
};

export const AtTypography = memo(function AtTypography({
  variant = 'body',
  color,
  className,
  selectable,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
  ellipsizeMode,
  children,
  style,
}: AtTypographyProps) {
  return (
    <Text
      className={className}
      selectable={selectable}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      ellipsizeMode={ellipsizeMode}
      style={[variantStyles[variant], color ? { color } : undefined, style]}
    >
      {children}
    </Text>
  );
});

AtTypography.displayName = 'AtTypography';

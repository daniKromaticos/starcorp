/**
 * Atom: AtIcon
 *
 * Wrapper around MaterialIcons and MaterialCommunityIcons
 * from @expo/vector-icons for consistent icon usage.
 */

import React, { memo } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];
type CommunityIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type AtIconSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<AtIconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export type AtIconProps = {
  size?: AtIconSize | number;
  color?: string;
  style?: StyleProp<TextStyle>;
} & (
  | { name: MaterialIconName; variant?: 'material' }
  | { name: CommunityIconName; variant: 'community' }
);

export const AtIcon = memo(function AtIcon({
  name,
  size = 'lg',
  color = '#1A1F36',
  variant = 'material',
  style,
}: AtIconProps) {
  const resolvedSize = typeof size === 'number' ? size : sizeMap[size];

  if (variant === 'community') {
    return (
      <MaterialCommunityIcons
        name={name as CommunityIconName}
        size={resolvedSize}
        color={color}
        style={style}
      />
    );
  }

  return (
    <MaterialIcons
      name={name as MaterialIconName}
      size={resolvedSize}
      color={color}
      style={style}
    />
  );
});

AtIcon.displayName = 'AtIcon';

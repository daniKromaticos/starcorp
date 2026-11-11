import React, { memo } from 'react';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { gradients, type GradientName } from '@/src/theme/gradients';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];
type CommunityIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export type AtGradientIconSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<AtGradientIconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export type AtGradientIconProps = {
  size?: AtGradientIconSize | number;
  gradient: GradientName;
} & (
  | { name: MaterialIconName; variant?: 'material' }
  | { name: CommunityIconName; variant: 'community' }
  | { name: IoniconsName; variant: 'ionicons' }
);

export const AtGradientIcon = memo(function AtGradientIcon({
  name,
  size = 'lg',
  gradient,
  variant = 'material',
}: AtGradientIconProps) {
  const resolvedSize = typeof size === 'number' ? size : sizeMap[size];
  const g = gradients[gradient];

  const IconComp =
    variant === 'community'
      ? MaterialCommunityIcons
      : variant === 'ionicons'
      ? Ionicons
      : MaterialIcons;

  return (
    <MaskedView
      style={{ width: resolvedSize, height: resolvedSize }}
      maskElement={
        <IconComp name={name as never} size={resolvedSize} color="#000" />
      }
    >
      <LinearGradient
        colors={g.colors as unknown as readonly [string, string, ...string[]]}
        start={g.start}
        end={g.end}
        style={{ flex: 1 }}
      />
    </MaskedView>
  );
});

AtGradientIcon.displayName = 'AtGradientIcon';

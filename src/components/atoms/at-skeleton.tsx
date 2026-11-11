/**
 * Atom: AtSkeleton
 *
 * Animated placeholder for loading states.
 * Preserved: Reanimated pulse animation.
 */

import React, { memo, useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AtSkeletonProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  className?: string;
}

export const AtSkeleton = memo<AtSkeletonProps>(
  ({ width, height, borderRadius = 6, className }) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
      opacity.value = withRepeat(
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        style={[
          {
            width,
            height,
            borderRadius,
            borderCurve: 'continuous' as const,
            backgroundColor: '#EBEBF0',
          },
          animatedStyle,
        ]}
      />
    );
  },
);

AtSkeleton.displayName = 'AtSkeleton';

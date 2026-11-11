/**
 * Atom: AtToggleSwitch
 *
 * Switch ON/OFF tipo iOS con knob blanco. Estado activo = pill azul navy
 * (matches el "Filtros" del informe asociados); inactivo = gris claro.
 */

import React, { memo } from 'react';
import { Pressable } from '@/src/tw';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface AtToggleSwitchProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

const WIDTH = 46;
const HEIGHT = 26;
const KNOB = 20;
const PADDING = 3;

export const AtToggleSwitch = memo<AtToggleSwitchProps>(
  ({ value, onChange, disabled }) => {
    const progress = useSharedValue(value ? 1 : 0);

    React.useEffect(() => {
      progress.value = withTiming(value ? 1 : 0, { duration: 180 });
    }, [progress, value]);

    const trackStyle = useAnimatedStyle(() => ({
      backgroundColor: progress.value > 0.5 ? '#1A3FE8' : '#D1D5DB',
    }));

    const knobStyle = useAnimatedStyle(() => ({
      transform: [
        {
          translateX: progress.value * (WIDTH - KNOB - PADDING * 2),
        },
      ],
    }));

    return (
      <Pressable
        onPress={() => !disabled && onChange(!value)}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        hitSlop={6}
      >
        <Animated.View
          style={[
            {
              width: WIDTH,
              height: HEIGHT,
              borderRadius: HEIGHT / 2,
              padding: PADDING,
              opacity: disabled ? 0.5 : 1,
              borderCurve: 'continuous',
            },
            trackStyle,
          ]}
        >
          <Animated.View
            style={[
              {
                width: KNOB,
                height: KNOB,
                borderRadius: KNOB / 2,
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.18,
                shadowRadius: 2,
                elevation: 2,
              },
              knobStyle,
            ]}
          />
        </Animated.View>
      </Pressable>
    );
  },
);

AtToggleSwitch.displayName = 'AtToggleSwitch';

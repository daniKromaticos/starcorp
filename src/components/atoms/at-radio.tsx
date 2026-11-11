/**
 * Atom: AtRadio
 *
 * Radio button con anillo naranja (matches el filtro "Por cargo" de
 * Informe Asociados). Cuando está seleccionado, el centro se rellena
 * con el mismo naranja del anillo.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from './at-typography';

interface AtRadioProps {
  selected: boolean;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}

export const AtRadio = memo<AtRadioProps>(
  ({ selected, label, onPress, color = '#E8952E', disabled }) => {
    return (
      <Pressable
        onPress={() => !disabled && onPress()}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled }}
        hitSlop={4}
        className="flex-row items-start gap-2"
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {selected && (
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: color,
              }}
            />
          )}
        </View>
        <AtTypography
          variant="body"
          color={disabled ? '#8892A4' : '#1A1F36'}
          className="flex-1"
        >
          {label}
        </AtTypography>
      </Pressable>
    );
  },
);

AtRadio.displayName = 'AtRadio';

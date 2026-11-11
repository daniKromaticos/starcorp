/**
 * Molecule: MlOtpInput
 *
 * Input de código de verificación (8 dígitos) del flujo de recuperación
 * de contraseña. Un solo TextInput invisible captura el teclado; las
 * cajas visibles se pintan a partir del valor. Soporta autofill del
 * código (one-time-code) y pegar los 8 dígitos completos.
 */

import React, { memo, useRef } from 'react';
import { TextInput as RNTextInput } from 'react-native';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';

const CODE_LENGTH = 8;

interface MlOtpInputProps {
  value: string;
  onChangeText: (code: string) => void;
  disabled?: boolean;
}

export const MlOtpInput = memo<MlOtpInputProps>(
  ({ value, onChangeText, disabled }) => {
    const inputRef = useRef<RNTextInput>(null);
    const digits = value.split('');
    const activeIndex = Math.min(value.length, CODE_LENGTH - 1);

    const handleChange = (text: string) => {
      onChangeText(text.replace(/\D/g, '').slice(0, CODE_LENGTH));
    };

    return (
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessibilityLabel="Código de verificación"
        disabled={disabled}
      >
        <View className="flex-row justify-center" style={{ gap: 6 }}>
          {Array.from({ length: CODE_LENGTH }, (_, i) => (
            <View
              key={i}
              className="bg-bg-card items-center justify-center"
              // 320dp: 8×34 + gaps no cabe en 272; las cajas se encogen
              // (flex 1) sin pasar de 34 en pantallas normales.
              style={{
                flex: 1,
                maxWidth: 34,
                height: 48,
                borderRadius: 10,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor:
                  i === activeIndex && !disabled
                    ? '#1938A5'
                    : 'rgba(0, 0, 0, 0.12)',
              }}
            >
              <AtTypography variant="h3" color="#1A1F36">
                {digits[i] ?? ''}
              </AtTypography>
            </View>
          ))}
        </View>
        <RNTextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          editable={!disabled}
          autoFocus
          caretHidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0,
          }}
        />
      </Pressable>
    );
  },
);

MlOtpInput.displayName = 'MlOtpInput';

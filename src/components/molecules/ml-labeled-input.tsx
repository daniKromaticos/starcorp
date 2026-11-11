/**
 * Molecule: MlLabeledInput
 *
 * Campo de formulario del Repositorio: label (con asterisco si es
 * requerido) + TextInput en card blanca con borde suave.
 */

import React, { memo } from 'react';
import type { TextInputProps } from 'react-native';
import { TextInput, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';

interface MlLabeledInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
}

export const MlLabeledInput = memo<MlLabeledInputProps>(
  ({
    label,
    value,
    onChangeText,
    placeholder,
    required,
    error,
    keyboardType,
    autoCapitalize,
    autoComplete,
    textContentType,
  }) => {
    return (
      <View className="gap-2">
        <AtTypography variant="captionBold" color="#1A1F36">
          {label}
          {required ? <AtTypography variant="captionBold" color="#E53E3E"> *</AtTypography> : null}
        </AtTypography>
        <View
          className="bg-bg-card px-4"
          style={{
            borderRadius: 10,
            borderCurve: 'continuous',
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: error ? '#E53E3E' : 'rgba(0, 0, 0, 0.12)',
          }}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#8892A4"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            textContentType={textContentType}
            className="p-0"
            style={{ fontFamily: 'Roboto_400Regular', fontSize: 14, color: '#1A1F36' }}
          />
        </View>
        {error ? (
          <AtTypography variant="caption" color="#E53E3E">
            {error}
          </AtTypography>
        ) : null}
      </View>
    );
  },
);

MlLabeledInput.displayName = 'MlLabeledInput';

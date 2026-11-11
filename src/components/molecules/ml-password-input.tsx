/**
 * Molecule: MlPasswordInput
 *
 * Campo de contraseña de las pantallas de auth: label con asterisco,
 * input seguro y toggle de visibilidad (ojo). Mismo estilo de card
 * blanca con borde suave que MlLabeledInput.
 */

import React, { memo, useState } from 'react';
import { Pressable, TextInput, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';

interface MlPasswordInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
}

export const MlPasswordInput = memo<MlPasswordInputProps>(
  ({ label, value, onChangeText, placeholder, required, error }) => {
    const [visible, setVisible] = useState(false);

    return (
      <View className="gap-2">
        <AtTypography variant="captionBold" color="#1A1F36">
          {label}
          {required ? (
            <AtTypography variant="captionBold" color="#E53E3E"> *</AtTypography>
          ) : null}
        </AtTypography>
        <View
          className="bg-bg-card px-4 flex-row items-center"
          style={{
            borderRadius: 10,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: error ? '#E53E3E' : 'rgba(0, 0, 0, 0.12)',
          }}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#8892A4"
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            className="flex-1 p-0"
            style={{
              fontFamily: 'Roboto_400Regular',
              fontSize: 14,
              color: '#1A1F36',
              paddingVertical: 12,
            }}
          />
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={8}
          >
            <AtIcon
              name={visible ? 'visibility' : 'visibility-off'}
              size="md"
              color="#8892A4"
            />
          </Pressable>
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

MlPasswordInput.displayName = 'MlPasswordInput';

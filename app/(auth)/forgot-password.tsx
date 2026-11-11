/**
 * Olvidaste la contraseña — paso 1: pide el correo y envía el código
 * OTP de recuperación (Supabase resetPasswordForEmail).
 */

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import {
  MlBackHeader,
  MlGradientButton,
  MlLabeledInput,
} from '@/src/components/molecules';
import { useRequestPasswordReset } from '@/src/hooks/mutations/use-auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const requestReset = useRequestPasswordReset();
  const [email, setEmail] = useState('');

  const canSubmit = /\S+@\S+\.\S+/.test(email.trim());

  const handleSubmit = () => {
    if (!canSubmit || requestReset.isPending) return;
    requestReset.mutate(
      { email },
      {
        onSuccess: () =>
          router.push({
            pathname: '/(auth)/verify-code',
            params: { email: email.trim().toLowerCase() },
          }),
      },
    );
  };

  return (
    <View
      className="flex-1 bg-bg-primary"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 py-4"
          keyboardShouldPersistTaps="handled"
        >
          <MlBackHeader />

          <View className="gap-4 items-center" style={{ marginTop: 72 }}>
            <AtTypography
              variant="h2"
              color="#1A1F36"
              style={{ textAlign: 'center' }}
            >
              ¿Olvidaste la contraseña?
            </AtTypography>
            <AtTypography
              variant="caption"
              color="#4A5568"
              style={{ textAlign: 'center' }}
            >
              Ingrese la dirección de correo electrónico que utilizó cuando se
              unió y le enviaremos instrucciones para restablecer su contraseña.
            </AtTypography>
            <AtTypography
              variant="caption"
              color="#4A5568"
              style={{ textAlign: 'center' }}
            >
              Por razones de seguridad, NO almacenamos su contraseña. Así que
              tenga la seguridad de que nunca le enviaremos su contraseña por
              correo electrónico.
            </AtTypography>
          </View>

          <View className="gap-4" style={{ marginTop: 40 }}>
            <MlLabeledInput
              label="Correo electrónico"
              required
              value={email}
              onChangeText={setEmail}
              placeholder="Ingresa tu correo"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              error={requestReset.isError ? requestReset.error.message : null}
            />
            <MlGradientButton
              label="Enviar instrucciones"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={requestReset.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

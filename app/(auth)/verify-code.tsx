/**
 * Olvidaste la contraseña — paso 2: verifica el código OTP de 8 dígitos
 * enviado al correo (Supabase verifyOtp type 'recovery'). Al verificar,
 * Supabase crea la sesión de recovery y se navega a reestablecer.
 */

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import {
  MlBackHeader,
  MlGradientButton,
  MlOtpInput,
} from '@/src/components/molecules';
import {
  useRequestPasswordReset,
  useVerifyResetCode,
} from '@/src/hooks/mutations/use-auth';

const CODE_LENGTH = 8;

export default function VerifyCodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  const verifyCode = useVerifyResetCode();
  const resend = useRequestPasswordReset();
  const [code, setCode] = useState('');
  const [resent, setResent] = useState(false);

  const canSubmit = code.length === CODE_LENGTH && !!email;

  const handleSubmit = () => {
    if (!canSubmit || verifyCode.isPending) return;
    verifyCode.mutate(
      { email: email!, code },
      { onSuccess: () => router.push('/(auth)/reset-password') },
    );
  };

  const handleResend = () => {
    if (!email || resend.isPending) return;
    setResent(false);
    setCode('');
    verifyCode.reset();
    resend.mutate({ email }, { onSuccess: () => setResent(true) });
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
              Ingresa el código de verificación que enviamos a {email}
            </AtTypography>
          </View>

          <View className="gap-4" style={{ marginTop: 32 }}>
            <MlOtpInput
              value={code}
              onChangeText={setCode}
              disabled={verifyCode.isPending}
            />
            {verifyCode.isError ? (
              <AtTypography
                variant="caption"
                color="#E53E3E"
                style={{ textAlign: 'center' }}
              >
                {verifyCode.error.message}
              </AtTypography>
            ) : null}
            {resend.isError ? (
              <AtTypography
                variant="caption"
                color="#E53E3E"
                style={{ textAlign: 'center' }}
              >
                {resend.error.message}
              </AtTypography>
            ) : null}
            {resent ? (
              <AtTypography
                variant="caption"
                color="#38A169"
                style={{ textAlign: 'center' }}
              >
                Enviamos un nuevo código a tu correo.
              </AtTypography>
            ) : null}
            <MlGradientButton
              label="Verificar código"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={verifyCode.isPending}
            />
          </View>

          <Pressable
            onPress={handleResend}
            accessibilityRole="link"
            hitSlop={8}
            className="items-center"
            style={{ marginTop: 96, opacity: resend.isPending ? 0.6 : 1 }}
          >
            <AtTypography variant="caption" color="#3182CE">
              Volver a enviar
            </AtTypography>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

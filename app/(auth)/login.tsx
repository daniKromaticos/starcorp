/**
 * Login — inicia sesión con email + contraseña contra Supabase Auth.
 */

import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, View } from '@/src/tw';
import { TmAuth } from '@/src/components/templates/tm-auth';
import { AtTypography } from '@/src/components/atoms/at-typography';
import {
  MlGradientButton,
  MlLabeledInput,
  MlPasswordInput,
} from '@/src/components/molecules';
import { useLogin } from '@/src/hooks/mutations/use-auth';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleSubmit = () => {
    if (!canSubmit || login.isPending) return;
    login.mutate({ email, password });
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
        <TmAuth>
          <View className="items-center gap-4">
            <Image
              source={require('@/assets/images/icon.png')}
              style={{ width: 72, height: 72, borderRadius: 14 }}
              resizeMode="contain"
              accessibilityLabel="Logo Starcorp"
            />
            <AtTypography variant="h2" color="#1A1F36">
              Bienvenido a Starcorp
            </AtTypography>
          </View>

          <View className="gap-4">
            <MlLabeledInput
              label="Usuario"
              required
              value={email}
              onChangeText={setEmail}
              placeholder="Ingresa tu usuario"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <MlPasswordInput
              label="Contraseña"
              required
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresa tu contraseña"
            />
            {login.isError ? (
              <AtTypography variant="caption" color="#E53E3E">
                {login.error.message}
              </AtTypography>
            ) : null}
            <MlGradientButton
              label="Inicia sesión"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={login.isPending}
            />
          </View>

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            accessibilityRole="link"
            hitSlop={8}
            className="items-center"
            style={{ marginTop: 48 }}
          >
            <AtTypography variant="caption" color="#3182CE">
              ¿Olvidaste la contraseña?
            </AtTypography>
          </Pressable>
        </TmAuth>
      </KeyboardAvoidingView>
    </View>
  );
}

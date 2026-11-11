/**
 * Reestablecer contraseña — paso 3: con la sesión de recovery creada
 * por verifyOtp, actualiza la contraseña (Supabase updateUser). Al
 * completar, el flag passwordRecovery se limpia y el gate del layout
 * raíz deja entrar a la app con la sesión ya activa.
 */

import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import {
  MlBackHeader,
  MlGradientButton,
  MlPasswordInput,
  MlPasswordStrength,
  isPasswordValid,
} from '@/src/components/molecules';
import { useUpdatePassword } from '@/src/hooks/mutations/use-auth';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const updatePassword = useUpdatePassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = isPasswordValid(password) && confirm === password;

  const handleSubmit = () => {
    if (!canSubmit || updatePassword.isPending) return;
    updatePassword.mutate(
      { password },
      {
        onSuccess: () => {
          // Al limpiarse passwordRecovery el gate navega solo a la app.
          Alert.alert('Listo', 'Tu contraseña fue actualizada.');
        },
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

          <View className="items-center" style={{ marginTop: 72 }}>
            <AtTypography
              variant="h2"
              color="#1A1F36"
              style={{ textAlign: 'center' }}
            >
              Reestablece tu contraseña
            </AtTypography>
          </View>

          <View className="gap-4" style={{ marginTop: 40 }}>
            <MlPasswordInput
              label="Nueva contraseña"
              required
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresa tu nueva contraseña"
            />
            <MlPasswordStrength password={password} />
            <MlPasswordInput
              label="Confirma la contraseña"
              required
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Ingresa tu nueva contraseña"
              error={mismatch ? 'Las contraseñas no coinciden.' : null}
            />
            {updatePassword.isError ? (
              <AtTypography variant="caption" color="#E53E3E">
                {updatePassword.error.message}
              </AtTypography>
            ) : null}
            <MlGradientButton
              label="Cambiar contraseña"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={updatePassword.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

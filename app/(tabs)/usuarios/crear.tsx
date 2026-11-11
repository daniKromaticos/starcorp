/**
 * Nuevo usuario — datos + permisos iniciales. Al confirmar en el modal
 * se crea el usuario con contraseña temporal autogenerada y se envía la
 * invitación por correo (si hay RESEND_API_KEY configurado; si no, la
 * contraseña se muestra al super admin para compartirla manualmente).
 */

import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlGradientButton, MlLabeledInput } from '@/src/components/molecules';
import { OrConfirmModal } from '@/src/components/organisms/or-confirm-modal';
import { OrPermisosEditor } from '@/src/components/organisms/or-permisos-editor';
import { useCreateUsuario } from '@/src/hooks/mutations/use-usuarios';
import { showToast } from '@/src/stores/toast.store';

const NAVY_TITLE = '#20307E';

export default function CrearUsuarioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createUsuario = useCreateUsuario();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = emailValid && !createUsuario.isPending;

  const handleCreate = () => {
    setConfirmVisible(false);
    createUsuario.mutate(
      { email, firstName, lastName, permissions },
      {
        onSuccess: (result) => {
          showToast('Usuario creado con éxito');
          // Volver de una vez a la lista (mostrará al nuevo usuario en
          // "Esperando confirmación"); el Alert es nativo y sobrevive
          // la navegación.
          router.back();
          Alert.alert(
            'Usuario creado',
            result.emailSent
              ? `Enviamos la invitación a ${email.trim()} con su contraseña temporal.`
              : `No se pudo enviar el correo de invitación${result.emailError ? ` (${result.emailError})` : ''}. Comparte esta contraseña temporal con el usuario:\n\n${result.tempPassword}`,
          );
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-bg-secondary" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pt-4 pb-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={8}
            className="flex-row items-center self-start"
            style={{ gap: 4 }}
          >
            <AtIcon name="chevron-left" size="lg" color={NAVY_TITLE} />
            {/* flexShrink: a 320dp el título no cabe junto al chevron */}
            <AtTypography variant="bodyBold" color={NAVY_TITLE} style={{ flexShrink: 1 }}>
              Usuarios y permisos / nuevo usuario
            </AtTypography>
          </Pressable>

          <View
            className="bg-bg-card p-4 gap-4"
            style={{ borderRadius: 14, borderCurve: 'continuous', marginTop: 20 }}
          >
            <AtTypography variant="bodyBold" color="#1A1F36">
              Datos del usuario
            </AtTypography>
            <MlLabeledInput
              label="Nombre"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ingresa el nombre del usuario"
            />
            <MlLabeledInput
              label="Apellido"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Ingresa el apellido del usuario"
            />
            <MlLabeledInput
              label="Correo electrónico"
              required
              value={email}
              onChangeText={setEmail}
              placeholder="Ingresa el correo con el que será invitado"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={{ marginTop: 16 }}>
            <AtTypography
              variant="bodyBold"
              color="#1A1F36"
              style={{ marginBottom: 12 }}
            >
              Permisos de usuario
            </AtTypography>
            <OrPermisosEditor
              selected={permissions}
              onChange={setPermissions}
              disabled={createUsuario.isPending}
            />
          </View>
        </ScrollView>

        <View className="px-4" style={{ paddingTop: 10, paddingBottom: 12 }}>
          {createUsuario.isError ? (
            <AtTypography variant="caption" color="#E53E3E" style={{ marginBottom: 8 }}>
              {createUsuario.error.message}
            </AtTypography>
          ) : null}
          <MlGradientButton
            label="Crear usuario"
            onPress={() => setConfirmVisible(true)}
            disabled={!canSubmit}
            loading={createUsuario.isPending}
          />
        </View>
      </KeyboardAvoidingView>

      <OrConfirmModal
        visible={confirmVisible}
        title="Crear usuario"
        message={`Enviaremos un correo a "${email.trim() || 'correo@correo.com'}" con las instrucciones de ingreso y una contraseña autogenerada.`}
        question="¿Está seguro de crear este usuario?"
        confirmLabel="Crear usuario"
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleCreate}
      />
    </View>
  );
}

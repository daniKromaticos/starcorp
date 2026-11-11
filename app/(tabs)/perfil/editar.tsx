/**
 * Editar perfil — foto, datos personales y cambio de contraseña
 * (requiere la actual). La foto elegida queda en preview y se sube al
 * presionar "Guardar cambios" (botón fijo al fondo, formulario con
 * scroll). Al salir con cambios sin guardar muestra el modal de
 * confirmación (usePreventRemove intercepta back button, gesto y
 * hardware back).
 */

import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtAvatar } from '@/src/components/atoms/at-avatar';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import {
  MlGradientButton,
  MlLabeledInput,
  MlPasswordInput,
  MlPasswordStrength,
  isPasswordValid,
} from '@/src/components/molecules';
import { OrConfirmModal } from '@/src/components/organisms/or-confirm-modal';
import { useSaveProfile, useUploadAvatar } from '@/src/hooks/mutations/use-auth';
import { useAuthStore } from '@/src/stores/auth.store';
import { showToast } from '@/src/stores/toast.store';

const BLUE = '#1A3FE8';
const NAVY_TITLE = '#20307E';

interface PendingPhoto {
  uri: string;
  contentType: string;
}

export default function EditarPerfilScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const saveProfile = useSaveProfile();
  const uploadAvatar = useUploadAvatar();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [saved, setSaved] = useState(false);

  const [pendingAction, setPendingAction] = useState<
    Parameters<typeof navigation.dispatch>[0] | null
  >(null);

  const emailChanged =
    email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();
  const dataChanged =
    firstName.trim() !== (user?.firstName ?? '') ||
    lastName.trim() !== (user?.lastName ?? '') ||
    emailChanged;
  const passwordTouched =
    currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;
  const isDirty = dataChanged || passwordTouched || pendingPhoto !== null;

  const saving = saveProfile.isPending || uploadAvatar.isPending;

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const passwordSectionValid =
    !passwordTouched ||
    (currentPassword.length > 0 &&
      isPasswordValid(newPassword) &&
      confirmPassword === newPassword);
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    emailValid &&
    passwordSectionValid &&
    isDirty;

  usePreventRemove(isDirty && !saved && !saving, ({ data }) => {
    setPendingAction(data.action);
  });

  // Navegar después del render para que usePreventRemove ya esté
  // des-registrado (saved=true) cuando ocurra la remoción.
  useEffect(() => {
    if (saved) router.back();
  }, [saved, router]);

  const handleSave = async () => {
    if (!canSubmit || saving) return;
    if (pendingPhoto) {
      try {
        await uploadAvatar.mutateAsync({
          uri: pendingPhoto.uri,
          contentType: pendingPhoto.contentType,
        });
      } catch {
        return; // uploadAvatar.isError muestra el mensaje
      }
    }
    saveProfile.mutate(
      {
        firstName,
        lastName,
        email: emailChanged ? email : undefined,
        currentPassword: passwordTouched ? currentPassword : undefined,
        newPassword: passwordTouched ? newPassword : undefined,
      },
      {
        onSuccess: () => {
          setPendingPhoto(null);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          showToast(
            emailChanged
              ? 'Cambios guardados. Revisa tu correo para confirmar el nuevo email.'
              : 'Cambios guardados con éxito',
          );
          setSaved(true);
        },
      },
    );
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setPendingPhoto({ uri: asset.uri, contentType: asset.mimeType ?? 'image/jpeg' });
  };

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

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
            accessibilityLabel="Volver al perfil"
            hitSlop={8}
            className="flex-row items-center self-start"
            style={{ gap: 4 }}
          >
            <AtIcon name="chevron-left" size="lg" color={NAVY_TITLE} />
            <AtTypography variant="h3" color={NAVY_TITLE}>
              Perfil
            </AtTypography>
          </Pressable>

          <View
            className="bg-bg-card flex-row items-center gap-4 p-4"
            style={{ borderRadius: 14, borderCurve: 'continuous', marginTop: 20 }}
          >
            <AtAvatar
              size={48}
              uri={pendingPhoto?.uri ?? user?.avatarUrl}
              name={user?.name}
            />
            {/* flex-1: el aviso de foto nueva desbordaba la card */}
            <View className="flex-1 gap-1">
              <Pressable
                onPress={handlePickPhoto}
                accessibilityRole="button"
                className="self-start"
                hitSlop={8}
                disabled={saving}
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                <AtTypography variant="captionBold" color={BLUE}>
                  Editar foto de perfil
                </AtTypography>
              </Pressable>
              {pendingPhoto ? (
                <AtTypography variant="caption" color="#4A5568">
                  Nueva foto seleccionada — guarda para aplicar.
                </AtTypography>
              ) : null}
            </View>
          </View>

          <View
            className="bg-bg-card p-4 gap-4"
            style={{ borderRadius: 14, borderCurve: 'continuous', marginTop: 16 }}
          >
            <AtTypography variant="bodyBold" color="#1A1F36">
              Datos personales
            </AtTypography>
            <MlLabeledInput
              label="Nombre"
              required
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ingresa tu nombre"
            />
            <MlLabeledInput
              label="Apellido"
              required
              value={lastName}
              onChangeText={setLastName}
              placeholder="Ingresa tu apellido"
            />
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
            />
          </View>

          <View
            className="bg-bg-card p-4 gap-4"
            style={{ borderRadius: 14, borderCurve: 'continuous', marginTop: 16 }}
          >
            <MlPasswordInput
              label="Contraseña actual"
              required={passwordTouched}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Ingresa la contraseña actual"
            />
            <MlPasswordInput
              label="Nueva contraseña"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Ingresa la nueva contraseña"
            />
            <MlPasswordStrength password={newPassword} />
            <MlPasswordInput
              label="Confirma la contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Ingresa la nueva contraseña"
              error={mismatch ? 'Las contraseñas no coinciden.' : null}
            />
          </View>
        </ScrollView>

        <View className="px-4" style={{ paddingTop: 10, paddingBottom: 12 }}>
          {uploadAvatar.isError ? (
            <AtTypography variant="caption" color="#E53E3E" style={{ marginBottom: 8 }}>
              {uploadAvatar.error.message}
            </AtTypography>
          ) : null}
          {saveProfile.isError ? (
            <AtTypography variant="caption" color="#E53E3E" style={{ marginBottom: 8 }}>
              {saveProfile.error.message}
            </AtTypography>
          ) : null}
          <MlGradientButton
            label="Guardar cambios"
            onPress={handleSave}
            disabled={!canSubmit}
            loading={saving}
          />
        </View>
      </KeyboardAvoidingView>

      <OrConfirmModal
        visible={pendingAction !== null}
        title="Cambios sin guardar"
        message="Tienes cambios sin guardar."
        question="¿Estás seguro de salir de la edición?"
        confirmLabel="Salir"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          if (action) navigation.dispatch(action);
        }}
      />
    </View>
  );
}

/**
 * Editar permisos — toggles por sección para un usuario invitado, con
 * tabs de filtro (Todos + secciones), eliminación con confirmación y
 * guard de cambios sin guardar (usePreventRemove + modal).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtAvatar } from '@/src/components/atoms/at-avatar';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlGradientButton } from '@/src/components/molecules';
import { OrConfirmModal } from '@/src/components/organisms/or-confirm-modal';
import { OrPermisosEditor } from '@/src/components/organisms/or-permisos-editor';
import { PERMISSION_SECTIONS } from '@/src/config/permissions';
import { useUsuarios } from '@/src/hooks/queries/use-usuarios';
import {
  useDeleteUsuario,
  useUpdateUsuarioPermissions,
} from '@/src/hooks/mutations/use-usuarios';
import { showToast } from '@/src/stores/toast.store';

const BLUE = '#1A3FE8';
const NAVY_TITLE = '#20307E';

const TABS = [
  { id: 'todos', label: 'Todos' },
  ...PERMISSION_SECTIONS.map((s) => ({ id: s.id, label: s.label })),
];

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((k) => set.has(k));
}

export default function EditarPermisosScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const usuarios = useUsuarios();
  const updatePermissions = useUpdateUsuarioPermissions();
  const deleteUsuario = useDeleteUsuario();

  const usuario = usuarios.data?.find((u) => u.id === userId) ?? null;

  const [activeTab, setActiveTab] = useState('todos');
  const [selected, setSelected] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    Parameters<typeof navigation.dispatch>[0] | null
  >(null);

  // Inicializar los toggles cuando llega el usuario (una sola vez).
  useEffect(() => {
    if (usuario && selected === null) {
      setSelected(usuario.permissions);
    }
  }, [usuario, selected]);

  const original = usuario?.permissions ?? [];
  const current = selected ?? original;
  const isDirty = selected !== null && !sameSet(current, original);
  const saving = updatePermissions.isPending || deleteUsuario.isPending;

  usePreventRemove(isDirty && !saved && !saving, ({ data }) => {
    setPendingAction(data.action);
  });

  useEffect(() => {
    if (saved) router.back();
  }, [saved, router]);

  const visibleSections = useMemo(
    () =>
      activeTab === 'todos'
        ? PERMISSION_SECTIONS
        : PERMISSION_SECTIONS.filter((s) => s.id === activeTab),
    [activeTab],
  );

  const handleSave = () => {
    if (!usuario || !isDirty || saving) return;
    updatePermissions.mutate(
      { userId: usuario.id, permissions: current },
      {
        onSuccess: () => {
          showToast('Cambios guardados con éxito');
          setSaved(true);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!usuario || saving) return;
    deleteUsuario.mutate(
      { userId: usuario.id },
      {
        onSuccess: () => {
          setDeleteVisible(false);
          showToast('Usuario eliminado');
          setSaved(true);
        },
        onError: () => setDeleteVisible(false),
      },
    );
  };

  return (
    <View className="flex-1 bg-bg-secondary" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 pb-6"
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
            Usuarios y permisos / editar permisos
          </AtTypography>
        </Pressable>

        {usuario ? (
          <>
            <Pressable
              onPress={() => setDeleteVisible(true)}
              accessibilityRole="link"
              hitSlop={8}
              className="self-end"
              style={{ marginTop: 12 }}
            >
              <AtTypography variant="captionBold" color={BLUE}>
                Eliminar usuario
              </AtTypography>
            </Pressable>

            <View
              className="bg-bg-card flex-row items-center gap-3 p-4"
              style={{ borderRadius: 14, borderCurve: 'continuous', marginTop: 12 }}
            >
              <AtAvatar
                size={44}
                uri={usuario.avatarUrl}
                name={usuario.name || usuario.email}
              />
              <View className="flex-1">
                <AtTypography variant="bodyBold" color="#1A1F36" numberOfLines={1}>
                  {usuario.name || '--'}
                </AtTypography>
                <AtTypography variant="caption" color="#4A5568" numberOfLines={1}>
                  {usuario.email}
                </AtTypography>
              </View>
            </View>

            <View className="flex-row flex-wrap" style={{ marginTop: 16, gap: 14 }}>
              {TABS.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    hitSlop={6}
                    style={{
                      paddingBottom: 4,
                      borderBottomWidth: 2,
                      borderBottomColor: active ? BLUE : 'transparent',
                    }}
                  >
                    <AtTypography
                      variant={active ? 'captionBold' : 'caption'}
                      color={active ? BLUE : '#4A5568'}
                    >
                      {tab.label}
                    </AtTypography>
                  </Pressable>
                );
              })}
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
                selected={current}
                onChange={setSelected}
                sections={visibleSections}
                disabled={saving || usuario.role === 'super_admin'}
              />
              {usuario.role === 'super_admin' ? (
                <AtTypography variant="caption" color="#4A5568" style={{ marginTop: 12 }}>
                  Un super admin siempre tiene acceso a todo; sus permisos no se editan.
                </AtTypography>
              ) : null}
            </View>
          </>
        ) : usuarios.isPending ? (
          <View className="gap-3" style={{ marginTop: 20 }}>
            <AtSkeleton width="100%" height={72} borderRadius={14} />
            <AtSkeleton width="100%" height={220} borderRadius={14} />
          </View>
        ) : (
          <AtTypography variant="caption" color="#E53E3E" style={{ marginTop: 20 }}>
            {usuarios.isError ? usuarios.error.message : 'Usuario no encontrado.'}
          </AtTypography>
        )}
      </ScrollView>

      {usuario && usuario.role !== 'super_admin' ? (
        <View className="px-4" style={{ paddingTop: 10, paddingBottom: 12 }}>
          {updatePermissions.isError ? (
            <AtTypography variant="caption" color="#E53E3E" style={{ marginBottom: 8 }}>
              {updatePermissions.error.message}
            </AtTypography>
          ) : null}
          {deleteUsuario.isError ? (
            <AtTypography variant="caption" color="#E53E3E" style={{ marginBottom: 8 }}>
              {deleteUsuario.error.message}
            </AtTypography>
          ) : null}
          <MlGradientButton
            label="Guardar cambios"
            onPress={handleSave}
            disabled={!isDirty}
            loading={updatePermissions.isPending}
          />
        </View>
      ) : null}

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

      <OrConfirmModal
        visible={deleteVisible}
        title="Eliminar usuario"
        message={`Estás a punto de eliminar al usuario "${usuario?.name || (usuario?.email ?? '')}", este cambio no se podrá deshacer.`}
        question="¿Estás seguro de eliminarlo?"
        confirmLabel="Eliminar usuario"
        loading={deleteUsuario.isPending}
        onCancel={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
      />
    </View>
  );
}

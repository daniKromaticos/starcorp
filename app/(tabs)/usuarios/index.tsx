/**
 * Usuarios y permisos — lista de usuarios (solo super_admin).
 * Cada fila muestra avatar, nombre/correo, estado "Esperando
 * confirmación" para invitados sin primer login, y "Ver permisos →".
 */

import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtAvatar } from '@/src/components/atoms/at-avatar';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { useUsuarios } from '@/src/hooks/queries/use-usuarios';
import { useAuthStore } from '@/src/stores/auth.store';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import type { ManagedUser } from '@/src/types/usuarios.types';

const BLUE = '#1A3FE8';
const NAVY_TITLE = '#20307E';

function UsuarioRow({ usuario, onPress }: { usuario: ManagedUser; onPress: () => void }) {
  const narrow = useWindowDimensions().width < 360;
  return (
    <View
      className="bg-bg-card flex-row items-center gap-3 p-3"
      style={{ borderRadius: 14, borderCurve: 'continuous' }}
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
        {usuario.pending ? (
          <AtTypography variant="caption" color="#E53E3E" numberOfLines={1}>
            Esperando confirmación
          </AtTypography>
        ) : null}
      </View>
      {/* 320dp: "Ver permisos →" dejaba ~90px a nombre/correo; solo flecha */}
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel="Ver permisos"
        hitSlop={8}
        className="flex-row items-center gap-1"
      >
        {narrow ? (
          <AtIcon name="chevron-right" size="lg" color={BLUE} />
        ) : (
          <>
            <AtTypography variant="captionBold" color={BLUE}>
              Ver permisos
            </AtTypography>
            <AtIcon name="arrow-forward" size="sm" color={BLUE} />
          </>
        )}
      </Pressable>
    </View>
  );
}

function ListSkeleton() {
  return (
    <View className="gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <View
          key={i}
          className="bg-bg-card flex-row items-center gap-3 p-3"
          style={{ borderRadius: 14, borderCurve: 'continuous' }}
        >
          <AtSkeleton width={44} height={44} borderRadius={22} />
          <View className="flex-1 gap-2">
            <AtSkeleton width="55%" height={14} />
            <AtSkeleton width="70%" height={11} />
          </View>
          <AtSkeleton width={80} height={12} />
        </View>
      ))}
    </View>
  );
}

export default function UsuariosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const isSuperAdmin = useAuthStore((s) => s.user?.role === 'super_admin');
  const usuarios = useUsuarios();

  if (!isSuperAdmin) {
    return <Redirect href="/" />;
  }

  return (
    <View className="flex-1 bg-bg-secondary" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pt-2 pb-8">
        <MlSearchBar
          onMenuPress={() => setDrawerVisible(true)}
          onPress={openGlobalSearch}
        />

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          className="flex-row items-center self-start"
          style={{ gap: 4, marginTop: 20 }}
        >
          <AtIcon name="chevron-left" size="lg" color={NAVY_TITLE} />
          <AtTypography variant="bodyBold" color={NAVY_TITLE}>
            Usuarios y permisos
          </AtTypography>
        </Pressable>

        <View
          className="flex-row items-center justify-between"
          style={{ marginTop: 20 }}
        >
          <View className="flex-row items-center gap-2">
            <AtIcon name="account-circle" size="lg" color="#1A1F36" />
            <AtTypography variant="h3" color="#1A1F36">
              Usuarios
            </AtTypography>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/usuarios/crear')}
            accessibilityRole="link"
            hitSlop={8}
          >
            <AtTypography variant="captionBold" color={BLUE}>
              Agregar un nuevo usuario
            </AtTypography>
          </Pressable>
        </View>

        <View className="gap-3" style={{ marginTop: 16 }}>
          {usuarios.isPending ? (
            <ListSkeleton />
          ) : usuarios.isError ? (
            <AtTypography variant="caption" color="#E53E3E">
              {usuarios.error.message}
            </AtTypography>
          ) : (
            usuarios.data.map((u) => (
              <UsuarioRow
                key={u.id}
                usuario={u}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/usuarios/[userId]',
                    params: { userId: u.id },
                  })
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="usuarios"
      />
    </View>
  );
}

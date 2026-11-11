/**
 * Perfil — vista de datos del usuario de la sesión: avatar, nombre,
 * chip de rol, datos personales y contraseña enmascarada.
 */

import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtAvatar } from '@/src/components/atoms/at-avatar';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlRoleChip } from '@/src/components/molecules/ml-role-chip';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { getAppVersionLabel } from '@/src/config/ota-updates';
import { useAuthStore } from '@/src/stores/auth.store';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';

const BLUE = '#1A3FE8';
const NAVY_TITLE = '#20307E';

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <AtTypography variant="captionBold" color="#1A1F36">
        {label}
      </AtTypography>
      <AtTypography variant="caption" color="#4A5568">
        {value || '—'}
      </AtTypography>
    </View>
  );
}

export default function PerfilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const user = useAuthStore((s) => s.user);

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
          <AtTypography variant="h3" color={NAVY_TITLE}>
            Perfil
          </AtTypography>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/perfil/editar')}
          accessibilityRole="link"
          hitSlop={8}
          className="self-end"
          style={{ marginTop: 12 }}
        >
          <AtTypography variant="captionBold" color={BLUE}>
            Editar datos
          </AtTypography>
        </Pressable>

        <View
          className="bg-bg-card flex-row items-center gap-3 p-4"
          style={{ borderRadius: 14, borderCurve: 'continuous', marginTop: 12 }}
        >
          <AtAvatar size={48} uri={user?.avatarUrl} name={user?.name} />
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <AtTypography variant="bodyBold" color="#1A1F36">
                {user?.name || 'Usuario'}
              </AtTypography>
              {user ? <MlRoleChip role={user.role} /> : null}
            </View>
            <AtTypography variant="caption" color="#4A5568" numberOfLines={1}>
              {user?.email ?? ''}
            </AtTypography>
          </View>
        </View>

        <View
          className="bg-bg-card p-4 gap-4"
          style={{ borderRadius: 14, borderCurve: 'continuous', marginTop: 16 }}
        >
          <AtTypography variant="bodyBold" color="#1A1F36">
            Datos personales
          </AtTypography>
          <FieldRow label="Nombre" value={user?.firstName ?? ''} />
          <FieldRow label="Apellido" value={user?.lastName ?? ''} />
          <FieldRow label="Correo electrónico" value={user?.email ?? ''} />
        </View>

        <View
          className="bg-bg-card p-4 gap-1"
          style={{ borderRadius: 14, borderCurve: 'continuous', marginTop: 16 }}
        >
          <AtTypography variant="captionBold" color="#1A1F36">
            Contraseña
          </AtTypography>
          <AtTypography variant="caption" color="#4A5568">
            ************
          </AtTypography>
        </View>

        <AtTypography
          variant="caption"
          color="#A0AEC0"
          className="self-center"
          style={{ marginTop: 24 }}
          selectable
        >
          {getAppVersionLabel()}
        </AtTypography>
      </ScrollView>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="perfil"
      />
    </View>
  );
}

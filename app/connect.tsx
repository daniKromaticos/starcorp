/**
 * Conexión QuickBooks — gestión de conexiones (admin) / espera (miembros).
 *
 * Integrada al design system de la app: header con menú (drawer) +
 * breadcrumb, cards del sistema y botón gradiente. Conserva la lógica:
 * gate de admin único (ADMIN_USER_ID en starcorp_vault), polling para
 * miembros en espera y redirect de miembros con datos al dashboard.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlGradientButton } from '@/src/components/molecules';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { OrGlobalSearchModal } from '@/src/components/organisms/or-global-search-modal';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { useAuthStore } from '@/src/stores/auth.store';
import { useQbStatus } from '@/src/hooks/queries/use-companies';
import { startQuickBooksOAuth } from '@/src/services/quickbooks/oauth';
import {
  disconnectQuickBooks,
  type QBConnectedCompany,
} from '@/src/services/quickbooks/client';

export default function ConnectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const narrow = useWindowDimensions().width < 360;
  const status = useQbStatus();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  // Al drawer solo llega el super admin, pero "super admin de la app" y
  // "dueño de la conexión QB" (ADMIN_USER_ID en starcorp_vault) son cosas
  // distintas: puede haber varios super admins y un solo dueño.
  const isSuperAdmin = useAuthStore((s) => s.user?.role === 'super_admin');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // El redirect de miembros usa isAdmin: decidirlo con datos frescos, no
  // con el cache (un status viejo con isAdmin=false rebotaba la pantalla).
  const [statusChecked, setStatusChecked] = useState(false);
  const refetchStatus = status.refetch;
  useEffect(() => {
    refetchStatus().finally(() => setStatusChecked(true));
  }, [refetchStatus]);

  // Members waiting for the admin to connect: poll every 10s so the screen
  // self-advances once the admin completes OAuth on their device.
  const isWaiting =
    !!status.data && status.data.hasAdmin && !status.data.isAdmin;
  useEffect(() => {
    if (!isWaiting) return;
    const id = setInterval(() => {
      status.refetch();
    }, 10_000);
    return () => clearInterval(id);
  }, [isWaiting, status]);

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      const result = await startQuickBooksOAuth();
      if (result.type !== 'success') {
        setError('Conexión cancelada.');
        return;
      }
      const refreshed = await status.refetch();
      if (refreshed.data && refreshed.data.companies.length > 0) {
        router.replace('/');
        return;
      }
      setError('No se detectaron compañías conectadas. Intenta de nuevo.');
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('not_admin') || msg.includes('403')) {
        setError('Otro usuario ya está registrado como admin.');
        await status.refetch();
        return;
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function confirmDisconnect(company: QBConnectedCompany) {
    Alert.alert(
      'Desconectar empresa',
      `¿Seguro que querés desconectar "${company.name ?? company.realmId}"? Tu equipo dejará de ver sus datos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: () => handleDisconnect(company.realmId),
        },
      ],
    );
  }

  async function handleDisconnect(realmId?: string) {
    setDisconnecting(realmId ?? 'all');
    setError(null);
    try {
      await disconnectQuickBooks(realmId);
      await status.refetch();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDisconnecting(null);
    }
  }

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (status.isPending || !statusChecked) {
    return (
      <View className="flex-1 bg-bg-secondary items-center justify-center">
        <ActivityIndicator color="#20307E" />
      </View>
    );
  }

  const hasAdmin = status.data?.hasAdmin ?? false;
  const isAdmin = status.data?.isAdmin ?? false;
  const companies = status.data?.companies ?? [];

  // Member with data available → bounce into the dashboard: no tiene nada
  // que gestionar acá y llegó por el gate de (tabs), no a propósito.
  // El super admin NO rebota aunque no sea el dueño de la conexión: entra
  // desde el drawer queriendo ver el estado, y rebotarlo dejaba la pantalla
  // en blanco un instante y lo devolvía al dashboard sin explicación.
  if (!isAdmin && !isSuperAdmin && companies.length > 0) {
    return <Redirect href="/" />;
  }

  let title: string;
  let subtitle: string;
  let canConnect: boolean;
  let ctaLabel: string;

  if (!hasAdmin) {
    title = 'Conecta tu QuickBooks';
    subtitle =
      'Sé el primero en conectar. Como administrador, conectarás QuickBooks para que tu equipo pueda ver los datos.';
    canConnect = true;
    ctaLabel = 'Conectar QuickBooks';
  } else if (isAdmin) {
    title = 'Conexiones activas';
    subtitle =
      'Eres el administrador. Podés vincular más compañías o desconectar las que ya no necesitás.';
    canConnect = true;
    ctaLabel = 'Conectar otra empresa';
  } else if (isSuperAdmin) {
    title = 'Conexiones activas';
    subtitle =
      'Las conexiones las administra otra cuenta. Podés ver el estado de las empresas vinculadas, pero conectar o desconectar solo lo puede hacer esa cuenta.';
    canConnect = false;
    ctaLabel = 'Volver a verificar';
  } else {
    title = 'Esperando al administrador';
    subtitle =
      'Tu administrador todavía no conecta QuickBooks. Vuelve a intentarlo en unos minutos.';
    canConnect = false;
    ctaLabel = 'Volver a verificar';
  }

  return (
    <View className="flex-1 bg-bg-secondary" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-2 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Header: menú + buscador + foto de perfil */}
        <MlSearchBar
          onMenuPress={() => setDrawerVisible(true)}
          onPress={openGlobalSearch}
        />

        <View style={{ marginTop: 20 }}>
          <MlBreadcrumb
            segments={['Conexión QuickBooks']}
            onBack={handleBack}
          />
        </View>

        {/* Hero */}
        <View className="items-center" style={{ marginTop: 32 }}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={{ width: 84, height: 84, borderRadius: 16, marginBottom: 20 }}
            resizeMode="contain"
          />
          <AtTypography variant="h2" color="#20307E" style={{ textAlign: 'center' }}>
            {title}
          </AtTypography>
          <AtTypography
            variant="body"
            color="#4A5568"
            style={{ textAlign: 'center', marginTop: 10, paddingHorizontal: 8 }}
          >
            {subtitle}
          </AtTypography>
        </View>

        {/* Empresas vinculadas: las ve cualquier super admin; desconectar
            solo el dueño de la conexión (qb-disconnect responde 403 al resto). */}
        {companies.length > 0 ? (
          <View className="gap-3" style={{ marginTop: 28 }}>
            <AtTypography variant="overline" color="#8892A4">
              Empresas vinculadas
            </AtTypography>
            {companies.map((c) => (
              <View
                key={c.realmId}
                className="bg-bg-card flex-row items-center gap-3 p-4"
                style={{ borderRadius: 14, borderCurve: 'continuous' }}
              >
                {/* 320dp: icono + "Desconectar" (minWidth 100) dejaban ~90px
                    al nombre; se oculta el icono y el botón toma su ancho. */}
                {!narrow && (
                  <View
                    className="items-center justify-center"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      borderCurve: 'continuous',
                      backgroundColor: '#F6F8FA',
                      borderWidth: 1,
                      borderColor: 'rgba(0,0,0,0.08)',
                    }}
                  >
                    <AtIcon name="business" size="md" color="#1A2B6D" />
                  </View>
                )}
                <View className="flex-1">
                  <AtTypography variant="bodyBold" color="#1A1F36" numberOfLines={1}>
                    {c.name ?? `Empresa ${c.realmId.slice(-4)}`}
                  </AtTypography>
                  <AtTypography variant="caption" color="#8892A4" numberOfLines={1}>
                    realm {c.realmId}
                    {c.reauthRequired ? ' · requiere reconexión' : ''}
                  </AtTypography>
                </View>
                {isAdmin ? (
                  <Pressable
                    onPress={() => confirmDisconnect(c)}
                    disabled={disconnecting !== null}
                    accessibilityRole="button"
                    className="items-center justify-center px-3"
                    style={{
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderCurve: 'continuous',
                      borderWidth: 1,
                      borderColor: '#FCA5A5',
                      minWidth: narrow ? undefined : 100,
                      opacity: disconnecting !== null ? 0.6 : 1,
                    }}
                  >
                    {disconnecting === c.realmId ? (
                      <ActivityIndicator size="small" color="#B91C1C" />
                    ) : (
                      <AtTypography variant="captionBold" color="#B91C1C">
                        Desconectar
                      </AtTypography>
                    )}
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* CTA */}
        <View style={{ marginTop: 28 }}>
          <MlGradientButton
            label={ctaLabel}
            onPress={canConnect ? handleConnect : () => status.refetch()}
            loading={busy}
          />
          {error ? (
            <AtTypography
              variant="caption"
              color="#E53E3E"
              style={{ textAlign: 'center', marginTop: 12 }}
            >
              {error}
            </AtTypography>
          ) : null}
        </View>
      </ScrollView>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="qb"
      />
      {/* Fuera de (tabs) el modal de búsqueda global no está montado por
          el layout; se monta aquí para que el buscador funcione. */}
      <OrGlobalSearchModal />
    </View>
  );
}

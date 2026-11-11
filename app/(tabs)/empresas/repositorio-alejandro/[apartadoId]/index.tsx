/**
 * Repositorio Alejandro — documentos de un apartado.
 *
 * Buscador local por nombre + lista de archivos; "Ver documento" abre
 * una signed URL del bucket privado en el browser in-app.
 */

import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from '@/src/tw';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { AtDivider } from '@/src/components/atoms/at-divider';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlInlineSearch } from '@/src/components/molecules/ml-inline-search';
import { MlEmptyState } from '@/src/components/molecules/ml-empty-state';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { OrRepoArchivoRow } from '@/src/components/organisms/or-repo-archivo-row';
import { TmDashboard } from '@/src/components/templates/tm-dashboard';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import {
  useRepoApartado,
  useRepoArchivos,
} from '@/src/hooks/queries/use-repositorio';
import { getArchivoSignedUrl } from '@/src/services/empresas/repositorio.service';

export default function ApartadoScreen() {
  const router = useRouter();
  const { apartadoId } = useLocalSearchParams<{ apartadoId: string }>();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [search, setSearch] = useState('');

  const { data: apartado } = useRepoApartado(apartadoId);
  const { data, isLoading, isError, refetch, isRefetching } =
    useRepoArchivos(apartadoId);

  const archivos = useMemo(() => {
    const list = data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (a) =>
        a.nombre.toLowerCase().includes(term) ||
        (a.archivoOriginal ?? '').toLowerCase().includes(term),
    );
  }, [data, search]);

  const handleView = async (storagePath: string) => {
    try {
      const url = await getArchivoSignedUrl(storagePath);
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      Alert.alert(
        'No se pudo abrir el documento',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      );
    }
  };

  return (
    <TmDashboard>
      <View className="px-4 pt-2">
        <MlSearchBar
          onMenuPress={() => setDrawerVisible(true)}
          onPress={openGlobalSearch}
        />
      </View>

      <View className="px-4">
        <MlBreadcrumb
          segments={[
            'Otras compañías',
            'Repositorio Alejandro',
            apartado?.nombre ?? 'Apartado',
          ]}
          onBack={() => router.back()}
        />
      </View>

      <View className="px-4 items-end">
        <Pressable
          onPress={() =>
            router.push(
              `/(tabs)/empresas/repositorio-alejandro/${apartadoId}/editar` as never,
            )
          }
          hitSlop={8}
          accessibilityRole="button"
        >
          <AtTypography variant="captionBold" color="#1A3FE8">
            Editar apartado
          </AtTypography>
        </Pressable>
      </View>

      <View className="px-4 pt-2">
        <MlInlineSearch
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por archivo"
        />
      </View>

      {isLoading ? (
        <View className="gap-3 px-4 pt-3">
          <AtSkeleton width="100%" height={64} />
          <AtSkeleton width="100%" height={64} />
          <AtSkeleton width="100%" height={64} />
        </View>
      ) : isError ? (
        <MlEmptyState
          icon="cloud-off"
          title="No pudimos cargar los documentos"
          description="Revisa tu conexión o vuelve a intentarlo en unos segundos."
          action={{
            label: isRefetching ? 'Reintentando…' : 'Reintentar',
            onPress: () => refetch(),
          }}
        />
      ) : archivos.length === 0 ? (
        <MlEmptyState
          icon="description"
          title={search ? 'Sin resultados' : 'Sin documentos'}
          description={
            search
              ? 'Ningún archivo coincide con la búsqueda.'
              : 'Sube el primer archivo a este apartado.'
          }
        />
      ) : (
        <View className="px-4 pt-3">
          <View
            className="bg-bg-card rounded-xl px-4 py-1"
            style={{
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: 'rgba(0, 0, 0, 0.08)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
            }}
          >
            {archivos.map((archivo, index) => (
              <View key={archivo.id}>
                {index > 0 && <AtDivider />}
                <OrRepoArchivoRow
                  archivo={archivo}
                  onView={() => handleView(archivo.storagePath)}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="empresas"
      />
    </TmDashboard>
  );
}

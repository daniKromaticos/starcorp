/**
 * VAG — Activos.
 *
 * Buscador + tarjetas expandibles por activo (detalle de valores, ficha
 * catastral y movimientos consolidados). Las filas de movimientos navegan
 * a la vista Movimientos con foco en el movimiento. Cada activo puede
 * tener UN documento adjunto (escritura/ficha): se sube desde la card y
 * "Ver documento" lo abre con una signed URL; re-subir reemplaza.
 */

import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, View } from '@/src/tw';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlEmptyState } from '@/src/components/molecules/ml-empty-state';
import { MlInlineSearch } from '@/src/components/molecules/ml-inline-search';
import { MlSimpleTotalFooter } from '@/src/components/molecules/ml-simple-total-footer';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { OrVagActivoCard } from '@/src/components/organisms/or-vag-activo-card';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import {
  useUploadVagActivoDoc,
  useVagActivoDocs,
  useVagActivos,
} from '@/src/hooks/queries/use-vag';
import { getVagDocSignedUrl } from '@/src/services/empresas/vag-docs.service';
import { formatNumber } from '@/src/utils/number';
import type { VagActivo, VagActivoDoc } from '@/src/types/vag.types';

export default function VagActivosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const { data: activos, isLoading } = useVagActivos();
  const { data: docs } = useVagActivoDocs();
  const uploadDoc = useUploadVagActivoDoc();
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = activos ?? [];
    const q = searchText.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [activos, searchText]);

  // Total consolidador = valor contable de los activos visibles.
  const total = useMemo(
    () => filtered.reduce((s, a) => s + a.valorContable, 0),
    [filtered],
  );

  const goToMovimiento = (movimientoId: string) =>
    router.push({
      pathname: '/(tabs)/empresas/vag/movimientos',
      params: { focus: movimientoId },
    } as never);

  const handleVerDocumento = async (doc: VagActivoDoc) => {
    try {
      const url = await getVagDocSignedUrl(doc.storagePath);
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      Alert.alert('No se pudo abrir el documento', (error as Error).message);
    }
  };

  const handleSubirDocumento = async (activo: VagActivo) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingId(activo.id);
    uploadDoc.mutate(
      {
        activoId: activo.id,
        activoNombre: activo.nombre,
        fileUri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType ?? null,
        sizeBytes: asset.size ?? null,
        webFile: asset.file,
        previousStoragePath: docs?.[activo.id]?.storagePath ?? null,
      },
      {
        onSettled: () => setUploadingId(null),
        onError: (error) =>
          Alert.alert('No se pudo subir el documento', error.message),
      },
    );
  };

  return (
    <View className="flex-1 bg-bg-secondary" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 pb-6"
      >
        <View className="px-4 pt-2">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>

        <View className="px-4">
          <MlBreadcrumb
            segments={['Otras compañías', 'Grupo Orion Holding', 'Activos']}
            onBack={() => router.back()}
          />
        </View>

        <View className="px-4">
          <MlInlineSearch
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar por activo"
          />
        </View>

        {isLoading ? (
          <View className="gap-3 px-4">
            <AtSkeleton width="100%" height={64} />
            <AtSkeleton width="100%" height={64} />
            <AtSkeleton width="100%" height={64} />
          </View>
        ) : filtered.length === 0 ? (
          <MlEmptyState
            icon="home-work"
            title="Sin activos"
            description="No se encontraron activos para mostrar."
          />
        ) : (
          <View className="gap-3 px-4">
            {filtered.map((activo) => (
              <OrVagActivoCard
                key={activo.id}
                activo={activo}
                doc={docs?.[activo.id] ?? null}
                uploading={uploadingId === activo.id}
                onMovimientoPress={goToMovimiento}
                onVerDocumento={handleVerDocumento}
                onSubirDocumento={handleSubirDocumento}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer navy fijo */}
      <View className="px-4 pt-2 bg-bg-secondary" style={{ paddingBottom: 8 }}>
        <MlSimpleTotalFooter
          label="Total consolidador"
          value={`$ ${formatNumber(total, 2)}`}
        />
      </View>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="empresas"
      />
    </View>
  );
}

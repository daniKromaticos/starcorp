/**
 * Repositorio Alejandro — editar apartado.
 *
 * Renombrar el apartado, renombrar/eliminar archivos (con modal de
 * confirmación) y eliminar el apartado completo (borra también sus
 * archivos de Storage). Los renombres quedan pendientes hasta
 * "Guardar cambios"; las eliminaciones son inmediatas tras confirmar.
 */

import React, { useEffect, useState } from 'react';
import { Alert, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { View } from '@/src/tw';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { AtDivider } from '@/src/components/atoms/at-divider';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlLabeledInput } from '@/src/components/molecules/ml-labeled-input';
import { MlActionButton } from '@/src/components/molecules/ml-action-button';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { OrConfirmModal } from '@/src/components/organisms/or-confirm-modal';
import { OrRepoArchivoRow } from '@/src/components/organisms/or-repo-archivo-row';
import { TmDashboard } from '@/src/components/templates/tm-dashboard';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import {
  useDeleteApartado,
  useDeleteArchivo,
  useRepoApartado,
  useRepoArchivos,
  useUpdateApartado,
  useUpdateArchivo,
} from '@/src/hooks/queries/use-repositorio';
import { getArchivoSignedUrl } from '@/src/services/empresas/repositorio.service';
import type { RepoArchivo } from '@/src/types/repositorio.types';

export default function EditarApartadoScreen() {
  const router = useRouter();
  const { apartadoId } = useLocalSearchParams<{ apartadoId: string }>();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const narrow = useWindowDimensions().width < 360;

  const { data: apartado, isLoading: loadingApartado } =
    useRepoApartado(apartadoId);
  const { data: archivos, isLoading: loadingArchivos } =
    useRepoArchivos(apartadoId);

  const [nombre, setNombre] = useState('');
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [archivoToDelete, setArchivoToDelete] = useState<RepoArchivo | null>(
    null,
  );
  const [confirmApartado, setConfirmApartado] = useState(false);

  useEffect(() => {
    if (apartado) setNombre(apartado.nombre);
  }, [apartado]);

  const updateApartado = useUpdateApartado();
  const updateArchivo = useUpdateArchivo();
  const deleteArchivo = useDeleteArchivo();
  const deleteApartado = useDeleteApartado();

  const isLoading = loadingApartado || loadingArchivos;
  const saving = updateApartado.isPending || updateArchivo.isPending;

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

  const handleSave = async () => {
    if (!apartadoId || !apartado) return;
    try {
      const jobs: Promise<unknown>[] = [];
      if (nombre.trim() && nombre.trim() !== apartado.nombre) {
        jobs.push(
          updateApartado.mutateAsync({ id: apartadoId, nombre }),
        );
      }
      for (const [id, nuevoNombre] of Object.entries(renames)) {
        jobs.push(
          updateArchivo.mutateAsync({ id, nombre: nuevoNombre, apartadoId }),
        );
      }
      await Promise.all(jobs);
      router.back();
    } catch (error) {
      Alert.alert(
        'No se pudieron guardar los cambios',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      );
    }
  };

  const handleDeleteArchivo = () => {
    if (!archivoToDelete || !apartadoId) return;
    deleteArchivo.mutate(
      {
        id: archivoToDelete.id,
        storagePath: archivoToDelete.storagePath,
        apartadoId,
      },
      {
        onSuccess: () => setArchivoToDelete(null),
        onError: (error) => {
          setArchivoToDelete(null);
          Alert.alert('No se pudo eliminar el archivo', error.message);
        },
      },
    );
  };

  const handleDeleteApartado = () => {
    if (!apartadoId) return;
    deleteApartado.mutate(apartadoId, {
      onSuccess: () => {
        setConfirmApartado(false);
        router.dismissTo('/(tabs)/empresas/repositorio-alejandro' as never);
      },
      onError: (error) => {
        setConfirmApartado(false);
        Alert.alert('No se pudo eliminar el apartado', error.message);
      },
    });
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
          segments={['Otras compañías', 'Repositorio Alejandro', 'Editar apartado']}
          onBack={() => router.back()}
        />
      </View>

      {isLoading ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={180} />
          <AtSkeleton width="100%" height={52} />
        </View>
      ) : (
        <View className="px-4 gap-4">
          <View
            className="bg-bg-card rounded-xl p-4 gap-3"
            style={{
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: 'rgba(0, 0, 0, 0.08)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
            }}
          >
            <AtTypography variant="h3" color="#1A1F36">
              Editar apartado
            </AtTypography>

            <MlLabeledInput
              label="Nombre del apartado"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre del apartado"
              required
            />

            <AtTypography variant="captionBold" color="#1A1F36" className="mt-1">
              Archivos subidos
            </AtTypography>

            {(archivos ?? []).length === 0 ? (
              <AtTypography variant="caption" color="#8892A4">
                Este apartado no tiene archivos.
              </AtTypography>
            ) : (
              <View>
                {(archivos ?? []).map((archivo, index) => (
                  <View key={archivo.id}>
                    {index > 0 && <AtDivider />}
                    <OrRepoArchivoRow
                      archivo={archivo}
                      viewLabel="Ver"
                      nombreOverride={renames[archivo.id]}
                      onView={() => handleView(archivo.storagePath)}
                      onDelete={() => setArchivoToDelete(archivo)}
                      onNameChange={(nuevoNombre) =>
                        setRenames((prev) => ({ ...prev, [archivo.id]: nuevoNombre }))
                      }
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 320dp: a media columna (~106px) los labels se parten; se apilan */}
          <View className={narrow ? 'gap-3' : 'flex-row gap-3'}>
            <MlActionButton
              label="Eliminar apartado"
              variant="outline"
              onPress={() => setConfirmApartado(true)}
              className={narrow ? undefined : 'flex-1'}
            />
            <MlActionButton
              label="Guardar cambios"
              onPress={handleSave}
              disabled={!nombre.trim()}
              loading={saving}
              className={narrow ? undefined : 'flex-1'}
            />
          </View>
        </View>
      )}

      <OrConfirmModal
        visible={confirmApartado}
        title="Eliminar apartado"
        message={`Está a punto de eliminar el apartado "${apartado?.nombre ?? ''}". Se borrarán todos los archivos que contenga.`}
        loading={deleteApartado.isPending}
        onCancel={() => setConfirmApartado(false)}
        onConfirm={handleDeleteApartado}
      />

      <OrConfirmModal
        visible={!!archivoToDelete}
        title="Eliminar archivo"
        message={`Está a punto de eliminar el archivo "${archivoToDelete?.nombre ?? ''}"`}
        loading={deleteArchivo.isPending}
        onCancel={() => setArchivoToDelete(null)}
        onConfirm={handleDeleteArchivo}
      />

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="empresas"
      />
    </TmDashboard>
  );
}

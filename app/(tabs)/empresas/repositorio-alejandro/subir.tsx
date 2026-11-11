/**
 * Repositorio Alejandro — subir archivo.
 *
 * Form: nombre visible + apartado destino + picker de documento. El
 * binario sube al bucket privado `repositorio` y la fila queda en
 * `repo_archivos`. Acepta ?apartadoId= para preseleccionar el apartado.
 */

import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlLabeledInput } from '@/src/components/molecules/ml-labeled-input';
import { MlSelectField } from '@/src/components/molecules/ml-select-field';
import { MlActionButton } from '@/src/components/molecules/ml-action-button';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { TmDashboard } from '@/src/components/templates/tm-dashboard';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import {
  useRepoApartados,
  useUploadArchivo,
} from '@/src/hooks/queries/use-repositorio';

const BLUE = '#1A3FE8';

function badgeFromName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const ext = dot > 0 ? fileName.slice(dot + 1) : 'DOC';
  return `${ext.toUpperCase().slice(0, 4)}.`;
}

export default function SubirArchivoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ apartadoId?: string }>();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [nombre, setNombre] = useState('');
  const [apartadoId, setApartadoId] = useState<string | null>(
    params.apartadoId ?? null,
  );
  const [asset, setAsset] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const { data: apartados } = useRepoApartados();
  const upload = useUploadArchivo();

  const handlePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const picked = result.assets[0];
    setAsset(picked);
    if (!nombre.trim()) {
      // Prellenar el nombre visible con el filename sin extensión.
      const dot = picked.name.lastIndexOf('.');
      setNombre(dot > 0 ? picked.name.slice(0, dot) : picked.name);
    }
  };

  const canSave = !!nombre.trim() && !!apartadoId && !!asset;

  const handleSave = () => {
    if (!canSave || !asset || !apartadoId) return;
    upload.mutate(
      {
        apartadoId,
        nombre,
        fileUri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType ?? null,
        sizeBytes: asset.size ?? null,
        webFile: asset.file,
      },
      {
        onSuccess: () => router.back(),
        onError: (error) =>
          Alert.alert('No se pudo subir el archivo', error.message),
      },
    );
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
          segments={['Otras compañías', 'Repositorio Alejandro', 'Subir archivo']}
          onBack={() => router.back()}
        />
      </View>

      <View className="px-4 gap-4">
        <View
          className="bg-bg-card rounded-xl p-4 gap-4"
          style={{
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.08)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          }}
        >
          <AtTypography variant="h3" color="#1A1F36">
            Subir archivo
          </AtTypography>

          <MlLabeledInput
            label="Nombre del archivo"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre del archivo"
            required
          />

          <MlSelectField
            label="Elige el apartado donde estará el archivo"
            options={(apartados ?? []).map((a) => ({ id: a.id, label: a.nombre }))}
            value={apartadoId}
            onChange={setApartadoId}
            required
          />

          <View className="gap-2">
            <AtTypography variant="captionBold" color="#1A1F36">
              Archivo
              <AtTypography variant="captionBold" color="#E53E3E"> *</AtTypography>
            </AtTypography>

            <View
              className="flex-row items-center justify-between gap-2 px-4"
              style={{
                borderRadius: 10,
                borderCurve: 'continuous',
                paddingVertical: 12,
                backgroundColor: '#F5F7FA',
              }}
            >
              {/* 320dp: "Archivo seleccionado" + "Subir archivo" no caben; el
                  texto izquierdo cede ancho con elipsis. */}
              <AtTypography
                variant="body"
                color="#4A5568"
                numberOfLines={1}
                style={{ fontSize: 14, flexShrink: 1 }}
              >
                {asset ? 'Archivo seleccionado' : 'Suba el archivo'}
              </AtTypography>
              <Pressable
                onPress={handlePick}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Subir archivo"
                className="flex-row items-center gap-1.5"
              >
                <AtTypography variant="captionBold" color={BLUE}>
                  Subir archivo
                </AtTypography>
                <AtIcon name="file-upload" size="md" color={BLUE} />
              </Pressable>
            </View>

            {asset && (
              <View className="flex-row items-center gap-3 py-2">
                <Pressable
                  onPress={() => setAsset(null)}
                  hitSlop={8}
                  accessibilityLabel="Quitar archivo"
                >
                  <AtIcon name="delete-outline" size="md" color={BLUE} />
                </Pressable>
                <View
                  className="items-center justify-center bg-bg-card"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.08)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <AtTypography variant="label" color="#1A1F36">
                    {badgeFromName(asset.name)}
                  </AtTypography>
                </View>
                <View className="flex-1 gap-0.5">
                  <AtTypography variant="captionBold" color="#1A1F36" numberOfLines={1}>
                    {nombre.trim() || asset.name}
                  </AtTypography>
                  <AtTypography variant="caption" color="#8892A4" numberOfLines={1}>
                    {asset.name}
                  </AtTypography>
                </View>
              </View>
            )}
          </View>
        </View>

        <MlActionButton
          label="Guardar"
          onPress={handleSave}
          disabled={!canSave}
          loading={upload.isPending}
        />
      </View>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="empresas"
      />
    </TmDashboard>
  );
}

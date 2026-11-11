/**
 * Repositorio Alejandro — crear apartado.
 */

import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { View } from '@/src/tw';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlLabeledInput } from '@/src/components/molecules/ml-labeled-input';
import { MlActionButton } from '@/src/components/molecules/ml-action-button';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { TmDashboard } from '@/src/components/templates/tm-dashboard';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { useCreateApartado } from '@/src/hooks/queries/use-repositorio';

export default function CrearApartadoScreen() {
  const router = useRouter();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [nombre, setNombre] = useState('');

  const createApartado = useCreateApartado();

  const handleSave = () => {
    createApartado.mutate(nombre, {
      onSuccess: () => router.back(),
      onError: (error) =>
        Alert.alert('No se pudo crear el apartado', error.message),
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
          segments={['Otras compañías', 'Repositorio Alejandro', 'Crear apartado']}
          onBack={() => router.back()}
        />
      </View>

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
            Crear apartado
          </AtTypography>
          <MlLabeledInput
            label="Nombre del apartado"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre del apartado"
            required
          />
        </View>

        <MlActionButton
          label="Guardar"
          onPress={handleSave}
          disabled={!nombre.trim()}
          loading={createApartado.isPending}
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

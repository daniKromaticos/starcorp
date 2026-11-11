/**
 * Histórico de pólizas de Vehículos.
 *
 * Mismo patrón que el histórico de Compañías: carousel de LLCs arriba y
 * sólo las pólizas con Estado inactivo en Notion (con su Motivo
 * Inactividad), que no aparecen en el informe ni en los chips.
 *
 * El carousel lista únicamente las LLCs que tienen alguna inactiva —
 * una pill que abre un listado vacío no aporta nada — y se oculta
 * cuando hay una sola.
 */

import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { RefreshControl } from 'react-native';
import { ScrollView, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlCompanyCard } from '@/src/components/molecules/ml-company-card';
import { MlVehiculoDetailCard } from '@/src/components/molecules/ml-vehiculo-detail-card';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { usePullToRefresh } from '@/src/hooks/use-pull-to-refresh';
import { useSeguros } from '@/src/hooks/queries/use-seguros';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { isInactiva, llcsDeVehiculos } from '@/src/types/seguros.types';

export default function SegurosVehiculosHistoricoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, refetch } = useSeguros();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeLlcId, setActiveLlcId] = useState<string | null>(null);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const inactivas = useMemo(
    () => (data?.vehiculos ?? []).filter(isInactiva),
    [data],
  );

  const llcs = useMemo(() => llcsDeVehiculos(inactivas), [inactivas]);

  // Por defecto la primera LLC queda activa.
  const effectiveLlcId = activeLlcId ?? llcs[0]?.id ?? null;

  const polizas = useMemo(
    () =>
      inactivas.filter(
        (p) => !effectiveLlcId || p.empresaId === effectiveLlcId,
      ),
    [inactivas, effectiveLlcId],
  );

  return (
    <View
      className="flex-1 bg-bg-secondary"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ rowGap: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 pt-2">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>

        <View className="px-4">
          <MlBreadcrumb
            segments={['Informes', 'Seguros', 'Vehículos', 'Histórico']}
            onBack={() => router.back()}
          />
        </View>

        {llcs.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 px-4"
          >
            {llcs.map((llc) => (
              <MlCompanyCard
                key={llc.id}
                name={llc.name}
                variant="tile"
                selected={llc.id === effectiveLlcId}
                onPress={() => setActiveLlcId(llc.id)}
              />
            ))}
          </ScrollView>
        )}

        <View className="gap-3 px-4">
          {polizas.length === 0 && (
            <AtTypography variant="caption" color="#8892A4">
              Sin pólizas de vehículos inactivas.
            </AtTypography>
          )}
          {polizas.map((p) => (
            <MlVehiculoDetailCard
              key={p.id}
              poliza={p}
              todayIso={data?.todayIso ?? ''}
            />
          ))}
        </View>
      </ScrollView>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="informes"
      />
    </View>
  );
}

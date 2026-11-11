/**
 * Histórico de pólizas de Compañías.
 *
 * Carousel con todas las empresas; tap en una pill filtra el listado
 * a esa empresa. Cards muestran el campo Empresa.
 */

import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { RefreshControl } from 'react-native';
import { ScrollView, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlCompanyCard } from '@/src/components/molecules/ml-company-card';
import { MlPolizaDetailCard } from '@/src/components/molecules/ml-poliza-detail-card';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { usePullToRefresh } from '@/src/hooks/use-pull-to-refresh';
import { useSeguros } from '@/src/hooks/queries/use-seguros';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { isInactiva } from '@/src/types/seguros.types';

export default function SegurosHistoricoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, refetch } = useSeguros();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeEmpresaId, setActiveEmpresaId] = useState<string | null>(null);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  // Por defecto la primera empresa queda activa.
  const effectiveActiveId = activeEmpresaId ?? data?.empresas[0]?.id ?? null;

  // El histórico muestra las pólizas con Estado=INACTIVA en Notion
  // (con su Motivo Inactividad), que no aparecen en el informe.
  const polizas = useMemo(() => {
    if (!data) return [];
    const all = data.empresas.flatMap((e) => e.polizas);
    return all.filter(
      (p) =>
        (!effectiveActiveId || p.empresaId === effectiveActiveId) &&
        isInactiva(p),
    );
  }, [data, effectiveActiveId]);

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
            segments={['Informes', 'Seguros', 'Compañías', 'Histórico']}
            onBack={() => router.back()}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-4"
        >
          {data?.empresas.map((empresa) => {
            const active = empresa.id === effectiveActiveId;
            return (
              <MlCompanyCard
                key={empresa.id}
                name={empresa.name}
                variant="tile"
                selected={active}
                onPress={() => setActiveEmpresaId(empresa.id)}
              />
            );
          })}
        </ScrollView>

        <View className="gap-3 px-4">
          {polizas.length === 0 && (
            <AtTypography variant="caption" color="#8892A4">
              Sin pólizas inactivas.
            </AtTypography>
          )}
          {polizas.map((p) => (
            <MlPolizaDetailCard
              key={p.id}
              poliza={p}
              todayIso={data?.todayIso ?? ''}
              showEmpresa
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

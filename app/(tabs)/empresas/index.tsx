/**
 * Otras compañías — lista de compañías.
 *
 * Cada compañía con métrica (BBM, VAG) navega a su detalle Ingresos/Gastos.
 * "Repositorio Alejandro" (sin métrica) navega al repositorio documental.
 */

import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from '@/src/tw';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlEmptyState } from '@/src/components/molecules/ml-empty-state';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { OrEmpresaCard } from '@/src/components/organisms/or-empresa-card';
import { TmDashboard } from '@/src/components/templates/tm-dashboard';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { useAuthStore } from '@/src/stores/auth.store';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { useEmpresas } from '@/src/hooks/queries/use-empresas';
import { hasPermission } from '@/src/types/auth.types';

// Ítems de la lista con permiso fino propio; el resto de compañías
// queda cubierto por el permiso base empresas.ver (gate de la sección).
const EMPRESA_PERMISSION: Record<string, string> = {
  bbm: 'empresas.bbm',
  vag: 'empresas.vag',
  'repositorio-alejandro': 'empresas.repositorio',
};

export default function EmpresasScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, refetch, isRefetching } = useEmpresas();
  const empresas = (data ?? []).filter((e) => {
    const permission = EMPRESA_PERMISSION[e.id];
    return permission ? hasPermission(user, permission) : true;
  });

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
          segments={['Otras compañías']}
          onBack={() => router.back()}
        />
      </View>

      {isLoading ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={84} />
          <AtSkeleton width="100%" height={84} />
          <AtSkeleton width="100%" height={56} />
        </View>
      ) : isError ? (
        <MlEmptyState
          icon="cloud-off"
          title="No pudimos cargar las compañías"
          description="Revisa tu conexión o vuelve a intentarlo en unos segundos."
          action={{
            label: isRefetching ? 'Reintentando…' : 'Reintentar',
            onPress: () => refetch(),
          }}
        />
      ) : empresas.length === 0 ? (
        <MlEmptyState
          icon="business"
          title="Sin compañías registradas"
          description="Aún no hay otras compañías para mostrar."
        />
      ) : (
        <View className="gap-3 px-4">
          {empresas.map((empresa) => (
            <OrEmpresaCard
              key={empresa.id}
              name={empresa.name}
              ingresos={empresa.ingresos}
              deltaPercent={empresa.deltaPercent}
              metricLabel={empresa.metricLabel}
              onPress={
                empresa.hasDetail
                  ? () =>
                      router.push(`/(tabs)/empresas/${empresa.id}` as never)
                  : undefined
              }
            />
          ))}
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

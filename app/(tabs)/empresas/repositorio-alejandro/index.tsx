/**
 * Repositorio Alejandro — pantalla principal.
 *
 * Lista de apartados (cards navy "Ver documentos →") con acciones para
 * crear apartado y subir archivo. Ruta estática: gana sobre
 * `empresas/[empresaId]`, así /empresas/repositorio-alejandro entra aquí.
 */

import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { View } from '@/src/tw';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlEmptyState } from '@/src/components/molecules/ml-empty-state';
import { MlActionButton } from '@/src/components/molecules/ml-action-button';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { OrRepoApartadoCard } from '@/src/components/organisms/or-repo-apartado-card';
import { TmDashboard } from '@/src/components/templates/tm-dashboard';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { useRepoApartados } from '@/src/hooks/queries/use-repositorio';

export default function RepositorioScreen() {
  const router = useRouter();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const narrow = useWindowDimensions().width < 360;

  const { data, isLoading, isError, refetch, isRefetching } = useRepoApartados();
  const apartados = data ?? [];

  const go = (path: string) =>
    router.push(`/(tabs)/empresas/repositorio-alejandro/${path}` as never);

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
          segments={['Otras compañías', 'Repositorio Alejandro']}
          onBack={() => router.back()}
        />
      </View>

      {/* 320dp: a media columna (~106px) los labels se parten; se apilan */}
      <View className={narrow ? 'gap-3 px-4 pb-1' : 'flex-row gap-3 px-4 pb-1'}>
        <MlActionButton
          label="Crear nuevo apartado"
          variant="outline"
          onPress={() => go('crear')}
          className={narrow ? undefined : 'flex-1'}
        />
        <MlActionButton
          label="Subir archivo"
          onPress={() => go('subir')}
          className={narrow ? undefined : 'flex-1'}
        />
      </View>

      {isLoading ? (
        <View className="gap-3 px-4 pt-2">
          <AtSkeleton width="100%" height={56} />
          <AtSkeleton width="100%" height={56} />
          <AtSkeleton width="100%" height={56} />
        </View>
      ) : isError ? (
        <MlEmptyState
          icon="cloud-off"
          title="No pudimos cargar el repositorio"
          description="Revisa tu conexión o vuelve a intentarlo en unos segundos."
          action={{
            label: isRefetching ? 'Reintentando…' : 'Reintentar',
            onPress: () => refetch(),
          }}
        />
      ) : apartados.length === 0 ? (
        <MlEmptyState
          icon="folder-open"
          title="Sin apartados"
          description="Crea el primer apartado para organizar los documentos."
        />
      ) : (
        <View className="gap-3 px-4 pt-2">
          {apartados.map((apartado) => (
            <OrRepoApartadoCard
              key={apartado.id}
              nombre={apartado.nombre}
              onPress={() => go(apartado.id)}
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

/**
 * Reportes / Detalle de tarea (NexiaTask).
 *
 * Composición:
 *  1. SearchBar + Drawer trigger
 *  2. Breadcrumb "< Reportes / Departamento X"
 *  3. Header "Seguimiento de tareas" + link "Ver todas"
 *  4. OrTaskDetailCard
 *  5. OrTaskAvancesList
 */

import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from '@/src/tw';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { OrTaskDetailCard } from '@/src/components/organisms/or-task-detail-card';
import { OrTaskAvancesList } from '@/src/components/organisms/or-task-avances-list';
import { TmDashboard } from '@/src/components/templates/tm-dashboard';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { MlEmptyState } from '@/src/components/molecules/ml-empty-state';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { useNexiataskTarea } from '@/src/hooks/queries/use-nexiatask-tarea';

export default function ReporteTareaScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  const { data: tarea, isLoading, isError, refetch, isRefetching } =
    useNexiataskTarea(taskId);

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
          segments={['Reportes', tarea?.departamentoNombre ?? 'Cargando…']}
          onBack={() => router.back()}
        />
      </View>

      {/* flex-1: a 320dp el h2 empujaba "Ver todas" fuera de pantalla */}
      <View className="flex-row items-center justify-between gap-2 px-4">
        <AtTypography variant="h2" style={{ flex: 1 }}>
          Seguimiento de tareas
        </AtTypography>
        <Pressable onPress={() => router.push('/(tabs)/reportes' as never)}>
          <AtTypography variant="bodyBold" color="#5B82E6">
            Ver todas
          </AtTypography>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="px-4 gap-3">
          <AtSkeleton width="100%" height={280} />
          <AtSkeleton width="100%" height={160} />
        </View>
      ) : isError ? (
        <MlEmptyState
          icon="cloud-off"
          title="No pudimos cargar la tarea"
          description="Revisa tu conexión o vuelve a intentarlo en unos segundos."
          action={{
            label: isRefetching ? 'Reintentando…' : 'Reintentar',
            onPress: () => refetch(),
          }}
        />
      ) : !tarea ? (
        <MlEmptyState
          icon="search-off"
          title="Tarea no encontrada"
          description="No encontramos esta tarea en el seguimiento de la semana."
          action={{ label: 'Ver todas', onPress: () => router.back() }}
        />
      ) : (
        <>
          <OrTaskDetailCard tarea={tarea} />
          <OrTaskAvancesList avances={tarea.avances} />
        </>
      )}

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="reportes"
      />
    </TmDashboard>
  );
}

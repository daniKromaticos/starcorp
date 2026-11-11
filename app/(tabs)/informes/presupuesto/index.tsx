/**
 * Informe Presupuesto — pantalla principal.
 *
 * Search global + breadcrumb + dos toggles (Ingresos/Gastos · Mes
 * corriente/pasado) + card "Ejecución" (gauge) + lista de empresas
 * desplegables (centros de costos) + card "Total" fija al pie.
 *
 * Datos: tabla PROYECCION de Power BI (hoy mock vía usePresupuesto).
 */

import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlSegmentedToggle } from '@/src/components/molecules/ml-segmented-toggle';
import { MlEmptyState } from '@/src/components/molecules/ml-empty-state';
import { OrPresupuestoGaugeCard } from '@/src/components/organisms/or-presupuesto-gauge-card';
import { OrPresupuestoList } from '@/src/components/organisms/or-presupuesto-list';
import { OrPresupuestoTotalCard } from '@/src/components/organisms/or-presupuesto-total-card';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { usePresupuesto } from '@/src/hooks/queries/use-presupuesto';
import type {
  PresupuestoTipo,
  PresupuestoPeriodo,
} from '@/src/types/presupuesto.types';

const TIPO_OPTIONS = [
  { value: 'ingreso', label: 'Ingresos' },
  { value: 'gasto', label: 'Gastos' },
];

const PERIODO_OPTIONS = [
  { value: 'corriente', label: 'Mes corriente' },
  { value: 'pasado', label: 'Mes pasado' },
];

export default function PresupuestoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [tipo, setTipo] = useState<PresupuestoTipo>('ingreso');
  const [periodo, setPeriodo] = useState<PresupuestoPeriodo>('corriente');

  const query = useMemo(() => ({ tipo, periodo }), [tipo, periodo]);
  const { data, isPending } = usePresupuesto(query);

  const empresas = data?.empresas ?? [];

  return (
    <View className="flex-1 bg-bg-secondary" style={{ paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 pt-2">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>

        <View className="px-4">
          <MlBreadcrumb
            segments={['Informes', 'Presupuesto']}
            onBack={() => router.back()}
          />
        </View>

        <View className="px-4 gap-3">
          <MlSegmentedToggle
            options={TIPO_OPTIONS}
            value={tipo}
            onChange={(v) => setTipo(v as PresupuestoTipo)}
            gradient="brandOrange"
          />
          <MlSegmentedToggle
            options={PERIODO_OPTIONS}
            value={periodo}
            onChange={(v) => setPeriodo(v as PresupuestoPeriodo)}
            gradient="buttonBlue"
          />
        </View>

        {isPending && !data ? (
          <View className="px-4 gap-3">
            <AtSkeleton width="100%" height={220} borderRadius={14} />
            <AtSkeleton width="100%" height={72} borderRadius={12} />
            <AtSkeleton width="100%" height={72} borderRadius={12} />
          </View>
        ) : !data || empresas.length === 0 ? (
          <MlEmptyState
            icon="calculate"
            title="Sin datos de presupuesto"
            description="No hay proyección cargada para este tipo y período."
          />
        ) : (
          <>
            <View className="px-4">
              <OrPresupuestoGaugeCard
                ejecucion={data.ejecucion}
                periodoLabel={data.periodoLabel}
              />
            </View>
            <OrPresupuestoList empresas={empresas} />
          </>
        )}
      </ScrollView>

      {data && empresas.length > 0 && (
        <View
          className="px-4 pt-1 bg-bg-secondary"
          style={{
            // Holgura acotada (8–12px) para pegar la card al fondo de forma
            // consistente, igual que las otras pantallas de informes.
            paddingBottom: Math.min(Math.max(insets.bottom, 8), 12),
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <OrPresupuestoTotalCard
            proyectado={data.totalProyectado}
            ejecutado={data.totalEjecutado}
          />
        </View>
      )}

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="informes"
      />
    </View>
  );
}

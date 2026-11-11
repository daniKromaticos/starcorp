/**
 * VAG — hub de la compañía.
 *
 * A diferencia de BBM (detalle Ingresos/Gastos), VAG tiene 4 vistas:
 * Activos y Movimientos (cards navy anchas) y Cuentas por cobrar/por pagar
 * (tiles navy con "Ver cuentas"). Esta ruta estática gana sobre
 * `[empresaId]`, así que /empresas/vag entra aquí.
 */

import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from '@/src/tw';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { OrVagNavCard, OrVagNavTile } from '@/src/components/organisms/or-vag-nav-card';
import { TmDashboard } from '@/src/components/templates/tm-dashboard';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { useVagResumen } from '@/src/hooks/queries/use-vag';

export default function VagHubScreen() {
  const router = useRouter();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { data: resumen, isLoading } = useVagResumen();

  const go = (path: string) =>
    router.push(`/(tabs)/empresas/vag/${path}` as never);

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
          segments={['Otras compañías', 'Grupo Orion Holding']}
          onBack={() => router.back()}
        />
      </View>

      {isLoading || !resumen ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={84} />
          <AtSkeleton width="100%" height={84} />
          <AtSkeleton width="100%" height={180} />
        </View>
      ) : (
        <View className="px-4 gap-3">
          <OrVagNavCard
            icon="equalizer"
            iconColor="#2BC8C4"
            title="Activos"
            total={resumen.activos.total}
            deltaPct={resumen.activos.deltaPct}
            onPress={() => go('activos')}
          />
          <OrVagNavCard
            icon="show-chart"
            iconColor="#5CF094"
            title="Movimientos"
            total={resumen.movimientos.total}
            deltaPct={resumen.movimientos.deltaPct}
            ultimaFecha={resumen.movimientos.ultimaFecha}
            onPress={() => go('movimientos')}
          />
          <View className="flex-row gap-3">
            <OrVagNavTile
              icon="credit-card"
              title="Cuentas por cobrar"
              total={resumen.cuentasCobrar.total}
              deltaPct={resumen.cuentasCobrar.deltaPct}
              ultimaFecha={resumen.cuentasCobrar.ultimaFecha}
              onPress={() => go('cobrar')}
            />
            <OrVagNavTile
              icon="payments"
              title="Cuentas por pagar"
              total={resumen.cuentasPagar.total}
              deltaPct={resumen.cuentasPagar.deltaPct}
              ultimaFecha={resumen.cuentasPagar.ultimaFecha}
              onPress={() => go('pagar')}
            />
          </View>
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

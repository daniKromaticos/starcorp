/**
 * Template: TmVagCuentas
 *
 * Vista compartida de Cuentas por cobrar / por pagar de VAG: buscador,
 * encabezado de columnas (Cuenta | Saldo), filas expandibles y el footer
 * navy "Total consolidador" fijo abajo. Cada movimiento dentro de una
 * cuenta navega a Movimientos con foco.
 */

import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View } from '@/src/tw';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlEmptyState } from '@/src/components/molecules/ml-empty-state';
import { MlInlineSearch } from '@/src/components/molecules/ml-inline-search';
import { MlSimpleTotalFooter } from '@/src/components/molecules/ml-simple-total-footer';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { OrVagCuentaRow } from '@/src/components/organisms/or-vag-cuenta-row';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { useVagCuentas } from '@/src/hooks/queries/use-vag';
import { formatNumber } from '@/src/utils/number';
import type { VagCuentaTipo } from '@/src/types/vag.types';

interface TmVagCuentasProps {
  tipo: VagCuentaTipo;
}

export function TmVagCuentas({ tipo }: TmVagCuentasProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const { data: cuentas, isLoading } = useVagCuentas(tipo);

  const filtered = useMemo(() => {
    const list = cuentas ?? [];
    const q = searchText.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.cuenta.toLowerCase().includes(q),
    );
  }, [cuentas, searchText]);

  // Total consolidador = suma de saldos de las cuentas visibles.
  const total = useMemo(
    () => filtered.reduce((s, c) => s + c.saldo, 0),
    [filtered],
  );

  const crumb = tipo === 'cobrar' ? 'Ctas. por cobrar' : 'Ctas. por pagar';
  const columnLabel = tipo === 'cobrar' ? 'Cuenta por cobrar' : 'Cuenta por pagar';

  const goToMovimiento = (movimientoId: string) =>
    router.push({
      pathname: '/(tabs)/empresas/vag/movimientos',
      params: { focus: movimientoId },
    } as never);

  return (
    <View className="flex-1 bg-bg-secondary" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 pb-6"
      >
        <View className="px-4 pt-2">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>

        <View className="px-4">
          <MlBreadcrumb
            segments={['Otras compañías', 'Grupo Orion Holding', crumb]}
            onBack={() => router.back()}
          />
        </View>

        <View className="px-4">
          <MlInlineSearch
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar por activo"
          />
        </View>

        {/* Encabezado de columnas — mismo inset (px-4) que el contenido de
            las filas y spacer de 20 que compensa el chevron, para que
            "Saldo" quede alineado como tabla sobre los montos. */}
        <View
          className="mx-4 flex-row items-center px-4 pb-2"
          style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' }}
        >
          <View className="flex-1 pr-2">
            <AtTypography variant="captionBold" color="#1A1F36">
              {columnLabel}
            </AtTypography>
          </View>
          <View className="flex-row items-center gap-2">
            <AtTypography variant="captionBold" color="#1A1F36">
              Saldo
            </AtTypography>
            <View style={{ width: 20 }} />
          </View>
        </View>

        {isLoading ? (
          <View className="gap-3 px-4">
            <AtSkeleton width="100%" height={56} />
            <AtSkeleton width="100%" height={56} />
            <AtSkeleton width="100%" height={56} />
          </View>
        ) : filtered.length === 0 ? (
          <MlEmptyState
            icon="receipt-long"
            title="Sin cuentas"
            description="No se encontraron cuentas para mostrar."
          />
        ) : (
          <View className="gap-3 px-4">
            {filtered.map((cuenta) => (
              <OrVagCuentaRow
                key={cuenta.id}
                cuenta={cuenta}
                onMovimientoPress={goToMovimiento}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer navy fijo */}
      <View className="px-4 pt-2 bg-bg-secondary" style={{ paddingBottom: 8 }}>
        <MlSimpleTotalFooter
          label="Total consolidador"
          value={`$ ${formatNumber(total, 2)}`}
        />
      </View>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="empresas"
      />
    </View>
  );
}

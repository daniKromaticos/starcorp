/**
 * Informe Bancos — detalle de empresa.
 *
 * Header con logo + nombre, card del saldo total con bar chart por
 * cuentas, lista de cuentas (dot + nombre + código + saldo) y footer
 * con el Total (mismo monto que el header del chart).
 */

import React, { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlBancoCuentaRow } from '@/src/components/molecules/ml-banco-cuenta-row';
import { MlSimpleTotalFooter } from '@/src/components/molecules/ml-simple-total-footer';
import { OrBancoSaldoChart } from '@/src/components/organisms/or-banco-saldo-chart';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtDivider } from '@/src/components/atoms/at-divider';
import { useBancos } from '@/src/hooks/queries/use-bancos';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { formatCurrency } from '@/src/utils/currency';

function formatTotal(value: number): string {
  const base = formatCurrency(value);
  const decimals = value.toFixed(2).split('.')[1];
  return `${base},${decimals}`;
}

export default function BancoEmpresaDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { empresaId } = useLocalSearchParams<{ empresaId: string }>();
  const { data } = useBancos();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const empresa = useMemo(
    () => data?.empresas.find((e) => e.id === empresaId),
    [data, empresaId],
  );

  const chartData = useMemo(
    () =>
      (empresa?.cuentas ?? []).map((c) => ({
        value: c.balance,
        color: c.color,
        gradient: c.gradient,
      })),
    [empresa],
  );

  const total = empresa?.balance ?? 0;

  return (
    <View
      className="flex-1 bg-bg-secondary"
      style={{ paddingTop: insets.top }}
    >
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
            segments={['Informes', 'Bancos', 'Empresa']}
            onBack={() => router.back()}
          />
        </View>

        <View className="flex-row items-center gap-2 px-4">
          <AtIcon name="account-balance" size="md" color="#1A1F36" />
          <AtTypography variant="h2" color="#1A1F36" className="flex-1">
            {empresa?.name ?? '—'}
          </AtTypography>
        </View>

        <AtDivider className="mx-4" />

        {empresa && empresa.cuentas.length > 0 && (
          <View className="px-4">
            <OrBancoSaldoChart
              total={total}
              deltaPct={empresa.deltaPct}
              data={chartData}
            />
          </View>
        )}

        {empresa && empresa.cuentas.length === 0 && (
          <View className="px-4">
            <AtTypography variant="caption" color="#8892A4">
              Esta empresa aún no tiene cuentas conectadas a QuickBooks.
            </AtTypography>
          </View>
        )}

        <View className="flex-row items-center justify-between px-4">
          <AtTypography variant="bodyBold" color="#1A1F36">
            Cuenta
          </AtTypography>
          <AtTypography variant="bodyBold" color="#1A1F36">
            Saldo
          </AtTypography>
        </View>

        <AtDivider className="mx-4" />

        <View className="gap-2 px-4">
          {(empresa?.cuentas ?? []).map((c, i) => (
            <MlBancoCuentaRow
              key={c.id}
              name={c.name}
              code={c.code}
              color={c.color}
              balance={c.balance}
              variant={i % 2 === 0 ? 'plain' : 'card'}
            />
          ))}
        </View>
      </ScrollView>

      {/* Total fijo: queda anclado al fondo de la pantalla, fuera del
          ScrollView, para que siempre sea visible al recorrer las cuentas. */}
      {empresa && empresa.cuentas.length > 0 && (
        <View
          className="px-4 pt-1 bg-bg-secondary"
          style={{
            // Holgura acotada (8–12px) para pegar la card al fondo de forma
            // consistente, sin el espacio extra del safe-area en algunos devices.
            paddingBottom: Math.min(Math.max(insets.bottom, 8), 12),
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <MlSimpleTotalFooter value={formatTotal(total)} />
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

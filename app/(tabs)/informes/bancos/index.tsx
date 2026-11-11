/**
 * Informe Bancos — pantalla principal.
 *
 * Search global + breadcrumb + hero "Bancos totalizado" + lista de
 * empresas (cada empresa = un Realm/Company de QuickBooks). Tap en una
 * empresa abre el detalle con sus cuentas.
 */

import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlReportListSkeleton } from '@/src/components/molecules/ml-report-list-skeleton';
import { MlBancoEmpresaRow } from '@/src/components/molecules/ml-banco-empresa-row';
import { OrBancoSummaryCard } from '@/src/components/organisms/or-banco-summary-card';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { useBancos } from '@/src/hooks/queries/use-bancos';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';

function formatUpdatedAt(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function BancosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isPending } = useBancos();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const empresas = data?.empresas ?? [];

  return (
    <View
      className="flex-1 bg-bg-secondary"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 pb-12"
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
            segments={['Informes', 'Bancos']}
            onBack={() => router.back()}
          />
        </View>

        {data && (
          <View className="px-4">
            <OrBancoSummaryCard
              total={data.totalizado}
              deltaPct={data.deltaPct}
            />
          </View>
        )}

        <View className="flex-row items-end justify-between px-4">
          <View className="flex-row items-baseline gap-1">
            <AtTypography variant="h3" color="#1A1F36">
              Empresas
            </AtTypography>
            <AtTypography variant="body" color="#1A1F36">
              ({empresas.length})
            </AtTypography>
          </View>
          {data && (
            <AtTypography variant="caption" color="#8892A4">
              {formatUpdatedAt(data.updatedAt)}
            </AtTypography>
          )}
        </View>

        <View className="gap-3 px-4">
          {isPending && <MlReportListSkeleton />}
          {empresas.map((empresa) => (
            <MlBancoEmpresaRow
              key={empresa.id}
              name={empresa.name}
              balance={empresa.balance}
              deltaPct={empresa.deltaPct}
              onPress={() =>
                router.push(
                  `/(tabs)/informes/bancos/${empresa.id}` as never,
                )
              }
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

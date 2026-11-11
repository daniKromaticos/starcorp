/**
 * Informes Tab Screen — grid 2x3 de tarjetas oscuras.
 *
 * Cada tarjeta navega a /(tabs)/informes/[reportId] donde se renderiza
 * el detalle del informe correspondiente.
 */

import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { View } from '@/src/tw';
import { MlReportCard } from '@/src/components/molecules/ml-report-card';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { TmInformes } from '@/src/components/templates/tm-informes';
import { useAuthStore } from '@/src/stores/auth.store';
import { hasPermission } from '@/src/types/auth.types';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

type ReportItem = {
  id: string;
  title: string;
  iconName: MaterialIconName;
};

const REPORTS: ReportItem[] = [
  { id: 'cartera', title: 'Informe Cartera', iconName: 'account-balance-wallet' },
  { id: 'asociados', title: 'Informe Asociados activos', iconName: 'people' },
  { id: 'bancos', title: 'Informe Bancos', iconName: 'account-balance' },
  { id: 'presupuesto', title: 'Informe Presupuesto', iconName: 'calculate' },
  { id: 'seguro', title: 'Informe Seguro', iconName: 'security' },
  { id: 'pagos', title: 'Informe Pagos', iconName: 'payment' },
];

// Permiso fino que habilita cada informe (el id 'seguro' mapea a
// informes.seguros del catálogo).
const REPORT_PERMISSION: Record<string, string> = {
  cartera: 'informes.cartera',
  asociados: 'informes.asociados',
  bancos: 'informes.bancos',
  presupuesto: 'informes.presupuesto',
  seguro: 'informes.seguros',
  pagos: 'informes.pagos',
};

export default function InformesScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  // 2 columnas exactas: px-4 (32) + gap-3 (12). Con '48%' + gap a 320dp
  // la suma pasaba de 100% y el grid caía a una columna.
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor((screenWidth - 32 - 12) / 2);

  const allowedReports = REPORTS.filter((r) =>
    hasPermission(user, REPORT_PERMISSION[r.id]),
  );

  return (
    <TmInformes
      onMenuPress={() => setDrawerVisible(true)}
      // Atrás del grid = Home, siempre: router.back() podía caer en el
      // historial de pestañas. Sin permiso de Consolidado no hay a dónde.
      onBack={
        hasPermission(user, 'consolidado.ver')
          ? () => router.navigate('/')
          : undefined
      }
    >
      <View className="flex-row flex-wrap gap-3 px-4">
        {allowedReports.map((report) => (
          <View key={report.id} style={{ width: cardWidth }}>
            <MlReportCard
              title={report.title}
              iconName={report.iconName}
              onPress={() => {
                if (report.id === 'cartera') {
                  router.push('/(tabs)/informes/cartera' as never);
                } else if (report.id === 'asociados') {
                  router.push('/(tabs)/informes/asociados' as never);
                } else if (report.id === 'bancos') {
                  router.push('/(tabs)/informes/bancos' as never);
                } else if (report.id === 'presupuesto') {
                  router.push('/(tabs)/informes/presupuesto' as never);
                } else if (report.id === 'seguro') {
                  router.push('/(tabs)/informes/seguros' as never);
                } else if (report.id === 'pagos') {
                  router.push('/(tabs)/informes/pagos' as never);
                } else {
                  router.push(`/(tabs)/informes/${report.id}` as never);
                }
              }}
            />
          </View>
        ))}
      </View>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="informes"
      />
    </TmInformes>
  );
}

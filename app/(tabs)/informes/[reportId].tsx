/**
 * Informe detail placeholder.
 *
 * Cada single (cartera, asociados, bancos, presupuesto, seguro, pagos)
 * tendrá su propio template; por ahora solo mostramos un esqueleto.
 */

import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';

const TITLES: Record<string, string> = {
  cartera: 'Informe Cartera',
  asociados: 'Informe Asociados activos',
  bancos: 'Informe Bancos',
  presupuesto: 'Informe Presupuesto',
  seguro: 'Informe Seguro',
  pagos: 'Informe Pagos',
};

export default function InformeDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const title = (reportId && TITLES[reportId]) || 'Informe';

  return (
    <View className="flex-1 bg-bg-secondary" style={{ paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 pb-12"
      >
        <View className="flex-row items-center gap-2 px-4 pt-2">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <AtIcon name="chevron-left" size="lg" color="#1A1F36" />
          </Pressable>
          <AtTypography variant="h2">{title}</AtTypography>
        </View>

        <View className="px-4">
          <AtTypography variant="body" color="#8892A4">
            Vista en construcción.
          </AtTypography>
        </View>
      </ScrollView>
    </View>
  );
}

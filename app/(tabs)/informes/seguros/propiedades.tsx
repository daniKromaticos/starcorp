/**
 * Pólizas de Propiedades.
 *
 * Arriba las vigentes, filtradas por los chips Vigente / Por vencer /
 * Vencido (mismo patrón que el detalle de Compañías). Abajo el histórico:
 * las que tienen Estado inactivo en Notion (VENCIDA / CANCELADA), que no
 * participan de los chips.
 *
 * Al navegar con `polizaId` (desde el informe), hace scroll y resalta esa
 * póliza; `status` abre el chip donde vive.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView as RNScrollView } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlTimeFilterBar } from '@/src/components/molecules/ml-time-filter-bar';
import { MlPropiedadDetailCard } from '@/src/components/molecules/ml-propiedad-detail-card';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { usePullToRefresh } from '@/src/hooks/use-pull-to-refresh';
import { useSeguros } from '@/src/hooks/queries/use-seguros';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import {
  isInactiva,
  POLIZA_STATUS_FILTERS,
  polizaStatus,
  type PolizaStatus,
} from '@/src/types/seguros.types';

export default function SegurosPropiedadesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { polizaId, status } = useLocalSearchParams<{
    polizaId?: string;
    status?: string;
  }>();
  const { data, refetch } = useSeguros();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  // Estado inicial del filtro: el que viene del informe (al elegir una póliza
  // concreta) o "Vigente" por defecto.
  const initialStatus =
    status && POLIZA_STATUS_FILTERS.some((f) => f.key === status)
      ? (status as PolizaStatus)
      : 'activa';

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PolizaStatus>(initialStatus);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const todayIso = data?.todayIso ?? '';

  // Las inactivas no participan de los chips — viven en el histórico.
  const vigentes = useMemo(
    () =>
      (data?.propiedades ?? []).filter(
        (p) =>
          !isInactiva(p) && polizaStatus(p.vigenciaFin, todayIso) === statusFilter,
      ),
    [data, todayIso, statusFilter],
  );

  const inactivas = useMemo(
    () => (data?.propiedades ?? []).filter(isInactiva),
    [data],
  );

  // Scroll automático hasta la póliza objetivo (la elegida en el informe).
  // Las tarjetas viven en dos listas distintas, así que la posición final es
  // el offset de la sección más el de la tarjeta dentro de ella.
  const scrollRef = useRef<RNScrollView>(null);
  const sectionYRef = useRef<Record<string, number>>({});
  const cardRef = useRef<Record<string, { section: string; y: number }>>({});
  const didScrollRef = useRef(false);

  const tryScrollToTarget = useCallback(() => {
    if (didScrollRef.current || !polizaId) return;
    const card = cardRef.current[polizaId];
    if (!card) return;
    const sectionY = sectionYRef.current[card.section];
    if (sectionY == null) return;
    didScrollRef.current = true;
    scrollRef.current?.scrollTo({
      y: Math.max(0, sectionY + card.y - 16),
      animated: true,
    });
  }, [polizaId]);

  const onSectionLayout = useCallback(
    (section: string, e: LayoutChangeEvent) => {
      sectionYRef.current[section] = e.nativeEvent.layout.y;
      tryScrollToTarget();
    },
    [tryScrollToTarget],
  );

  const onCardLayout = useCallback(
    (section: string, id: string, e: LayoutChangeEvent) => {
      cardRef.current[id] = { section, y: e.nativeEvent.layout.y };
      tryScrollToTarget();
    },
    [tryScrollToTarget],
  );

  return (
    <View
      className="flex-1 bg-bg-secondary"
      style={{ paddingTop: insets.top }}
    >
      <RNScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ rowGap: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 pt-2">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>

        <View className="px-4">
          <MlBreadcrumb
            segments={['Informes', 'Seguros', 'Propiedades']}
            onBack={() => router.back()}
          />
        </View>

        <MlTimeFilterBar
          fill
          options={POLIZA_STATUS_FILTERS}
          selectedKey={statusFilter}
          onSelect={(k) => setStatusFilter(k as PolizaStatus)}
        />

        <View
          className="gap-3 px-4"
          onLayout={(e) => onSectionLayout('vigentes', e)}
        >
          {vigentes.length === 0 && (
            <AtTypography variant="caption" color="#8892A4">
              No hay pólizas de propiedades en este estado.
            </AtTypography>
          )}
          {vigentes.map((p) => (
            <View
              key={p.id}
              onLayout={(e) => onCardLayout('vigentes', p.id, e)}
            >
              <MlPropiedadDetailCard
                poliza={p}
                todayIso={todayIso}
                highlighted={p.id === polizaId}
              />
            </View>
          ))}
        </View>

        <View
          className="gap-3 px-4"
          onLayout={(e) => onSectionLayout('historico', e)}
        >
          <AtTypography variant="bodyBold" color="#1A1F36">
            Histórico
          </AtTypography>
          {inactivas.length === 0 && (
            <AtTypography variant="caption" color="#8892A4">
              Sin pólizas de propiedades inactivas.
            </AtTypography>
          )}
          {inactivas.map((p) => (
            <View
              key={p.id}
              onLayout={(e) => onCardLayout('historico', p.id, e)}
            >
              <MlPropiedadDetailCard
                poliza={p}
                todayIso={todayIso}
                highlighted={p.id === polizaId}
              />
            </View>
          ))}
        </View>
      </RNScrollView>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="informes"
      />
    </View>
  );
}

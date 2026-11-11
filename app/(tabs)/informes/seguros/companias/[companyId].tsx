/**
 * Detalle de Compañía — todas las pólizas de una empresa.
 *
 * El chip arranca en el primero que tenga resultados (o en el de la
 * póliza objetivo cuando venimos del informe), no siempre en "Vigente".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView as RNScrollView } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlPolizaDetailCard } from '@/src/components/molecules/ml-poliza-detail-card';
import { MlTimeFilterBar } from '@/src/components/molecules/ml-time-filter-bar';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { usePullToRefresh } from '@/src/hooks/use-pull-to-refresh';
import { useSeguros } from '@/src/hooks/queries/use-seguros';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import {
  isInactiva,
  POLIZA_STATUS_FILTERS,
  polizaStatus,
  type PolizaStatus,
} from '@/src/types/seguros.types';

export default function SeguroEmpresaDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { companyId, polizaId, status } = useLocalSearchParams<{
    companyId: string;
    polizaId?: string;
    status?: string;
  }>();
  const { data, refetch } = useSeguros();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  // El chip que viene del informe (al elegir una póliza concreta) manda
  // como valor inicial; null = automático (primero con resultados).
  const paramStatus =
    status && POLIZA_STATUS_FILTERS.some((f) => f.key === status)
      ? (status as PolizaStatus)
      : null;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PolizaStatus | null>(
    paramStatus,
  );
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  // Scroll automático hasta la póliza objetivo (la elegida en el informe).
  const scrollRef = useRef<RNScrollView>(null);
  const listYRef = useRef(0);
  const listMeasuredRef = useRef(false);
  const cardYRef = useRef<Record<string, number>>({});
  const didScrollRef = useRef(false);

  const tryScrollToTarget = useCallback(() => {
    if (didScrollRef.current || !polizaId || !listMeasuredRef.current) return;
    const cardY = cardYRef.current[polizaId];
    if (cardY == null) return;
    didScrollRef.current = true;
    scrollRef.current?.scrollTo({
      y: Math.max(0, listYRef.current + cardY - 16),
      animated: true,
    });
  }, [polizaId]);

  const onListLayout = useCallback(
    (e: LayoutChangeEvent) => {
      listYRef.current = e.nativeEvent.layout.y;
      listMeasuredRef.current = true;
      tryScrollToTarget();
    },
    [tryScrollToTarget],
  );

  const empresa = useMemo(
    () => data?.empresas.find((e) => e.id === companyId),
    [data, companyId],
  );

  const todayIso = data?.todayIso ?? '';

  // Las INACTIVA no participan de los chips — viven en el histórico.
  const activas = useMemo(
    () => (empresa?.polizas ?? []).filter((p) => !isInactiva(p)),
    [empresa],
  );

  // Chip automático: el de la póliza objetivo si venimos del informe, si
  // no el primero que tenga resultados. Evita abrir en un chip vacío.
  const autoStatus = useMemo<PolizaStatus>(() => {
    const target = activas.find((p) => p.id === polizaId);
    if (target) return polizaStatus(target.vigenciaFin, todayIso);
    const withResults = POLIZA_STATUS_FILTERS.find((f) =>
      activas.some((p) => polizaStatus(p.vigenciaFin, todayIso) === f.key),
    );
    return withResults?.key ?? 'activa';
  }, [activas, polizaId, todayIso]);

  const effectiveStatus = statusFilter ?? autoStatus;

  const polizasFiltradas = useMemo(
    () =>
      activas.filter(
        (p) => polizaStatus(p.vigenciaFin, todayIso) === effectiveStatus,
      ),
    [activas, todayIso, effectiveStatus],
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
            segments={['Informes', 'Seguros', 'Compañías']}
            onBack={() => router.back()}
          />
        </View>

        <View className="flex-row items-center gap-2 px-4">
          <AtIcon name="account-balance" size="md" color="#1A1F36" />
          <AtTypography variant="h2" color="#1A1F36" className="flex-1">
            {empresa?.name ?? '—'}
          </AtTypography>
        </View>

        <MlTimeFilterBar
          fill
          options={POLIZA_STATUS_FILTERS}
          selectedKey={effectiveStatus}
          onSelect={(k) => setStatusFilter(k as PolizaStatus)}
        />

        <View className="gap-3 px-4" onLayout={onListLayout}>
          {polizasFiltradas.length === 0 && (
            <AtTypography variant="caption" color="#8892A4">
              {empresa && empresa.polizas.length > 0
                ? 'No hay pólizas en este estado.'
                : 'Esta empresa no tiene pólizas registradas.'}
            </AtTypography>
          )}
          {polizasFiltradas.map((p) => (
            <View
              key={p.id}
              onLayout={(e) => {
                cardYRef.current[p.id] = e.nativeEvent.layout.y;
                tryScrollToTarget();
              }}
            >
              <MlPolizaDetailCard
                poliza={p}
                todayIso={todayIso}
                showEmpresa={false}
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

/**
 * Pólizas de Vehículos — mismo patrón que Compañías.
 *
 * Carousel de LLCs arriba (tap en una pill filtra el listado), chips
 * Vigente / Por vencer / Vencido debajo, y sólo las pólizas activas en
 * Notion. Las que tienen Estado inactivo viven en el Histórico.
 *
 * El chip arranca en el primero que tenga resultados para la LLC activa
 * (o en el de la póliza objetivo), no siempre en "Vigente".
 *
 * Al navegar con `polizaId` (desde el informe), abre la LLC de esa
 * póliza, hace scroll y la resalta; `status` abre el chip donde vive.
 * `llcId` permite entrar directo a una LLC desde el carousel del informe.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView as RNScrollView } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { ScrollView, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlCompanyCard } from '@/src/components/molecules/ml-company-card';
import { MlTimeFilterBar } from '@/src/components/molecules/ml-time-filter-bar';
import { MlVehiculoDetailCard } from '@/src/components/molecules/ml-vehiculo-detail-card';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { usePullToRefresh } from '@/src/hooks/use-pull-to-refresh';
import { useSeguros } from '@/src/hooks/queries/use-seguros';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import {
  isInactiva,
  llcsDeVehiculos,
  POLIZA_STATUS_FILTERS,
  polizaStatus,
  type PolizaStatus,
} from '@/src/types/seguros.types';

export default function SegurosVehiculosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { polizaId, status, llcId } = useLocalSearchParams<{
    polizaId?: string;
    status?: string;
    llcId?: string;
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
  const [activeLlcId, setActiveLlcId] = useState<string | null>(null);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const todayIso = data?.todayIso ?? '';

  // Las inactivas no participan de los chips — viven en el histórico.
  const activas = useMemo(
    () => (data?.vehiculos ?? []).filter((p) => !isInactiva(p)),
    [data],
  );

  const llcs = useMemo(() => llcsDeVehiculos(activas), [activas]);

  // La LLC de la póliza a la que se navegó manda sobre el `llcId` suelto:
  // sin eso la card objetivo quedaría filtrada fuera del listado.
  const targetLlcId = useMemo(
    () => activas.find((p) => p.id === polizaId)?.empresaId ?? null,
    [activas, polizaId],
  );

  const effectiveLlcId =
    activeLlcId ?? targetLlcId ?? llcId ?? llcs[0]?.id ?? null;

  const deLaLlc = useMemo(
    () =>
      activas.filter(
        (p) => !effectiveLlcId || p.empresaId === effectiveLlcId,
      ),
    [activas, effectiveLlcId],
  );

  // Chip automático: el de la póliza objetivo si venimos del informe, si
  // no el primero que tenga resultados. Evita abrir en un chip vacío.
  const autoStatus = useMemo<PolizaStatus>(() => {
    const target = deLaLlc.find((p) => p.id === polizaId);
    if (target) return polizaStatus(target.vigenciaFin, todayIso);
    const withResults = POLIZA_STATUS_FILTERS.find((f) =>
      deLaLlc.some((p) => polizaStatus(p.vigenciaFin, todayIso) === f.key),
    );
    return withResults?.key ?? 'activa';
  }, [deLaLlc, polizaId, todayIso]);

  const effectiveStatus = statusFilter ?? autoStatus;

  const polizas = useMemo(
    () =>
      deLaLlc.filter(
        (p) => polizaStatus(p.vigenciaFin, todayIso) === effectiveStatus,
      ),
    [deLaLlc, todayIso, effectiveStatus],
  );

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
            segments={['Informes', 'Seguros', 'Vehículos']}
            onBack={() => router.back()}
          />
        </View>

        {llcs.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 px-4"
          >
            {llcs.map((llc) => (
              <MlCompanyCard
                key={llc.id}
                name={llc.name}
                variant="tile"
                selected={llc.id === effectiveLlcId}
                onPress={() => {
                  setActiveLlcId(llc.id);
                  // Cada LLC vuelve a abrir en su primer chip con resultados.
                  setStatusFilter(null);
                }}
              />
            ))}
          </ScrollView>
        )}

        <MlTimeFilterBar
          fill
          options={POLIZA_STATUS_FILTERS}
          selectedKey={effectiveStatus}
          onSelect={(k) => setStatusFilter(k as PolizaStatus)}
        />

        <View className="gap-3 px-4" onLayout={onListLayout}>
          {polizas.length === 0 && (
            <AtTypography variant="caption" color="#8892A4">
              No hay pólizas de vehículos en este estado.
            </AtTypography>
          )}
          {polizas.map((p) => (
            <View
              key={p.id}
              onLayout={(e) => {
                cardYRef.current[p.id] = e.nativeEvent.layout.y;
                tryScrollToTarget();
              }}
            >
              <MlVehiculoDetailCard
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

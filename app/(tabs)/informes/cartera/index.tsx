/**
 * Informe Cartera — pantalla principal.
 *
 * Donut de distribución (al tocar un sector filtra la lista y muestra nombre
 * y % del sector) + tabs de aging + lista de clientes expandibles (al tocar un
 * cliente, el donut cede su lugar a la segmentación por aging de ese cliente,
 * con "Volver") + filtros en bottom sheet + footer con totales.
 */

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView as RNScrollView, useWindowDimensions } from 'react-native';
import { Pressable, TextInput, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlReportListSkeleton } from '@/src/components/molecules/ml-report-list-skeleton';
import { MlAgingTabsBar } from '@/src/components/molecules/ml-aging-tabs-bar';
import { MlUpdatedAtCard } from '@/src/components/molecules/ml-updated-at-card';
import { MlFilterChip } from '@/src/components/molecules/ml-filter-chip';
import { MlFilterButton } from '@/src/components/molecules/ml-filter-button';
import {
  MlCarteraClientRow,
  CARTERA_BUCKET_COL_W,
  CARTERA_TOTAL_COL_W,
  CARTERA_NARROW_MAX_W,
} from '@/src/components/molecules/ml-cartera-client-row';
import { MlCarteraTotalFooter } from '@/src/components/molecules/ml-cartera-total-footer';
import { OrCarteraAgingCard } from '@/src/components/organisms/or-cartera-aging-card';
import { OrCarteraDonut } from '@/src/components/organisms/or-cartera-donut';
import {
  OrCarteraFiltersSheet,
  type CarteraFilters,
} from '@/src/components/organisms/or-cartera-filters-sheet';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { useCartera } from '@/src/hooks/queries/use-cartera';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import {
  AGING_BUCKETS,
  AGING_BUCKET_LABEL,
  type AgingBucket,
} from '@/src/types/cartera.types';
import { donutColorAt, DONUT_MAX_NAMED } from '@/src/utils/donut';
import { OTROS_SEGMENT_COLOR } from '@/src/theme/gradients';

const MAX_DONUT_SLICES = DONUT_MAX_NAMED;

function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CarteraScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isPending } = useCartera();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<CarteraFilters>({ clientIds: [] });
  const [selectedBucket, setSelectedBucket] =
    useState<AgingBucket>('corriente');
  const [search, setSearch] = useState('');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const baseClients = useMemo(() => {
    const all = data?.clients ?? [];
    const filtered = filters.clientIds.length
      ? all.filter((c) => filters.clientIds.includes(c.id))
      : all;
    const q = search.trim().toLowerCase();
    const searched = q
      ? filtered.filter((c) => c.name.toLowerCase().includes(q))
      : filtered;
    // Color por posición (mayor→menor): el sector más grande siempre naranja;
    // del 8º en adelante (agrupados en "Otros") va remolacha. Así donut, dots
    // de la lista y tendencia quedan consistentes.
    return [...searched]
      .sort((a, b) => b.total - a.total)
      .map((c, i) => ({ ...c, color: donutColorAt(i) }));
  }, [data, filters, search]);

  // Un cliente puede netear en 0 o a favor (nota de crédito sin factura
  // abierta, o crédito mayor al saldo pendiente): no tiene sentido como
  // sector del donut, así que se excluye solo de esta vista (sigue en la
  // lista y en el total general).
  const donutClients = useMemo(
    () => baseClients.filter((c) => c.total > 0),
    [baseClients],
  );

  // Clientes agrupados bajo el sector "Otros" del donut (los que quedan
  // fuera del top MAX_DONUT_SLICES, dentro de los que sí tienen saldo
  // positivo). Vacío cuando no hay agrupación.
  const otrosClientIds = useMemo(() => {
    if (donutClients.length <= MAX_DONUT_SLICES) return [];
    return donutClients.slice(MAX_DONUT_SLICES).map((c) => c.id);
  }, [donutClients]);

  const donutData = useMemo(() => {
    if (!donutClients.length) return [];
    if (donutClients.length <= MAX_DONUT_SLICES) {
      return donutClients.map((c) => ({
        id: c.id,
        value: c.total,
        color: c.color,
        label: c.name,
      }));
    }
    const top = donutClients.slice(0, MAX_DONUT_SLICES);
    const rest = donutClients.slice(MAX_DONUT_SLICES);
    return [
      ...top.map((c) => ({
        id: c.id,
        value: c.total,
        color: c.color,
        label: c.name,
      })),
      {
        id: 'otros',
        value: rest.reduce((s, c) => s + c.total, 0),
        color: OTROS_SEGMENT_COLOR,
        label: 'Otros',
      },
    ];
  }, [donutClients]);

  // Lista filtrada por el sector seleccionado en el donut. El sector
  // "Otros" agrupa varios clientes; un sector normal corresponde a uno.
  const visibleClients = useMemo(() => {
    if (!selectedSliceId) return baseClients;
    if (selectedSliceId === 'otros') {
      const ids = new Set(otrosClientIds);
      return baseClients.filter((c) => ids.has(c.id));
    }
    return baseClients.filter((c) => c.id === selectedSliceId);
  }, [baseClients, selectedSliceId, otrosClientIds]);

  // Cliente tocado en la lista: su segmentación por aging reemplaza al donut
  // mientras la fila esté abierta. Si sale de la lista (filtro, búsqueda o
  // sector), vuelve el donut.
  const chartClient = useMemo(
    () => visibleClients.find((c) => c.id === expandedClientId) ?? null,
    [visibleClients, expandedClientId],
  );

  const handleSliceChange = (id: string | null) => {
    setSelectedSliceId(id);
    setExpandedClientId(null);
  };

  const scrollRef = useRef<RNScrollView>(null);
  const chartY = useRef(0);
  const toggleClient = (id: string) => {
    const opening = expandedClientId !== id;
    setExpandedClientId(opening ? id : null);
    // La gráfica aparece arriba, donde estaba el donut: si el cliente estaba
    // más abajo en la lista, se sube para que se vea.
    if (opening) {
      scrollRef.current?.scrollTo({
        y: Math.max(chartY.current - 12, 0),
        animated: true,
      });
    }
  };

  // Cuando la lista queda en un único cliente, se muestra expandido con
  // todos los buckets; el header y footer se simplifican a Cliente/Total.
  const isSingleClient = visibleClients.length === 1;
  const isNarrow = useWindowDimensions().width < CARTERA_NARROW_MAX_W;

  const totals = useMemo(() => {
    const bucketTotal = visibleClients.reduce(
      (sum, c) => sum + c.buckets[selectedBucket],
      0,
    );
    const grandTotal = visibleClients.reduce((sum, c) => sum + c.total, 0);
    return { bucketTotal, grandTotal };
  }, [visibleClients, selectedBucket]);

  const bucketIndex = AGING_BUCKETS.indexOf(selectedBucket);
  const goPrevBucket = () => {
    const n = AGING_BUCKETS.length;
    setSelectedBucket(AGING_BUCKETS[(bucketIndex - 1 + n) % n]);
  };
  const goNextBucket = () => {
    const n = AGING_BUCKETS.length;
    setSelectedBucket(AGING_BUCKETS[(bucketIndex + 1) % n]);
  };

  const clientOptions = useMemo(
    () =>
      (data?.clients ?? []).map((c) => ({ id: c.id, name: c.name })),
    [data],
  );

  React.useEffect(() => {
    if (selectedSliceId && !donutData.some((s) => s.id === selectedSliceId)) {
      setSelectedSliceId(null);
    }
  }, [donutData, selectedSliceId]);

  return (
    <View
      className="flex-1 bg-bg-secondary"
      style={{ paddingTop: insets.top }}
    >
      <RNScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ rowGap: 20, paddingBottom: 96 + insets.bottom }}
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
            segments={['Informes', 'Cartera']}
            onBack={() => router.back()}
          />
        </View>

        <View className="flex-row items-center justify-between px-4">
          <View className="flex-row items-center gap-2 flex-1">
            <AtTypography variant="bodyBold">Filtros</AtTypography>
            {filters.clientIds.length > 0 && (
              <Pressable
                onPress={() => setFilters({ clientIds: [] })}
                hitSlop={6}
              >
                <AtTypography variant="captionBold" color="#1A3FE8">
                  Borrar filtros
                </AtTypography>
              </Pressable>
            )}
          </View>
          <MlFilterButton
            active={filters.clientIds.length > 0}
            onPress={() => setFiltersVisible(true)}
          />
        </View>

        {filters.clientIds.length > 0 && (
          <View className="flex-row flex-wrap gap-2 px-4">
            {clientOptions
              .filter((c) => filters.clientIds.includes(c.id))
              .map((c) => (
                <MlFilterChip
                  key={c.id}
                  label={c.name}
                  onRemove={() =>
                    setFilters((f) => ({
                      clientIds: f.clientIds.filter((id) => id !== c.id),
                    }))
                  }
                />
              ))}
          </View>
        )}

        <MlAgingTabsBar
          value={selectedBucket}
          onChange={setSelectedBucket}
        />

        <View
          className="px-4"
          onLayout={(e) => {
            chartY.current = e.nativeEvent.layout.y;
          }}
        >
          {/* Tocar un sector lo resalta (nombre + %) y filtra la lista; tocar
              un cliente de la lista cambia el donut por su segmentación por
              aging, y "Volver" cierra la fila y regresa al donut. */}
          {chartClient ? (
            <OrCarteraAgingCard
              title="Segmentación de la cartera"
              name={chartClient.name}
              color={chartClient.color}
              buckets={chartClient.buckets}
              valueFormatter={formatMoney}
              onBack={() => setExpandedClientId(null)}
            />
          ) : (
            <OrCarteraDonut
              title="Distribución cartera por cliente"
              data={donutData}
              labelsMode="tap-only"
              selectedId={selectedSliceId}
              onSelectChange={handleSliceChange}
              valueFormatter={formatMoney}
              showPercentInBanner
              emptyHint="Toca un sector para filtrar la lista"
            />
          )}
        </View>

        <View className="px-4">
          <MlUpdatedAtCard isoDate={data?.updatedAt ?? '2026-04-07'} />
        </View>

        <View className="px-4">
          <View
            className="flex-row items-center gap-2 rounded-full bg-bg-card px-4 py-3"
            style={{
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.06)',
            }}
          >
            <AtIcon name="search" size="md" color="#8892A4" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por cliente"
              placeholderTextColor="#8892A4"
              className="flex-1 p-0 text-ink-primary text-base"
              style={{ fontFamily: 'Roboto_400Regular' }}
            />
          </View>
        </View>

        <View className="gap-2">
          {/* paddingRight 33 = px-4 de la lista + borde 1px + px-4 de
              MlCarteraClientRow: con solo px-4 las columnas de montos del
              header quedaban ~17px corridas a la derecha respecto de las de
              la fila. En pantallas angostas el header pasa a 2 líneas igual
              que la fila. */}
          <View
            className={isNarrow ? 'gap-1.5' : 'flex-row items-center gap-3'}
            style={{ paddingLeft: 16, paddingRight: 33 }}
          >
            <AtTypography
              variant="captionBold"
              color="#1A1F36"
              className={isNarrow ? undefined : 'flex-1'}
              style={{ marginLeft: 22 }}
            >
              Cliente
            </AtTypography>
            <View className="flex-row items-center justify-end gap-3">
            {!isSingleClient && (
              <View
                style={{ width: CARTERA_BUCKET_COL_W }}
                className="flex-row items-center justify-end gap-0.5"
              >
                <Pressable onPress={goPrevBucket} hitSlop={6}>
                  <AtIcon name="chevron-left" size="sm" color="#1A1F36" />
                </Pressable>
                <AtTypography variant="captionBold" color="#1A1F36">
                  {AGING_BUCKET_LABEL[selectedBucket]}
                </AtTypography>
                <Pressable onPress={goNextBucket} hitSlop={6}>
                  <AtIcon name="chevron-right" size="sm" color="#1A1F36" />
                </Pressable>
              </View>
            )}
            <View
              style={{ width: CARTERA_TOTAL_COL_W }}
              className="items-center"
            >
              <AtTypography variant="captionBold" color="#1A1F36">
                Total
              </AtTypography>
            </View>
            </View>
          </View>

          <View className="gap-2 px-4">
            {isPending && <MlReportListSkeleton />}
            {!isPending && visibleClients.length === 0 && (
              <AtTypography variant="caption" color="#8892A4">
                Sin clientes que coincidan con los filtros.
              </AtTypography>
            )}
            {visibleClients.map((c) => (
              <MlCarteraClientRow
                key={c.id}
                name={c.name}
                color={c.color}
                activeBucket={selectedBucket}
                buckets={c.buckets}
                total={c.total}
                expanded={isSingleClient || expandedClientId === c.id}
                onToggle={() => toggleClient(c.id)}
                onOpenDetail={() =>
                  router.push(`/(tabs)/informes/cartera/${c.id}` as never)
                }
              />
            ))}
          </View>
        </View>
      </RNScrollView>

      <View
        className="absolute left-0 right-0 bottom-0 px-4 pt-1 bg-bg-secondary"
        // El safe-area inset de algunos dispositivos (home indicator ~34px)
        // dejaba un gran espacio bajo la card y la hacía "flotar". Acotamos a
        // una holgura pequeña y consistente para pegarla al fondo en todos.
        style={{ paddingBottom: Math.min(Math.max(insets.bottom, 8), 12) }}
      >
        <MlCarteraTotalFooter
          showBucket={!isSingleClient}
          bucketLabel={AGING_BUCKET_LABEL[selectedBucket]}
          bucketValue={totals.bucketTotal}
          totalValue={totals.grandTotal}
        />
      </View>

      <OrCarteraFiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        clients={clientOptions}
        initialFilters={filters}
        onApply={setFilters}
      />

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="informes"
      />
    </View>
  );
}

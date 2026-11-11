/**
 * Informe Asociados activos — pantalla principal.
 *
 * Todo el contenido (search, breadcrumb, filtros, donut y lista) scrollea;
 * sólo el footer de total queda fijo abajo. Tap en un sector del donut
 * filtra la lista de clientes de abajo.
 */

import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, TextInput, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlFilterChip } from '@/src/components/molecules/ml-filter-chip';
import { MlFilterButton } from '@/src/components/molecules/ml-filter-button';
import { MlAsociadoClientRow } from '@/src/components/molecules/ml-asociado-client-row';
import { MlSimpleTotalFooter } from '@/src/components/molecules/ml-simple-total-footer';
import { MlReportListSkeleton } from '@/src/components/molecules/ml-report-list-skeleton';
import { OrCarteraDonut } from '@/src/components/organisms/or-cartera-donut';
import {
  OrAsociadosTrend,
  TODOS_ID,
  type TrendSeries,
} from '@/src/components/organisms/or-asociados-trend';
import {
  OrAsociadosFiltersSheet,
  type AsociadosFilters,
} from '@/src/components/organisms/or-asociados-filters-sheet';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, OTROS_SEGMENT_COLOR } from '@/src/theme/gradients';
import { useAsociados } from '@/src/hooks/queries/use-asociados';
import { useAsociadosTrend } from '@/src/hooks/queries/use-asociados-trend';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { donutColorAt, DONUT_MAX_NAMED } from '@/src/utils/donut';

const MAX_DONUT_SLICES = DONUT_MAX_NAMED;
const VARIOS_ID = '__varios__';

export default function AsociadosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isPending } = useAsociados();
  const { data: trend } = useAsociadosTrend();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [vista, setVista] = useState<'participacion' | 'tendencia'>(
    'participacion',
  );
  const [filters, setFilters] = useState<AsociadosFilters>({
    area: 'todos',
    clientIds: [],
  });
  const [search, setSearch] = useState('');
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const clientOptions = useMemo(
    () => (data?.clients ?? []).map((c) => ({ id: c.id, name: c.name })),
    [data],
  );

  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    (data?.clients ?? []).forEach((c) =>
      c.employees.forEach((e) => e.area && set.add(e.area)),
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const effectiveFilters: AsociadosFilters = filters;

  const allClientCounts = useMemo(() => {
    const all = data?.clients ?? [];
    const byClient = effectiveFilters.clientIds.length
      ? all.filter((c) => effectiveFilters.clientIds.includes(c.id))
      : all;
    return byClient.map((c) => {
      const employees =
        effectiveFilters.area === 'todos'
          ? c.employees
          : c.employees.filter((e) => e.area === effectiveFilters.area);
      return { client: c, count: employees.length };
    });
  }, [data, effectiveFilters]);

  // Filas con asociados, ordenadas por conteo (base del donut y del
  // agrupamiento "Varios").
  const sortedByCount = useMemo(
    () =>
      allClientCounts
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count),
    [allClientCounts],
  );

  // Clientes agrupados bajo el sector "Varios" (fuera del top MAX_DONUT_SLICES).
  const variosClientIds = useMemo(() => {
    if (sortedByCount.length <= MAX_DONUT_SLICES) return [];
    return sortedByCount.slice(MAX_DONUT_SLICES).map((r) => r.client.id);
  }, [sortedByCount]);

  // Color por posición (mayor→menor): el sector más grande siempre naranja;
  // del 8º en adelante (agrupados en "Varios") va remolacha. Mantiene donut,
  // dots de la lista y tendencia consistentes.
  const colorByClientId = useMemo(
    () =>
      new Map(sortedByCount.map((r, i) => [r.client.id, donutColorAt(i)])),
    [sortedByCount],
  );

  // Rank por cliente (posición en el orden mayor→menor) para reusar las reglas
  // de agrupamiento del donut también en la tendencia.
  const rankByClientId = useMemo(
    () => new Map(sortedByCount.map((r, i) => [r.client.id, i])),
    [sortedByCount],
  );

  const donutData = useMemo(() => {
    if (!sortedByCount.length) return [];
    if (sortedByCount.length <= MAX_DONUT_SLICES) {
      return sortedByCount.map((r) => ({
        id: r.client.id,
        value: r.count,
        color: colorByClientId.get(r.client.id) ?? r.client.color,
        label: r.client.name,
      }));
    }
    const top = sortedByCount.slice(0, MAX_DONUT_SLICES);
    const rest = sortedByCount.slice(MAX_DONUT_SLICES);
    return [
      ...top.map((r) => ({
        id: r.client.id,
        value: r.count,
        color: colorByClientId.get(r.client.id) ?? r.client.color,
        label: r.client.name,
      })),
      {
        id: VARIOS_ID,
        value: rest.reduce((s, r) => s + r.count, 0),
        color: OTROS_SEGMENT_COLOR,
        label: 'Varios',
      },
    ];
  }, [sortedByCount, colorByClientId]);

  // Lista filtrada por el sector seleccionado en el donut. "Varios" agrupa
  // varios clientes; un sector normal corresponde a uno solo.
  const visibleClients = useMemo(() => {
    let base = allClientCounts;
    if (selectedSliceId) {
      if (selectedSliceId === VARIOS_ID) {
        const ids = new Set(variosClientIds);
        base = base.filter((r) => ids.has(r.client.id));
      } else {
        base = base.filter((r) => r.client.id === selectedSliceId);
      }
    }
    const q = search.trim().toLowerCase();
    const searched = q
      ? base.filter((r) => r.client.name.toLowerCase().includes(q))
      : base;
    return [...searched].sort((a, b) =>
      a.client.name.localeCompare(b.client.name),
    );
  }, [allClientCounts, selectedSliceId, variosClientIds, search]);

  const total = useMemo(
    () => visibleClients.reduce((s, r) => s + r.count, 0),
    [visibleClients],
  );

  // Series de tendencia con las mismas reglas de color del donut: top-7
  // clientes con colores únicos (0–6) y el resto agrupado en "Varios"
  // (remolacha), para no repetir colores cuando se agota la paleta. Respeta el
  // filtro por cliente si hay alguno seleccionado.
  const trendSeries = useMemo<TrendSeries[]>(() => {
    if (!trend) return [];
    const ids = effectiveFilters.clientIds;
    const filtered = trend.series.filter(
      (s) => ids.length === 0 || ids.includes(s.id),
    );
    const n = trend.months.length;
    const named: TrendSeries[] = [];
    const tail: typeof filtered = [];
    for (const s of filtered) {
      const rank = rankByClientId.get(s.id);
      if (rank != null && rank < MAX_DONUT_SLICES) {
        named.push({
          id: s.id,
          name: s.name,
          color: donutColorAt(rank),
          counts: s.counts,
        });
      } else {
        tail.push(s);
      }
    }
    named.sort(
      (a, b) =>
        (rankByClientId.get(a.id) ?? 0) - (rankByClientId.get(b.id) ?? 0),
    );
    if (tail.length > 0) {
      const counts = new Array(n).fill(0);
      for (const s of tail) {
        for (let i = 0; i < n; i++) counts[i] += s.counts[i] ?? 0;
      }
      named.push({
        id: VARIOS_ID,
        name: 'Varios',
        color: OTROS_SEGMENT_COLOR,
        counts,
      });
    }
    return named;
  }, [trend, rankByClientId, effectiveFilters.clientIds]);

  // Variación % del total de asociados activos: último mes vs mes anterior
  // (suma de counts de todas las series en cada mes). null si no hay base.
  const totalDeltaPercent = useMemo(() => {
    if (!trend || trend.months.length < 2) return null;
    const n = trend.months.length;
    let last = 0;
    let prev = 0;
    for (const s of trend.series) {
      last += s.counts[n - 1] ?? 0;
      prev += s.counts[n - 2] ?? 0;
    }
    if (prev === 0) return null;
    return ((last - prev) / prev) * 100;
  }, [trend]);

  const hasActiveFilters =
    filters.area !== 'todos' || filters.clientIds.length > 0;

  // Reset selección si la slice ya no existe (cambió filtro/data). Sólo
  // aplica a la vista de participación: en tendencia se puede seleccionar
  // un cliente que no es slice del donut (agrupado en "Varios").
  React.useEffect(() => {
    if (vista !== 'participacion') return;
    if (selectedSliceId && !donutData.some((s) => s.id === selectedSliceId)) {
      setSelectedSliceId(null);
    }
  }, [vista, donutData, selectedSliceId]);

  return (
    <View
      className="flex-1 bg-bg-secondary"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pt-2"
        contentContainerStyle={{ rowGap: 20, paddingBottom: 96 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>

        <View className="px-4">
          <MlBreadcrumb
            segments={['Informes', 'Asociados activos']}
            onBack={() => router.back()}
          />
        </View>

        {/* Botón para alternar la vista: participación (donut) ↔ tendencia
            (línea). El label muestra la vista a la que cambia. */}
        <View className="px-4">
          <Pressable
            onPress={() => {
              setSelectedSliceId(null);
              setVista((v) =>
                v === 'participacion' ? 'tendencia' : 'participacion',
              );
            }}
            style={{
              borderRadius: 12,
              borderCurve: 'continuous',
              overflow: 'hidden',
              boxShadow: '0 2px 6px rgba(4, 17, 63, 0.35)',
            }}
          >
            <LinearGradient
              colors={gradients.buttonBlue.colors}
              start={gradients.buttonBlue.start}
              end={gradients.buttonBlue.end}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* 320dp: el label largo partía a 2 líneas; se encoge un poco. */}
              <AtTypography
                variant="bodyBold"
                color="#FFFFFF"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {vista === 'participacion'
                  ? 'Ver asociados por tendencia'
                  : 'Ver asociados por participación'}
              </AtTypography>
            </LinearGradient>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between px-4">
          <AtTypography variant="bodyBold">Filtros</AtTypography>
          <View className="flex-row items-center gap-2">
            {hasActiveFilters && (
              <Pressable
                onPress={() => setFilters({ area: 'todos', clientIds: [] })}
                hitSlop={6}
              >
                <AtTypography variant="captionBold" color="#1A3FE8">
                  Borrar
                </AtTypography>
              </Pressable>
            )}
            <MlFilterButton
              active={hasActiveFilters}
              onPress={() => setFiltersVisible(true)}
            />
          </View>
        </View>

        {hasActiveFilters && (
          <View className="flex-row flex-wrap gap-2 px-4">
            {effectiveFilters.area !== 'todos' && (
              <MlFilterChip
                label={effectiveFilters.area}
                onRemove={() =>
                  setFilters((f) => ({ ...f, area: 'todos' }))
                }
              />
            )}
            {clientOptions
              .filter((c) => effectiveFilters.clientIds.includes(c.id))
              .map((c) => (
                <MlFilterChip
                  key={c.id}
                  label={c.name}
                  onRemove={() =>
                    setFilters((f) => ({
                      ...f,
                      clientIds: f.clientIds.filter((id) => id !== c.id),
                    }))
                  }
                />
              ))}
          </View>
        )}

        <View className="px-4">
          {vista === 'participacion' ? (
            <OrCarteraDonut
              title="Asociados por participación"
              data={donutData}
              headerBadge={
                totalDeltaPercent != null ? (
                  <AtDeltaIndicator value={totalDeltaPercent} size="sm" />
                ) : undefined
              }
              selectedId={selectedSliceId}
              onSelectChange={setSelectedSliceId}
              labelsMode="tap-only"
              valueFormatter={(v) => `${v} asociados`}
              emptyHint="Toca un sector para ver el cliente"
            />
          ) : (
            <OrAsociadosTrend
              months={trend?.months ?? []}
              series={trendSeries}
              selectedId={selectedSliceId ?? TODOS_ID}
              onSelectChange={(id) =>
                setSelectedSliceId(id === TODOS_ID ? null : id)
              }
            />
          )}
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
          <View className="flex-row items-center justify-between px-4">
            <AtTypography variant="bodyBold" color="#1A1F36">
              Cliente
            </AtTypography>
            <AtTypography variant="bodyBold" color="#1A1F36">
              Asociados
            </AtTypography>
          </View>

          <View className="gap-2 px-4">
            {isPending && <MlReportListSkeleton />}
            {!isPending && visibleClients.length === 0 && (
              <AtTypography variant="caption" color="#8892A4">
                Sin clientes que coincidan con los filtros.
              </AtTypography>
            )}
            {visibleClients.map((row) => (
              <MlAsociadoClientRow
                key={row.client.id}
                name={row.client.name}
                color={colorByClientId.get(row.client.id) ?? row.client.color}
                count={row.count}
                onPress={() =>
                  router.push(
                    `/(tabs)/informes/asociados/${row.client.id}` as never,
                  )
                }
              />
            ))}
          </View>
        </View>

      </ScrollView>

      <View
        className="absolute left-0 right-0 bottom-0 px-4 pt-1 bg-bg-secondary"
        // Holgura acotada (8–12px) para pegar la card al fondo de forma
        // consistente, sin el espacio extra del safe-area en algunos devices.
        style={{ paddingBottom: Math.min(Math.max(insets.bottom, 8), 12) }}
      >
        <MlSimpleTotalFooter value={total} />
      </View>

      <OrAsociadosFiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        clients={clientOptions}
        areas={areaOptions}
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

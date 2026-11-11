/**
 * Informe Pagos — pantalla principal.
 *
 * Layout scrolleable:
 *   1. Search + breadcrumb
 *   2. Fila "Filtros" (toggle + botón filtros) y chips de filtros aplicados
 *   3. Card cabecera con toggle "Por fecha" (calendario heatmap) / "Por
 *      empresa generadora" (donut)
 *   4. Headers "Empresa generadora" / "Total"
 *   5. Lista de cards de pagos
 *   6. Footer "Total" navy
 *
 * Tap en una celda del calendario abre el sheet "Detalle del día".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Pressable, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlReportListSkeleton } from '@/src/components/molecules/ml-report-list-skeleton';
import { MlFilterChip } from '@/src/components/molecules/ml-filter-chip';
import { MlPagoCard } from '@/src/components/molecules/ml-pago-card';
import { MlFilterButton } from '@/src/components/molecules/ml-filter-button';
import { MlSimpleTotalFooter } from '@/src/components/molecules/ml-simple-total-footer';
import { OrPagosCalendar } from '@/src/components/organisms/or-pagos-calendar';
import { OrPagoDayDetailSheet } from '@/src/components/organisms/or-pago-day-detail-sheet';
import { OrPagosFiltersSheet } from '@/src/components/organisms/or-pagos-filters-sheet';
import { OrCarteraDonut } from '@/src/components/organisms/or-cartera-donut';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/src/theme/gradients';
import { usePagos } from '@/src/hooks/queries/use-pagos';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import {
  EMPTY_PAGOS_FILTERS,
  formatShortDate,
  type Pago,
  type PagosFilters,
} from '@/src/types/pagos.types';
import { formatCurrency } from '@/src/utils/currency';
import { buildDonutSlices } from '@/src/utils/donut';

/** Id del sector "Otros" del donut (sentinela; no choca con la empresa real). */
const PAGOS_OTROS_ID = '__otros_donut__';

/** Separador de 12px entre cards de pago en la lista virtualizada. */
function Separator() {
  return <View style={{ height: 12 }} />;
}

function inRange(iso: string, from: string | null, to: string | null): boolean {
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

export default function PagosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isPending } = usePagos();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filtersActive, setFiltersActive] = useState(true);
  const [filters, setFilters] = useState<PagosFilters>(EMPTY_PAGOS_FILTERS);
  // null hasta que el usuario navegue; antes sigue el último mes con datos.
  const [yearMonth, setYearMonth] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [detailDay, setDetailDay] = useState<string | null>(null);
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  // Vista derivada del toggle: ON = calendario por fecha, OFF = donut por
  // empresa generadora. Misma señal que controla los chips de filtros.
  const vista: 'calendario' | 'donut' = filtersActive ? 'calendario' : 'donut';
  const effective = filtersActive ? filters : EMPTY_PAGOS_FILTERS;

  // Mes visible del calendario: el último mes con datos hasta que el usuario
  // navegue con las flechas (que fijan `yearMonth`).
  const ym = yearMonth ?? (data?.todayIso ? data.todayIso.slice(0, 7) : '2026-06');

  const empresasMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    data?.empresas.forEach((e) => map.set(e.id, { name: e.name, color: e.color }));
    return map;
  }, [data]);

  const centrosMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.centrosCostos.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [data]);

  const empleadosMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.empleados.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [data]);

  const filteredPagos = useMemo(() => {
    if (!data) return [];
    return data.pagos.filter((p) => {
      if (!inRange(p.fecha, effective.dateFrom, effective.dateTo)) return false;
      if (effective.empresaIds.length && !effective.empresaIds.includes(p.empresaId))
        return false;
      if (
        effective.centroCostosIds.length &&
        !effective.centroCostosIds.includes(p.centroCostosId)
      )
        return false;
      if (effective.empleadoIds.length && !effective.empleadoIds.includes(p.empleadoId))
        return false;
      return true;
    });
  }, [data, effective]);

  const totalsByDate = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of filteredPagos) {
      out[p.fecha] = (out[p.fecha] ?? 0) + p.monto;
    }
    return out;
  }, [filteredPagos]);

  // Variación % del total del día seleccionado vs el día con pagos
  // inmediatamente anterior (badge del donut). null si no hay día previo.
  const dayDeltaPercent = useMemo(() => {
    if (!selectedDay) return null;
    const prevDay = Object.keys(totalsByDate)
      .filter((d) => d < selectedDay)
      .sort()
      .pop();
    if (!prevDay) return null;
    const prev = totalsByDate[prevDay] ?? 0;
    if (prev === 0) return null;
    const current = totalsByDate[selectedDay] ?? 0;
    return ((current - prev) / prev) * 100;
  }, [selectedDay, totalsByDate]);

  // El donut de empresa generadora es del día seleccionado (su detalle).
  // Color por posición (mayor→menor, empieza en naranja); del 8º en adelante
  // se agrupa en "Otros" (remolacha).
  const { donutData, donutOtrosIds } = useMemo(() => {
    if (!data || !selectedDay) return { donutData: [], donutOtrosIds: [] };
    const source = filteredPagos.filter((p) => p.fecha === selectedDay);
    const totals = new Map<string, number>();
    for (const p of source) {
      totals.set(p.empresaId, (totals.get(p.empresaId) ?? 0) + p.monto);
    }
    const nameById = new Map(data.empresas.map((e) => [e.id, e.name]));
    const sorted = [...totals.entries()]
      .map(([id, value]) => ({ id, value, label: nameById.get(id) ?? id }))
      .sort((a, b) => b.value - a.value);
    const { slices, otrosIds } = buildDonutSlices(sorted, {
      id: PAGOS_OTROS_ID,
      label: 'Otros',
    });
    // Cada sector con el color de su empresa (igual que el dot de las cards de
    // la lista de abajo), no por posición. El sector "Otros" conserva su
    // remolacha de agrupado.
    const colored = slices.map((s) =>
      s.id === PAGOS_OTROS_ID
        ? s
        : { ...s, color: empresasMap.get(s.id)?.color ?? s.color },
    );
    return { donutData: colored, donutOtrosIds: otrosIds };
  }, [data, filteredPagos, selectedDay, empresasMap]);

  // Lista de abajo: cuando hay un día seleccionado en el calendario, se
  // filtra a ese día. El calendario (totalsByDate / donut / totales del mes)
  // sigue usando `filteredPagos` completo para no vaciar el heatmap.
  const listaPagos = useMemo(() => {
    let base = selectedDay
      ? filteredPagos.filter((p) => p.fecha === selectedDay)
      : filteredPagos;
    // En la vista donut, el segmento seleccionado (empresa) filtra la lista.
    // El sector "Otros" agrupa varias empresas (las que quedaron fuera del top).
    if (vista === 'donut' && selectedSliceId) {
      if (selectedSliceId === PAGOS_OTROS_ID) {
        const ids = new Set(donutOtrosIds);
        base = base.filter((p) => ids.has(p.empresaId));
      } else {
        base = base.filter((p) => p.empresaId === selectedSliceId);
      }
    }
    return base;
  }, [filteredPagos, selectedDay, vista, selectedSliceId, donutOtrosIds]);

  const listaTotal = useMemo(
    () => listaPagos.reduce((s, p) => s + p.monto, 0),
    [listaPagos],
  );

  const hasActiveFilters =
    !!effective.dateFrom ||
    !!effective.dateTo ||
    effective.empresaIds.length > 0 ||
    effective.centroCostosIds.length > 0 ||
    effective.empleadoIds.length > 0;

  // Tocar un día abre el sheet "Detalle del día" y lo selecciona como filtro
  // de la lista (se deselecciona desde el chip "Día: ...").
  const handleSelectDay = (iso: string) => {
    setSelectedDay(iso);
    setDetailDay(iso);
  };

  // El botón "Ver total por empresa generadora" solo se habilita cuando hay un
  // día seleccionado (el detalle por empresa es de ese día). En la vista donut
  // el botón siempre permite volver al calendario.
  const viewButtonDisabled = vista === 'calendario' && !selectedDay;

  // Reset selección del donut si el slice ya no existe (cambió filtro).
  React.useEffect(() => {
    if (selectedSliceId && !donutData.some((s) => s.id === selectedSliceId)) {
      setSelectedSliceId(null);
    }
  }, [donutData, selectedSliceId]);

  // Limpia el día seleccionado si ese día ya no tiene pagos (cambió un filtro).
  React.useEffect(() => {
    if (selectedDay && !(totalsByDate[selectedDay] > 0)) {
      setSelectedDay(null);
    }
  }, [selectedDay, totalsByDate]);

  // El detalle por empresa generadora siempre es de un día; si quedamos en esa
  // vista sin día seleccionado, volvemos al calendario.
  React.useEffect(() => {
    if (vista === 'donut' && !selectedDay) {
      setFiltersActive(true);
    }
  }, [vista, selectedDay]);

  // Item de la lista virtualizada (FlashList). Va envuelto en px-4 para que
  // el padding horizontal no afecte al header.
  const renderItem = useCallback(
    ({ item: p }: { item: Pago }) => {
      const empresa = empresasMap.get(p.empresaId);
      return (
        <View className="px-4">
          <MlPagoCard
            empresaName={empresa?.name ?? p.empresaId}
            empresaColor={empresa?.color ?? '#1A1F36'}
            monto={p.monto}
            centroCostos={centrosMap.get(p.centroCostosId) ?? '—'}
            empleado={empleadosMap.get(p.empleadoId) ?? '—'}
            concepto={p.concepto}
            fecha={p.fecha}
            onPress={
              vista === 'donut'
                ? () =>
                    setSelectedSliceId((cur) =>
                      cur === p.empresaId ? null : p.empresaId,
                    )
                : undefined
            }
            selected={vista === 'donut' && selectedSliceId === p.empresaId}
          />
        </View>
      );
    },
    [empresasMap, centrosMap, empleadosMap, vista, selectedSliceId],
  );

  // Todo lo que va por encima de la lista de pagos. Se pasa como elemento
  // (no como componente inline) para que el calendario/donut no se
  // re-monten en cada render. El gap-4 reproduce el espaciado original.
  const listHeader = (
    <View className="gap-4" style={{ marginBottom: 12 }}>
      <View className="px-4 pt-2">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>

        <View className="px-4">
          <MlBreadcrumb
            segments={['Informes', 'Pagos']}
            onBack={() => router.back()}
          />
        </View>

        {/* Botón para alternar la vista: por fecha (calendario) ↔ por empresa
            generadora (donut). Solo se habilita para ir al detalle por empresa
            cuando hay un día seleccionado; el label muestra la vista destino. */}
        <View className="px-4 gap-1">
          <Pressable
            onPress={() => {
              if (viewButtonDisabled) return;
              setFiltersActive((v) => !v);
            }}
            disabled={viewButtonDisabled}
            style={{
              borderRadius: 12,
              borderCurve: 'continuous',
              overflow: 'hidden',
              opacity: viewButtonDisabled ? 0.45 : 1,
              boxShadow: viewButtonDisabled
                ? undefined
                : '0 2px 6px rgba(4, 17, 63, 0.35)',
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
                {vista === 'calendario'
                  ? 'Ver total por empresa generadora'
                  : 'Ver total por fecha'}
              </AtTypography>
            </LinearGradient>
          </Pressable>
          {viewButtonDisabled && (
            <AtTypography variant="caption" color="#8892A4" className="px-1">
              Selecciona un día del calendario para ver el total por empresa
              generadora.
            </AtTypography>
          )}
        </View>

        {/* Filtros bar */}
        <View className="flex-row items-center justify-between px-4">
          <AtTypography variant="bodyBold">Filtros</AtTypography>
          <View className="flex-row items-center gap-2">
            {hasActiveFilters && filtersActive && (
              <Pressable
                onPress={() => setFilters(EMPTY_PAGOS_FILTERS)}
                hitSlop={6}
              >
                <AtTypography variant="captionBold" color="#1A3FE8">
                  Borrar filtros
                </AtTypography>
              </Pressable>
            )}
            <MlFilterButton
              active={hasActiveFilters && filtersActive}
              onPress={() => setFiltersVisible(true)}
            />
          </View>
        </View>

        {/* Chips de filtros aplicados */}
        {filtersActive && hasActiveFilters && (
          <View className="flex-row flex-wrap gap-2 px-4">
            {effective.dateFrom && effective.dateTo && (
              <MlFilterChip
                label={`Fecha: ${formatShortDate(effective.dateFrom)} - ${formatShortDate(effective.dateTo)}`}
                onRemove={() =>
                  setFilters((f) => ({ ...f, dateFrom: null, dateTo: null }))
                }
              />
            )}
            {effective.empresaIds.map((id) => (
              <MlFilterChip
                key={`emp-${id}`}
                label={`Empresa: ${empresasMap.get(id)?.name ?? id}`}
                onRemove={() =>
                  setFilters((f) => ({
                    ...f,
                    empresaIds: f.empresaIds.filter((x) => x !== id),
                  }))
                }
              />
            ))}
            {effective.centroCostosIds.map((id) => (
              <MlFilterChip
                key={`cc-${id}`}
                label={`Centro de costos: ${centrosMap.get(id) ?? id}`}
                onRemove={() =>
                  setFilters((f) => ({
                    ...f,
                    centroCostosIds: f.centroCostosIds.filter((x) => x !== id),
                  }))
                }
              />
            ))}
            {effective.empleadoIds.map((id) => (
              <MlFilterChip
                key={`emp-${id}`}
                label={`Empleado/Hotel: ${empleadosMap.get(id) ?? id}`}
                onRemove={() =>
                  setFilters((f) => ({
                    ...f,
                    empleadoIds: f.empleadoIds.filter((x) => x !== id),
                  }))
                }
              />
            ))}
          </View>
        )}

        {/* Card cabecera — calendario cuando filtros ON, donut cuando OFF */}
        {data && vista === 'calendario' && (
          <View className="px-4">
            <OrPagosCalendar
              yearMonth={ym}
              totalsByDate={totalsByDate}
              bucketsByDate={data.dayBuckets}
              onChangeMonth={setYearMonth}
              onSelectDay={handleSelectDay}
              selectedDay={selectedDay}
            />
          </View>
        )}

        {data && vista === 'donut' && (
          <View className="px-4">
            <OrCarteraDonut
              title={
                selectedDay
                  ? `Empresa generadora · ${formatShortDate(selectedDay)}`
                  : 'Total por empresa generadora'
              }
              data={donutData}
              headerBadge={
                dayDeltaPercent != null ? (
                  <AtDeltaIndicator value={dayDeltaPercent} size="sm" />
                ) : undefined
              }
              labelsMode="tap-only"
              selectedId={selectedSliceId}
              onSelectChange={setSelectedSliceId}
              valueFormatter={(v) => formatCurrency(v)}
              emptyHint="Toca un sector para ver la empresa"
            />
          </View>
        )}

        {/* Chip del día seleccionado (filtra la lista en la vista calendario) */}
        {selectedDay && vista === 'calendario' && (
          <View className="flex-row px-4">
            <MlFilterChip
              label={`Día: ${formatShortDate(selectedDay)}`}
              onRemove={() => setSelectedDay(null)}
            />
          </View>
        )}

      {/* Lista headers */}
      <View className="flex-row items-center justify-between px-4">
        <AtTypography variant="bodyBold" color="#1A1F36">
          Empresa generadora
        </AtTypography>
        <AtTypography variant="bodyBold" color="#1A1F36">
          Total
        </AtTypography>
      </View>
    </View>
  );

  return (
    <View
      className="flex-1 bg-bg-secondary"
      style={{ paddingTop: insets.top }}
    >
      <FlashList
        data={listaPagos}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View className="px-4">
            {isPending ? (
              <MlReportListSkeleton />
            ) : (
              <AtTypography variant="caption" color="#8892A4">
                {selectedDay
                  ? 'Sin pagos en el día seleccionado.'
                  : 'Sin pagos que coincidan con los filtros.'}
              </AtTypography>
            )}
          </View>
        }
        ItemSeparatorComponent={Separator}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Total fijo: anclado al fondo de la pantalla, fuera del ScrollView,
          para que siempre sea visible al recorrer la lista de pagos. */}
      {listaPagos.length > 0 && (
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
          <MlSimpleTotalFooter value={formatTotal(listaTotal)} />
        </View>
      )}

      <OrPagoDayDetailSheet
        visible={!!detailDay}
        onClose={() => setDetailDay(null)}
        iso={detailDay}
        total={detailDay ? (totalsByDate[detailDay] ?? 0) : 0}
        bucket={
          (detailDay && data?.dayBuckets[detailDay]) || 'medio'
        }
      />

      <OrPagosFiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        initialFilters={filters}
        empresas={data?.empresas ?? []}
        centrosCostos={data?.centrosCostos ?? []}
        empleados={data?.empleados ?? []}
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

function formatTotal(value: number): string {
  const base = formatCurrency(value);
  const decimals = value.toFixed(2).split('.')[1];
  return `${base},${decimals}`;
}

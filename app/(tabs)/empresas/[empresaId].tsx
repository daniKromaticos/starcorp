/**
 * Otras compañías — detalle de una compañía.
 *
 * Toggle Ingresos/Gastos → donut por categoría + lista de terceros con
 * cross-filtrado bidireccional (como financiero/ingresos): tocar un
 * sector filtra la lista a los terceros de esa categoría (con su monto
 * dentro de ella); tocar un tercero colapsa la lista a esa fila y
 * recalcula el donut con solo sus categorías. Requiere `links`
 * (BBM real); en las compañías mock la selección solo resalta.
 * La tarjeta navy de Total queda FIJA abajo (fuera del scroll) y refleja
 * lo visible. Filtro de periodo (año/mes) en bottom sheet.
 */

import React, { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlEmptyState } from '@/src/components/molecules/ml-empty-state';
import { MlSegmentedToggle } from '@/src/components/molecules/ml-segmented-toggle';
import { MlSimpleTotalFooter } from '@/src/components/molecules/ml-simple-total-footer';
import { OrCarteraDonut } from '@/src/components/organisms/or-cartera-donut';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { OrEmpresaTercerosList } from '@/src/components/organisms/or-empresa-terceros-list';
import {
  OrEmpresaFiltersSheet,
  DEFAULT_EMPRESA_FILTERS,
} from '@/src/components/organisms/or-empresa-filters-sheet';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { useEmpresaDetail } from '@/src/hooks/queries/use-empresa-detail';
import { formatCurrency } from '@/src/utils/currency';
import { formatNumber } from '@/src/utils/number';
import type { EmpresaFilters, EmpresaTipo } from '@/src/types/empresas.types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Fallback cuando el backend no devuelve período (compañías mock). */
function periodLabel(f: EmpresaFilters): string {
  const year = f.year === 'corriente' ? '2026' : f.year;
  // 'ultimo' = último mes cerrado (mock: Abril 2026).
  if (f.month === 'ultimo') return `Abril ${year}`;
  return `${MONTHS[Number(f.month) - 1] ?? ''} ${year}`;
}

const TIPO_OPTIONS = [
  { value: 'ingresos', label: 'Ingresos' },
  { value: 'gastos', label: 'Gastos' },
];

/** Selección única del cross-filtrado: un sector del donut (categoría)
 *  o una fila de la lista (tercero); elegir uno reemplaza al otro. */
type Selection = { kind: 'categoria' | 'tercero'; id: string } | null;

export default function EmpresaDetailScreen() {
  const insets = useSafeAreaInsets();
  const { empresaId } = useLocalSearchParams<{ empresaId: string }>();
  const router = useRouter();
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [tipo, setTipo] = useState<EmpresaTipo>('ingresos');
  const [filters, setFilters] = useState<EmpresaFilters>(DEFAULT_EMPRESA_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);

  const { data: detail, isLoading } = useEmpresaDetail(empresaId ?? '', filters);

  const financials = detail ? detail[tipo] : null;

  // ── Cross-filtrado torta↔lista ────────────────────────────────────
  // Con una categoría elegida, la lista muestra los terceros de esa
  // categoría (monto dentro de ella). Con un tercero elegido, el donut se
  // recalcula con las categorías de ese tercero. Sin `links` (mock) la
  // selección solo resalta.
  const donutCategories = useMemo(() => {
    if (!financials) return [];
    if (selection?.kind === 'tercero' && financials.links) {
      const byCat = new Map<string, number>();
      for (const l of financials.links) {
        if (l.terceroId === selection.id) {
          byCat.set(l.categoryId, (byCat.get(l.categoryId) ?? 0) + l.amount);
        }
      }
      if (byCat.size > 0) {
        return financials.categories
          .map((c) => ({ ...c, amount: byCat.get(c.id) ?? 0 }))
          .filter((c) => c.amount > 0);
      }
    }
    return financials.categories;
  }, [financials, selection]);

  const listTerceros = useMemo(() => {
    if (!financials) return [];
    if (selection?.kind === 'categoria' && financials.links) {
      const byTercero = new Map<string, number>();
      for (const l of financials.links) {
        if (l.categoryId === selection.id) {
          byTercero.set(l.terceroId, (byTercero.get(l.terceroId) ?? 0) + l.amount);
        }
      }
      return financials.terceros
        .filter((t) => byTercero.has(t.id))
        .map((t) => ({ ...t, amount: byTercero.get(t.id)! }))
        .sort((a, b) => b.amount - a.amount);
    }
    return financials.terceros;
  }, [financials, selection]);

  const donutSelectedId = selection?.kind === 'categoria' ? selection.id : null;
  const listSelectedId = selection?.kind === 'tercero' ? selection.id : null;

  const selectedTercero =
    listSelectedId != null
      ? financials?.terceros.find((t) => t.id === listSelectedId) ?? null
      : null;

  // El footer navy siempre refleja lo visible en la lista.
  const footerTotal =
    selectedTercero != null
      ? selectedTercero.amount
      : selection?.kind === 'categoria' && financials?.links
        ? listTerceros.reduce((s, t) => s + t.amount, 0)
        : financials?.tercerosTotal ?? 0;
  // BBM (real) devuelve el período resuelto por el RPC ("último mes con
  // datos"); el chip lo muestra tal cual. Mock cae al label derivado.
  const periodText = useMemo(() => {
    if (detail?.period) {
      return `${MONTHS[detail.period.month - 1] ?? ''} ${detail.period.year}`;
    }
    return periodLabel(filters);
  }, [detail?.period, filters]);
  const tipoLabel = tipo === 'ingresos' ? 'Ingresos' : 'Gastos';

  return (
    <View className="flex-1 bg-bg-secondary" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6 pb-6"
      >
        <View className="px-4 pt-2">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>

        <View className="px-4">
          <MlBreadcrumb
            segments={['Otras compañías', detail?.name ?? '']}
            onBack={() => router.back()}
          />
        </View>

        {isLoading && !detail ? (
          <View className="gap-3 px-4">
            <AtSkeleton width="100%" height={48} />
            <AtSkeleton width="100%" height={320} />
          </View>
        ) : !detail ? (
          <MlEmptyState
            icon="business"
            title="Compañía no encontrada"
            description="No pudimos cargar el detalle de esta compañía."
          />
        ) : (
          <>
            {/* Toggle Ingresos / Gastos */}
            <View className="px-4">
              <MlSegmentedToggle
                options={TIPO_OPTIONS}
                value={tipo}
                onChange={(v) => {
                  setTipo(v as EmpresaTipo);
                  setSelection(null);
                }}
                gradient="brandOrange"
              />
            </View>

            {/* Fila Filtros */}
            <View className="px-4 flex-row items-center justify-between">
              <AtTypography variant="bodyBold">Filtros</AtTypography>
              <Pressable
                onPress={() => setFiltersVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Abrir filtros"
                className="rounded-lg p-2.5"
                style={{ backgroundColor: '#0F1B4A', borderCurve: 'continuous' }}
              >
                <AtIcon name="filter-list" size="md" color="#FFFFFF" />
              </Pressable>
            </View>

            {financials && (
              <>
                <View className="px-4">
                  {/* Mismo donut que /informes/cartera (look y comportamiento);
                      el chip de periodo va como badge del header. */}
                  <OrCarteraDonut
                    title={`Distribución ${tipoLabel.toLowerCase()} por categoría`}
                    headerBadge={
                      <View
                        className="rounded-full bg-bg-secondary px-3 py-1"
                        style={{ borderCurve: 'continuous' }}
                      >
                        <AtTypography variant="caption" color="#4A5568">
                          {periodText}
                        </AtTypography>
                      </View>
                    }
                    data={donutCategories.map((c) => ({
                      id: c.id,
                      value: c.amount,
                      color: c.color,
                      label: c.label,
                    }))}
                    labelsMode="tap-only"
                    selectedId={donutSelectedId}
                    onSelectChange={(id) =>
                      setSelection(id ? { kind: 'categoria', id } : null)
                    }
                    valueFormatter={(v) => formatCurrency(v)}
                    emptyHint="Toca un sector para ver la categoría"
                    externalSelection={
                      selectedTercero
                        ? {
                            label: selectedTercero.name,
                            value: selectedTercero.amount,
                            color: selectedTercero.color,
                            pct:
                              financials.total > 0
                                ? (selectedTercero.amount / financials.total) *
                                  100
                                : null,
                          }
                        : null
                    }
                  />
                </View>

                <OrEmpresaTercerosList
                  terceros={listTerceros}
                  selectedId={listSelectedId}
                  onSelectChange={(id) =>
                    setSelection(id ? { kind: 'tercero', id } : null)
                  }
                />
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Tarjeta navy de Total — FIJA al fondo */}
      {financials && (
        <View
          className="px-4 pt-2 bg-bg-secondary"
          style={{ paddingBottom: 8 }}
        >
          <MlSimpleTotalFooter value={formatNumber(footerTotal, 2)} />
        </View>
      )}

      <OrEmpresaFiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        initialFilters={filters}
        onApply={(f) => {
          setFilters(f);
          setSelection(null);
        }}
      />

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="empresas"
      />
    </View>
  );
}

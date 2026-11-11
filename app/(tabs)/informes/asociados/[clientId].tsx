/**
 * Informe Asociados — detalle del cliente.
 *
 * Entra a un resumen por cargo (HOUSEKEEPING, DISHWASHER, …) con la cantidad
 * de asociados de cada uno; tocar un cargo abre la lista de sus empleados
 * (área + código interno) y "Cargos" vuelve al resumen. "Ver todos" lista el
 * cliente completo. El filtro por área del bottom sheet sigue disponible y
 * lleva directo a la lista de ese cargo.
 */

import React, { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { MlFilterChip } from '@/src/components/molecules/ml-filter-chip';
import { MlFilterButton } from '@/src/components/molecules/ml-filter-button';
import { MlAsociadoCargoRow } from '@/src/components/molecules/ml-asociado-cargo-row';
import { MlAsociadoEmployeeRow } from '@/src/components/molecules/ml-asociado-employee-row';
import {
  OrAsociadosFiltersSheet,
  type AsociadosFilters,
} from '@/src/components/organisms/or-asociados-filters-sheet';
import { OrDrawer } from '@/src/components/organisms/or-drawer';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDivider } from '@/src/components/atoms/at-divider';
import { useAsociados } from '@/src/hooks/queries/use-asociados';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import type { AsociadoEmployee } from '@/src/types/asociados.types';
import { donutColorAt } from '@/src/utils/donut';

const SIN_CARGO = 'Sin cargo';

function truncate(text: string, max = 18): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Cargo del empleado para agrupar; el área viene libre y puede venir vacía. */
function cargoOf(e: AsociadoEmployee): string {
  return e.area?.trim() || SIN_CARGO;
}

export default function AsociadoClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { data } = useAsociados();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<AsociadosFilters>({
    area: 'todos',
    clientIds: [],
  });
  // "Ver todos" desde el resumen: lista completa sin elegir un cargo.
  const [showAll, setShowAll] = useState(false);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const client = useMemo(
    () => data?.clients.find((c) => c.id === clientId),
    [data, clientId],
  );

  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    (client?.employees ?? []).forEach((e) => set.add(cargoOf(e)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [client]);

  // Resumen: un grupo por cargo, de mayor a menor cantidad de asociados.
  const cargos = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of client?.employees ?? []) {
      const k = cargoOf(e);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([cargo, count]) => ({ cargo, count }))
      .sort((a, b) => b.count - a.count || a.cargo.localeCompare(b.cargo));
  }, [client]);

  const totalEmployees = client?.employees.length ?? 0;

  const employees = useMemo(() => {
    if (!client) return [];
    return filters.area === 'todos'
      ? client.employees
      : client.employees.filter((e) => cargoOf(e) === filters.area);
  }, [client, filters.area]);

  const hasActiveFilters = filters.area !== 'todos';
  const showList = hasActiveFilters || showAll;

  const openCargo = (cargo: string) => {
    setShowAll(false);
    setFilters((f) => ({ ...f, area: cargo }));
  };
  const backToCargos = () => {
    setShowAll(false);
    setFilters((f) => ({ ...f, area: 'todos' }));
  };

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
            segments={[
              'Informes',
              'Asociados activos',
              truncate(client?.name ?? 'Cliente'),
            ]}
            onBack={() => router.back()}
          />
        </View>

        <View className="flex-row items-center justify-between px-4">
          <View className="flex-row items-center gap-3 flex-1">
            <AtTypography variant="bodyBold">Filtros</AtTypography>
            {hasActiveFilters && (
              <Pressable onPress={backToCargos} hitSlop={6}>
                <AtTypography variant="captionBold" color="#1A3FE8">
                  Borrar
                </AtTypography>
              </Pressable>
            )}
          </View>
          <MlFilterButton
            active={hasActiveFilters}
            onPress={() => setFiltersVisible(true)}
          />
        </View>

        {hasActiveFilters && (
          <View className="flex-row flex-wrap gap-2 px-4">
            <MlFilterChip label={filters.area} onRemove={backToCargos} />
          </View>
        )}

        <View className="px-4">
          <AtTypography variant="h2">{client?.name ?? '—'}</AtTypography>
        </View>

        {showList ? (
          <>
            <View className="flex-row items-center justify-between px-4">
              <Pressable
                onPress={backToCargos}
                hitSlop={8}
                className="flex-row items-center gap-1"
                accessibilityRole="button"
                accessibilityLabel="Volver al resumen por cargo"
              >
                <AtIcon name="chevron-left" size="sm" color="#1A3FE8" />
                <AtTypography variant="captionBold" color="#1A3FE8">
                  Cargos
                </AtTypography>
              </Pressable>
              <AtTypography variant="captionBold" color="#4A5568">
                {`${hasActiveFilters ? filters.area : 'Todos los cargos'} · ${employees.length}`}
              </AtTypography>
            </View>

            <View className="flex-row items-center justify-between px-4">
              <AtTypography variant="bodyBold" color="#1A1F36">
                Empleado
              </AtTypography>
              <AtTypography variant="bodyBold" color="#1A1F36">
                Código interno
              </AtTypography>
            </View>

            <AtDivider className="mx-4" />

            <View className="gap-2 px-4">
              {employees.length === 0 && (
                <AtTypography variant="caption" color="#8892A4">
                  Sin empleados para mostrar.
                </AtTypography>
              )}
              {employees.map((e, i) => (
                <MlAsociadoEmployeeRow
                  key={e.id}
                  name={e.name}
                  area={e.area}
                  codigoInterno={e.codigoInterno}
                  variant={i % 2 === 0 ? 'plain' : 'card'}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <View className="flex-row items-center justify-between px-4">
              <AtTypography variant="bodyBold" color="#1A1F36">
                {`Asociados por cargo · ${totalEmployees}`}
              </AtTypography>
              {totalEmployees > 0 && (
                <Pressable onPress={() => setShowAll(true)} hitSlop={6}>
                  <AtTypography variant="captionBold" color="#1A3FE8">
                    Ver todos
                  </AtTypography>
                </Pressable>
              )}
            </View>

            <View className="gap-2 px-4">
              {cargos.length === 0 && (
                <AtTypography variant="caption" color="#8892A4">
                  Sin empleados para mostrar.
                </AtTypography>
              )}
              {cargos.map((c, i) => (
                <MlAsociadoCargoRow
                  key={c.cargo}
                  cargo={c.cargo}
                  count={c.count}
                  percent={
                    totalEmployees > 0 ? (c.count / totalEmployees) * 100 : 0
                  }
                  color={donutColorAt(i)}
                  onPress={() => openCargo(c.cargo)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <OrAsociadosFiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        clients={[]}
        areas={areaOptions}
        initialFilters={filters}
        onApply={setFilters}
        showClientFilter={false}
      />

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="informes"
      />
    </View>
  );
}

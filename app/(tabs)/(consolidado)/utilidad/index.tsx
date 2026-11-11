/**
 * /utilidad — consolidated utilidad screen.
 *
 * Layout: pinned top (search + breadcrumb + filter + selected-client chart),
 * scrollable bottom (client list). Tapping a client row swaps the chart to
 * that client's utilidad trend (Totalizado / Corriente / Histórico).
 */

import { AtSkeleton } from "@/src/components/atoms/at-skeleton";
import { MlBreadcrumb } from "@/src/components/molecules/ml-breadcrumb";
import { MlClientRow } from "@/src/components/molecules/ml-client-row";
import { MlEmptyState } from "@/src/components/molecules/ml-empty-state";
import { MlSearchBar } from "@/src/components/molecules/ml-search-bar";
import { MlTimeFilterBar } from "@/src/components/molecules/ml-time-filter-bar";
import { AtIcon } from "@/src/components/atoms/at-icon";
import { OrDrawer } from "@/src/components/organisms/or-drawer";
import { OrRevenueChartCard } from "@/src/components/organisms/or-revenue-chart-card";
import { useConsolidadoClients } from "@/src/hooks/queries/use-consolidado-clients";
import { useFiltersStore } from "@/src/stores/filters.store";
import { useGlobalSearchStore } from "@/src/stores/global-search.store";
import { ScrollView, TextInput, View } from "@/src/tw";
import type { PeriodKey } from "@/src/types/domain.types";
import { PERIOD_SHORT_LABELS } from "@/src/utils/date";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PERIOD_OPTIONS = (["today", "1w", "1m", "3m", "12m"] as PeriodKey[]).map(
  (key) => ({ key, label: PERIOD_SHORT_LABELS[key] }),
);

export default function UtilidadConsolidadaScreen() {
  const insets = useSafeAreaInsets();
  const activePeriodKey = useFiltersStore((s) => s.activePeriodKey);
  const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);

  const { data, isLoading } = useConsolidadoClients("utilidad");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [query, setQuery] = useState("");
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  // 320×568: con la card del chart fija no queda área de scroll para la
  // lista; en pantallas bajas el chart pasa a scrollear con la lista.
  const pinChart = useWindowDimensions().height > 700;

  const filtered = useMemo(() => {
    if (!data) return null;
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((c) => c.name.toLowerCase().includes(q));
  }, [data, query]);

  const selected = data?.[selectedIndex];

  const handleFilterSelect = useCallback(
    (key: string) => setActivePeriod(key as PeriodKey),
    [setActivePeriod],
  );
  const goToWidestPeriod = useCallback(
    () => setActivePeriod("12m"),
    [setActivePeriod],
  );

  const isPending = isLoading && !data;
  const isEmpty = !!data && data.length === 0;

  // Misma card que Ingresos/Costos/Gastos: Totalizado (ambas series),
  // Corriente o Histórico del cliente seleccionado.
  const chartCard =
    !isPending && !isEmpty && selected ? (
      <OrRevenueChartCard
        categoryId="utilidad"
        label={selected.name}
        period={activePeriodKey}
        centroCosto={selected.id}
      />
    ) : null;

  return (
    <View className="flex-1 bg-bg-primary" style={{ paddingTop: insets.top }}>
      {/* Pinned top: search + breadcrumb + filter + chart card */}
      <View className="gap-4 bg-bg-primary pt-2 pb-3">
        <View className="px-4">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>
        <MlBreadcrumb
          segments={["Utilidad consolidada"]}
          onBack={() => router.back()}
          className="px-4"
        />
        <MlTimeFilterBar
          options={PERIOD_OPTIONS}
          selectedKey={activePeriodKey}
          onSelect={handleFilterSelect}
        />

        {isPending ? (
          <View className="gap-3 px-4">
            <AtSkeleton width="100%" height={220} borderRadius={14} />
          </View>
        ) : pinChart ? (
          chartCard
        ) : null}

        {!isPending && !isEmpty ? (
          <View className="px-4">
            <View
              className="flex-row items-center bg-bg-card px-4 gap-3"
              style={{
                borderRadius: 24,
                borderCurve: "continuous",
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: "rgba(0, 0, 0, 0.08)",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
              }}
            >
              <AtIcon name="search" size="sm" color="#8892A4" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar cliente"
                placeholderTextColor="#8892A4"
                className="flex-1 p-0"
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 14,
                  color: "#1A1F36",
                }}
              />
            </View>
          </View>
        ) : null}
      </View>

      {/* Scrollable client list */}
      {isPending ? (
        <View className="gap-2 px-4">
          {[0, 1, 2, 3].map((i) => (
            <AtSkeleton key={i} width="100%" height={48} borderRadius={8} />
          ))}
        </View>
      ) : isEmpty ? (
        <MlEmptyState
          icon="search-off"
          title="Sin clientes con utilidad en este periodo"
          description={
            activePeriodKey === "12m"
              ? "No hay movimiento en los últimos 12 meses."
              : "Prueba ampliar el rango desde el filtro de arriba."
          }
          action={
            activePeriodKey !== "12m"
              ? { label: "Ver últimos 12 meses", onPress: goToWidestPeriod }
              : undefined
          }
        />
      ) : filtered && filtered.length === 0 ? (
        <>
          {/* Pantalla baja: el chart vive en el scroll de la lista; que no
              desaparezca cuando la búsqueda no encuentra nada. */}
          {!pinChart && chartCard ? <View className="mb-3">{chartCard}</View> : null}
          <MlEmptyState
            icon="search-off"
            title="Sin coincidencias"
            description={`No hay clientes que coincidan con "${query.trim()}".`}
          />
        </>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-4 pb-12"
        >
          {!pinChart && chartCard ? (
            <View className="-mx-4 mb-3">{chartCard}</View>
          ) : null}
          {filtered?.map((c) => {
            const originalIndex = data?.findIndex((d) => d.id === c.id) ?? -1;
            return (
              <MlClientRow
                key={c.id}
                name={c.name}
                color={c.color}
                revenue={c.amount}
                deltaPercent={c.deltaPercent}
                selected={selectedIndex === originalIndex}
                highlighted
                onPress={() => setSelectedIndex(originalIndex)}
              />
            );
          })}
        </ScrollView>
      )}

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="consolidado"
      />
    </View>
  );
}

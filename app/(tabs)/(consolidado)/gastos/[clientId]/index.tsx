/**
 * /gastos/[clientId] — gasto groups for one client. Mirrors costos/[clientId].
 *
 * Layout:
 *   - Pinned: OrRevenueChartCard (gastos trend, same card as Ingresos)
 *   - Scrollable: MlCostGroupAccordionRow list with placeholder sub-items
 */

import { AtSkeleton } from "@/src/components/atoms/at-skeleton";
import { MlCostGroupAccordionRow } from "@/src/components/molecules/ml-cost-group-accordion-row";
import { MlEmptyState } from "@/src/components/molecules/ml-empty-state";
import { OrRevenueChartCard } from "@/src/components/organisms/or-revenue-chart-card";
import { TmConsolidatedDetail } from "@/src/components/templates/tm-consolidated-detail";
import { useCostGroups } from "@/src/hooks/queries/use-cost-groups";
import { useFiltersStore } from "@/src/stores/filters.store";
import { CLIENT_LEGEND_GRADIENTS } from "@/src/theme/gradients";
import { View } from "@/src/tw";
import type { PeriodKey } from "@/src/types/domain.types";
import { PERIOD_SHORT_LABELS } from "@/src/utils/date";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback } from "react";

const PERIOD_OPTIONS = (["today", "1w", "1m", "3m", "12m"] as PeriodKey[]).map(
  (key) => ({ key, label: PERIOD_SHORT_LABELS[key] }),
);

export default function GastosGruposScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const centroCosto = decodeURIComponent(clientId ?? "");
  const activePeriodKey = useFiltersStore((s) => s.activePeriodKey);
  const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);
  const { data, isLoading } = useCostGroups("gastos", clientId ?? "");

  const handleFilterSelect = useCallback(
    (key: string) => setActivePeriod(key as PeriodKey),
    [setActivePeriod],
  );
  const goToWidestPeriod = useCallback(
    () => setActivePeriod("12m"),
    [setActivePeriod],
  );

  return (
    <TmConsolidatedDetail
      breadcrumbs={["Gasto", centroCosto || "..."]}
      filterOptions={PERIOD_OPTIONS}
      selectedFilter={activePeriodKey}
      onFilterSelect={handleFilterSelect}
      onBack={() => router.back()}
      pinnedContent={
        // Misma tendencia que Ingresos (Totalizado / Corriente / Histórico)
        // en vez de barras por grupo: los montos por grupo ya están en la
        // lista de abajo.
        <OrRevenueChartCard
          categoryId="gastos"
          label="Gastos"
          period={activePeriodKey}
          centroCosto={centroCosto}
        />
      }
    >
      {isLoading || !data ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={260} borderRadius={14} />
        </View>
      ) : data.length === 0 ? (
        <MlEmptyState
          icon="search-off"
          title="Sin grupos de gasto en este periodo"
          description={
            activePeriodKey === "12m"
              ? "Este cliente no registra gastos en los últimos 12 meses."
              : "Prueba ampliar el rango desde el filtro de arriba."
          }
          action={
            activePeriodKey !== "12m"
              ? { label: "Ver últimos 12 meses", onPress: goToWidestPeriod }
              : undefined
          }
        />
      ) : (
        <View className="gap-2">
          {data.map((g, index) => {
            const gradientColors = CLIENT_LEGEND_GRADIENTS[
              index % CLIENT_LEGEND_GRADIENTS.length
            ] as [string, string];
            return (
              <MlCostGroupAccordionRow
                key={g.id}
                name={g.label}
                amount={g.amount}
                deltaPercent={g.deltaPercent}
                gradientColors={gradientColors}
                onPress={() =>
                  router.push(
                    `/gastos/${encodeURIComponent(clientId ?? "")}/${encodeURIComponent(g.id)}` as Parameters<
                      typeof router.push
                    >[0],
                  )
                }
              />
            );
          })}
        </View>
      )}
    </TmConsolidatedDetail>
  );
}

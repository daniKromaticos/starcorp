/**
 * /costos/[clientId]/[groupId] — terceros within one cost group for one client.
 *
 * Layout:
 *   - OrThirdPartiesDonutCard — pinned (stays fixed below the filter bar)
 *   - OrTercerosList (search bar + tercero rows) — scrollable area below
 *
 * Tapping a slice or a row selects it; the list collapses to just that
 * selection and the scrollable area resets to the top.
 */

import { AtSkeleton } from "@/src/components/atoms/at-skeleton";
import { MlEmptyState } from "@/src/components/molecules/ml-empty-state";
import {
  OrThirdPartiesDonutCard,
  OTROS_TERCERO_ID,
} from "@/src/components/organisms/or-third-parties-donut-card";
import { OrTercerosList } from "@/src/components/organisms/or-terceros-list";
import { TmConsolidatedDetail } from "@/src/components/templates/tm-consolidated-detail";
import { useCostGroups } from "@/src/hooks/queries/use-cost-groups";
import { useThirdParties } from "@/src/hooks/queries/use-third-parties";
import { useFiltersStore } from "@/src/stores/filters.store";
import { View } from "@/src/tw";
import type { PeriodKey } from "@/src/types/domain.types";
import { PERIOD_SHORT_LABELS } from "@/src/utils/date";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ScrollView as RNScrollView } from "react-native";

const PERIOD_OPTIONS = (["today", "1w", "1m", "3m", "12m"] as PeriodKey[]).map(
  (key) => ({ key, label: PERIOD_SHORT_LABELS[key] }),
);

export default function CostosTercerosScreen() {
  const { clientId, groupId } = useLocalSearchParams<{
    clientId: string;
    groupId: string;
  }>();
  const centroCosto = decodeURIComponent(clientId ?? "");
  const decodedGroupId = decodeURIComponent(groupId ?? "");
  const activePeriodKey = useFiltersStore((s) => s.activePeriodKey);
  const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);

  const { data, isLoading } = useThirdParties(
    "costos",
    decodedGroupId,
    clientId ?? "",
  );
  const { data: groups } = useCostGroups("costos", clientId ?? "");
  const group = groups?.find((g) => g.id === decodedGroupId);

  const handleFilterSelect = useCallback(
    (key: string) => setActivePeriod(key as PeriodKey),
    [setActivePeriod],
  );
  const goToWidestPeriod = useCallback(
    () => setActivePeriod("12m"),
    [setActivePeriod],
  );

  const isReady = !isLoading && data != null;
  const isEmpty = isReady && data.length === 0;
  const [selectedTerceroId, setSelectedTerceroId] = useState<string | null>(
    null,
  );

  const scrollRef = useRef<RNScrollView | null>(null);
  useEffect(() => {
    if (selectedTerceroId) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [selectedTerceroId]);

  return (
    <TmConsolidatedDetail
      breadcrumbs={[
        "Costo",
        centroCosto || "...",
        group?.label ?? decodedGroupId ?? "...",
      ]}
      filterOptions={PERIOD_OPTIONS}
      selectedFilter={activePeriodKey}
      onFilterSelect={handleFilterSelect}
      onBack={() => router.back()}
      scrollRef={scrollRef}
      pinnedContent={
        isReady && !isEmpty && data ? (
          <OrThirdPartiesDonutCard
            sectionTitle="Costos administrativos"
            groupLabel={group?.label ?? decodedGroupId}
            groupAmount={group?.amount ?? 0}
            deltaPercent={group?.deltaPercent ?? 0}
            data={data}
            selectedId={selectedTerceroId}
            onSelectChange={setSelectedTerceroId}
            emptyHint="Toca un sector para ver el tercero"
          />
        ) : undefined
      }
    >
      {isLoading || !data ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={260} borderRadius={14} />
        </View>
      ) : isEmpty ? (
        <MlEmptyState
          icon="search-off"
          title="Sin terceros en este grupo"
          description={
            activePeriodKey === "12m"
              ? "No hay movimiento de terceros en los últimos 12 meses para este grupo."
              : "Prueba ampliar el rango desde el filtro de arriba."
          }
          action={
            activePeriodKey !== "12m"
              ? { label: "Ver últimos 12 meses", onPress: goToWidestPeriod }
              : undefined
          }
        />
      ) : (
        <OrTercerosList
          terceros={data}
          selectedId={selectedTerceroId}
          onSelectChange={setSelectedTerceroId}
          otrosId={OTROS_TERCERO_ID}
        />
      )}
    </TmConsolidatedDetail>
  );
}

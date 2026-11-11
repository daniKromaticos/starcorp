/**
 * Organism: OrConsolidadoClientList
 *
 * Just the cards. The "Clientes (N)" subheader + period select live in
 * `OrConsolidadoClientListHeader` so they can be pinned above the scroll area.
 * Renders a friendly empty state when the active filter returns no clients.
 */

import { AtSkeleton } from "@/src/components/atoms/at-skeleton";
import { MlConsolidadoClientCard } from "@/src/components/molecules/ml-consolidado-client-card";
import { MlEmptyState } from "@/src/components/molecules/ml-empty-state";
import { useConsolidadoClients } from "@/src/hooks/queries/use-consolidado-clients";
import { useFiltersStore } from "@/src/stores/filters.store";
import { View } from "@/src/tw";
import type { ConsolidadoCategoryId } from "@/src/types/domain.types";
import React, { memo, useCallback } from "react";

const AMOUNT_LABEL_BY_CATEGORY: Record<ConsolidadoCategoryId, string> = {
  ingresos: "Ingresos",
  costos: "Costos",
  gastos: "Gastos",
  utilidad: "Utilidad",
  egresos: "Egresos",
};

interface OrConsolidadoClientListProps {
  categoryId: ConsolidadoCategoryId;
  onClientPress?: (clientId: string) => void;
}

export const OrConsolidadoClientList = memo<OrConsolidadoClientListProps>(
  ({ categoryId, onClientPress }) => {
    const { data, isLoading } = useConsolidadoClients(categoryId);
    const periodKey = useFiltersStore((s) => s.activePeriodKey);
    const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);
    const amountLabel = AMOUNT_LABEL_BY_CATEGORY[categoryId];

    const goToWidestPeriod = useCallback(
      () => setActivePeriod("12m"),
      [setActivePeriod],
    );

    if (isLoading || !data) {
      return (
        <View className="gap-2 mx-4">
          {[0, 1, 2, 3].map((i) => (
            <AtSkeleton key={i} width="100%" height={64} borderRadius={14} />
          ))}
        </View>
      );
    }

    if (data.length === 0) {
      return (
        <MlEmptyState
          icon="search-off"
          title={`Sin clientes con ${amountLabel.toLowerCase()} en este periodo`}
          description={
            periodKey === "12m"
              ? "No se encontraron movimientos en los últimos 12 meses."
              : "Prueba ampliar el rango desde el selector de arriba."
          }
          action={
            periodKey !== "12m"
              ? { label: "Ver últimos 12 meses", onPress: goToWidestPeriod }
              : undefined
          }
        />
      );
    }

    return (
      <View className="gap-2">
        {data.map((client) => (
          <MlConsolidadoClientCard
            key={client.id}
            name={client.name}
            amountLabel={amountLabel}
            amount={client.amount}
            deltaPercent={client.deltaPercent}
            onPress={() => onClientPress?.(client.id)}
          />
        ))}
      </View>
    );
  },
);

OrConsolidadoClientList.displayName = "OrConsolidadoClientList";

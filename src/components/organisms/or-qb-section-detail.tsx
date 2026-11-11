/**
 * Organism: OrQBSectionDetail
 *
 * Shared detail screen for the QB P&L sections /financiero/{costos,egresos}.
 * (Ingresos has its own screen at app/(tabs)/financiero/ingresos.tsx.)
 * Reads the active QB realm + period, fetches a single P&L report, extracts
 * the requested section group, and renders a pinned trend card (Corriente vs
 * Histórico) + flat row list (una fila por cuenta hoja, con flecha — sin
 * acordeón; tocarla navega al detalle).
 *
 * Level-2 drill-down (terceros) is wired for COGS and Expenses:
 *   /financiero/{costos,egresos}/[groupId]
 */

import { AtSkeleton } from "@/src/components/atoms/at-skeleton";
import { MlClientRow } from "@/src/components/molecules/ml-client-row";
import { MlCostGroupAccordionRow } from "@/src/components/molecules/ml-cost-group-accordion-row";
import { MlEmptyState } from "@/src/components/molecules/ml-empty-state";
import { OrQBTrendChartCard } from "@/src/components/organisms/or-qb-trend-chart-card";
import { TmConsolidatedDetail } from "@/src/components/templates/tm-consolidated-detail";
import { useCompanies } from "@/src/hooks/queries/use-companies";
import { useQBProfitAndLoss } from "@/src/hooks/queries/use-qb-profit-and-loss";
import {
  normalizePnLSection,
  normalizePnLSectionHierarchical,
  type PnLSection,
} from "@/src/services/quickbooks/normalizer";
import { useFiltersStore } from "@/src/stores/filters.store";
import { useQBStore } from "@/src/stores/qb.store";
import { CLIENT_LEGEND_GRADIENTS } from "@/src/theme/gradients";
import { View } from "@/src/tw";
import type { PeriodKey } from "@/src/types/domain.types";
import { PERIOD_SHORT_LABELS } from "@/src/utils/date";
import type { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo } from "react";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

const PERIOD_OPTIONS = (["today", "1w", "1m", "3m", "12m"] as PeriodKey[]).map(
  (key) => ({ key, label: PERIOD_SHORT_LABELS[key] }),
);

interface OrQBSectionDetailProps {
  group: PnLSection;
  breadcrumbLabel: string;
  defaultIcon: MaterialIconName;
}

export function OrQBSectionDetail({
  group,
  breadcrumbLabel,
  defaultIcon,
}: OrQBSectionDetailProps) {
  const period = useFiltersStore((s) => s.activePeriod);
  const activePeriodKey = useFiltersStore((s) => s.activePeriodKey);
  const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);
  const realmId = useQBStore((s) => s.activeRealmId);
  const { data: companies = [] } = useCompanies();
  const company = companies.find((c) => c.id === realmId);

  const pnl = useQBProfitAndLoss({
    start_date: period.start,
    end_date: period.end,
  });

  const items = useMemo(
    () => normalizePnLSection(pnl.data ?? null, group),
    [pnl.data, group],
  );

  const categories = useMemo(
    () => normalizePnLSectionHierarchical(pnl.data ?? null, group),
    [pnl.data, group],
  );

  // Cuentas hoja de la sección — una fila plana por cada una, con flecha
  // que navega directo al detalle (sin acordeón). Ordenadas desc por monto.
  const leafAccounts = useMemo(
    () =>
      categories
        .flatMap((cat) => cat.accounts)
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    [categories],
  );

  const groups = items.map((it) => ({
    id: it.id,
    label: it.label,
    icon: defaultIcon as string,
    color: it.color,
    amount: it.amount,
    deltaPercent: 0,
  }));

  const accountRoutePrefix =
    group === "COGS"
      ? "/financiero/costos"
      : group === "Expenses"
        ? "/financiero/egresos"
        : null;

  const handleFilterSelect = useCallback(
    (key: string) => setActivePeriod(key as PeriodKey),
    [setActivePeriod],
  );
  const goToWidestPeriod = useCallback(
    () => setActivePeriod("12m"),
    [setActivePeriod],
  );

  const isLoading = pnl.isLoading;

  return (
    <TmConsolidatedDetail
      breadcrumbs={[breadcrumbLabel, company?.name ?? "Empresa"]}
      filterOptions={PERIOD_OPTIONS}
      selectedFilter={activePeriodKey}
      onFilterSelect={handleFilterSelect}
      onBack={() => router.back()}
      pinnedContent={
        // Tendencia comparativa (Corriente vs Histórico), igual que en el
        // consolidado.
        <OrQBTrendChartCard section={group} label={breadcrumbLabel} />
      }
    >
      {isLoading ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={260} borderRadius={14} />
        </View>
      ) : items.length === 0 ? (
        <MlEmptyState
          icon="search-off"
          title={`Sin ${breadcrumbLabel.toLowerCase()} en este periodo`}
          description={
            activePeriodKey === "12m"
              ? "QuickBooks no devolvió cuentas para este rango."
              : "Prueba ampliar el rango desde el filtro de arriba."
          }
          action={
            activePeriodKey !== "12m"
              ? { label: "Ver últimos 12 meses", onPress: goToWidestPeriod }
              : undefined
          }
        />
      ) : accountRoutePrefix ? (
        <View className="gap-2">
          {leafAccounts.map((leaf, i) => {
            const gradientColors = CLIENT_LEGEND_GRADIENTS[
              i % CLIENT_LEGEND_GRADIENTS.length
            ] as [string, string];
            return (
              <MlCostGroupAccordionRow
                key={leaf.id}
                name={leaf.label}
                amount={leaf.amount}
                deltaPercent={null}
                gradientColors={gradientColors}
                onPress={() =>
                  router.push(
                    `${accountRoutePrefix}/${encodeURIComponent(leaf.id)}` as never,
                  )
                }
              />
            );
          })}
        </View>
      ) : (
        <View className="gap-1">
          {groups.map((g, i) => {
            const gradientColors = CLIENT_LEGEND_GRADIENTS[
              i % CLIENT_LEGEND_GRADIENTS.length
            ] as [string, string];
            return (
              <MlClientRow
                key={g.id}
                name={g.label}
                color={gradientColors[0]}
                gradientColors={gradientColors}
                revenue={g.amount}
                deltaPercent={g.deltaPercent}
                swatchSize="lg"
              />
            );
          })}
        </View>
      )}
    </TmConsolidatedDetail>
  );
}

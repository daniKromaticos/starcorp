/**
 * /financiero/ingresos — QuickBooks Income section.
 *
 * Layout:
 *   - Pinned: OrQBTrendChartCard (Corriente vs Histórico del Income)
 *   - Scrollable: OrTercerosList — search bar + one row per Income account.
 *
 * Data comes from the QB P&L "Income" section (one P&L report for the active
 * realm + period). QuickBooks P&L gives no per-customer breakdown, so each
 * Income account is rendered as one "tercero" row.
 */

import { AtSkeleton } from "@/src/components/atoms/at-skeleton";
import { MlEmptyState } from "@/src/components/molecules/ml-empty-state";
import { OrQBTrendChartCard } from "@/src/components/organisms/or-qb-trend-chart-card";
import { OrTercerosList } from "@/src/components/organisms/or-terceros-list";
import { TmConsolidatedDetail } from "@/src/components/templates/tm-consolidated-detail";
import { useCompanies } from "@/src/hooks/queries/use-companies";
import { useQBProfitAndLoss } from "@/src/hooks/queries/use-qb-profit-and-loss";
import { normalizePnLSection } from "@/src/services/quickbooks/normalizer";
import { useFiltersStore } from "@/src/stores/filters.store";
import { useQBStore } from "@/src/stores/qb.store";
import { CLIENT_LEGEND_GRADIENTS } from "@/src/theme/gradients";
import { View } from "@/src/tw";
import type { PeriodKey, ThirdParty } from "@/src/types/domain.types";
import { PERIOD_SHORT_LABELS } from "@/src/utils/date";
import { router } from "expo-router";
import React, { useCallback, useMemo } from "react";

const PERIOD_OPTIONS = (["today", "1w", "1m", "3m", "12m"] as PeriodKey[]).map(
  (key) => ({ key, label: PERIOD_SHORT_LABELS[key] }),
);

export default function FinancieroIngresosScreen() {
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
    () => normalizePnLSection(pnl.data ?? null, "Income"),
    [pnl.data],
  );

  // Each Income account → one "tercero" row, so OrTercerosList (built for
  // the consolidado terceros screen) can render it as-is.
  const rows: ThirdParty[] = useMemo(
    () =>
      items.map((it, i) => {
        const grad = CLIENT_LEGEND_GRADIENTS[
          i % CLIENT_LEGEND_GRADIENTS.length
        ] as [string, string];
        return {
          id: it.id,
          name: it.label,
          color: grad[0],
          gradientColors: grad,
          amount: it.amount,
          deltaPercent: 0,
        };
      }),
    [items],
  );

  const handleFilterSelect = useCallback(
    (key: string) => setActivePeriod(key as PeriodKey),
    [setActivePeriod],
  );
  const goToWidestPeriod = useCallback(
    () => setActivePeriod("12m"),
    [setActivePeriod],
  );

  const isLoading = pnl.isLoading;
  const isReady = !isLoading && pnl.data != null;
  const isEmpty = isReady && items.length === 0;

  return (
    <TmConsolidatedDetail
      breadcrumbs={["Ingresos", company?.name ?? "Empresa"]}
      filterOptions={PERIOD_OPTIONS}
      selectedFilter={activePeriodKey}
      onFilterSelect={handleFilterSelect}
      onBack={() => router.back()}
      pinnedContent={
        // Tendencia comparativa (Corriente vs Histórico), igual que en el
        // consolidado.
        <OrQBTrendChartCard section="Income" label="Ingresos" />
      }
    >
      {isLoading || pnl.data == null ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={260} borderRadius={14} />
        </View>
      ) : isEmpty ? (
        <MlEmptyState
          icon="search-off"
          title="Sin ingresos en este periodo"
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
      ) : (
        <OrTercerosList terceros={rows} />
      )}
    </TmConsolidatedDetail>
  );
}

/**
 * /financiero/egresos/[groupId] — desglose de una cuenta Expense.
 * Mirrors /financiero/costos/[groupId]; only the section ("Expenses") differs.
 */

import { AtSkeleton } from "@/src/components/atoms/at-skeleton";
import { MlEmptyState } from "@/src/components/molecules/ml-empty-state";
import {
  OrHighlightedBarChartCard,
  type HighlightedBarChartPoint,
} from "@/src/components/organisms/or-highlighted-bar-chart-card";
import { OrTercerosList } from "@/src/components/organisms/or-terceros-list";
import { TmConsolidatedDetail } from "@/src/components/templates/tm-consolidated-detail";
import { useCompanies } from "@/src/hooks/queries/use-companies";
import { useQBGeneralLedger } from "@/src/hooks/queries/use-qb-general-ledger";
import { useQBProfitAndLoss } from "@/src/hooks/queries/use-qb-profit-and-loss";
import {
  findPnLLeafById,
  normalizeGeneralLedgerByAccount,
} from "@/src/services/quickbooks/normalizer";
import { useFiltersStore } from "@/src/stores/filters.store";
import { useQBStore } from "@/src/stores/qb.store";
import { CLIENT_LEGEND_GRADIENTS } from "@/src/theme/gradients";
import { View } from "@/src/tw";
import type { PeriodKey, ThirdParty } from "@/src/types/domain.types";
import { PERIOD_SHORT_LABELS } from "@/src/utils/date";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";

const PERIOD_OPTIONS = (["today", "1w", "1m", "3m", "12m"] as PeriodKey[]).map(
  (key) => ({ key, label: PERIOD_SHORT_LABELS[key] }),
);

/** Cap bars in the chart so the flex layout can't squeeze each one to 0 width
 *  when an account has dozens/hundreds of transactions. */
const MAX_CHART_BARS = 20;

/** Aggregate transactions by vendor name → list ordered by absolute amount. */
function aggregateVendors(
  transactions: { name: string; amount: number }[],
): ThirdParty[] {
  const byVendor = new Map<string, number>();
  for (const tx of transactions) {
    const key = tx.name || "—";
    byVendor.set(key, (byVendor.get(key) ?? 0) + tx.amount);
  }
  return Array.from(byVendor.entries())
    .map(([name, signedAmount]) => ({ name, amount: Math.abs(signedAmount) }))
    .sort((a, b) => b.amount - a.amount)
    .map(({ name, amount }, i) => {
      const grad = CLIENT_LEGEND_GRADIENTS[
        i % CLIENT_LEGEND_GRADIENTS.length
      ] as [string, string];
      return {
        id: name,
        name,
        color: grad[0],
        gradientColors: grad,
        amount,
        deltaPercent: 0,
      };
    });
}

export default function EgresosCuentaDetalleScreen() {
  const { groupId, vendor } = useLocalSearchParams<{
    groupId: string;
    vendor?: string;
  }>();
  const decodedGroupId = decodeURIComponent(groupId ?? "");

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

  const account = useMemo(
    () => findPnLLeafById(pnl.data ?? null, "Expenses", decodedGroupId),
    [pnl.data, decodedGroupId],
  );

  const gl = useQBGeneralLedger({
    accountIds: [decodedGroupId],
    start_date: period.start,
    end_date: period.end,
  });

  const transactions = useMemo(() => {
    const grouped = normalizeGeneralLedgerByAccount(gl.data ?? null);
    return (
      grouped.find((a) => a.accountId === decodedGroupId)?.transactions ??
      grouped.flatMap((a) => a.transactions)
    );
  }, [gl.data, decodedGroupId]);

  const vendors = useMemo(() => aggregateVendors(transactions), [transactions]);

  const groupLabel = account?.label ?? decodedGroupId;
  const groupAmount = account?.amount ?? 0;

  /** Una barra por PROVEEDOR (el mismo agregado que la lista de abajo),
   *  capped at the top N by magnitude so the chart layout stays legible. */
  const bars: HighlightedBarChartPoint[] = useMemo(
    () =>
      vendors.slice(0, MAX_CHART_BARS).map((v) => ({
        id: v.id,
        label: v.name,
        value: v.amount,
      })),
    [vendors],
  );

  // Proveedor preseleccionado desde el index (?vendor=).
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(
    vendor ? decodeURIComponent(vendor) : null,
  );

  const handleFilterSelect = useCallback(
    (key: string) => setActivePeriod(key as PeriodKey),
    [setActivePeriod],
  );
  const goToWidestPeriod = useCallback(
    () => setActivePeriod("12m"),
    [setActivePeriod],
  );

  const isPnLLoading = pnl.isLoading;
  const isTxLoading = gl.isLoading;

  return (
    <TmConsolidatedDetail
      breadcrumbs={["Egreso", company?.name ?? "Empresa", groupLabel]}
      filterOptions={PERIOD_OPTIONS}
      selectedFilter={activePeriodKey}
      onFilterSelect={handleFilterSelect}
      onBack={() => router.back()}
      pinnedContent={
        isPnLLoading ? (
          <View className="gap-3 px-4">
            <AtSkeleton width="100%" height={260} borderRadius={14} />
          </View>
        ) : (
          <OrHighlightedBarChartCard
            title={groupLabel}
            amount={groupAmount}
            deltaPercent={null}
            bars={bars}
            highlightedId={selectedVendorId ?? undefined}
            highlightMode="dot"
          />
        )
      }
    >
      {isPnLLoading ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={200} borderRadius={14} />
        </View>
      ) : !account ? (
        <MlEmptyState
          icon="search-off"
          title="Sin datos para esta cuenta"
          description={
            activePeriodKey === "12m"
              ? "QuickBooks no devolvió movimientos para esta cuenta."
              : "Prueba ampliar el rango desde el filtro de arriba."
          }
          action={
            activePeriodKey !== "12m"
              ? { label: "Ver últimos 12 meses", onPress: goToWidestPeriod }
              : undefined
          }
        />
      ) : isTxLoading ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={56} borderRadius={12} />
          <AtSkeleton width="100%" height={56} borderRadius={12} />
          <AtSkeleton width="100%" height={56} borderRadius={12} />
        </View>
      ) : (
        <OrTercerosList
          terceros={vendors}
          selectedId={selectedVendorId}
          onSelectChange={setSelectedVendorId}
        />
      )}
    </TmConsolidatedDetail>
  );
}

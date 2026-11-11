/**
 * Financiero Tab Screen
 *
 * Client carousel + per-company detail layout matching the prototype:
 *  1. Company logo + name (left) / period pill (right)
 *  2. Three dark cards stacked: Ingresos, Costos, Egresos (tappable → drill-down)
 *  3. Two light cards side-by-side: Utilidad bruta, Utilidad neta
 */

import { AtIcon } from "@/src/components/atoms/at-icon";
import { AtSkeleton } from "@/src/components/atoms/at-skeleton";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { MlBreadcrumb } from "@/src/components/molecules/ml-breadcrumb";
import { MlCompanyCard } from "@/src/components/molecules/ml-company-card";
import { MlPeriodDropdown } from "@/src/components/molecules/ml-period-dropdown";
import { OrDrawer } from "@/src/components/organisms/or-drawer";
import {
  OrPrimaryMetrics,
  OrSecondaryMetrics,
  type FinancialMetric,
} from "@/src/components/organisms/or-financial-summary";
import { TmFinanciero } from "@/src/components/templates/tm-financiero";
import { useCompanies, useQbStatus } from "@/src/hooks/queries/use-companies";
import { useCompanyMetrics } from "@/src/hooks/queries/use-company-metrics";
import { queryKeys } from "@/src/hooks/queries/query-keys";
import { startQuickBooksOAuth } from "@/src/services/quickbooks/oauth";
import { useAuthStore } from "@/src/stores/auth.store";
import { useQBStore } from "@/src/stores/qb.store";
import { hasPermission } from "@/src/types/auth.types";
import { Pressable, ScrollView, View } from "@/src/tw";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";

export default function FinancieroScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [connectingCompany, setConnectingCompany] = useState(false);

  const activeRealmId = useQBStore((s) => s.activeRealmId);
  const setActiveRealmId = useQBStore((s) => s.setActiveRealmId);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: companies = [] } = useCompanies();
  const { data: qbStatus } = useQbStatus();
  const isAdmin = qbStatus?.isAdmin ?? false;

  useEffect(() => {
    if (!activeRealmId && companies[0]) {
      setActiveRealmId(companies[0].id);
    }
  }, [activeRealmId, companies, setActiveRealmId]);

  const activeCompanyId = activeRealmId ?? companies[0]?.id;
  const { data: metrics } = useCompanyMetrics(activeCompanyId);
  const activeCompany = companies.find((c) => c.id === activeCompanyId);

  async function handleConnectAnother() {
    setConnectingCompany(true);
    try {
      await startQuickBooksOAuth();
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
    } catch (err) {
      console.warn("connect another QB company failed", err);
    } finally {
      setConnectingCompany(false);
    }
  }

  // Render parcial: cada card exige su permiso fino (super_admin ve todo).
  const primaryMetrics: FinancialMetric[] = useMemo(() => {
    if (!metrics) return [];
    const cards: FinancialMetric[] = [
      {
        id: "ingresos",
        label: "Ingresos",
        value: metrics.ingresos.value,
        deltaPercent: metrics.ingresos.deltaPercent,
        icon: "attach-money",
      },
      {
        id: "costos",
        label: "Costos",
        value: metrics.costos.value,
        deltaPercent: metrics.costos.deltaPercent,
        icon: "shopping-bag",
      },
      {
        id: "egresos",
        label: "Egresos",
        value: metrics.egresos.value,
        deltaPercent: metrics.egresos.deltaPercent,
        icon: "payments",
      },
    ];
    return cards.filter((c) => hasPermission(user, `financiero.${c.id}`));
  }, [metrics, user]);

  const secondaryMetrics: FinancialMetric[] = useMemo(() => {
    if (!metrics || !hasPermission(user, "financiero.utilidades")) return [];
    return [
      {
        id: "utilidad-bruta",
        label: "Utilidad bruta",
        value: metrics.utilidadBruta.value,
        deltaPercent: metrics.utilidadBruta.deltaPercent,
        icon: "insights",
        iconColor: "#3A5BC4",
      },
      {
        id: "utilidad-neta",
        label: "Utilidad neta",
        value: metrics.utilidadNeta.value,
        deltaPercent: metrics.utilidadNeta.deltaPercent,
        icon: "account-balance-wallet",
        iconColor: "#3A5BC4",
      },
    ];
  }, [metrics, user]);

  const handleMetricPress = (id: string) => {
    if (id === "ingresos") router.push("/financiero/ingresos");
    else if (id === "costos") router.push("/financiero/costos");
    else if (id === "egresos") router.push("/financiero/egresos");
  };

  return (
    <TmFinanciero onMenuPress={() => setDrawerVisible(true)}>
      <MlBreadcrumb
        segments={["Financiero"]}
        onBack={() => router.back()}
        className="px-4"
      />

      {/* Company carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-4"
      >
        {companies.map((c) => (
          <MlCompanyCard
            key={c.id}
            name={c.name}
            variant="tile"
            selected={c.id === activeCompanyId}
            onPress={() => setActiveRealmId(c.id)}
          />
        ))}
        {isAdmin ? (
          <Pressable
            onPress={handleConnectAnother}
            disabled={connectingCompany}
            className="items-center gap-2"
            style={{ width: 110, opacity: connectingCompany ? 0.6 : 1 }}
          >
            <View
              style={{
                width: 110,
                height: 110,
                borderRadius: 18,
                borderCurve: "continuous",
                borderWidth: 2,
                borderColor: "#1A2B6D",
                borderStyle: "dashed",
                backgroundColor: "#F4F6FB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {connectingCompany ? (
                <ActivityIndicator color="#1A2B6D" />
              ) : (
                <AtIcon name="add" size="xl" color="#1A2B6D" />
              )}
            </View>
            <AtTypography
              variant="bodyBold"
              color="#1A1F36"
              className="text-center"
              numberOfLines={2}
            >
              Conectar otra
            </AtTypography>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Company header row: logo + name (left) | period pill (right) */}
      <View
        className="flex-row items-center gap-3 px-4"
        style={{ minHeight: 44 }}
      >
        {/* White logo square ~38px */}
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            borderCurve: "continuous",
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.08)",
          }}
        >
          <AtIcon name="business" size="md" color="#1A2B6D" />
        </View>

        {/* Company name — bold, smaller so long names fit without ellipsis */}
        <AtTypography variant="bodyBold" className="flex-1" numberOfLines={2} color="#1A1F36">
          {activeCompany?.name ?? ""}
        </AtTypography>

        {/* Period pill */}
        <MlPeriodDropdown />
      </View>

      {/* Metric cards */}
      {!metrics ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={76} borderRadius={8} />
          <AtSkeleton width="100%" height={76} borderRadius={8} />
          <AtSkeleton width="100%" height={76} borderRadius={8} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AtSkeleton width="100%" height={148} borderRadius={8} />
            </View>
            <View style={{ flex: 1 }}>
              <AtSkeleton width="100%" height={148} borderRadius={8} />
            </View>
          </View>
        </View>
      ) : (
        <>
          {primaryMetrics.length > 0 ? (
            <OrPrimaryMetrics
              metrics={primaryMetrics}
              onMetricPress={handleMetricPress}
            />
          ) : null}
          {secondaryMetrics.length > 0 ? (
            <OrSecondaryMetrics metrics={secondaryMetrics} />
          ) : null}
        </>
      )}

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="financiero"
      />
    </TmFinanciero>
  );
}

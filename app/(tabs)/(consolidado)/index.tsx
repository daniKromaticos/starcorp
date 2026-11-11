/**
 * Home Dashboard Page (Consolidado)
 *
 * Assembles new organisms into the full dashboard view matching the mockup.
 * Uses NativeWind components + AtTypography.
 */

import { AtStatusBadge } from "@/src/components/atoms/at-status-badge";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { MlSearchBar } from "@/src/components/molecules/ml-search-bar";
import { MlTimeFilterBar } from "@/src/components/molecules/ml-time-filter-bar";
import {
  OrCategoryCarousel,
  type CategoryItem,
} from "@/src/components/organisms/or-category-carousel";
import { OrDrawer } from "@/src/components/organisms/or-drawer";
import { OrFinancieroSection } from "@/src/components/organisms/or-financiero-section";
import { OrGreetingHeader } from "@/src/components/organisms/or-greeting-header";
import { OrInformesSection } from "@/src/components/organisms/or-informes-section";
import { OrRecentReportsSection } from "@/src/components/organisms/or-recent-reports-section";
import { OrRevenueChartCard } from "@/src/components/organisms/or-revenue-chart-card";
import { OrTopClientsSection } from "@/src/components/organisms/or-top-clients-section";
import { TmDashboard } from "@/src/components/templates/tm-dashboard";
import { useCompanySummaries } from "@/src/hooks/queries/use-company-summaries";
import { useFiltersStore } from "@/src/stores/filters.store";
import { useAuthStore } from "@/src/stores/auth.store";
import { useGlobalSearchStore } from "@/src/stores/global-search.store";
import { hasPermission } from "@/src/types/auth.types";
import { useQBStore } from "@/src/stores/qb.store";
import { View } from "@/src/tw";
import type { PeriodKey } from "@/src/types/domain.types";
import { PERIOD_LABELS, PERIOD_SHORT_LABELS } from "@/src/utils/date";
import { setInformeOrigin } from "@/src/utils/informe-origin";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";

const PERIOD_OPTIONS = (["today", "1w", "1m", "3m", "12m"] as PeriodKey[]).map(
  (key) => ({
    key,
    label: PERIOD_SHORT_LABELS[key],
  }),
);

const POWERBI_DATASET_ID = "43f822cf-7162-410d-bc5a-61182e5ca2d7";
const POWERBI_GROUP_ID = "457b264f-6eb8-4b00-8f62-f65ee2700cd4";
const DAX_BBM_INGRESO = `EVALUATE ROW("BBMIngreso", [BBMIngreso])`;

// Ruta del single de cada categoría de Informes. Las que tienen carpeta
// propia resuelven al index del folder; presupuesto cae al placeholder
// dinámico [reportId].
const INFORME_ROUTES: Record<string, string> = {
  cartera: "/informes/cartera",
  asociados: "/informes/asociados",
  bancos: "/informes/bancos",
  seguro: "/informes/seguros",
  pagos: "/informes/pagos",
  presupuesto: "/informes/presupuesto",
};

// Permiso fino que habilita cada categoría del consolidado.
const CATEGORY_PERMISSION: Record<string, string> = {
  ingresos: "consolidado.ingresos",
  costos: "consolidado.costos",
  gastos: "consolidado.gastos",
  utilidad: "consolidado.utilidades",
};

const CATEGORIES: CategoryItem[] = [
  {
    id: "ingresos",
    label: "Ingresos",
    icon: "attach-money",
    actionLabel: "Ver clientes",
  },
  {
    id: "costos",
    label: "Costos",
    icon: "shopping-bag",
    actionLabel: "Ver clientes",
  },
  {
    id: "gastos",
    label: "Gastos",
    icon: "credit-card",
    actionLabel: "Ver clientes",
  },
  {
    id: "utilidad",
    label: "Utilidad",
    icon: "trending-up",
    actionLabel: "Ver detalle",
  },
];

export default function HomeScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ingresos");
  const user = useAuthStore((s) => s.user);
  const activePeriodKey = useFiltersStore((s) => s.activePeriodKey);
  const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);
  const setActiveRealmId = useQBStore((s) => s.setActiveRealmId);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const { summaries: companies } = useCompanySummaries();

  const handleFilterSelect = useCallback(
    (key: string) => setActivePeriod(key as PeriodKey),
    [setActivePeriod],
  );

  const handleCompanyPress = useCallback(
    (id: string) => {
      setActiveRealmId(id);
      router.push("/financiero");
    },
    [setActiveRealmId],
  );

  // Render parcial: cada sección del dashboard exige su permiso
  // (super_admin ve todo — ver hasPermission).
  const can = useCallback(
    (key: string) => hasPermission(user, key),
    [user],
  );
  const allowedCategories = CATEGORIES.filter((c) =>
    can(CATEGORY_PERMISSION[c.id]),
  );
  const activeCategory =
    allowedCategories.find((c) => c.id === selectedCategory) ??
    allowedCategories[0] ??
    null;

  return (
    <TmDashboard stickyHeaderIndices={[0]}>
      {/* Sticky header: search + time filter */}
      <View className="gap-4 bg-bg-secondary pt-2 pb-3">
        <View className="px-4">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>
        <MlTimeFilterBar
          options={PERIOD_OPTIONS}
          selectedKey={activePeriodKey}
          onSelect={handleFilterSelect}
        />
      </View>

      {/* Greeting */}
      <OrGreetingHeader name={user?.firstName || user?.name || ""} />

      {/* Section: Empresas (Consolidado) — solo con alguna categoría permitida */}
      {activeCategory ? (
        <View className="gap-3">
          <View className="flex-row justify-between items-center px-4">
            <AtTypography variant="h2">Empresas</AtTypography>
            <AtStatusBadge
              label={PERIOD_LABELS[activePeriodKey]}
              variant="gradient"
              size="md"
            />
          </View>
          <OrRevenueChartCard
            categoryId={activeCategory.id}
            label={activeCategory.label}
            period={activePeriodKey}
          />
        </View>
      ) : null}

      {/* Category carousel — solo categorías permitidas */}
      {activeCategory ? (
        <OrCategoryCarousel
          categories={allowedCategories}
          selectedId={activeCategory.id}
          onSelect={setSelectedCategory}
          onActionPress={(id) =>
            router.push(`/${id}` as Parameters<typeof router.push>[0])
          }
        />
      ) : null}

      {/* Top clients */}
      {can("clientes.ver") ? (
        <OrTopClientsSection
          periodLabel={PERIOD_LABELS[activePeriodKey]}
          onViewClients={() => router.push("/clientes")}
        />
      ) : null}

      {/* Financiero (empresas carousel) */}
      {can("financiero.ver") ? (
        <OrFinancieroSection
          periodLabel={PERIOD_LABELS[activePeriodKey]}
          companies={companies}
          onCompanyPress={handleCompanyPress}
          onViewAll={() => router.push("/financiero")}
        />
      ) : null}

      {/* Informes (reports) */}
      {can("informes.ver") ? (
        <OrInformesSection
          periodLabel={PERIOD_LABELS[activePeriodKey]}
          onViewAll={(id) => {
            // El atrás del informe vuelve a Home (ver informes/_layout).
            setInformeOrigin("home");
            router.push(
              (INFORME_ROUTES[id] ?? "/informes") as Parameters<
                typeof router.push
              >[0],
              // Carga el grid de Informes debajo (anchor en
              // informes/_layout) para que el informe no quede como raíz
              // del tab y se apile con el siguiente.
              { withAnchor: true },
            );
          }}
        />
      ) : null}

      {/* Reportes más recientes */}
      {can("reportes.ver") ? <OrRecentReportsSection /> : null}

      {/* Drawer */}
      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="consolidado"
      />
    </TmDashboard>
  );
}

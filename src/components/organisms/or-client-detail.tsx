/**
 * Organism: OrClientDetail
 *
 * Single-client detail view used by /ingresos/[clientId], /costos/[clientId],
 * /gastos/[clientId]. The top section (search bar + breadcrumb + period
 * filter) stays pinned; chart card, stat boxes and metric bars scroll below.
 *
 * The entryCategory drives the breadcrumb label and the initially-selected
 * metric bar (which in turn drives the chart card category).
 */

import { Skeleton } from "@/src/components/atoms/skeleton";
import { MlBreadcrumb } from "@/src/components/molecules/ml-breadcrumb";
import { MlEmptyState } from "@/src/components/molecules/ml-empty-state";
import { MlLocationCard } from "@/src/components/molecules/ml-location-card";
import { MlMetricBar } from "@/src/components/molecules/ml-metric-bar";
import { MlSearchBar } from "@/src/components/molecules/ml-search-bar";
import { MlStatBox } from "@/src/components/molecules/ml-stat-box";
import { MlTimeFilterBar } from "@/src/components/molecules/ml-time-filter-bar";
import { OrDrawer } from "@/src/components/organisms/or-drawer";
import { OrRevenueChartCard } from "@/src/components/organisms/or-revenue-chart-card";
import { useCartera } from "@/src/hooks/queries/use-cartera";
import { useClientMetadata } from "@/src/hooks/queries/use-client-metadata";
import {
  useDashboardSummary,
  type DashboardSummaryPeriod,
} from "@/src/hooks/queries/use-dashboard-summary";
import { useQBCustomerBalance } from "@/src/hooks/queries/use-qb-customer-balance";
import { useAuthStore } from "@/src/stores/auth.store";
import { useFiltersStore } from "@/src/stores/filters.store";
import { useGlobalSearchStore } from "@/src/stores/global-search.store";
import { ScrollView, View } from "@/src/tw";
import { hasPermission } from "@/src/types/auth.types";
import type { PeriodKey } from "@/src/types/domain.types";
import { PERIOD_SHORT_LABELS } from "@/src/utils/date";
import type { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];
type MetricKey =
  | "ingreso"
  | "costo"
  | "gastos"
  | "utilidad-neta"
  | "utilidad-bruta"
  | "cartera"
  | "margen";
type ChartCategory = "ingresos" | "costos" | "gastos" | "utilidad";
export type ClientDetailEntry = "ingresos" | "costos" | "gastos";

const PERIOD_OPTIONS = (["today", "1w", "1m", "3m", "12m"] as PeriodKey[]).map(
  (key) => ({ key, label: PERIOD_SHORT_LABELS[key] }),
);

const RPC_PERIOD: Record<PeriodKey, DashboardSummaryPeriod> = {
  today: "mtd",
  "1w": "1w",
  "1m": "1m",
  "3m": "3m",
  "12m": "12m",
};

const METRIC_TO_CATEGORY: Record<MetricKey, ChartCategory> = {
  ingreso: "ingresos",
  costo: "costos",
  gastos: "gastos",
  "utilidad-neta": "utilidad",
  "utilidad-bruta": "utilidad",
  cartera: "ingresos",
  margen: "utilidad",
};

const CATEGORY_LABEL: Record<ChartCategory, string> = {
  ingresos: "Ingresos",
  costos: "Costos",
  gastos: "Gastos",
  utilidad: "Utilidad",
};

const METRIC_CHART_LABEL: Partial<Record<MetricKey, string>> = {
  "utilidad-neta": "Utilidad neta",
  "utilidad-bruta": "Utilidad bruta",
  margen: "Margen",
  cartera: "Cartera",
};

// Resolve a value from clientes_master.data tolerating column-name variants
// (case, accents, common synonyms). Returns the first non-empty match.
function pickField(
  data: Record<string, unknown> | null | undefined,
  candidates: string[],
): string | null {
  if (!data) return null;
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const targets = new Set(candidates.map(norm));
  for (const [k, v] of Object.entries(data)) {
    if (v == null || v === "") continue;
    if (targets.has(norm(k))) return String(v);
  }
  return null;
}

const ENTRY_BREADCRUMB: Record<ClientDetailEntry, string> = {
  ingresos: "Ingresos",
  costos: "Costos",
  gastos: "Gastos",
};

const ENTRY_INITIAL_METRIC: Record<ClientDetailEntry, MetricKey> = {
  ingresos: "ingreso",
  costos: "costo",
  gastos: "gastos",
};

/**
 * Métricas que tienen un single propio en `(consolidado)/<categoria>/[clientId]`.
 * Sólo estas pueden actuar como drill-down (tap-de-nuevo navega). El resto
 * sólo cambia el chart al seleccionarse.
 *
 * `cartera` no tiene single en el consolidado: redirige al Informe Cartera
 * (ver CARTERA_INDEX_ROUTE / carteraClientId más abajo).
 */
const METRIC_REDIRECT_TARGET: Partial<Record<MetricKey, ClientDetailEntry>> = {
  ingreso: "ingresos",
  costo: "costos",
  gastos: "gastos",
};

const CARTERA_INDEX_ROUTE = "/(tabs)/informes/cartera";

/**
 * Normaliza un nombre de cliente para comparar el `Quickbook` del master
 * contra el DisplayName del snapshot de Cartera. Mismo criterio que
 * useQBCustomerBalance: sin acentos ni puntuación, en mayúsculas.
 */
function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

interface OrClientDetailProps {
  clientId: string;
  entryCategory: ClientDetailEntry;
}

export function OrClientDetail({
  clientId,
  entryCategory,
}: OrClientDetailProps) {
  const centroCosto = decodeURIComponent(clientId ?? "");
  const insets = useSafeAreaInsets();
  // 320×568: con el chart fijo arriba casi no queda área de scroll; en
  // pantallas bajas el chart pasa al inicio del contenido scrolleable.
  const pinChart = useWindowDimensions().height > 700;

  const activePeriodKey = useFiltersStore((s) => s.activePeriodKey);
  const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);
  const rpcPeriod = RPC_PERIOD[activePeriodKey];

  const summaryQuery = useDashboardSummary(rpcPeriod, {
    compare: true,
    centroCosto,
  });
  const metaQuery = useClientMetadata(centroCosto);

  /** QB customer DisplayName comes from the PBI master row's `Quickbook`
   *  field (synced into clientes_master.data via pbi-sync-clientes). */
  const qbCustomerName = pickField(metaQuery.data?.clienteData, [
    "Quickbook",
    "QuickBook",
    "QuickBooks",
    "Quickbooks",
    "QBName",
    "QuickbookName",
  ]);
  const carteraQuery = useQBCustomerBalance(qbCustomerName);

  const user = useAuthStore((s) => s.user);
  const canSeeCartera = hasPermission(user, "informes.cartera");

  const [selectedMetric, setSelectedMetric] = useState<MetricKey>(
    ENTRY_INITIAL_METRIC[entryCategory],
  );
  const [drawerVisible, setDrawerVisible] = useState(false);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  // El Informe Cartera identifica al cliente por `${realmId}-${customerId}`,
  // que aquí no se conoce: se resuelve casando el nombre QB del master
  // contra el snapshot del informe (misma query, misma caché). Se difiere
  // hasta que la métrica Cartera está seleccionada para no disparar el
  // barrido de facturas de QB en cada single de cliente.
  const carteraSnapshotQuery = useCartera({
    enabled: canSeeCartera && selectedMetric === "cartera",
  });

  const handleFilterSelect = useCallback(
    (key: string) => setActivePeriod(key as PeriodKey),
    [setActivePeriod],
  );

  const summary = summaryQuery.data;
  const meta = metaQuery.data;

  const cartera = carteraQuery.data ?? null;

  /**
   * Id del cliente dentro del Informe Cartera. Null cuando el master no
   * trae `Quickbook`, o cuando ese customer no tiene facturas abiertas
   * (el snapshot sólo incluye cartera viva) — en ese caso la redirección
   * cae al index del informe.
   */
  const carteraClientId = useMemo(() => {
    const target = normalizeName(qbCustomerName ?? "");
    if (!target) return null;
    const clients = carteraSnapshotQuery.data?.clients ?? [];
    const named = clients.map((c) => ({ id: c.id, n: normalizeName(c.name) }));
    const hit =
      named.find(({ n }) => n === target) ??
      named.find(({ n }) => n.startsWith(target)) ??
      named.find(({ n }) => n.includes(target)) ??
      // Master más largo que el DisplayName ("OKANA RESORT" vs "OKANA").
      named.find(({ n }) => n.length >= 4 && target.includes(n));
    return hit?.id ?? null;
  }, [qbCustomerName, carteraSnapshotQuery.data]);

  const metrics = useMemo(() => {
    if (!summary) return [];
    const ingreso = summary.ingresos;
    const costo = summary.costos;
    const gastos = summary.gastos;
    const utilidadBruta = ingreso - costo;
    // Utilidad neta = utilidad bruta - gastos. El RPC la devuelve pre-calculada
    // (usa saldo_final con signo, no ABS), pero debe ser consistente con la
    // fórmula. Si difiere en más de $1 (redondeo), se usa la fórmula local y
    // se emite un warning para detectar discrepancias en el RPC.
    const utilidadNetaRpc = summary.utilidad;
    const utilidadNetaCalculada = utilidadBruta - gastos;
    const diff = Math.abs(utilidadNetaRpc - utilidadNetaCalculada);
    if (__DEV__ && diff > 1) {
      console.warn(
        `[OrClientDetail] utilidad neta inconsistente para "${centroCosto}":`,
        { utilidadNetaRpc, utilidadNetaCalculada, diff },
      );
    }
    const utilidadNeta = utilidadNetaCalculada;

    const margenPct = ingreso !== 0 ? (utilidadNeta / ingreso) * 100 : null;
    const margenPrevPct =
      summary.ingresosPrev !== 0
        ? (summary.utilidadPrev / summary.ingresosPrev) * 100
        : null;

    const maxAbs = Math.max(
      Math.abs(ingreso),
      Math.abs(costo),
      Math.abs(gastos),
      Math.abs(utilidadNeta),
      Math.abs(utilidadBruta),
      Math.abs(cartera ?? 0),
      1,
    );
    const w = (v: number) => Math.abs(v) / maxAbs;

    return [
      {
        key: "ingreso" as MetricKey,
        label: "Ingreso",
        icon: "attach-money" as MaterialIconName,
        value: ingreso as number | null,
        deltaPositive: summary.ingresosDeltaPercent >= 0,
        gradient: ["#1A2B6D", "#2D4BA0"] as const,
        widthPercent: w(ingreso),
      },
      {
        key: "costo" as MetricKey,
        label: "Costo",
        icon: "shopping-bag" as MaterialIconName,
        value: costo as number | null,
        deltaPositive: summary.costosDeltaPercent >= 0,
        gradient: ["#1A2B6D", "#5B82E6"] as const,
        widthPercent: w(costo),
      },
      {
        key: "utilidad-bruta" as MetricKey,
        label: "U. bruta",
        icon: "insights" as MaterialIconName,
        value: utilidadBruta as number | null,
        deltaPositive: utilidadBruta >= 0,
        gradient: ["#1A2B6D", "#3A5BBB"] as const,
        widthPercent: w(utilidadBruta),
      },
      {
        key: "gastos" as MetricKey,
        label: "Gastos",
        icon: "credit-card" as MaterialIconName,
        value: gastos as number | null,
        deltaPositive: summary.gastosDeltaPercent >= 0,
        gradient: ["#0F1B4A", "#1A2B6D"] as const,
        widthPercent: w(gastos),
      },
      {
        key: "utilidad-neta" as MetricKey,
        label: "U. neta",
        icon: "trending-up" as MaterialIconName,
        value: utilidadNeta as number | null,
        deltaPositive: summary.utilidadDeltaPercent >= 0,
        gradient: ["#84CC16", "#D9E26A"] as const,
        widthPercent: w(utilidadNeta),
      },
      // Cartera: outstanding balance for this client's QB Customer (resolved
      // via clientes_master.Quickbook → useQBCustomerBalance). Null when the
      // master row has no Quickbook, the customer isn't in QB, or QB isn't
      // connected — in which case the card stays as "—".
      {
        key: "cartera" as MetricKey,
        label: "Cartera",
        icon: "account-balance-wallet" as MaterialIconName,
        value: cartera,
        deltaPositive: true,
        gradient: ["#0E5048", "#84CC16"] as const,
        widthPercent: cartera != null ? w(cartera) : 0,
      },
      {
        key: "margen" as MetricKey,
        label: "Margen",
        icon: "show-chart" as MaterialIconName,
        value: margenPct,
        deltaPositive:
          margenPct !== null && margenPrevPct !== null
            ? margenPct >= margenPrevPct
            : (margenPct ?? 0) >= 0,
        gradient: ["#F59E0B", "#FBBF24"] as const,
        widthPercent:
          margenPct !== null ? Math.max(0, Math.min(1, margenPct / 100)) : 0.4,
        valueFormat: "percent" as const,
      },
    ];
  }, [summary, cartera]);

  const chartCategory = METRIC_TO_CATEGORY[selectedMetric];

  // Cartera seleccionada: el header y la gráfica dejan de reflejar la
  // categoría P&L. Sin cartera (null o 0) todo se fuerza a 0; con cartera
  // se muestra el saldo QB con flecha según su signo (QB solo expone el
  // saldo actual, no hay serie histórica para un trend real).
  const carteraSelected = selectedMetric === "cartera";
  const hasCartera = cartera != null && cartera !== 0;

  const hasNoActivity =
    !!summary &&
    summary.ingresos === 0 &&
    summary.costos === 0 &&
    summary.gastos === 0;

  const goToWidestPeriod = useCallback(
    () => setActivePeriod("12m"),
    [setActivePeriod],
  );

  const handleMetricPress = useCallback(
    (key: MetricKey) => {
      const alreadySelected = key === selectedMetric;

      // Cartera sale del consolidado: segundo tap abre el Informe Cartera,
      // en el detalle del cliente si se pudo resolver su id y si no en el
      // index del informe.
      if (key === "cartera" && alreadySelected && canSeeCartera) {
        router.push(
          (carteraClientId
            ? `${CARTERA_INDEX_ROUTE}/${encodeURIComponent(carteraClientId)}`
            : CARTERA_INDEX_ROUTE) as Parameters<typeof router.push>[0],
          // Cross-tab: carga el grid de Informes debajo (ver informes/_layout).
          { withAnchor: true },
        );
        return;
      }

      const target = METRIC_REDIRECT_TARGET[key];
      // Tap inicial → selecciona (cambia chart + activa chevron de redirect).
      // Tap subsecuente en una barra que apunta a OTRA categoría → navega.
      if (alreadySelected && target && target !== entryCategory) {
        router.push(
          `/${target}/${encodeURIComponent(clientId)}` as Parameters<
            typeof router.push
          >[0],
        );
        return;
      }
      setSelectedMetric(key);
    },
    [selectedMetric, entryCategory, clientId, canSeeCartera, carteraClientId],
  );

  const chartCard = (
    <OrRevenueChartCard
      categoryId={chartCategory}
      // Margen no es un monto: la card grafica utilidad/ingresos por
      // bucket en vez de la serie de Utilidad.
      metricMode={selectedMetric === "margen" ? "margen" : "category"}
      label={
        METRIC_CHART_LABEL[selectedMetric] ?? CATEGORY_LABEL[chartCategory]
      }
      period={activePeriodKey}
      centroCosto={centroCosto}
      headerValueOverride={carteraSelected ? (cartera ?? 0) : undefined}
      headerTrend={
        carteraSelected && hasCartera ? (cartera > 0 ? "up" : "down") : null
      }
      zeroData={carteraSelected && !hasCartera}
    />
  );

  return (
    <View className="flex-1 bg-bg-secondary" style={{ paddingTop: insets.top }}>
      {/* Pinned top: search + breadcrumb + period filter + chart */}
      <View className="gap-4 bg-bg-secondary pt-2 pb-3">
        <View className="px-4">
          <MlSearchBar
            onMenuPress={() => setDrawerVisible(true)}
            onPress={openGlobalSearch}
          />
        </View>
        <MlBreadcrumb
          segments={[ENTRY_BREADCRUMB[entryCategory], centroCosto || "..."]}
          onBack={() => router.back()}
          className="px-4"
        />
        <MlTimeFilterBar
          options={PERIOD_OPTIONS}
          selectedKey={activePeriodKey}
          onSelect={handleFilterSelect}
        />
        {pinChart ? chartCard : null}
      </View>

      {/* Scrollable content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6 pb-12"
      >
        {pinChart ? null : chartCard}
        <MlLocationCard
          value={
            pickField(meta?.clienteData, [
              "Ubicacion",
              "Ubicación",
              "Direccion",
              "Dirección",
              "DireccionCliente",
              "Address",
              "DireccionFiscal",
            ]) ?? "—"
          }
        />

        {metaQuery.isPending && !meta ? (
          <View className="flex-row gap-3 px-4">
            {[0, 1, 2].map((i) => (
              <View key={i} className="flex-1">
                <Skeleton width="100%" height={88} />
              </View>
            ))}
          </View>
        ) : meta ? (
          <View className="flex-row gap-3 px-4">
            <MlStatBox
              icon="engineering"
              value={
                meta.empleadosActivos != null
                  ? String(meta.empleadosActivos)
                  : "XX"
              }
              label="Empleados"
              iconColor="#F59E0B"
              variant="dark"
            />
            <MlStatBox
              icon="workspace-premium"
              value={
                pickField(meta.clienteData, [
                  "Lider",
                  "Líder",
                  "LiderCuenta",
                  "AccountManager",
                  "Responsable",
                ]) ?? "XX"
              }
              label="Líder"
              iconColor="#22D3EE"
              variant="dark"
            />
            <MlStatBox
              icon="event"
              value={(() => {
                const raw = pickField(meta.clienteData, [
                  "Vigencia",
                  "FechaVigencia",
                  "FechaInicio",
                  "FechaContrato",
                  "VigenciaDesde",
                ]);
                if (raw) {
                  const year = raw.match(/\d{4}/)?.[0];
                  return year ? `Desde ${year}` : raw;
                }
                return meta.firstFecha
                  ? `Desde ${meta.firstFecha.slice(0, 4)}`
                  : "XX";
              })()}
              label="Vigencia"
              iconColor="#A78BFA"
              variant="dark"
            />
          </View>
        ) : null}

        <View className="gap-1 px-4">
          {summaryQuery.isPending && metrics.length === 0 ? (
            <View className="gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} width="100%" height={64} />
              ))}
            </View>
          ) : hasNoActivity ? (
            <MlEmptyState
              icon="event-busy"
              title="Sin movimiento en este periodo"
              description={
                activePeriodKey === "12m"
                  ? "Este cliente no registra asientos en los últimos 12 meses."
                  : "Prueba ampliar el rango desde el selector de arriba."
              }
              action={
                activePeriodKey !== "12m"
                  ? {
                      label: "Ver últimos 12 meses",
                      onPress: goToWidestPeriod,
                    }
                  : undefined
              }
            />
          ) : (
            metrics.map((m) => {
              const target = METRIC_REDIRECT_TARGET[m.key];
              const redirectable =
                m.key === "cartera"
                  ? canSeeCartera
                  : !!target && target !== entryCategory;
              return (
                <MlMetricBar
                  key={m.key}
                  label={m.label}
                  icon={m.icon}
                  value={m.value}
                  deltaPositive={m.deltaPositive}
                  gradient={m.gradient}
                  widthPercent={m.widthPercent}
                  valueFormat={"valueFormat" in m ? m.valueFormat : undefined}
                  selected={selectedMetric === m.key}
                  redirectable={redirectable}
                  onPress={() => handleMetricPress(m.key)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      <OrDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeSection="consolidado"
      />
    </View>
  );
}

import { MlMetricGradientRow } from "@/src/components/molecules/ml-metric-gradient-row";
import { View } from "@/src/tw";
import type { ClientConsolidadoDetail } from "@/src/types/domain.types";
import React, { memo, useState } from "react";

type MetricKey = keyof ClientConsolidadoDetail["metrics"];

const METRIC_CONFIG: {
  key: MetricKey;
  label: string;
  icon: React.ComponentProps<typeof MlMetricGradientRow>["icon"];
  gradient: readonly [string, string, ...string[]];
}[] = [
  {
    key: "ingreso",
    label: "Ingreso",
    icon: "attach-money",
    gradient: ["#2D4BA0", "#4A7FD4"] as const,
  },
  {
    key: "costo",
    label: "Costo",
    icon: "shopping-bag",
    gradient: ["#1A2B6D", "#2D4BA0"] as const,
  },
  {
    key: "gastos",
    label: "Gastos",
    icon: "credit-card",
    gradient: ["#0F1B4A", "#1A2B6D"] as const,
  },
  {
    key: "utilidadNeta",
    label: "Util. Neta",
    icon: "trending-up",
    gradient: ["#84CC16", "#B4C93A"] as const,
  },
  {
    key: "utilidadBruta",
    label: "Util. Bruta",
    icon: "insights",
    gradient: ["#1A2B6D", "#2D4BA0"] as const,
  },
  {
    key: "cartera",
    label: "Cartera",
    icon: "account-balance-wallet",
    gradient: ["#14B8A6", "#78A63A"] as const,
  },
  {
    key: "margen",
    label: "Margen",
    icon: "show-chart",
    gradient: ["#F59E0B", "#E8952E"] as const,
  },
];

interface OrClientDetailMetricsProps {
  metrics: ClientConsolidadoDetail["metrics"];
}

export const OrClientDetailMetrics = memo<OrClientDetailMetricsProps>(
  ({ metrics }) => {
    const [selected, setSelected] = useState<MetricKey>("ingreso");
    return (
      <View className="gap-2 px-4">
        {METRIC_CONFIG.map((cfg) => {
          const m = metrics[cfg.key];
          return (
            <MlMetricGradientRow
              key={cfg.key}
              label={cfg.label}
              value={m.value}
              deltaPercent={m.deltaPercent}
              icon={cfg.icon}
              gradient={cfg.gradient}
              selected={selected === cfg.key}
              onPress={() => setSelected(cfg.key)}
            />
          );
        })}
      </View>
    );
  },
);

OrClientDetailMetrics.displayName = "OrClientDetailMetrics";

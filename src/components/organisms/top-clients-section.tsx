/**
 * Organism: TopClientsSection
 *
 * "Top 8 clientes (Mayor ingreso)" section from mockup.
 * Client list on left + Donut chart on right.
 */

import { DeltaIndicator } from "@/src/components/atoms/delta-indicator";
import { MetricValue } from "@/src/components/atoms/metric-value";
import { Skeleton } from "@/src/components/atoms/skeleton";
import { StatusBadge } from "@/src/components/atoms/status-badge";
import { DonutChart } from "@/src/components/charts/donut-chart";
import { ClientRow } from "@/src/components/molecules/client-row";
import { useTopClients } from "@/src/hooks/queries/use-top-clients";
import { tokens } from "@/src/theme/tokens";
import { formatCurrency } from "@/src/utils/currency";
import React, { memo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from '@/src/tw';

export const TopClientsSection = memo(() => {
  const { data, isLoading } = useTopClients(8);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedClient = data?.clients[selectedIndex];

  if (isLoading || !data) {
    return (
      <View
        style={{ paddingHorizontal: tokens.spacing.lg, gap: tokens.spacing.md }}
      >
        <Skeleton width={240} height={22} />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={36} />
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: tokens.spacing.lg }}>
      {/* Section header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: tokens.spacing.lg,
        }}
      >
        <Text
          style={{ ...tokens.typography.h3, color: tokens.color.ink.primary }}
        >
          Top 8 clientes (Mayor ingreso)
        </Text>
        <StatusBadge label="Hoy" variant="accent" size="sm" />
      </View>

      {/* Content: List + Chart */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: tokens.spacing.lg,
          gap: tokens.spacing.lg,
        }}
      >
        {/* Client list */}
        <View style={{ flex: 1, gap: 2 }}>
          {data.clients.map((client, i) => (
            <ClientRow
              key={client.id}
              name={client.name}
              color={client.color}
              selected={selectedIndex === i}
              onPress={() => setSelectedIndex(i)}
            />
          ))}
        </View>

        {/* Right side: Selected client info + Donut */}
        <View style={{ flex: 1, alignItems: "center", gap: tokens.spacing.md }}>
          {/* Selected client detail */}
          {selectedClient && (
            <View style={{ alignItems: "center", gap: tokens.spacing.xs }}>
              <Text
                style={{
                  ...tokens.typography.bodyBold,
                  color: tokens.color.ink.primary,
                }}
              >
                {selectedClient.name}
              </Text>
              <MetricValue value={selectedClient.revenue} size="md" />
              <DeltaIndicator value={selectedClient.deltaPercent} size="sm" />
            </View>
          )}

          {/* Donut chart */}
          <DonutChart
            data={data.chartData}
            size={180}
            innerRadius={0.6}
            padAngle={2}
          >
            <Text
              selectable
              style={{
                fontSize: 20,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
                color: tokens.color.ink.primary,
              }}
            >
              {formatCurrency(data.total, { compact: true })}
            </Text>
            <Text
              style={{
                ...tokens.typography.caption,
                color: tokens.color.ink.tertiary,
              }}
            >
              Total
            </Text>
          </DonutChart>
        </View>
      </View>

      {/* Footer CTA */}
      <View style={{ alignItems: "center", paddingBottom: tokens.spacing.lg }}>
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#0F1B4A" : "#1A2B6D",
            paddingHorizontal: tokens.spacing["2xl"],
            paddingVertical: tokens.spacing.md,
            borderRadius: tokens.radius.full,
            borderCurve: "continuous",
          })}
        >
          <Text
            style={{
              ...tokens.typography.captionBold,
              color: tokens.color.ink.inverse,
            }}
          >
            Ver clientes
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

TopClientsSection.displayName = "TopClientsSection";

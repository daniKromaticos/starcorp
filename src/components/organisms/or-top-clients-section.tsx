/**
 * Organism: OrTopClientsSection
 *
 * "Top 8 clientes (Mayor ingreso)" section.
 * Card container with client list + donut chart; CTA button sits below
 * the card aligned to the right and navigates to /clientes.
 */

import { AtMetricValue } from "@/src/components/atoms/at-metric-value";
import { AtSkeleton } from "@/src/components/atoms/at-skeleton";
import { AtStatusBadge } from "@/src/components/atoms/at-status-badge";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { DonutChart } from "@/src/components/charts/donut-chart";
import { MlClientRow } from "@/src/components/molecules/ml-client-row";
import { useTopClients } from "@/src/hooks/queries/use-top-clients";
import { Pressable, View } from "@/src/tw";
import { formatCurrency } from "@/src/utils/currency";
import { gradients, CLIENT_LEGEND_GRADIENTS } from "@/src/theme/gradients";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useState } from "react";

interface OrTopClientsSectionProps {
  periodLabel?: string;
  onViewClients?: () => void;
}

export const OrTopClientsSection = memo<OrTopClientsSectionProps>(
  ({ periodLabel = "Hoy", onViewClients }) => {
    const { data, isLoading } = useTopClients(8);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [donutSize, setDonutSize] = useState(0);

    const selectedClient = data?.clients[selectedIndex];

    if (isLoading || !data) {
      return (
        <View className="gap-3 px-4">
          <AtSkeleton width={240} height={22} />
          <AtSkeleton width="100%" height={360} borderRadius={16} />
        </View>
      );
    }

    return (
      <View className="gap-4">
        {/* Section header */}
        <View className="flex-row justify-between items-center px-4">
          <AtTypography variant="h3">Top 8 clientes</AtTypography>
          <AtStatusBadge label={periodLabel} variant="gradient" size="md" />
        </View>

        {/* Card wrapping list + donut */}
        <View
          className="bg-bg-card mx-4 p-4 rounded-lg"
          style={{
            borderCurve: "continuous",
            boxShadow:
              "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
          }}
        >
          {data.clients.length === 0 ? (
            <View
              style={{
                paddingVertical: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AtTypography variant="label" color="#8892A4">
                Sin clientes para mostrar
              </AtTypography>
            </View>
          ) : (
            <View className="flex-row gap-3">
              {/* La lista se lleva más ancho que el donut (que igual topa en
                  180): a 50/50 los nombres quedaban en "WOODL…". */}
              <View className="gap-0.5" style={{ flex: 1.35 }}>
                {data.clients.map((client, i) => (
                  <MlClientRow
                    key={client.id}
                    name={client.name}
                    color={client.color}
                    gradientColors={
                      CLIENT_LEGEND_GRADIENTS[i % CLIENT_LEGEND_GRADIENTS.length] as [string, string]
                    }
                    selected={selectedIndex === i}
                    onPress={() => setSelectedIndex(i)}
                    centerTitle
                    dense
                  />
                ))}
              </View>

              <View
                className="flex-1 justify-center items-center gap-3"
                onLayout={(e) =>
                  setDonutSize(Math.min(180, e.nativeEvent.layout.width))
                }
              >
                {selectedClient && (
                  <View className="items-center gap-1">
                    <AtTypography variant="bodyBold" className="text-center">
                      {selectedClient.name}
                    </AtTypography>
                    <AtMetricValue value={selectedClient.revenue} size="md" />
                    {/* Participación sobre el total del donut (suma del
                        top 8), no el crecimiento vs. el periodo anterior. */}
                    {data.total > 0 && (
                      <AtTypography variant="captionBold" color="#4A5568">
                        {`${((selectedClient.revenue / data.total) * 100).toFixed(1)}% del total`}
                      </AtTypography>
                    )}
                  </View>
                )}

                <View
                  style={{
                    height: 1,
                    alignSelf: "stretch",
                    backgroundColor: "rgba(0,0,0,0.08)",
                  }}
                />

                {donutSize > 0 && (
                  <DonutChart
                    data={data.chartData}
                    size={donutSize}
                    innerRadius={0.6}
                    padAngle={2}
                    ringSplit={0.22}
                  >
                    {/* Centro blanco (el fondo de la card): el navy se
                        confundía con los segmentos azules del anillo. */}
                    <AtTypography
                      variant="metricSmall"
                      color="#1A1F36"
                      selectable
                    >
                      {formatCurrency(data.total, { compact: true })}
                    </AtTypography>
                    <AtTypography
                      variant="caption"
                      color="#8892A4"
                    >
                      Total
                    </AtTypography>
                  </DonutChart>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Footer CTA — right aligned, navigates to /clientes */}
        <View className="items-end px-4 pb-2">
          <Pressable
            onPress={onViewClients}
            style={{
              borderRadius: 8,
              borderCurve: "continuous",
              overflow: "hidden",
              boxShadow: "0 2px 6px rgba(4, 17, 63, 0.35)",
            }}
          >
            <LinearGradient
              colors={gradients.buttonBlue.colors}
              start={gradients.buttonBlue.start}
              end={gradients.buttonBlue.end}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AtTypography variant="captionBold" color="#FFFFFF">
                Ver clientes
              </AtTypography>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  },
);

OrTopClientsSection.displayName = "OrTopClientsSection";

/**
 * Molecule: MlCompanyCard
 *
 * Two visual variants:
 *  - 'summary' (default) — wide dark navy card with name, total label and value
 *    (used by the dashboard Financiero section).
 *  - 'tile' — compact gradient tile with a company logo and a name label
 *    rendered below the tile (used by the /financiero screen carousel).
 */

import { AtDeltaIndicator } from "@/src/components/atoms/at-delta-indicator";
import { AtIcon } from "@/src/components/atoms/at-icon";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { Pressable, View } from "@/src/tw";
import { formatCurrency } from "@/src/utils/currency";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";

type MlCompanyCardVariant = "summary" | "tile";

interface MlCompanyCardProps {
  name: string;
  totalLabel?: string;
  totalValue?: number;
  deltaPercent?: number;
  onPress?: () => void;
  className?: string;
  width?: number;
  selected?: boolean;
  variant?: MlCompanyCardVariant;
}

const GRADIENT_COLORS = ["#215EF7", "#0F2674"] as const;

export const MlCompanyCard = memo<MlCompanyCardProps>(
  ({
    name,
    totalLabel,
    totalValue,
    deltaPercent,
    onPress,
    className,
    width,
    selected,
    variant = "summary",
  }) => {
    if (variant === "tile") {
      const isSelected = selected !== false;
      const tileWidth = width ?? 110;
      return (
        <Pressable
          onPress={onPress}
          className={`items-center gap-2 ${className ?? ""}`}
          style={{ width: tileWidth, opacity: isSelected ? 1 : 0.55 }}
        >
          <LinearGradient
            colors={GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: tileWidth,
              height: tileWidth,
              borderRadius: 18,
              borderCurve: "continuous",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isSelected
                ? "0 6px 14px rgba(15, 38, 116, 0.35)"
                : "0 2px 6px rgba(15, 38, 116, 0.2)",
            }}
          >
            <View
              style={{
                width: tileWidth * 0.72,
                height: tileWidth * 0.72,
                borderRadius: 12,
                borderCurve: "continuous",
                backgroundColor: isSelected
                  ? "#FFFFFF"
                  : "rgba(255, 255, 255, 0.35)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AtIcon name="business" size="xl" color="#1A2B6D" />
            </View>
          </LinearGradient>

          <AtTypography
            variant="bodyBold"
            color={isSelected ? "#1A1F36" : "#8892A4"}
            className="text-center"
            numberOfLines={2}
          >
            {name}
          </AtTypography>
        </Pressable>
      );
    }

    const dimmed = selected === false;
    const summaryWidth = width ?? 280;
    return (
      <Pressable
        onPress={onPress}
        className={`bg-[#0A1432] rounded-lg p-4 gap-3 ${className ?? ""}`}
        style={{
          width: summaryWidth,
          borderCurve: "continuous",
          opacity: dimmed ? 0.55 : 1,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              borderCurve: "continuous",
            }}
          >
            <AtIcon name="business" size="md" color="#1A2B6D" />
          </View>

          <AtTypography
            variant="h3"
            color="#FFFFFF"
            numberOfLines={1}
            className="flex-1"
          >
            {name}
          </AtTypography>

          {deltaPercent != null && (
            <AtDeltaIndicator value={deltaPercent} size="sm" appearance="dark" />
          )}
        </View>

        {(totalLabel || totalValue != null) && (
          <View className="gap-1">
            {totalLabel && (
              <AtTypography variant="bodyBold" color="#FFFFFF">
                {totalLabel}
              </AtTypography>
            )}
            {totalValue != null && (
              <AtTypography
                variant="metricSmall"
                color="#FFFFFF"
                selectable
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatCurrency(totalValue, { currency: "USD", compact: false })}
              </AtTypography>
            )}
          </View>
        )}
      </Pressable>
    );
  },
);

MlCompanyCard.displayName = "MlCompanyCard";

/**
 * Molecule: MlMetricBar
 *
 * Gradient pill row used in the client detail screen. The pill width is
 * proportional to `widthPercent` (clamped 0.18..0.7 so the right value
 * never overflows). The right side shows arrow + amount, with the
 * arrow coloured by `deltaPositive` and the amount in dark navy. When
 * `selected` is true the whole row gets a thin blue outline matching
 * the pill curvature.
 */

import { AtIcon } from "@/src/components/atoms/at-icon";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { Pressable, View } from "@/src/tw";
import { formatCurrency } from "@/src/utils/currency";
import type { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { useWindowDimensions } from "react-native";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

interface MlMetricBarProps {
  label: string;
  icon: MaterialIconName;
  /** When null, the right side renders "—" without arrow (placeholder mode). */
  value: number | null;
  deltaPositive: boolean;
  gradient: readonly [string, string, ...string[]];
  widthPercent: number;
  selected?: boolean;
  onPress?: () => void;
  /** Currency by default; 'percent' renders e.g. "42.3%". */
  valueFormat?: "currency" | "percent";
  /**
   * When true and the row is `selected`, a chevron appears at the right
   * edge to hint that tapping again will navigate (drill-down pattern).
   */
  redirectable?: boolean;
}

function formatPercent(v: number): string {
  return `${v.toFixed(1)}%`;
}

const MIN_WIDTH = 0.18;
const MAX_WIDTH = 0.7;
// 320dp: con 0.7 el lado derecho (~67px) no alcanza para flecha + monto.
const MAX_WIDTH_NARROW = 0.55;
// Ancho mínimo del pill = paddingHorizontal (18×2) + icono (22).
const PILL_MIN_PX = 58;
// Heuristic: label fits inside the pill when pillFlex covers icon + padding
// + label width. Looser than strict-fit so short labels (e.g. "U. neta")
// render inside in white whenever the pill has reasonable space; ellipsis
// truncation handles the edge cases.
const LABEL_BASE_FLEX = 0.16;
const LABEL_FLEX_PER_CHAR = 0.022;

export const MlMetricBar = memo<MlMetricBarProps>(
  ({
    label,
    icon,
    value,
    deltaPositive,
    gradient,
    widthPercent,
    selected = false,
    onPress,
    valueFormat = "currency",
    redirectable = false,
  }) => {
    const isPlaceholder = value === null;
    const arrowIcon: MaterialIconName = deltaPositive
      ? "north-east"
      : "south-east";
    const arrowColor = deltaPositive ? "#22C55E" : "#EF4444";
    const { width: windowWidth } = useWindowDimensions();
    const maxWidth = windowWidth < 360 ? MAX_WIDTH_NARROW : MAX_WIDTH;
    const pillFlex = Math.max(MIN_WIDTH, Math.min(maxWidth, widthPercent));
    const rightFlex = 1 - pillFlex;
    const labelMinFlex = Math.min(
      maxWidth,
      LABEL_BASE_FLEX + label.length * LABEL_FLEX_PER_CHAR,
    );
    const labelOutside = pillFlex < labelMinFlex;

    return (
      <Pressable
        onPress={onPress}
        style={{
          padding: 4,
          borderWidth: 1.5,
          borderColor: selected ? "#6366F1" : "transparent",
          borderRadius: selected ? 20 : 22,
          borderCurve: "continuous",
        }}
      >
        <View className="flex-row items-center">
          <View style={{ flex: pillFlex, minWidth: PILL_MIN_PX }}>
            <LinearGradient
              colors={
                gradient as unknown as readonly [string, string, ...string[]]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 18,
                paddingVertical: 16,
                borderRadius: 14,
                borderCurve: "continuous",
              }}
            >
              <AtIcon name={icon} size={22} color="#FFFFFF" />
              {!labelOutside && (
                <AtTypography
                  variant="h3"
                  color="#FFFFFF"
                  numberOfLines={1}
                  className="flex-shrink"
                >
                  {label}
                </AtTypography>
              )}
              {!labelOutside && redirectable && selected && (
                <AtIcon name="arrow-forward" size={22} color="#FFFFFF" />
              )}
            </LinearGradient>
          </View>

          <View
            style={{
              flex: rightFlex,
              flexDirection: "row",
              alignItems: "center",
              paddingLeft: 12,
              paddingRight: 4,
            }}
          >
            {labelOutside && (
              <View
                className="flex-row items-center"
                style={{ flexShrink: 1, marginRight: 8, gap: 6 }}
              >
                <AtTypography
                  variant="h3"
                  color="#1A1F36"
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {label}
                </AtTypography>
                {redirectable && selected && (
                  <AtIcon name="arrow-forward" size={20} color="#1A1F36" />
                )}
              </View>
            )}
            <View
              className="flex-row items-center gap-2"
              style={{ marginLeft: "auto", flexShrink: 1 }}
            >
              {!isPlaceholder && (
                <AtIcon name={arrowIcon} size={22} color={arrowColor} />
              )}
              <AtTypography
                variant="bodyBold"
                color={isPlaceholder ? "#8892A4" : "#1A1F36"}
                style={{ fontVariant: ["tabular-nums"], flexShrink: 1 }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {isPlaceholder
                  ? "—"
                  : valueFormat === "percent"
                    ? formatPercent(value)
                    : formatCurrency(value)}
              </AtTypography>
            </View>
          </View>
        </View>
      </Pressable>
    );
  },
);

MlMetricBar.displayName = "MlMetricBar";

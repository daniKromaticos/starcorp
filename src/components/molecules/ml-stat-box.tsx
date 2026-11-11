/**
 * Molecule: MlStatBox
 *
 * Icon + value + label in a box layout.
 * Used in client detail (Empleados, Lider, Vigencia).
 */

import { AtIcon } from "@/src/components/atoms/at-icon";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { View } from "@/src/tw";
import type { MaterialIcons } from "@expo/vector-icons";
import React, { memo } from "react";
import { useWindowDimensions } from "react-native";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

interface MlStatBoxProps {
  icon: MaterialIconName;
  value: string | number;
  label: string;
  iconColor?: string;
  variant?: "light" | "dark";
  className?: string;
}

export const MlStatBox = memo<MlStatBoxProps>(
  ({
    icon,
    value,
    label,
    iconColor = "#1A2B6D",
    variant = "light",
    className,
  }) => {
    const isDark = variant === "dark";
    // 320dp: 3 cajas de ~88px con p-4 dejan 56px internos y "Empleados"
    // se parte a media palabra; en pantallas angostas se reduce el padding X.
    const { width: windowWidth } = useWindowDimensions();
    const padding = windowWidth < 360 ? "py-4 px-2" : "p-4";
    return (
      <View
        className={`items-center justify-between ${padding} rounded-lg flex-1 ${className ?? ""}`}
        style={{
          borderCurve: "continuous",
          backgroundColor: isDark ? "#0E173C" : "#F5F5F7",
        }}
      >
        <View className="items-center gap-2">
          <AtIcon name={icon} size="lg" color={iconColor} />
          <AtTypography
            variant="captionBold"
            color={isDark ? "#FFFFFF" : "#1A1F36"}
            selectable
            numberOfLines={2}
            style={{ textAlign: "center" }}
          >
            {String(value)}
          </AtTypography>
        </View>
        <AtTypography
          variant="caption"
          color={isDark ? "rgba(255,255,255,0.75)" : "#8892A4"}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{ textAlign: "center", marginTop: 4 }}
        >
          {label}
        </AtTypography>
      </View>
    );
  },
);

MlStatBox.displayName = "MlStatBox";

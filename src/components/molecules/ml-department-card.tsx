/**
 * Molecule: MlDepartmentCard
 *
 * Card navy del carrusel "Lista de responsabilidades" — icono, nombre
 * del departamento, divisor y responsable principal.
 */

import { AtIcon } from "@/src/components/atoms/at-icon";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { Pressable, View } from "@/src/tw";
import type { MaterialIconName } from "@/src/types/nexiatask.types";
import React, { memo } from "react";

interface MlDepartmentCardProps {
  nombre: string;
  responsable: string;
  icon: MaterialIconName;
  selected?: boolean;
  onPress?: () => void;
}

const ICON_COLOR = "#5B8AF0";
const BG_ACTIVE = "#0C2B78";
const BG_INACTIVE = "#1C224D";
const BORDER_ACTIVE = "#5B8AF0";

export const MlDepartmentCard = memo<MlDepartmentCardProps>(
  ({ nombre, responsable, icon, selected, onPress }) => {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: !!selected }}
        accessibilityLabel={`${nombre}. Responsable ${responsable}`}
        className="gap-3 p-4 rounded-lg"
        style={{
          width: 168,
          backgroundColor: selected ? BG_ACTIVE : BG_INACTIVE,
          borderCurve: "continuous",
          borderWidth: selected ? 2 : 0,
          borderColor: selected ? BORDER_ACTIVE : "transparent",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
        }}
      >
        <AtIcon name={icon} size="lg" color={ICON_COLOR} />

        <AtTypography
          variant="bodyBold"
          color="#FFFFFF"
          numberOfLines={2}
          style={{ minHeight: 44 }}
        >
          {nombre}
        </AtTypography>

        <View
          className="h-px"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.18)" }}
        />

        <View>
          <AtTypography variant="caption" color="#8FA0D6">
            Responsable
          </AtTypography>
          <AtTypography variant="bodyBold" color="#FFFFFF" numberOfLines={1}>
            {responsable}
          </AtTypography>
        </View>
      </Pressable>
    );
  },
);

MlDepartmentCard.displayName = "MlDepartmentCard";

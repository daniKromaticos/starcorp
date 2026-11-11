/**
 * Molecule: MlAvanceRow
 *
 * Card del histórico de Avances en el detalle de tarea. Estructura:
 * box con MES/DÍA + label de semana + texto del avance.
 */

import { AtTypography } from "@/src/components/atoms/at-typography";
import { View } from "@/src/tw";
import type { NexiataskAvance } from "@/src/types/nexiatask.types";
import React, { memo } from "react";

interface MlAvanceRowProps {
  avance: NexiataskAvance;
}

export const MlAvanceRow = memo<MlAvanceRowProps>(({ avance }) => {
  return (
    <View
      className="flex-row gap-3 bg-bg-card p-3 rounded-lg"
      style={{
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.06)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
      }}
    >
      <View
        className="justify-center items-center px-2 py-1 rounded-md"
        style={{
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.08)",
          backgroundColor: "#FAFBFC",
          minWidth: 48,
        }}
      >
        <AtTypography variant="label" color="#5B82E6">
          {avance.fechaMes}
        </AtTypography>
        <AtTypography variant="bodyBold" color="#1A1F36">
          {avance.fechaDia}
        </AtTypography>
      </View>
      <View className="flex-1 gap-0.5">
        <AtTypography variant="bodyBold" color="#1A1F36">
          {avance.semanaLabel}
        </AtTypography>
        <AtTypography variant="caption" color="#4A5568">
          {avance.descripcion}
        </AtTypography>
      </View>
    </View>
  );
});

MlAvanceRow.displayName = "MlAvanceRow";

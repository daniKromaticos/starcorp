/**
 * Molecule: MlTaskRow
 *
 * Fila de tarea dentro de un proyecto: check + título + flecha arriba,
 * pill de cumplimiento, y card blanca interna con fecha + descripción
 * de la semana + objetivo de la tarea (mismo campo que el detalle).
 *
 * Reutilizada en /reportes (lista) y en el dashboard "Reportes recientes".
 */

import { AtIcon } from "@/src/components/atoms/at-icon";
import { AtProgressPill } from "@/src/components/atoms/at-progress-pill";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { Pressable, View } from "@/src/tw";
import type { NexiataskTarea } from "@/src/types/nexiatask.types";
import React, { memo } from "react";

const INNER_CARD_RADIUS = 8;
const DATE_NUMBER_COLOR = "#5B82E6";

interface MlTaskRowProps {
  tarea: NexiataskTarea;
  onPress?: () => void;
}

function isCompletedState(estado: string): boolean {
  // Estado terminal "exitoso" en la API: "Aprobada / Cerrada".
  return /aprobad|cerrad/i.test(estado);
}

export const MlTaskRow = memo<MlTaskRowProps>(({ tarea, onPress }) => {
  const completed = isCompletedState(tarea.estado);
  const objetivo = tarea.raw.objetivo?.trim();

  return (
    <Pressable onPress={onPress} className="gap-2 bg-[#0C2B78] p-4 rounded-md">
      <View className="flex-row items-center gap-2">
        <AtIcon name="check-circle" size={18} color="#5B82E6" />
        <View className="flex-1">
          <AtTypography variant="caption" color="#FFFFFF">
            {tarea.titulo}
          </AtTypography>
        </View>
        <AtIcon name="arrow-forward" size={18} color="#FFFFFF" />
      </View>

      <View className="self-start">
        {completed ? (
          <AtProgressPill value={100} label="Completado" variant="success" />
        ) : (
          <AtProgressPill value={tarea.cumplimientoPct} />
        )}
      </View>

      <View
        className="flex-row gap-3 p-3"
        style={{
          backgroundColor: "#F6F8FA",
          borderRadius: INNER_CARD_RADIUS,
          borderCurve: "continuous",
        }}
      >
        <View
          className="justify-center items-center px-2 py-1"
          style={{
            borderRadius: INNER_CARD_RADIUS,
            borderCurve: "continuous",
            backgroundColor: "#FFFFFF",
            minWidth: 48,
          }}
        >
          <AtTypography variant="label" color={"#424654"}>
            {tarea.fechaMes}
          </AtTypography>
          <AtTypography variant="bodyBold" color={DATE_NUMBER_COLOR}>
            {tarea.fechaDia}
          </AtTypography>
        </View>
        <View className="flex-1 gap-0.5">
          <AtTypography variant="bodyBold" color="#212122">
            {tarea.semanaLabel}
          </AtTypography>
          <AtTypography variant="caption" color="#424654">
            {tarea.seguimiento}
          </AtTypography>
          {!!objetivo && (
            <AtTypography variant="caption" color="#424654" className="mt-1.5">
              {objetivo}
            </AtTypography>
          )}
        </View>
      </View>
    </Pressable>
  );
});

MlTaskRow.displayName = "MlTaskRow";

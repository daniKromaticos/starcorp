/**
 * Organism: OrTaskDetailCard
 *
 * Card grande del detalle de una tarea: header (proyecto + título + badge
 * de estado), barra de cumplimiento, grid Objetivo/Meta/Resultado y
 * sección Bloqueo / Apoyo requerido.
 */

import { AtIcon } from "@/src/components/atoms/at-icon";
import { AtProgressBar } from "@/src/components/atoms/at-progress-bar";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { View } from "@/src/tw";
import type {
  MaterialIconName,
  NexiataskTareaDetalle,
} from "@/src/types/nexiatask.types";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";

interface OrTaskDetailCardProps {
  tarea: NexiataskTareaDetalle;
}

function isCompletedState(estado: string): boolean {
  // Estado terminal "exitoso" en la API: "Aprobada / Cerrada".
  return /aprobad|cerrad/i.test(estado);
}

// Verdes de marca: claro #8DC549 → oscuro #294316. La barra de
// cumplimiento siempre usa esta familia; el chip de estado cambia de
// color según el estado (ver getStateGradient).
const GREEN_LIGHT = "#8DC549";
const GREEN_DARK = "#294316";
const PROGRESS_GRADIENT: readonly [string, string] = [
  GREEN_DARK,
  GREEN_LIGHT,
] as const;

type Gradient = readonly [string, string];

// Gradiente del chip por estado (claro arriba → oscuro abajo, texto blanco).
// El extremo oscuro garantiza contraste suficiente para el label.
const STATE_GRADIENTS: Record<string, Gradient> = {
  success: [GREEN_LIGHT, GREEN_DARK], // Aprobada / Cerrada
  active: ["#5B82E6", "#0C2B78"], // En progreso / Recurrente
  review: ["#38B2AC", "#1D4044"], // Lista para revisión
  waiting: ["#E9A23B", "#8A5A12"], // En espera (cliente / Presidencia)
  adjust: ["#ED8936", "#7B341E"], // Devuelta / Requiere ajustes
  blocked: ["#E53E3E", "#7B1F1F"], // Bloqueada
  failed: ["#9B6B6B", "#3B1F1F"], // No realizada
  pending: ["#8A94A6", "#3D4452"], // Pendiente / default
};

function getStateGradient(estado: string): Gradient {
  const e = estado.toLowerCase();
  if (/aprobad|cerrad/.test(e)) return STATE_GRADIENTS.success;
  if (/bloquead/.test(e)) return STATE_GRADIENTS.blocked;
  if (/no realizada/.test(e)) return STATE_GRADIENTS.failed;
  if (/devuelt|ajuste/.test(e)) return STATE_GRADIENTS.adjust;
  if (/espera/.test(e)) return STATE_GRADIENTS.waiting;
  if (/revisi/.test(e)) return STATE_GRADIENTS.review;
  if (/progreso|recurrente/.test(e)) return STATE_GRADIENTS.active;
  return STATE_GRADIENTS.pending; // Pendiente y cualquier estado no mapeado
}

export const OrTaskDetailCard = memo<OrTaskDetailCardProps>(({ tarea }) => {
  const completed = isCompletedState(tarea.estado);
  const stateLabel = completed ? "Completado" : tarea.estado;
  const stateColors = getStateGradient(tarea.estado);
  const pct = Number.isFinite(tarea.cumplimientoPct)
    ? tarea.cumplimientoPct
    : 0;
  // Iniciativa padre como subtítulo; el narrativo de la semana va en "Resultado".
  const subtitle = tarea.responsabilidad?.trim();

  return (
    <View
      className="gap-4 bg-bg-card mx-4 p-4 rounded-lg"
      style={{
        borderCurve: "continuous",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      }}
    >
      {/* Estado: pill solo, alineado a la derecha */}
      <View className="flex-row justify-end">
        <LinearGradient
          colors={stateColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: "rgba(0, 0, 0, 0.12)",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
          }}
        >
          <AtTypography variant="label" color="#FFFFFF">
            {stateLabel}
          </AtTypography>
        </LinearGradient>
      </View>

      {/* Título grande (tarea) + subtítulo (descripción) con check */}
      <View className="gap-2">
        <AtTypography variant="h3" color="#1A1F36" numberOfLines={3}>
          {tarea.titulo}
        </AtTypography>
        {!!subtitle && (
          <View className="flex-row items-center gap-2">
            <AtIcon name="checklist" size={20} color="#1A1F36" />
            <AtTypography
              variant="bodyBold"
              color="#1A1F36"
              numberOfLines={2}
              className="flex-1"
            >
              {subtitle}
            </AtTypography>
          </View>
        )}
      </View>

      <View className="gap-2">
        <View className="flex-row justify-between">
          <AtTypography variant="caption" color="#4A5568">
            Cumplimiento
          </AtTypography>
          <AtTypography variant="bodyBold" color="#1A1F36">
            {Math.round(pct)}%
          </AtTypography>
        </View>
        <AtProgressBar
          progress={pct / 100}
          colors={PROGRESS_GRADIENT}
          height={8}
        />
      </View>

      <View
        className="gap-3 p-3 rounded-md"
        style={{
          backgroundColor: "#FAFBFC",
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.06)",
        }}
      >
        <View className="flex-row gap-3">
          <DetailField
            iconName="adjust"
            iconColor="#1C1B1F"
            label="Objetivo"
            value={tarea.objetivo || "—"}
          />
          <DetailField
            iconName="flag"
            iconColor="#1C1B1F"
            label="Meta"
            value={tarea.meta || "—"}
          />
        </View>

        <View
          className="h-px"
          style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
        />

        <DetailField
          iconName="search"
          iconColor="#1C1B1F"
          label="Resultado"
          value={tarea.resultado || "—"}
        />

        <View
          className="h-px"
          style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
        />

        <View className="flex-row gap-3">
          <DetailField
            iconName="error-outline"
            iconColor="#E53E3E"
            labelColor="#E53E3E"
            label="Bloqueo"
            value={tarea.bloqueo || "—"}
          />
          <DetailField
            iconName="handshake"
            iconColor="#0C2B78"
            labelColor="#0C2B78"
            label="Apoyo requerido"
            value={tarea.apoyoRequerido || "—"}
          />
        </View>
      </View>
    </View>
  );
});

OrTaskDetailCard.displayName = "OrTaskDetailCard";

interface DetailFieldProps {
  iconName: MaterialIconName;
  iconColor: string;
  label: string;
  value: string;
  labelColor?: string;
}

const DetailField = memo<DetailFieldProps>(
  ({ iconName, iconColor, label, value, labelColor = "#1A1F36" }) => {
    return (
      <View className="flex-1 gap-1.5">
        <View className="flex-row items-center gap-2">
          <AtIcon name={iconName} size={18} color={iconColor} />
          {/* flexShrink: a 320dp "Apoyo requerido" desbordaba su columna */}
          <AtTypography variant="h3" color={labelColor} style={{ flexShrink: 1 }}>
            {label}
          </AtTypography>
        </View>
        <AtTypography variant="body" color="#4A5568">
          {value}
        </AtTypography>
      </View>
    );
  },
);
DetailField.displayName = "DetailField";

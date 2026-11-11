/**
 * Organism: OrTareasAccordionList
 *
 * Lista vertical de acordeones — uno por RESPONSABILIDAD (iniciativa
 * padre) del departamento seleccionado, numerada ("1. …"). La card azul
 * que se despliega lleva el nombre de la responsabilidad como título y
 * adentro muestra sus TAREAS. Cada tarea muestra su título, un pill de
 * estado/cumplimiento y una card blanca con su último avance (preview).
 * Tap en una tarea navega al single (/reportes/[taskId]), donde se ve el
 * seguimiento completo y el historial de avances.
 *
 * El carrusel superior decide qué departamento se muestra; este organism
 * solo recibe las tareas de ese departamento y las agrupa por
 * `responsabilidad` preservando el orden de aparición.
 */

import React, { memo, useMemo, useState } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtProgressPill } from '@/src/components/atoms/at-progress-pill';
import type {
  NexiataskAvance,
  NexiataskTareaConAvances,
} from '@/src/types/nexiatask.types';

const NAVY_BG = '#0F1B4A';
const TAREA_BLOCK_BG = '#16245C';
const AVANCE_CARD_BG = '#FFFFFF';
const DATE_BOX_BG = '#F4F6FB';
const SIN_RESPONSABILIDAD = 'Sin responsabilidad';

/** Estados que consideramos "Completado" para el pill nominal. */
const COMPLETED_ESTADOS = new Set(['Aprobada / Cerrada']);

function isCompletada(tarea: NexiataskTareaConAvances): boolean {
  return COMPLETED_ESTADOS.has(tarea.estado) || tarea.cumplimientoPct >= 100;
}

interface OrTareasAccordionListProps {
  tareas: NexiataskTareaConAvances[];
  /** Navega al single de la tarea al tocarla. */
  onTareaPress?: (tareaId: string) => void;
}

interface ResponsabilidadGroup {
  /** Nombre de la responsabilidad (iniciativa padre). */
  titulo: string;
  tareas: NexiataskTareaConAvances[];
}

/**
 * Agrupa las tareas por `responsabilidad` preservando el orden de
 * aparición (primer match define la posición del grupo).
 */
function groupByResponsabilidad(
  tareas: NexiataskTareaConAvances[],
): ResponsabilidadGroup[] {
  const byResp = new Map<string, ResponsabilidadGroup>();
  for (const t of tareas) {
    const titulo = t.responsabilidad?.trim() || SIN_RESPONSABILIDAD;
    const group = byResp.get(titulo);
    if (group) {
      group.tareas.push(t);
    } else {
      byResp.set(titulo, { titulo, tareas: [t] });
    }
  }
  return Array.from(byResp.values());
}

export const OrTareasAccordionList = memo<OrTareasAccordionListProps>(
  ({ tareas, onTareaPress }) => {
    const groups = useMemo(() => groupByResponsabilidad(tareas), [tareas]);

    return (
      <View className="gap-3 px-4">
        {groups.map((group, idx) => (
          <ResponsabilidadAccordion
            key={group.titulo}
            numero={idx + 1}
            group={group}
            openByDefault={idx === 0}
            onTareaPress={onTareaPress}
          />
        ))}
      </View>
    );
  },
);

OrTareasAccordionList.displayName = 'OrTareasAccordionList';

interface ResponsabilidadAccordionProps {
  numero: number;
  group: ResponsabilidadGroup;
  openByDefault: boolean;
  onTareaPress?: (tareaId: string) => void;
}

const ResponsabilidadAccordion = memo<ResponsabilidadAccordionProps>(
  ({ numero, group, openByDefault, onTareaPress }) => {
    const [open, setOpen] = useState(openByDefault);

    const count = group.tareas.length;
    const countLabel = `${count} ${count === 1 ? 'tarea' : 'tareas'}`;

    return (
      <View
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: NAVY_BG,
          borderCurve: 'continuous',
          boxShadow: '0 4px 12px rgba(15, 27, 74, 0.18)',
        }}
      >
        <Pressable
          onPress={() => setOpen((o) => !o)}
          className="flex-row items-center justify-between px-4 py-3.5 gap-2"
          accessibilityRole="button"
          accessibilityLabel={`${numero}. ${group.titulo}, ${countLabel}`}
          accessibilityState={{ expanded: open }}
        >
          <AtTypography
            variant="bodyBold"
            color="#FFFFFF"
            numberOfLines={2}
            className="flex-1"
          >
            {numero}. {group.titulo}
          </AtTypography>
          <View className="flex-row items-center gap-2">
            <AtTypography variant="caption" color="#8FA0D6">
              {countLabel}
            </AtTypography>
            <AtIcon
              name={open ? 'expand-less' : 'expand-more'}
              size={20}
              color="#FFFFFF"
            />
          </View>
        </Pressable>

        {open && (
          <View className="gap-3 px-3 pb-3">
            {group.tareas.map((t) => (
              <TareaCard
                key={t.id}
                tarea={t}
                onPress={() => onTareaPress?.(t.id)}
              />
            ))}
          </View>
        )}
      </View>
    );
  },
);

ResponsabilidadAccordion.displayName = 'ResponsabilidadAccordion';

interface TareaCardProps {
  tarea: NexiataskTareaConAvances;
  onPress?: () => void;
}

const TareaCard = memo<TareaCardProps>(({ tarea, onPress }) => {
  const ultimoAvance = tarea.avances[0];
  const completada = isCompletada(tarea);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tarea.titulo}
      className="gap-2.5 p-3 rounded-lg"
      style={{ backgroundColor: TAREA_BLOCK_BG, borderCurve: 'continuous' }}
    >
      <View className="flex-row items-center gap-2">
        <AtIcon name="check-circle" size={18} color="#5B82E6" />
        <AtTypography
          variant="bodyBold"
          color="#FFFFFF"
          numberOfLines={2}
          className="flex-1"
        >
          {tarea.titulo}
        </AtTypography>
        <AtIcon name="arrow-forward" size={18} color="#8FA0D6" />
      </View>

      {completada ? (
        <AtProgressPill value={100} label="Completado" variant="success" />
      ) : (
        <AtProgressPill value={tarea.cumplimientoPct} />
      )}

      {ultimoAvance && <AvancePreview avance={ultimoAvance} />}
    </Pressable>
  );
});

TareaCard.displayName = 'TareaCard';

interface AvancePreviewProps {
  avance: NexiataskAvance;
}

const AvancePreview = memo<AvancePreviewProps>(({ avance }) => {
  return (
    <View
      className="flex-row items-center gap-3 p-3 rounded-md"
      style={{ backgroundColor: AVANCE_CARD_BG, borderCurve: 'continuous' }}
    >
      <View
        className="justify-center items-center px-2 py-1"
        style={{
          borderRadius: 8,
          borderCurve: 'continuous',
          backgroundColor: DATE_BOX_BG,
          minWidth: 48,
        }}
      >
        <AtTypography variant="label" color="#8A92A6">
          {avance.fechaMes}
        </AtTypography>
        <AtTypography variant="bodyBold" color="#5B82E6">
          {avance.fechaDia}
        </AtTypography>
      </View>

      <View className="flex-1 gap-0.5">
        <AtTypography variant="bodyBold" color="#1A2440" numberOfLines={1}>
          {avance.semanaLabel}
        </AtTypography>
        <AtTypography variant="caption" color="#6B7280" numberOfLines={2}>
          {avance.descripcion}
        </AtTypography>
      </View>
    </View>
  );
});

AvancePreview.displayName = 'AvancePreview';

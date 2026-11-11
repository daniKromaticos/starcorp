/**
 * Organism: OrRecentReportsSection
 *
 * "Reportes más recientes" del dashboard — lista vertical de
 * departamentos → proyectos → tareas (alimentada por NexiaTask).
 * Preview acotado: los 2 primeros departamentos, con su primer
 * proyecto y las 2 primeras tareas de cada uno (ver constantes MAX_*).
 *
 * Comparte source of truth con la pantalla /reportes: usa el mismo
 * hook (useNexiataskResponsibilities). Tap en una tarea navega a
 * /reportes/[taskId].
 */

import React, { memo, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { MlTaskRow } from '@/src/components/molecules/ml-task-row';
import { MlEmptyState } from '@/src/components/molecules/ml-empty-state';
import { gradients } from '@/src/theme/gradients';
import { useNexiataskResponsibilities } from '@/src/hooks/queries/use-nexiatask-responsibilities';
import type {
  NexiataskDepartamento,
  NexiataskTarea,
} from '@/src/types/nexiatask.types';

const CARD_BG = '#1C224D';
const CARD_RADIUS = 8;
// Marco blanco que envuelve las cards azules.
const OUTER_CARD_BG = '#FFFFFF';
const OUTER_CARD_RADIUS = 12;
const HEADER_TEXT_COLOR = '#1A2440';
// Topes del preview. Cada MlTaskRow ocupa ~175px (título + pill + card con
// fecha, semana, seguimiento y objetivo), así que el tope de tareas es lo que
// manda en el alto de la sección: 3×2×3 daban hasta 18 filas y ~3.100px de
// scroll en el dashboard. El detalle completo está en /reportes.
const MAX_DEPARTAMENTOS = 2;
const MAX_PROYECTOS_POR_DEPTO = 1;
const MAX_TAREAS_POR_PROYECTO = 2;

interface ProyectoPreview {
  id: string;
  titulo: string;
  tareas: NexiataskTarea[];
  totalTareas: number;
}

interface DeptoPreview {
  id: string;
  nombre: string;
  icon: NexiataskDepartamento['icon'];
  proyectos: ProyectoPreview[];
}

function buildPreview(
  departamentos: readonly NexiataskDepartamento[],
): DeptoPreview[] {
  return departamentos.slice(0, MAX_DEPARTAMENTOS).map((dept) => ({
    id: dept.id,
    nombre: dept.nombre,
    icon: dept.icon,
    proyectos: dept.proyectos
      .slice(0, MAX_PROYECTOS_POR_DEPTO)
      .map((proyecto) => ({
        id: proyecto.id,
        titulo: proyecto.titulo,
        tareas: proyecto.tareas.slice(0, MAX_TAREAS_POR_PROYECTO),
        totalTareas: proyecto.tareas.length,
      })),
  }));
}

export const OrRecentReportsSection = memo(() => {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } =
    useNexiataskResponsibilities();
  const previews = useMemo(
    () => buildPreview(data?.departamentos ?? []),
    [data],
  );

  const handleTareaPress = (tareaId: string) => {
    router.push(`/(tabs)/reportes/${tareaId}` as never);
  };

  return (
    <View className="gap-3">
      <View className="px-4">
        <AtTypography variant="h2">Reportes recientes</AtTypography>
      </View>

      {isLoading ? (
        <View className="gap-3 px-4">
          <AtSkeleton width="100%" height={140} />
          <AtSkeleton width="100%" height={140} />
        </View>
      ) : isError ? (
        <View className="px-4">
          <MlEmptyState
            icon="cloud-off"
            title="No pudimos cargar los reportes"
            description="Revisa tu conexión o vuelve a intentarlo en unos segundos."
            action={{
              label: isRefetching ? 'Reintentando…' : 'Reintentar',
              onPress: () => refetch(),
            }}
          />
        </View>
      ) : previews.length === 0 ? (
        <View className="px-4">
          <MlEmptyState
            icon="assignment"
            title="Sin reportes esta semana"
            description="Aún no se registran tareas para los departamentos."
          />
        </View>
      ) : (
        <>
          <View className="px-4">
            <View
              className="p-3 gap-4"
              style={{
                backgroundColor: OUTER_CARD_BG,
                borderRadius: OUTER_CARD_RADIUS,
                borderCurve: 'continuous',
                boxShadow: '0 4px 12px rgba(15, 27, 74, 0.12)',
              }}
            >
              {previews.map((preview) => (
                <DepartmentCard
                  key={preview.id}
                  preview={preview}
                  onTareaPress={handleTareaPress}
                />
              ))}
            </View>
          </View>

          {/* Footer CTA — mismo estilo que "Ver clientes" del dashboard */}
          <View className="items-end px-4">
            <Pressable
              onPress={() => router.push('/(tabs)/reportes' as never)}
              style={{
                borderRadius: 8,
                borderCurve: 'continuous',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(4, 17, 63, 0.35)',
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
                  Ver reportes
                </AtTypography>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
});
OrRecentReportsSection.displayName = 'OrRecentReportsSection';

interface DepartmentCardProps {
  preview: DeptoPreview;
  onTareaPress: (tareaId: string) => void;
}

const DepartmentCard = memo<DepartmentCardProps>(
  ({ preview, onTareaPress }) => {
    return (
      <View className="gap-3">
        <View className="flex-row items-center gap-2 px-1">
          <AtIcon name={preview.icon} size={18} color={HEADER_TEXT_COLOR} />
          <AtTypography
            variant="bodyBold"
            color={HEADER_TEXT_COLOR}
            numberOfLines={1}
            className="flex-1"
          >
            {preview.nombre}
          </AtTypography>
        </View>

        {preview.proyectos.map((proyecto) => (
          <ProyectoCard
            key={proyecto.id}
            proyecto={proyecto}
            onTareaPress={onTareaPress}
          />
        ))}
      </View>
    );
  },
);
DepartmentCard.displayName = 'DepartmentCard';

interface ProyectoCardProps {
  proyecto: ProyectoPreview;
  onTareaPress: (tareaId: string) => void;
}

const ProyectoCard = memo<ProyectoCardProps>(({ proyecto, onTareaPress }) => {
  const shown = proyecto.tareas.length;
  const total = proyecto.totalTareas;
  const countLabel =
    total > shown
      ? `${shown} de ${total} tareas`
      : `${shown} ${shown === 1 ? 'Tarea' : 'Tareas'}`;

  return (
    <View
      className="p-3 gap-3"
      style={{
        backgroundColor: CARD_BG,
        borderRadius: CARD_RADIUS,
        borderCurve: 'continuous',
      }}
    >
      <View className="flex-row justify-between items-center gap-2">
        <AtTypography
          variant="bodyBold"
          color="#FFFFFF"
          numberOfLines={1}
          className="flex-1"
        >
          {proyecto.titulo}
        </AtTypography>
        <AtTypography variant="caption" color="#8FA0D6">
          {countLabel}
        </AtTypography>
      </View>

      <View className="gap-3">
        {proyecto.tareas.map((tarea) => (
          <MlTaskRow
            key={tarea.id}
            tarea={tarea}
            onPress={() => onTareaPress(tarea.id)}
          />
        ))}
      </View>
    </View>
  );
});
ProyectoCard.displayName = 'ProyectoCard';

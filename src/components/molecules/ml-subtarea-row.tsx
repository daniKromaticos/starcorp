/**
 * Molecule: MlSubtareaRow
 *
 * Fila de "subtarea" = un avance semanal dentro del drawer de una tarea
 * en /reportes. Caja de fecha + label de semana + narrativo del avance,
 * con pill de cumplimiento. Presionable: navega al single de la tarea.
 *
 * Vive sobre fondo navy (drawer), por eso el texto es claro.
 */

import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtProgressPill } from '@/src/components/atoms/at-progress-pill';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { Pressable, View } from '@/src/tw';
import type { NexiataskAvance } from '@/src/types/nexiatask.types';
import React, { memo } from 'react';

const CARD_BG = '#0C2B78';
const DATE_BOX_BG = '#FFFFFF';
const DATE_NUMBER_COLOR = '#5B82E6';

interface MlSubtareaRowProps {
  avance: NexiataskAvance;
  onPress?: () => void;
}

export const MlSubtareaRow = memo<MlSubtareaRowProps>(({ avance, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${avance.semanaLabel}, ${Math.round(
        avance.cumplimientoPct,
      )}% de cumplimiento`}
      className="flex-row items-center gap-3 p-3 rounded-md"
      style={{ backgroundColor: CARD_BG, borderCurve: 'continuous' }}
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
        <AtTypography variant="label" color="#424654">
          {avance.fechaMes}
        </AtTypography>
        <AtTypography variant="bodyBold" color={DATE_NUMBER_COLOR}>
          {avance.fechaDia}
        </AtTypography>
      </View>

      <View className="flex-1 gap-0.5">
        <AtTypography variant="bodyBold" color="#FFFFFF" numberOfLines={1}>
          {avance.semanaLabel}
        </AtTypography>
        <AtTypography variant="caption" color="#C7D2F0" numberOfLines={2}>
          {avance.descripcion}
        </AtTypography>
      </View>

      <View className="items-end gap-1.5">
        <AtProgressPill value={avance.cumplimientoPct} />
        <AtIcon name="arrow-forward" size={16} color="#8FA0D6" />
      </View>
    </Pressable>
  );
});

MlSubtareaRow.displayName = 'MlSubtareaRow';

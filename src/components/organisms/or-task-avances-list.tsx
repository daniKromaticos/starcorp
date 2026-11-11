/**
 * Organism: OrTaskAvancesList
 *
 * Lista cronológica de avances semanales para una tarea. Si el array
 * viene vacío (caso común hoy: backend solo expone semana actual),
 * muestra un empty state.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlAvanceRow } from '@/src/components/molecules/ml-avance-row';
import type { NexiataskAvance } from '@/src/types/nexiatask.types';

interface OrTaskAvancesListProps {
  avances: NexiataskAvance[];
}

export const OrTaskAvancesList = memo<OrTaskAvancesListProps>(({ avances }) => {
  return (
    <View className="gap-3 px-4">
      <AtTypography variant="h3" color="#1A1F36">
        Avances
      </AtTypography>

      {avances.length === 0 ? (
        <View
          className="rounded-lg p-4 bg-bg-card"
          style={{
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <AtTypography variant="caption" color="#8892A4">
            Aún no hay histórico de avances disponible.
          </AtTypography>
        </View>
      ) : (
        <View className="gap-2">
          {avances.map((a) => (
            <MlAvanceRow key={a.id} avance={a} />
          ))}
        </View>
      )}
    </View>
  );
});

OrTaskAvancesList.displayName = 'OrTaskAvancesList';

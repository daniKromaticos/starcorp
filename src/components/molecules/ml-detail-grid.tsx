/**
 * Molecule: MlDetailGrid
 *
 * Grid de 2 columnas label/valor para bloques de detalle (activo VAG,
 * movimiento expandido, cuenta por cobrar/pagar). Un par con `fullWidth`
 * ocupa la fila completa (ej. Observaciones).
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';

export interface DetailGridPair {
  label: string;
  value: string;
  fullWidth?: boolean;
}

interface MlDetailGridProps {
  pairs: DetailGridPair[];
  /** Columnas del grid (default 2; los movimientos de VAG usan 3). */
  columns?: 2 | 3;
}

export const MlDetailGrid = memo<MlDetailGridProps>(({ pairs, columns = 2 }) => {
  return (
    <View className="flex-row flex-wrap">
      {pairs.map((pair) => (
        <View
          key={pair.label}
          className="gap-0.5 py-1.5 pr-2"
          style={{ width: pair.fullWidth ? '100%' : columns === 3 ? '33.33%' : '50%' }}
        >
          <AtTypography variant="captionBold" color="#1A1F36">
            {pair.label}
          </AtTypography>
          <AtTypography variant="caption" color="#4A5568">
            {pair.value}
          </AtTypography>
        </View>
      ))}
    </View>
  );
});

MlDetailGrid.displayName = 'MlDetailGrid';

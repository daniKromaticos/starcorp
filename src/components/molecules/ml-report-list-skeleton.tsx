/**
 * Molecule: MlReportListSkeleton
 *
 * Loader homologado para las listas de Informes (Cartera, Asociados, Bancos,
 * Pagos, Seguros). Reemplaza el texto "Cargando…" por N filas placeholder con
 * una silueta consistente: avatar + dos líneas + valor a la derecha.
 */

import React, { memo } from 'react';
import type { DimensionValue } from 'react-native';
import { View } from '@/src/tw';
import { Skeleton } from '@/src/components/atoms/skeleton';

interface MlReportListSkeletonProps {
  /** Cantidad de filas placeholder. */
  rows?: number;
}

// Anchos deterministas por índice para que cada fila se vea natural sin usar
// valores aleatorios (estables entre renders).
const TITLE_WIDTHS: DimensionValue[] = ['68%', '52%', '74%', '46%', '60%', '58%'];
const SUBTITLE_WIDTHS: DimensionValue[] = ['34%', '28%', '40%', '30%', '36%', '26%'];

export const MlReportListSkeleton = memo<MlReportListSkeletonProps>(
  ({ rows = 6 }) => {
    return (
      <View className="gap-2" accessibilityRole="progressbar" accessibilityLabel="Cargando">
        {Array.from({ length: rows }).map((_, i) => (
          <View
            key={i}
            className="bg-bg-card rounded-lg flex-row items-center px-4 py-3 gap-3"
            style={{
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.06)',
            }}
          >
            <Skeleton width={28} height={28} borderRadius={14} />
            <View className="flex-1 gap-2">
              <Skeleton width={TITLE_WIDTHS[i % TITLE_WIDTHS.length]} height={12} />
              <Skeleton width={SUBTITLE_WIDTHS[i % SUBTITLE_WIDTHS.length]} height={10} />
            </View>
            <Skeleton width={44} height={14} />
          </View>
        ))}
      </View>
    );
  },
);

MlReportListSkeleton.displayName = 'MlReportListSkeleton';

/**
 * Molecule: MlSegurosSkeleton
 *
 * Loader del Informe Seguros: 3 cards que imitan las secciones
 * (Compañías / Vehículos / Propiedades) en su estado colapsado —
 * header con icono + título + chevron y el link "Histórico" debajo.
 * Reemplaza al listado de filas genérico, que no calza con esta pantalla.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { Skeleton } from '@/src/components/atoms/skeleton';

const CARD_CLASS = 'mx-4 bg-white rounded-lg p-4 gap-3';
const CARD_STYLE = {
  borderCurve: 'continuous',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.06)',
} as const;

// Anchos deterministas del título por card, para variar sin aleatoriedad.
const TITLE_WIDTHS = [120, 96, 132] as const;

export const MlSegurosSkeleton = memo<{ cards?: number }>(({ cards = 3 }) => {
  return (
    <View
      style={{ rowGap: 20 }}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <View key={i} className={CARD_CLASS} style={CARD_STYLE}>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-2 flex-1">
              <Skeleton width={22} height={22} borderRadius={6} />
              <Skeleton width={TITLE_WIDTHS[i % TITLE_WIDTHS.length]} height={16} />
            </View>
            <Skeleton width={24} height={24} borderRadius={12} />
          </View>
          <Skeleton width={120} height={12} />
        </View>
      ))}
    </View>
  );
});

MlSegurosSkeleton.displayName = 'MlSegurosSkeleton';

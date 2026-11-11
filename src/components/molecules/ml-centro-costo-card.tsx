/**
 * Molecule: MlCentroCostoCard
 *
 * Sub-card gris que aparece al desplegar una EMPRESA en el Informe
 * Presupuesto. Muestra el CENTRO DE COSTOS y una rejilla de 3 columnas ×
 * 2 filas: Proyectado / Ejecutado / Concepto y Categoría / Porcentaje /
 * Comentario.
 */

import React, { memo } from 'react';
import { useWindowDimensions } from 'react-native';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { formatMoney2 } from '@/src/utils/currency';
import { formatNumber } from '@/src/utils/number';
import { tokens } from '@/src/theme/tokens';
import type { PresupuestoCentroCosto } from '@/src/types/presupuesto.types';

interface MlCentroCostoCardProps {
  centro: PresupuestoCentroCosto;
}

const LABEL_COLOR = '#1A1F36';
// Nombre y valores en gris azulado (antes azul) — token de la paleta.
const VALUE_COLOR = tokens.color.ink.label;
const NAME_COLOR = tokens.color.ink.label;

const Field = memo<{ label: string; value: string }>(({ label, value }) => (
  <View className="flex-1 gap-0.5">
    <AtTypography variant="captionBold" color={LABEL_COLOR}>
      {label}
    </AtTypography>
    <AtTypography variant="caption" color={VALUE_COLOR} numberOfLines={3}>
      {value}
    </AtTypography>
  </View>
));
Field.displayName = 'CentroCostoField';

export const MlCentroCostoCard = memo<MlCentroCostoCardProps>(({ centro }) => {
  const isNarrow = useWindowDimensions().width < 360;
  const fields = [
    { label: 'Proyectado', value: formatMoney2(centro.proyectado) },
    { label: 'Ejecutado', value: formatMoney2(centro.ejecutado) },
    { label: 'Concepto', value: centro.concepto || '—' },
    { label: 'Categoría', value: centro.categoria || '—' },
    {
      label: 'Porcentaje',
      value: `${formatNumber(centro.porcentajeEje, 2)}%`,
    },
    { label: 'Comentario', value: centro.comentario || '—' },
  ];
  // 320dp: 3 columnas quedaban de ~72px y montos/labels se partían a mitad
  // de palabra; en angosto la rejilla pasa a 2 columnas × 3 filas.
  const perRow = isNarrow ? 2 : 3;
  const rows: (typeof fields)[] = [];
  for (let i = 0; i < fields.length; i += perRow) {
    rows.push(fields.slice(i, i + perRow));
  }
  return (
    <View
      className="gap-3 p-3 rounded-lg"
      style={{
        backgroundColor: '#F4F6F8',
        borderCurve: 'continuous',
      }}
    >
      <View className="gap-0.5">
        <AtTypography variant="captionBold" color={LABEL_COLOR}>
          Centro de costos
        </AtTypography>
        <AtTypography variant="bodyBold" color={NAME_COLOR}>
          {centro.centroCostos}
        </AtTypography>
      </View>

      <View className="h-px" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }} />

      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-3">
          {row.map((f) => (
            <Field key={f.label} label={f.label} value={f.value} />
          ))}
        </View>
      ))}
    </View>
  );
});

MlCentroCostoCard.displayName = 'MlCentroCostoCard';

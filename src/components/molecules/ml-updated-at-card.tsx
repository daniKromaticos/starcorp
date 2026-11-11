/**
 * Molecule: MlUpdatedAtCard
 *
 * Card navy oscura con icono de reloj y texto "Actualizado el ..."
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';

interface MlUpdatedAtCardProps {
  /** ISO date string */
  isoDate: string;
  className?: string;
}

const WEEKDAY = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const MONTH = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  const weekday = WEEKDAY[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH[d.getMonth()];
  return `${weekday}, ${day} de ${month} de ${d.getFullYear()}`;
}

export const MlUpdatedAtCard = memo<MlUpdatedAtCardProps>(
  ({ isoDate, className }) => {
    return (
      <View
        className={`flex-row items-center gap-3 rounded-lg px-4 py-3 ${className ?? ''}`}
        style={{
          backgroundColor: '#1C224D',
          borderCurve: 'continuous',
        }}
      >
        <AtIcon name="schedule" size="md" color="#FFFFFF" />
        <View className="flex-1">
          <AtTypography variant="bodyBold" color="#FFFFFF">
            Actualizado el
          </AtTypography>
          <AtTypography
            variant="caption"
            color="rgba(255,255,255,0.85)"
          >
            {formatDate(isoDate)}
          </AtTypography>
        </View>
      </View>
    );
  },
);

MlUpdatedAtCard.displayName = 'MlUpdatedAtCard';

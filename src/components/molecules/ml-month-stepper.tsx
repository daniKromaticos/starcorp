/**
 * Molecule: MlMonthStepper
 *
 * Selector de mes con flechas ("< Enero 2026 >") para el encabezado de la
 * vista Movimientos de VAG.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export interface MonthValue {
  year: number;
  /** 1..12 */
  month: number;
}

/** 1..12 → "Enero".."Diciembre" (para los acordeones de Movimientos). */
export function monthName(month: number): string {
  return MONTHS[month - 1] ?? '';
}

interface MlMonthStepperProps {
  value: MonthValue;
  onChange: (value: MonthValue) => void;
}

function step(value: MonthValue, delta: 1 | -1): MonthValue {
  const m = value.month + delta;
  if (m < 1) return { year: value.year - 1, month: 12 };
  if (m > 12) return { year: value.year + 1, month: 1 };
  return { year: value.year, month: m };
}

export const MlMonthStepper = memo<MlMonthStepperProps>(({ value, onChange }) => {
  return (
    <View className="flex-row items-center gap-1">
      <Pressable
        onPress={() => onChange(step(value, -1))}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
      >
        <AtIcon name="chevron-left" size="md" color="#4A5568" />
      </Pressable>
      <AtTypography variant="captionBold" color="#1A1F36">
        {MONTHS[value.month - 1]} {value.year}
      </AtTypography>
      <Pressable
        onPress={() => onChange(step(value, 1))}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
      >
        <AtIcon name="chevron-right" size="md" color="#4A5568" />
      </Pressable>
    </View>
  );
});

MlMonthStepper.displayName = 'MlMonthStepper';

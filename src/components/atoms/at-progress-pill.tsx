/**
 * Atom: AtProgressPill
 *
 * Pill con gradiente que codifica el cumplimiento de una tarea.
 * - ≥80%       → verde (logro / completado)
 * - 25–79%     → naranja (en curso)
 * - <25%       → vino tinto (atrasado / crítico)
 *
 * Si se pasa `label` se renderiza ese texto en vez del %; útil para
 * estados nominales como "Completado" o "En progreso".
 */

import React, { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { AtTypography } from './at-typography';

export type ProgressPillVariant = 'auto' | 'success' | 'warning' | 'danger';

interface AtProgressPillProps {
  value: number;
  label?: string;
  variant?: ProgressPillVariant;
}

// Stops bien separados para que el degradado se lea visible en el pill.
// Cada par va de un tono claro (top-left) a uno más oscuro (bottom-right).
const GRADIENTS: Record<Exclude<ProgressPillVariant, 'auto'>, readonly [string, string]> = {
  success: ['#48BB78', '#22663F'] as const,
  warning: ['#F6AD55', '#C05621'] as const,
  danger: ['#E53E3E', '#7A1F33'] as const,
};

function resolveVariant(value: number, variant: ProgressPillVariant): Exclude<ProgressPillVariant, 'auto'> {
  if (variant !== 'auto') return variant;
  if (value >= 80) return 'success';
  if (value < 25) return 'danger';
  return 'warning';
}

export const AtProgressPill = memo<AtProgressPillProps>(({ value, label, variant = 'auto' }) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const resolved = resolveVariant(safeValue, variant);
  const colors = GRADIENTS[resolved];
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 999,
        borderCurve: 'continuous',
      }}
    >
      <AtTypography variant="captionBold" color="#FFFFFF">
        {label ?? `${Math.round(safeValue)}%`}
      </AtTypography>
    </LinearGradient>
  );
});

AtProgressPill.displayName = 'AtProgressPill';

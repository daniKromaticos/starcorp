/**
 * Atom: AtChip
 *
 * Selectable pill for filter bars (Hoy, 1 semana, 1 mes, etc.)
 * Migrated to NativeWind + AtTypography.
 */

import React, { memo } from 'react';
import { Pressable } from '@/src/tw';
import { AtTypography } from './at-typography';

interface AtChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

export const AtChip = memo<AtChipProps>(({ label, selected = false, onPress, className }) => {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-2 rounded-full ${
        selected ? 'bg-accent' : 'bg-bg-secondary'
      } ${className ?? ''}`}
      style={{ borderCurve: 'continuous' }}
    >
      <AtTypography
        variant="captionBold"
        color={selected ? '#FFFFFF' : undefined}
        className={selected ? 'text-ink-inverse' : 'text-ink-secondary'}
      >
        {label}
      </AtTypography>
    </Pressable>
  );
});

AtChip.displayName = 'AtChip';

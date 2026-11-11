/**
 * Atom: AtDivider
 *
 * Simple horizontal divider line.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';

interface AtDividerProps {
  className?: string;
}

export const AtDivider = memo<AtDividerProps>(({ className }) => {
  return (
    <View
      className={`h-px bg-border ${className ?? ''}`}
    />
  );
});

AtDivider.displayName = 'AtDivider';

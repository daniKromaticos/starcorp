/**
 * Molecule: MlAgingTabsBar
 *
 * Fila horizontal scrollable con chips de aging para Cartera:
 * Corriente / 1-30 / 31-60 / 61-90 / 91-más.
 */

import React, { memo } from 'react';
import { ScrollView } from '@/src/tw';
import { AtChip } from '@/src/components/atoms/at-chip';
import {
  AGING_BUCKETS,
  AGING_BUCKET_LABEL,
  type AgingBucket,
} from '@/src/types/cartera.types';

interface MlAgingTabsBarProps {
  value: AgingBucket;
  onChange: (b: AgingBucket) => void;
  className?: string;
}

export const MlAgingTabsBar = memo<MlAgingTabsBarProps>(
  ({ value, onChange, className }) => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className={className}
        contentContainerClassName="gap-2 px-4"
      >
        {AGING_BUCKETS.map((bucket) => (
          <AtChip
            key={bucket}
            label={AGING_BUCKET_LABEL[bucket]}
            selected={bucket === value}
            onPress={() => onChange(bucket)}
          />
        ))}
      </ScrollView>
    );
  },
);

MlAgingTabsBar.displayName = 'MlAgingTabsBar';

/**
 * Organism: OrConsolidadoClientListHeader
 *
 * "Clientes (N)" subheader + period selector. Designed to live in the pinned
 * top section of the consolidated list templates so it stays visible while
 * the cards below it scroll.
 */

import React, { memo, useCallback } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlPeriodSelect } from '@/src/components/molecules/ml-period-select';
import { useConsolidadoClients } from '@/src/hooks/queries/use-consolidado-clients';
import { useFiltersStore } from '@/src/stores/filters.store';
import { PERIOD_LABELS } from '@/src/utils/date';
import type { ConsolidadoCategoryId, PeriodKey } from '@/src/types/domain.types';

const PERIOD_OPTIONS = (['today', '1w', '1m', '3m', '12m'] as PeriodKey[]).map(
  (key) => ({ key, label: PERIOD_LABELS[key] }),
);

interface OrConsolidadoClientListHeaderProps {
  categoryId: ConsolidadoCategoryId;
  label?: string;
}

export const OrConsolidadoClientListHeader = memo<OrConsolidadoClientListHeaderProps>(
  ({ categoryId, label = 'Clientes' }) => {
    const { data } = useConsolidadoClients(categoryId);
    const periodKey = useFiltersStore((s) => s.activePeriodKey);
    const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);
    const handleSelect = useCallback(
      (k: string) => setActivePeriod(k as PeriodKey),
      [setActivePeriod],
    );

    return (
      <View className="flex-row justify-between items-center px-4">
        <View className="flex-row items-baseline gap-1">
          <AtTypography variant="bodyBold">{label}</AtTypography>
          <AtTypography variant="caption" color="#8892A4">
            ({data?.length ?? 0})
          </AtTypography>
        </View>
        <MlPeriodSelect
          options={PERIOD_OPTIONS}
          selectedKey={periodKey}
          onSelect={handleSelect}
        />
      </View>
    );
  },
);

OrConsolidadoClientListHeader.displayName = 'OrConsolidadoClientListHeader';

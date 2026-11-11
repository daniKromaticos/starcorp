import React, { useCallback, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from '@/src/tw';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { TmConsolidatedDetail } from '@/src/components/templates/tm-consolidated-detail';
import { OrHighlightedBarChartCard } from '@/src/components/organisms/or-highlighted-bar-chart-card';
import { OrTercerosList } from '@/src/components/organisms/or-terceros-list';
import { useThirdParties } from '@/src/hooks/queries/use-third-parties';
import { useCompany } from '@/src/hooks/queries/use-company';
import { useFiltersStore } from '@/src/stores/filters.store';
import { PERIOD_SHORT_LABELS } from '@/src/utils/date';
import type { PeriodKey } from '@/src/types/domain.types';

const PERIOD_OPTIONS = (['today', '1w', '1m', '3m', '12m'] as PeriodKey[]).map(
  (key) => ({ key, label: PERIOD_SHORT_LABELS[key] }),
);

export default function EgresosTercerosScreen() {
  const { clientId, groupId } = useLocalSearchParams<{
    clientId: string;
    groupId: string;
  }>();
  const activePeriodKey = useFiltersStore((s) => s.activePeriodKey);
  const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);
  const { data, isLoading } = useThirdParties(
    'egresos',
    groupId ?? '',
    clientId ?? '',
  );
  const { data: company } = useCompany(clientId);

  const handleFilterSelect = useCallback(
    (key: string) => setActivePeriod(key as PeriodKey),
    [setActivePeriod],
  );

  const bars = useMemo(
    () =>
      (data ?? []).slice(0, 5).map((tp) => ({
        id: tp.id,
        label: tp.name,
        value: tp.amount,
        color: tp.color,
      })),
    [data],
  );

  const [firstBar] = bars;

  return (
    <TmConsolidatedDetail
      breadcrumbs={['Egreso', company?.name ?? 'Empresa', 'Grupos', 'Terceros']}
      filterOptions={PERIOD_OPTIONS}
      selectedFilter={activePeriodKey}
      onFilterSelect={handleFilterSelect}
      onBack={() => router.back()}
    >
      {isLoading || !data ? (
        <View className="px-4 gap-3">
          <AtSkeleton width="100%" height={240} borderRadius={14} />
          <AtSkeleton width="100%" height={360} borderRadius={14} />
        </View>
      ) : (
        <View className="gap-3">
          {firstBar && (
            <OrHighlightedBarChartCard
              title={firstBar.label}
              amount={firstBar.value}
              deltaPercent={data[0]?.deltaPercent ?? 0}
              bars={bars}
              highlightedId={firstBar.id}
            />
          )}
          <OrTercerosList terceros={data} />
        </View>
      )}
    </TmConsolidatedDetail>
  );
}

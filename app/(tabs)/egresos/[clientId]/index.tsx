import React, { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from '@/src/tw';
import { AtSkeleton } from '@/src/components/atoms/at-skeleton';
import { TmConsolidatedDetail } from '@/src/components/templates/tm-consolidated-detail';
import { OrCostGroupsChartCard } from '@/src/components/organisms/or-cost-groups-chart-card';
import { MlCostGroupRow } from '@/src/components/molecules/ml-cost-group-row';
import { useCostGroups } from '@/src/hooks/queries/use-cost-groups';
import { useCompany } from '@/src/hooks/queries/use-company';
import { useFiltersStore } from '@/src/stores/filters.store';
import { PERIOD_SHORT_LABELS } from '@/src/utils/date';
import type { PeriodKey } from '@/src/types/domain.types';

const PERIOD_OPTIONS = (['today', '1w', '1m', '3m', '12m'] as PeriodKey[]).map(
  (key) => ({ key, label: PERIOD_SHORT_LABELS[key] }),
);

export default function EgresosGruposScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const activePeriodKey = useFiltersStore((s) => s.activePeriodKey);
  const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);
  const { data, isLoading } = useCostGroups('egresos', clientId ?? '');
  const { data: company } = useCompany(clientId);

  const handleFilterSelect = useCallback(
    (key: string) => setActivePeriod(key as PeriodKey),
    [setActivePeriod],
  );

  const total = (data ?? []).reduce((s, g) => s + g.amount, 0);

  return (
    <TmConsolidatedDetail
      breadcrumbs={['Egreso', company?.name ?? 'Empresa', 'Grupos']}
      filterOptions={PERIOD_OPTIONS}
      selectedFilter={activePeriodKey}
      onFilterSelect={handleFilterSelect}
      onBack={() => router.back()}
    >
      {isLoading || !data ? (
        <View className="px-4 gap-3">
          <AtSkeleton width="100%" height={260} borderRadius={14} />
        </View>
      ) : (
        <View className="gap-2">
          <OrCostGroupsChartCard
            title="Egresos administrativos"
            total={total}
            deltaPercent={1.87}
            groups={data}
          />
          <View>
            {data.map((g) => (
              <MlCostGroupRow
                key={g.id}
                label={g.label}
                amount={g.amount}
                deltaPercent={g.deltaPercent}
                icon={g.icon as React.ComponentProps<typeof MlCostGroupRow>['icon']}
                color={g.color}
                onPress={() =>
                  router.push(
                    `/egresos/${clientId}/${g.id}` as Parameters<typeof router.push>[0],
                  )
                }
              />
            ))}
          </View>
        </View>
      )}
    </TmConsolidatedDetail>
  );
}

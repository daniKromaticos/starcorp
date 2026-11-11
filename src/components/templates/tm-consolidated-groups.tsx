/**
 * Template: TmConsolidatedGroups
 *
 * Template for groups view (bar chart + category list).
 * Used in Costos/Gastos → Grupos.
 */

import React, { memo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View } from '@/src/tw';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlTimeFilterBar, type TimeFilterOption } from '@/src/components/molecules/ml-time-filter-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';

interface TmConsolidatedGroupsProps {
  breadcrumbs: string[];
  groupTitle?: string;
  totalValue?: number;
  deltaPercent?: number;
  filterOptions: TimeFilterOption[];
  selectedFilter: string;
  onFilterSelect: (key: string) => void;
  onBack?: () => void;
  onMenuPress?: () => void;
  children: React.ReactNode;
}

export const TmConsolidatedGroups = memo<TmConsolidatedGroupsProps>(
  ({
    breadcrumbs,
    groupTitle,
    totalValue,
    deltaPercent,
    filterOptions,
    selectedFilter,
    onFilterSelect,
    onBack,
    onMenuPress,
    children,
  }) => {
    const insets = useSafeAreaInsets();
    const openGlobalSearch = useGlobalSearchStore((s) => s.open);
    return (
      <View className="flex-1 bg-bg-primary" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-bg-primary"
        contentContainerClassName="gap-4 pb-12"
      >
        <View className="px-4 pt-2">
          <MlSearchBar onMenuPress={onMenuPress} onPress={openGlobalSearch} />
        </View>

        <MlBreadcrumb segments={breadcrumbs} onBack={onBack} className="px-4" />

        <MlTimeFilterBar
          options={filterOptions}
          selectedKey={selectedFilter}
          onSelect={onFilterSelect}
        />

        {groupTitle && (
          <View className="px-4">
            <AtTypography variant="h3">{groupTitle}</AtTypography>
          </View>
        )}

        {/* Total + Delta */}
        {totalValue != null && (
          <View className="px-4 gap-1">
            <AtTypography variant="overline" color="#8892A4">Total</AtTypography>
            <View className="flex-row items-center gap-3">
              <AtMetricValue value={totalValue} size="lg" />
              {deltaPercent != null && (
                <AtDeltaIndicator value={deltaPercent} size="md" />
              )}
            </View>
          </View>
        )}

        {/* Content: bar chart + category rows */}
        {children}
      </ScrollView>
      </View>
    );
  },
);

TmConsolidatedGroups.displayName = 'TmConsolidatedGroups';

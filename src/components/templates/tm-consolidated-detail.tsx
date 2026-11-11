/**
 * Template: TmConsolidatedDetail
 *
 * Template for client detail within consolidated views.
 * Structure: Search + Breadcrumb + TimeFilter + Chart + Stats + CategoryRows
 */

import React, { memo } from 'react';
import { ScrollView as RNScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from '@/src/tw';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { MlTimeFilterBar, type TimeFilterOption } from '@/src/components/molecules/ml-time-filter-bar';
import { MlBreadcrumb } from '@/src/components/molecules/ml-breadcrumb';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';

interface TmConsolidatedDetailProps {
  breadcrumbs: string[];
  metricLabel?: string;
  metricValue?: number;
  deltaPercent?: number;
  filterOptions: TimeFilterOption[];
  selectedFilter: string;
  onFilterSelect: (key: string) => void;
  onBack?: () => void;
  onMenuPress?: () => void;
  /**
   * Rendered between the top filter bar and the scrollable area — stays
   * pinned on tall screens (height > 700); on short ones it scrolls.
   */
  pinnedContent?: React.ReactNode;
  /** Optional ref to the inner ScrollView (for scrollTo etc.). */
  scrollRef?: React.RefObject<RNScrollView | null>;
  children: React.ReactNode;
}

export const TmConsolidatedDetail = memo<TmConsolidatedDetailProps>(
  ({
    breadcrumbs,
    metricLabel,
    metricValue,
    deltaPercent,
    filterOptions,
    selectedFilter,
    onFilterSelect,
    onBack,
    onMenuPress,
    pinnedContent,
    scrollRef,
    children,
  }) => {
    const insets = useSafeAreaInsets();
    const openGlobalSearch = useGlobalSearchStore((s) => s.open);
    // 320×568: con el chart/donut fijo arriba casi no queda área de scroll;
    // en pantallas bajas el pinnedContent pasa al inicio del scroll.
    const pinContent = useWindowDimensions().height > 700;
    return (
      <View className="flex-1 bg-bg-primary" style={{ paddingTop: insets.top }}>
        {/* Pinned top: search + breadcrumb + filter + optional pinned slot */}
        <View className="gap-4 pt-2">
          <View className="px-4">
            <MlSearchBar onMenuPress={onMenuPress} onPress={openGlobalSearch} />
          </View>

          <MlBreadcrumb segments={breadcrumbs} onBack={onBack} className="px-4" />

          <MlTimeFilterBar
            options={filterOptions}
            selectedKey={selectedFilter}
            onSelect={onFilterSelect}
          />

          {metricValue != null && (
            <View className="px-4 gap-1">
              {metricLabel && (
                <AtTypography variant="caption" color="#8892A4">
                  {metricLabel}
                </AtTypography>
              )}
              {/* 320dp: si el monto + delta no caben, el delta baja de línea. */}
              <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
                <AtMetricValue value={metricValue} size="lg" />
                {deltaPercent != null && (
                  <AtDeltaIndicator value={deltaPercent} size="sm" />
                )}
              </View>
            </View>
          )}

          {pinContent ? pinnedContent : null}
        </View>

        {/* Scrollable area */}
        <RNScrollView
          ref={scrollRef}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 48, gap: 16 }}
        >
          {pinContent ? null : pinnedContent}
          {children}
        </RNScrollView>
      </View>
    );
  },
);

TmConsolidatedDetail.displayName = 'TmConsolidatedDetail';

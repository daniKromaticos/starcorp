/**
 * Template: TmDashboard
 *
 * Scrollable layout for dashboard/home pages.
 * Handles safe area, spacing between sections.
 * Migrated to NativeWind.
 */

import { ScrollView, View } from "@/src/tw";
import React, { memo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TmDashboardProps {
  children: React.ReactNode;
  className?: string;
  stickyHeaderIndices?: number[];
}

export const TmDashboard = memo<TmDashboardProps>(
  ({ children, className, stickyHeaderIndices }) => {
    const insets = useSafeAreaInsets();
    return (
      <View
        className="flex-1 bg-bg-secondary"
        style={{ paddingTop: insets.top }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          className={`flex-1 bg-bg-secondary ${className ?? ""}`}
          contentContainerClassName="gap-6 pb-12"
          stickyHeaderIndices={stickyHeaderIndices}
        >
          {children}
        </ScrollView>
      </View>
    );
  },
);

TmDashboard.displayName = "TmDashboard";

/**
 * Template: TmInformes
 *
 * Template for Informes/Reportes listing screens.
 * Scrollable with report row items.
 */

import { AtIcon } from "@/src/components/atoms/at-icon";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { MlSearchBar } from "@/src/components/molecules/ml-search-bar";
import { useGlobalSearchStore } from "@/src/stores/global-search.store";
import { Pressable, ScrollView, View } from "@/src/tw";
import React, { memo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TmInformesProps {
  title?: string;
  onMenuPress?: () => void;
  /** Con onBack el título lleva un chevron de atrás (iOS no tiene botón de sistema). */
  onBack?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const TmInformes = memo<TmInformesProps>(
  ({ title = "Informes", onMenuPress, onBack, children, className }) => {
    const insets = useSafeAreaInsets();
    const openGlobalSearch = useGlobalSearchStore((s) => s.open);
    return (
      <View
        className="flex-1 bg-bg-secondary"
        style={{ paddingTop: insets.top }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          className={`flex-1 bg-bg-secondary ${className ?? ""}`}
          contentContainerClassName="gap-4 pb-12"
        >
          <View className="px-4 pt-2">
            <MlSearchBar onMenuPress={onMenuPress} onPress={openGlobalSearch} />
          </View>

          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              className="flex-row items-center gap-2 px-4"
            >
              <AtIcon name="chevron-left" size="lg" color="#1A1F36" />
              <AtTypography variant="h2">{title}</AtTypography>
            </Pressable>
          ) : (
            <View className="px-4">
              <AtTypography variant="h2">{title}</AtTypography>
            </View>
          )}

          {/* Content: report rows */}
          {children}
        </ScrollView>
      </View>
    );
  },
);

TmInformes.displayName = "TmInformes";

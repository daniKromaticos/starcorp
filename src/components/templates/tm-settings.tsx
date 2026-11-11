/**
 * Template: TmSettings
 *
 * Template for settings/configuration screens.
 * Scrollable with grouped sections.
 */

import React, { memo } from 'react';
import { ScrollView, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';

interface TmSettingsProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const TmSettings = memo<TmSettingsProps>(
  ({ title = 'Configuración', children, className }) => {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className={`flex-1 bg-bg-secondary ${className ?? ''}`}
        contentContainerClassName="gap-6 pb-12 pt-4"
      >
        <View className="px-4">
          <AtTypography variant="h1">{title}</AtTypography>
        </View>
        {children}
      </ScrollView>
    );
  },
);

TmSettings.displayName = 'TmSettings';

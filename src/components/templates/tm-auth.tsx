/**
 * Template: TmAuth
 *
 * Template for authentication screens (login/register).
 * Centered layout with logo area + form content.
 */

import React, { memo } from 'react';
import { View, ScrollView } from '@/src/tw';

interface TmAuthProps {
  children: React.ReactNode;
  className?: string;
}

export const TmAuth = memo<TmAuthProps>(({ children, className }) => {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      className={`flex-1 bg-bg-primary ${className ?? ''}`}
      contentContainerClassName="flex-1 justify-center px-6 py-12"
    >
      <View className="gap-8">{children}</View>
    </ScrollView>
  );
});

TmAuth.displayName = 'TmAuth';

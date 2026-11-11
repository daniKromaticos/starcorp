/**
 * Organism: OrToast
 *
 * Banner de confirmación (verde, check + mensaje) que entra desde
 * arriba y se auto-oculta a los 3 s. Montado una sola vez en el root
 * layout; se dispara con showToast() (src/stores/toast.store.ts).
 */

import React, { memo, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { useToastStore } from '@/src/stores/toast.store';

const AUTO_HIDE_MS = 3000;

export const OrToast = memo(() => {
  const insets = useSafeAreaInsets();
  const message = useToastStore((s) => s.message);
  const nonce = useToastStore((s) => s.nonce);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [message, nonce, hide]);

  if (!message) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 1000,
      }}
      pointerEvents="none"
    >
      <Animated.View
        entering={FadeInUp.duration(220)}
        exiting={FadeOutUp.duration(200)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: '#F0FDF4',
          borderWidth: 1,
          borderColor: '#BBF7D0',
          borderRadius: 12,
          borderCurve: 'continuous',
          paddingHorizontal: 14,
          paddingVertical: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.10)',
        }}
      >
        <AtIcon name="check-circle-outline" size="md" color="#38A169" />
        <AtTypography variant="captionBold" color="#1A1F36" className="flex-1">
          {message}
        </AtTypography>
      </Animated.View>
    </View>
  );
});

OrToast.displayName = 'OrToast';

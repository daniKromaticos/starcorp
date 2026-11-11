/**
 * Settings Screen (Modal)
 *
 * Configuration and app settings.
 */

import React from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { TmSettings } from '@/src/components/templates/tm-settings';
import { useAuthStore } from '@/src/stores/auth.store';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);

  return (
    <TmSettings>
      <View className="items-center justify-center py-20 gap-4">
        <AtIcon name="settings" size="xl" color="#8892A4" />
        <AtTypography variant="body" color="#8892A4">
          Configuración — próximamente.
        </AtTypography>
        {user ? (
          <AtTypography variant="caption" color="#8892A4">
            Sesión iniciada como {user.email}
          </AtTypography>
        ) : null}
      </View>
    </TmSettings>
  );
}

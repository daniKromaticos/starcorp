/**
 * Molecule: MlBackHeader
 *
 * Header "< Volver" de las pantallas secundarias de auth
 * (olvidaste la contraseña / código / reestablecer).
 */

import React, { memo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';

interface MlBackHeaderProps {
  label?: string;
  onPress?: () => void;
}

export const MlBackHeader = memo<MlBackHeaderProps>(({ label = 'Volver', onPress }) => {
  const router = useRouter();

  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className="flex-row items-center self-start"
      style={{ gap: 4 }}
    >
      <AtIcon name="chevron-left" size="lg" color="#1A1F36" />
      <AtTypography variant="bodyBold" color="#1A1F36">
        {label}
      </AtTypography>
    </Pressable>
  );
});

MlBackHeader.displayName = 'MlBackHeader';

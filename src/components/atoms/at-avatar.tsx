/**
 * Atom: AtAvatar
 *
 * Avatar circular del usuario: foto (expo-image) si hay avatar_url,
 * o iniciales blancas sobre gradiente navy como fallback.
 */

import React, { memo } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { gradients } from '@/src/theme/gradients';

interface AtAvatarProps {
  size?: number;
  uri?: string | null;
  /** Nombre completo — se derivan las iniciales para el fallback. */
  name?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + second).toUpperCase();
}

export const AtAvatar = memo<AtAvatarProps>(({ size = 40, uri, name }) => {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={100}
        accessibilityLabel={name ? `Foto de ${name}` : 'Foto de perfil'}
      />
    );
  }

  return (
    <LinearGradient
      colors={gradients.brandNavy.colors}
      start={gradients.brandNavy.start}
      end={gradients.brandNavy.end}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AtTypography
        variant="bodyBold"
        color="#FFFFFF"
        style={{ fontSize: size * 0.36, lineHeight: size * 0.5 }}
      >
        {initialsOf(name ?? '') || '?'}
      </AtTypography>
    </LinearGradient>
  );
});

AtAvatar.displayName = 'AtAvatar';

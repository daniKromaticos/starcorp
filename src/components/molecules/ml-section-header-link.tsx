/**
 * Molecule: MlSectionHeaderLink
 *
 * Cabecera de sección usada en el index de Seguros: icono + título
 * (con flecha → opcional para hacer toda la cabecera navegable) y un
 * link azul "Histórico de pólizas" alineado a la derecha.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon, type AtIconProps } from '@/src/components/atoms/at-icon';

interface MlSectionHeaderLinkProps {
  title: string;
  iconName: AtIconProps['name'];
  iconVariant?: AtIconProps['variant'];
  linkLabel?: string;
  onLinkPress?: () => void;
  onTitlePress?: () => void;
  /** Si se pasa onToggle, se muestra el chevron de colapso a la derecha. */
  collapsed?: boolean;
  onToggle?: () => void;
}

export const MlSectionHeaderLink = memo<MlSectionHeaderLinkProps>(
  ({
    title,
    iconName,
    iconVariant,
    linkLabel,
    onLinkPress,
    onTitlePress,
    collapsed,
    onToggle,
  }) => {
    const TitleWrapper = onTitlePress ? Pressable : View;
    return (
      <View className="gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <TitleWrapper
            onPress={onTitlePress}
            className="flex-row items-center gap-2 flex-1"
            hitSlop={onTitlePress ? 6 : undefined}
          >
            <AtIcon
              name={iconName as never}
              variant={iconVariant as never}
              size="md"
              color="#1A1F36"
            />
            <AtTypography variant="h3" color="#1A1F36">
              {title}
            </AtTypography>
            {onTitlePress && (
              <AtIcon name="arrow-forward" size="sm" color="#1A1F36" />
            )}
          </TitleWrapper>
          {onToggle && (
            <Pressable
              onPress={onToggle}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ expanded: !collapsed }}
            >
              <AtIcon
                name={collapsed ? 'expand-more' : 'expand-less'}
                size="lg"
                color="#1A1F36"
              />
            </Pressable>
          )}
        </View>
        {linkLabel && onLinkPress && (
          <Pressable onPress={onLinkPress} hitSlop={6} className="self-start">
            <AtTypography variant="captionBold" color="#1A3FE8">
              {linkLabel}
            </AtTypography>
          </Pressable>
        )}
      </View>
    );
  },
);

MlSectionHeaderLink.displayName = 'MlSectionHeaderLink';

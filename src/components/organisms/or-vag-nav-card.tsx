/**
 * Organism: OrVagNavCard / OrVagNavTile
 *
 * Cards de navegación navy del hub de VAG.
 *  - OrVagNavCard (ancho completo): icono + título + flecha a la izquierda,
 *    chip de delta a la derecha y el monto grande debajo. Para Activos y
 *    Movimientos.
 *  - OrVagNavTile (media columna): icono arriba, título centrado, monto,
 *    delta, divider y "Ver cuentas →". Para Ctas. por cobrar/pagar.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { formatCurrency } from '@/src/utils/currency';
import { formatShortDate } from '@/src/utils/date';

const NAVY = '#0F1B4A';
const MUTED = 'rgba(255,255,255,0.7)';

interface OrVagNavCardProps {
  icon: string;
  iconColor: string;
  title: string;
  total: number;
  deltaPct: number;
  /** Fecha ISO del último dato cargado; se muestra como "Datos a ...". */
  ultimaFecha?: string | null;
  onPress: () => void;
}

export const OrVagNavCard = memo<OrVagNavCardProps>(
  ({ icon, iconColor, title, total, deltaPct, ultimaFecha, onPress }) => {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        className="rounded-xl px-4 py-4 gap-1"
        style={{ backgroundColor: NAVY, borderCurve: 'continuous' }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <AtIcon name={icon as never} size="md" color={iconColor} />
            <AtTypography variant="bodyBold" color="#FFFFFF">
              {title}
            </AtTypography>
            <AtIcon name="arrow-forward" size="sm" color="#FFFFFF" />
          </View>
          <AtDeltaIndicator value={deltaPct} size="md" appearance="dark" />
        </View>
        {/* 320dp: monto + "Datos a …" no caben en una línea; la fecha baja */}
        <View className="flex-row flex-wrap items-end justify-between gap-x-2 gap-y-1">
          <AtTypography
            variant="metricSmall"
            color="#FFFFFF"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatCurrency(total)}
          </AtTypography>
          {ultimaFecha ? (
            <View className="flex-row items-center gap-1 pb-0.5">
              <AtIcon name="schedule" size="sm" color={MUTED} />
              <AtTypography variant="caption" color={MUTED}>
                {`Datos a ${formatShortDate(ultimaFecha)}`}
              </AtTypography>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  },
);

OrVagNavCard.displayName = 'OrVagNavCard';

interface OrVagNavTileProps {
  icon: string;
  title: string;
  total: number;
  deltaPct: number;
  /** Fecha ISO del último dato cargado; se muestra como "Datos a ...". */
  ultimaFecha?: string | null;
  actionLabel?: string;
  onPress: () => void;
}

export const OrVagNavTile = memo<OrVagNavTileProps>(
  ({
    icon,
    title,
    total,
    deltaPct,
    ultimaFecha,
    actionLabel = 'Ver cuentas',
    onPress,
  }) => {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        className="flex-1 rounded-xl px-3 py-4 items-center gap-2"
        style={{ backgroundColor: NAVY, borderCurve: 'continuous' }}
      >
        <AtIcon name={icon as never} size="lg" color="#5B8DEF" />
        <AtTypography
          variant="bodyBold"
          color="#FFFFFF"
          className="text-center"
          numberOfLines={2}
        >
          {title}
        </AtTypography>
        {/* 320dp: el tile mide ~115px; el monto se achica en vez de partirse
            y la fecha se recorta con elipsis. */}
        <AtTypography
          variant="bodyBold"
          color="#FFFFFF"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{ fontVariant: ['tabular-nums'], fontSize: 17 }}
        >
          {formatCurrency(total)}
        </AtTypography>
        <AtDeltaIndicator value={deltaPct} size="md" appearance="dark" />

        {ultimaFecha ? (
          <View className="flex-row items-center gap-1" style={{ maxWidth: '100%' }}>
            <AtIcon name="schedule" size="sm" color={MUTED} />
            <AtTypography
              variant="caption"
              color={MUTED}
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {`Datos a ${formatShortDate(ultimaFecha)}`}
            </AtTypography>
          </View>
        ) : null}

        <View
          className="self-stretch"
          style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 4 }}
        />

        <View className="flex-row items-center gap-1.5">
          <AtTypography variant="captionBold" color="#FFFFFF">
            {actionLabel}
          </AtTypography>
          <AtIcon name="arrow-forward" size="sm" color="#FFFFFF" />
        </View>
      </Pressable>
    );
  },
);

OrVagNavTile.displayName = 'OrVagNavTile';

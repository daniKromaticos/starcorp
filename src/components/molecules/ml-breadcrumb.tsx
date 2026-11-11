/**
 * Molecule: MlBreadcrumb
 *
 * Navigation breadcrumb trail: "< Costos / Grupos / Terceros"
 *
 * Todo el rastro es UN solo texto de una línea con el "…" al inicio
 * (ellipsizeMode 'head'): en pantallas angostas (320dp) o con nombres
 * largos se recorta el principio y siempre queda visible el segmento
 * actual. Con un Text por segmento la fila no se encogía y se salía de la
 * pantalla.
 */

import React, { memo } from 'react';
import { Pressable } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';

interface MlBreadcrumbProps {
  segments: string[];
  onBack?: () => void;
  className?: string;
}

export const MlBreadcrumb = memo<MlBreadcrumbProps>(
  ({ segments, onBack, className }) => {
    const last = segments.length - 1;
    return (
      <Pressable
        onPress={onBack}
        className={`flex-row items-center gap-1 ${className ?? ''}`}
        // También dentro de filas: que se encoja en vez de empujar vecinos.
        style={{ flexShrink: 1 }}
      >
        <AtIcon name="chevron-left" size="md" color="#4A5568" />
        <AtTypography
          variant="body"
          color="#4A5568"
          numberOfLines={1}
          ellipsizeMode="head"
          style={{ flexShrink: 1 }}
        >
          {segments.map((seg, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <AtTypography variant="body" color="#8892A4">
                  {' / '}
                </AtTypography>
              )}
              <AtTypography
                variant={i === last ? 'bodyBold' : 'body'}
                color={i === last ? '#1A1F36' : '#4A5568'}
              >
                {seg}
              </AtTypography>
            </React.Fragment>
          ))}
        </AtTypography>
      </Pressable>
    );
  },
);

MlBreadcrumb.displayName = 'MlBreadcrumb';

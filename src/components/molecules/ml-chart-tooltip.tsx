/**
 * Molecule: MlChartTooltip
 *
 * Burbuja flotante para gráficas de tendencia: muestra la fecha del punto
 * activo y uno o más valores (una línea por serie). Se posiciona sobre el
 * plot a partir de la x del punto, clamp horizontal para no salirse.
 *
 * `pointerEvents="none"` para no robar el toque a la capa interactiva de
 * abajo.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';

export interface ChartTooltipLine {
  /** Color del swatch (omitir para series únicas). */
  color?: string;
  /** Etiqueta de la serie (omitir para series únicas). */
  label?: string;
  value: string;
}

interface MlChartTooltipProps {
  /** x del punto activo dentro del plot (px). */
  x: number;
  /** Ancho del plot, para clamp horizontal. */
  plotWidth: number;
  /** Fecha / etiqueta del punto. */
  title: string;
  lines: ChartTooltipLine[];
  /** Offset vertical desde el tope del plot. */
  top?: number;
}

// 140 cortaba "Históri…" junto al valor; 156 deja "Histórico 56.1K" entero.
const TOOLTIP_WIDTH = 156;

export const MlChartTooltip = memo<MlChartTooltipProps>(
  ({ x, plotWidth, title, lines, top = 4 }) => {
    const half = TOOLTIP_WIDTH / 2;
    const left = Math.max(
      0,
      Math.min(Math.max(0, plotWidth - TOOLTIP_WIDTH), x - half),
    );

    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top,
          left,
          width: TOOLTIP_WIDTH,
          backgroundColor: '#FFFFFF',
          borderRadius: 10,
          borderCurve: 'continuous',
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.06)',
          boxShadow: '0 4px 12px rgba(15,27,74,0.18)',
          gap: 4,
          zIndex: 10,
        }}
      >
        <AtTypography variant="label" color="#8892A4" numberOfLines={1}>
          {title}
        </AtTypography>
        {lines.map((ln, i) => (
          <View key={i} className="flex-row items-center gap-1.5">
            {ln.color && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: ln.color,
                }}
              />
            )}
            {ln.label != null && (
              <AtTypography
                variant="caption"
                color="#6B7280"
                numberOfLines={1}
                className="flex-1"
              >
                {ln.label}
              </AtTypography>
            )}
            <AtTypography
              variant="captionBold"
              color="#1A2440"
              numberOfLines={1}
              className={ln.label != null ? undefined : 'flex-1'}
            >
              {ln.value}
            </AtTypography>
          </View>
        ))}
      </View>
    );
  },
);

MlChartTooltip.displayName = 'MlChartTooltip';

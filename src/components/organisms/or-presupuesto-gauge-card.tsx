/**
 * Organism: OrPresupuestoGaugeCard
 *
 * Card "Ejecución" del Informe Presupuesto: título + badge de variación y
 * un medidor semicircular (GaugeChart) con el valor ejecutado al centro.
 * Recicla el GaugeChart del dashboard (charts/gauge-chart).
 */

import React, { memo, useState } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { GaugeChart } from '@/src/components/charts/gauge-chart';
import type { PresupuestoEjecucion } from '@/src/types/presupuesto.types';

interface OrPresupuestoGaugeCardProps {
  ejecucion: PresupuestoEjecucion;
  /** Mes resuelto ("Junio 2026"); el período depende de los datos cargados. */
  periodoLabel?: string;
}

const MAX_GAUGE_WIDTH = 280;

/** Naranja de sobre-ejecución (ejecutado > proyectado). */
const OVER_COLOR = '#C2410C';

/** "$1.06M" / "$882.62k" — los montos de PROYECCION vienen en unidades reales. */
function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

export const OrPresupuestoGaugeCard = memo<OrPresupuestoGaugeCardProps>(
  ({ ejecucion, periodoLabel }) => {
    const [containerWidth, setContainerWidth] = useState(0);
    const gaugeWidth = Math.min(
      MAX_GAUGE_WIDTH,
      Math.max(0, containerWidth - 32),
    );
    // El arco se detiene en 100%; sin este texto la sobre-ejecución quedaría
    // invisible (un mes al 120% se ve igual que uno al 100%).
    const overExec = ejecucion.pctReal > 100;

    return (
      <View
        className="bg-bg-card rounded-lg p-4 gap-3"
        style={{
          borderCurve: 'continuous',
          boxShadow:
            '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {/* flex-wrap: a 320dp título + badge + período no caben en una línea;
            el período baja a la siguiente. */}
        <View className="flex-row flex-wrap items-center gap-2">
          <AtTypography variant="h3" color="#1A1F36">
            Ejecución
          </AtTypography>
          <AtDeltaIndicator value={ejecucion.deltaPct} size="md" />
          {!!periodoLabel && (
            <AtTypography variant="caption" color="#8892A4">
              {periodoLabel}
            </AtTypography>
          )}
        </View>

        <View className="items-center justify-center">
          {gaugeWidth > 0 && (
            <View style={{ position: 'relative' }}>
              <GaugeChart
                width={gaugeWidth}
                fraction={ejecucion.fraction}
                gradientId="presupuesto-gauge"
              />
              {/* Valor ejecutado centrado en la base del semicírculo. */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: 'center',
                  paddingBottom: gaugeWidth * 0.06,
                }}
                pointerEvents="none"
              >
                <AtTypography
                  variant="h2"
                  color="#1A1F36"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {formatCompact(ejecucion.ejecutado)}
                </AtTypography>
                <AtTypography
                  variant="caption"
                  color={overExec ? OVER_COLOR : '#8892A4'}
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {`${ejecucion.pctReal.toFixed(1)}% de ${formatCompact(ejecucion.proyectado)}`}
                </AtTypography>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  },
);

OrPresupuestoGaugeCard.displayName = 'OrPresupuestoGaugeCard';

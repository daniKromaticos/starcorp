/**
 * Organism: OrVagMovimientosGroup
 *
 * Acordeón de la vista Movimientos de VAG: una fila por activo (centro
 * de costo) — "Lote La Plata (2) | Enero | $120.000.000" — que expandida
 * muestra una card por movimiento con el grid de 3 columnas
 * Movimiento/Fecha/Monto + Subpartida/Tercero/Observaciones.
 *
 * `highlightedId` resalta un movimiento con borde naranja (navegación
 * desde un activo o una cuenta), mismo lenguaje que las pólizas
 * resaltadas de Seguros.
 */

import React, { memo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { MlDetailGrid } from '@/src/components/molecules/ml-detail-grid';
import { formatCurrency } from '@/src/utils/currency';
import type { VagMovimiento } from '@/src/types/vag.types';

interface OrVagMovimientosGroupProps {
  /** Nombre del activo / centro de costo que agrupa. */
  nombre: string;
  /** Label del mes mostrado en la fila ("Enero"). */
  monthLabel: string;
  movimientos: VagMovimiento[];
  initiallyExpanded?: boolean;
  /** id del movimiento a resaltar en naranja (focus mode). */
  highlightedId?: string;
  /** Oculta el "(n)" y el mes del título (focus mode: un solo movimiento). */
  hideMeta?: boolean;
}

/** '2026-01-07' → '7/1/2026' (como el mockup). */
function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
}

export const OrVagMovimientosGroup = memo<OrVagMovimientosGroupProps>(
  ({
    nombre,
    monthLabel,
    movimientos,
    initiallyExpanded = false,
    highlightedId,
    hideMeta = false,
  }) => {
    const [expanded, setExpanded] = useState(initiallyExpanded);
    const narrow = useWindowDimensions().width < 360;

    const total = movimientos.reduce((s, m) => s + m.valor, 0);

    return (
      <View
        className="bg-bg-card rounded-xl overflow-hidden"
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.08)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Tres zonas espejo del encabezado de la pantalla (Activo |
            mes | Consolidado): laterales flex-1 iguales para que el mes
            quede centrado y el monto alineado bajo "Consolidado". */}
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          className="flex-row items-center px-4 py-3"
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <View className="flex-1 pr-2">
            <AtTypography variant="bodyBold" color="#1A1F36" numberOfLines={1}>
              {hideMeta ? nombre : `${nombre} (${movimientos.length})`}
            </AtTypography>
          </View>
          {/* 320dp: el mes (ya visible en el stepper) se oculta y el monto
              toma su ancho natural; con mitades iguales quedaba en ~56px. */}
          {!hideMeta && !narrow && (
            <AtTypography variant="caption" color="#4A5568">
              {monthLabel}
            </AtTypography>
          )}
          <View
            className={
              narrow
                ? 'flex-row items-center justify-end gap-2 pl-2'
                : 'flex-1 flex-row items-center justify-end gap-2 pl-2'
            }
          >
            <AtTypography
              variant="captionBold"
              color="#1A1F36"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{ fontVariant: ['tabular-nums'], flexShrink: 1 }}
            >
              {formatCurrency(total)}
            </AtTypography>
            <AtIcon
              name={expanded ? 'expand-less' : 'expand-more'}
              size="md"
              color="#1A1F36"
            />
          </View>
        </Pressable>

        {expanded && (
          <View className="gap-2 px-3 pb-3">
            {movimientos.map((mov) => {
              const highlighted = highlightedId === mov.id;
              return (
                <View
                  key={mov.id}
                  className="rounded-xl px-4 py-2"
                  style={{
                    borderCurve: 'continuous',
                    backgroundColor: '#F5F7FA',
                    borderWidth: highlighted ? 2 : 0,
                    borderColor: highlighted ? '#E8952E' : 'transparent',
                    boxShadow: highlighted
                      ? '0 0 0 3px rgba(232, 149, 46, 0.18)'
                      : undefined,
                  }}
                >
                  <MlDetailGrid
                    // 320dp: 3 columnas de ~70px parten "Observaciones"
                    columns={narrow ? 2 : 3}
                    pairs={[
                      { label: 'Movimiento', value: mov.tipo },
                      { label: 'Fecha', value: formatFecha(mov.fecha) },
                      { label: 'Monto', value: formatCurrency(mov.valor) },
                      { label: 'Subpartida', value: mov.subpartida },
                      { label: 'Tercero', value: mov.tercero },
                      { label: 'Observaciones', value: mov.observaciones },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  },
);

OrVagMovimientosGroup.displayName = 'OrVagMovimientosGroup';

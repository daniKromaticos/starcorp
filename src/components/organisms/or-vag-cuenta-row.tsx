/**
 * Organism: OrVagCuentaRow
 *
 * Fila expandible de Cuentas por cobrar / por pagar de VAG: nombre + saldo
 * + chevron. Expandida muestra el detalle (Activo, Servicio si aplica,
 * Dirección) y los movimientos asociados; cada movimiento navega a la
 * vista Movimientos con foco.
 */

import React, { memo, useState } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { MlDetailGrid, type DetailGridPair } from '@/src/components/molecules/ml-detail-grid';
import { formatCurrency } from '@/src/utils/currency';
import type { VagCuenta } from '@/src/types/vag.types';

interface OrVagCuentaRowProps {
  cuenta: VagCuenta;
  onMovimientoPress?: (movimientoId: string) => void;
  initiallyExpanded?: boolean;
}

export const OrVagCuentaRow = memo<OrVagCuentaRowProps>(
  ({ cuenta, onMovimientoPress, initiallyExpanded = false }) => {
    const [expanded, setExpanded] = useState(initiallyExpanded);

    const pairs: DetailGridPair[] = [
      { label: 'Cuenta', value: cuenta.cuenta },
      ...(cuenta.servicio ? [{ label: 'Servicio', value: cuenta.servicio }] : []),
      { label: 'Dirección', value: cuenta.direccion ?? '--' },
    ];

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
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          className="flex-row items-center gap-2 px-4 py-3.5"
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <AtTypography
            variant="bodyBold"
            color="#1A1F36"
            numberOfLines={1}
            className="flex-1 mr-1"
          >
            {cuenta.nombre}
          </AtTypography>
          <AtTypography
            variant="captionBold"
            color="#1A1F36"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatCurrency(cuenta.saldo)}
          </AtTypography>
          <AtIcon
            name={expanded ? 'expand-less' : 'expand-more'}
            size="md"
            color="#1A1F36"
          />
        </Pressable>

        {expanded && (
          <View className="px-4 pb-3 gap-2">
            <View
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: '#F5F7FA', borderCurve: 'continuous' }}
            >
              <MlDetailGrid pairs={pairs} />
            </View>

            <AtTypography variant="bodyBold" color="#1A1F36">
              Movimientos
            </AtTypography>
            {cuenta.movimientos.map((mov) => (
              <Pressable
                key={mov.id}
                onPress={
                  mov.movimientoId && onMovimientoPress
                    ? () => onMovimientoPress(mov.movimientoId!)
                    : undefined
                }
                className="flex-row items-center rounded-lg px-3 py-2.5"
                style={{ backgroundColor: '#F5F7FA', borderCurve: 'continuous' }}
              >
                <View className="flex-1 gap-0.5">
                  <AtTypography variant="captionBold" color="#1A1F36">
                    {mov.tipo}
                  </AtTypography>
                  <AtTypography
                    variant="caption"
                    color="#4A5568"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {formatCurrency(mov.monto)}
                  </AtTypography>
                </View>
                <AtIcon name="arrow-forward" size="sm" color="#4A5568" />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  },
);

OrVagCuentaRow.displayName = 'OrVagCuentaRow';

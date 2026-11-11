/**
 * Organism: OrPresupuestoTotalCard
 *
 * Card "Total" fija al pie del Informe Presupuesto (navy). Totaliza
 * Proyectado y Ejecutado de las empresas del tipo/período activo.
 */

import React, { memo } from 'react';
import { useWindowDimensions } from 'react-native';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { formatMoney2 } from '@/src/utils/currency';

interface OrPresupuestoTotalCardProps {
  proyectado: number;
  ejecutado: number;
}

const NAVY_BG = '#1C2A5E';

const TotalCol = memo<{ label: string; value: number; narrow?: boolean }>(
  ({ label, value, narrow }) => (
    <View
      className={`items-end gap-1 ${narrow ? 'flex-1' : ''}`}
      style={narrow ? undefined : { minWidth: 96 }}
    >
      <AtTypography variant="captionBold" color="rgba(255,255,255,0.75)">
        {label}
      </AtTypography>
      <AtTypography
        variant="bodyBold"
        color="#FFFFFF"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {formatMoney2(value)}
      </AtTypography>
    </View>
  ),
);
TotalCol.displayName = 'PresupuestoTotalCol';

export const OrPresupuestoTotalCard = memo<OrPresupuestoTotalCardProps>(
  ({ proyectado, ejecutado }) => {
    // 320dp: "Total" + dos montos bodyBold desbordaban ~11-29px por la
    // derecha; en angosto las columnas toman el espacio restante y el
    // monto se encoge para caber en una línea.
    const isNarrow = useWindowDimensions().width < 360;
    return (
      <View
        className="flex-row items-center justify-between gap-3 px-4 py-3 rounded-lg"
        style={{
          backgroundColor: NAVY_BG,
          borderCurve: 'continuous',
          boxShadow: '0 -2px 10px rgba(15, 27, 74, 0.18)',
        }}
      >
        <AtTypography variant="bodyBold" color="#FFFFFF">
          Total
        </AtTypography>
        <View className={`flex-row gap-4 ${isNarrow ? 'flex-1' : ''}`}>
          <TotalCol label="Proyectado" value={proyectado} narrow={isNarrow} />
          <TotalCol label="Ejecutado" value={ejecutado} narrow={isNarrow} />
        </View>
      </View>
    );
  },
);

OrPresupuestoTotalCard.displayName = 'OrPresupuestoTotalCard';

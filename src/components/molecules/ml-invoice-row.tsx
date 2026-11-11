/**
 * Molecule: MlInvoiceRow
 *
 * Fila de factura para "Gestión carteras vencidas".
 * Layout 2x2 con: Fecha / Vencimiento (días overdue), Factura / Nota,
 * y monto a la derecha.
 */

import React, { memo } from 'react';
import { useWindowDimensions } from 'react-native';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtDivider } from '@/src/components/atoms/at-divider';

function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Ancho de la columna de monto, compartido con el encabezado "Monto"
// del detalle de cartera (app/(tabs)/informes/cartera/[clientId].tsx).
export const INVOICE_AMOUNT_COL_W = 110;
// Por debajo de este ancho la columna fija de monto dejaba celdas de ~54px
// en la grilla 2x2 (fechas partidas). En angosto el monto va en su propia
// línea arriba (con label "Monto") y la grilla ocupa todo el ancho; el
// header del detalle oculta su columna "Monto".
export const INVOICE_NARROW_MAX_W = 360;

function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

interface MlInvoiceRowProps {
  date: string;
  daysOverdue: number;
  invoiceNumber: string;
  note?: string;
  amount: number;
  showDivider?: boolean;
}

export const MlInvoiceRow = memo<MlInvoiceRowProps>(
  ({ date, daysOverdue, invoiceNumber, note, amount, showDivider = true }) => {
    const overdue = daysOverdue < 0;
    const isNarrow = useWindowDimensions().width < INVOICE_NARROW_MAX_W;
    const amountText = (
      <AtTypography
        variant="bodyBold"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {formatMoney(amount)}
      </AtTypography>
    );
    return (
      <View>
        <View
          className={
            isNarrow ? 'px-4 py-3 gap-2' : 'flex-row items-start px-4 py-3 gap-3'
          }
        >
          {isNarrow && (
            <View className="gap-0.5">
              <AtTypography variant="caption" color="#8892A4">
                Monto
              </AtTypography>
              {amountText}
            </View>
          )}
          <View className={isNarrow ? 'gap-2' : 'flex-1 gap-2'}>
            <View className="flex-row gap-6">
              <View className="flex-1 gap-0.5">
                <AtTypography variant="caption" color="#8892A4">
                  Fecha
                </AtTypography>
                <AtTypography variant="body">{formatDate(date)}</AtTypography>
              </View>
              <View className="flex-1 gap-0.5">
                <AtTypography variant="caption" color="#8892A4">
                  Vencimiento
                </AtTypography>
                <AtTypography
                  variant="bodyBold"
                  color={overdue ? '#DC2626' : '#1A1F36'}
                >
                  {daysOverdue} días
                </AtTypography>
              </View>
            </View>
            <View className="flex-row gap-6">
              <View className="flex-1 gap-0.5">
                <AtTypography variant="caption" color="#8892A4">
                  Factura
                </AtTypography>
                <AtTypography variant="body">{invoiceNumber}</AtTypography>
              </View>
              <View className="flex-1 gap-0.5">
                <AtTypography variant="caption" color="#8892A4">
                  Nota
                </AtTypography>
                <AtTypography variant="body" numberOfLines={2}>
                  {note ?? '—'}
                </AtTypography>
              </View>
            </View>
          </View>
          {!isNarrow && (
            <View
              style={{ width: INVOICE_AMOUNT_COL_W }}
              className="items-start"
            >
              {amountText}
            </View>
          )}
        </View>
        {showDivider && <AtDivider className="mx-4" />}
      </View>
    );
  },
);

MlInvoiceRow.displayName = 'MlInvoiceRow';

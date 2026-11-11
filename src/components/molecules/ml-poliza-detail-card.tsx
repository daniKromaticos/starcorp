/**
 * Molecule: MlPolizaDetailCard
 *
 * Card detallada de una póliza de Compañía. Header "Compañía / Costo"
 * con el nombre + costo en bold, divider, y grid 2×4 con los campos
 * (Aseguradora, Empresa, Broker, Número, Vigencia, Vencimiento,
 * Cobertura, Payroll). El campo Vencimiento se pinta en rojo cuando
 * la póliza está vencida.
 *
 * `showEmpresa=false` oculta el campo Empresa (vista de detalle de una
 * sola empresa donde el dato es redundante).
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon, type AtIconProps } from '@/src/components/atoms/at-icon';
import { AtDivider } from '@/src/components/atoms/at-divider';
import { formatCurrency } from '@/src/utils/currency';
import {
  diffInDays,
  formatVigenciaDate,
  inactivaLabel,
  isInactiva,
  type PolizaCompania,
} from '@/src/types/seguros.types';

interface MlPolizaDetailCardProps {
  poliza: PolizaCompania;
  todayIso: string;
  showEmpresa?: boolean;
  /** Resalta la card (póliza a la que se navegó desde el informe). */
  highlighted?: boolean;
}

interface FieldProps {
  icon: AtIconProps['name'];
  iconVariant?: AtIconProps['variant'];
  iconColor?: string;
  label: string;
  value: string;
  valueColor?: string;
}

const Field = memo<FieldProps>(
  ({ icon, iconVariant, iconColor = '#1A1F36', label, value, valueColor = '#4A5568' }) => (
    <View className="flex-1 gap-1">
      <View className="flex-row items-center gap-1.5">
        <AtIcon
          name={icon as never}
          variant={iconVariant as never}
          size="sm"
          color={iconColor}
        />
        <AtTypography variant="bodyBold" color="#1A1F36">
          {label}
        </AtTypography>
      </View>
      <AtTypography variant="caption" color={valueColor}>
        {value}
      </AtTypography>
    </View>
  ),
);
Field.displayName = 'Field';

function formatVencimiento(days: number): string {
  if (days < 0) return `${days} días`;
  if (days === 0) return 'Hoy';
  return `${days} días`;
}

export const MlPolizaDetailCard = memo<MlPolizaDetailCardProps>(
  ({ poliza, todayIso, showEmpresa = false, highlighted = false }) => {
    const days = diffInDays(poliza.vigenciaFin, todayIso);
    const inactiva = isInactiva(poliza);
    const vencida = days < 0;
    const venceProximo = days >= 0 && days <= 60;
    // Una póliza inactiva no alerta por vencimiento.
    const showVencimientoAlert = !inactiva && (vencida || venceProximo);
    const vencimientoColor = vencida ? '#DC2626' : '#D97706';

    return (
      <View
        className="bg-white rounded-lg p-4 gap-3"
        style={{
          borderCurve: 'continuous',
          borderWidth: highlighted ? 2 : 1,
          borderColor: highlighted ? '#E8952E' : 'rgba(0,0,0,0.06)',
          boxShadow: highlighted
            ? '0 0 0 3px rgba(232, 149, 46, 0.18)'
            : undefined,
        }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <AtTypography variant="caption" color="#8892A4">
              Compañía
            </AtTypography>
            <AtTypography variant="bodyBold" color="#1A1F36">
              {poliza.nombre}
            </AtTypography>
            {inactiva && (
              <View
                className="self-start mt-1 rounded-full px-2 py-0.5"
                style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
              >
                <AtTypography variant="caption" color="#4A5568">
                  {inactivaLabel(poliza)}
                </AtTypography>
              </View>
            )}
          </View>
          <View className="items-end">
            <AtTypography variant="caption" color="#8892A4">
              Costo
            </AtTypography>
            <AtTypography variant="bodyBold" color="#1A1F36">
              {formatCurrency(poliza.costo)}
            </AtTypography>
          </View>
        </View>

        <AtDivider />

        <View className="flex-row gap-4">
          <Field
            icon="shield"
            iconVariant="community"
            label="Aseguradora"
            value={poliza.aseguradora}
          />
          {showEmpresa ? (
            <Field
              icon="business"
              label="Empresa"
              value={poliza.empresaName}
            />
          ) : (
            <View className="flex-1" />
          )}
        </View>

        <View className="flex-row gap-4">
          <Field
            icon="account-circle"
            label="Broker"
            value={poliza.broker}
          />
          <Field
            icon="format-list-numbered"
            label="Número"
            value={poliza.numero}
          />
        </View>

        <View className="flex-row gap-4">
          <Field
            icon="schedule"
            label="Vigencia"
            value={formatVigenciaDate(poliza.vigenciaFin)}
          />
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-1.5">
              {showVencimientoAlert && (
                <AtIcon name="warning-amber" size="sm" color={vencimientoColor} />
              )}
              <AtTypography
                variant="bodyBold"
                color={showVencimientoAlert ? vencimientoColor : '#1A1F36'}
              >
                Vencimiento
              </AtTypography>
            </View>
            <AtTypography
              variant="caption"
              color={showVencimientoAlert ? vencimientoColor : '#4A5568'}
            >
              {formatVencimiento(days)}
            </AtTypography>
          </View>
        </View>

        <View className="flex-row gap-4">
          <Field
            icon="place"
            label="Cobertura"
            value={formatCurrency(poliza.cobertura)}
          />
          <Field
            icon="account-balance"
            label="Payroll"
            value={poliza.payroll == null ? '--' : formatCurrency(poliza.payroll)}
          />
        </View>
      </View>
    );
  },
);

MlPolizaDetailCard.displayName = 'MlPolizaDetailCard';

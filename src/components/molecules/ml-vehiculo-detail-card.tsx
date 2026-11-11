/**
 * Molecule: MlVehiculoDetailCard
 *
 * Card de póliza de Vehículo. Mismo layout que MlPolizaDetailCard:
 * header "Vehículo / Costo" con el nombre + costo en bold, divider, y
 * grid 2×4 con los campos (Aseguradora, Empresa, Broker, Número,
 * Asignación, Vigencia, Vencimiento). El campo Vencimiento se pinta en
 * rojo/ámbar cuando la póliza está vencida o por vencer.
 *
 * Los campos que la fila de Notion no trae se muestran como "--" para
 * no romper la grid.
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
  type PolizaVehiculo,
} from '@/src/types/seguros.types';

interface MlVehiculoDetailCardProps {
  poliza: PolizaVehiculo;
  todayIso: string;
  /** Resalta la card (póliza a la que se navegó desde el informe). */
  highlighted?: boolean;
}

interface FieldProps {
  icon: AtIconProps['name'];
  iconVariant?: AtIconProps['variant'];
  label: string;
  value: string;
}

const Field = memo<FieldProps>(({ icon, iconVariant, label, value }) => (
  <View className="flex-1 gap-1">
    <View className="flex-row items-center gap-1.5">
      <AtIcon
        name={icon as never}
        variant={iconVariant as never}
        size="sm"
        color="#1A1F36"
      />
      <AtTypography variant="bodyBold" color="#1A1F36">
        {label}
      </AtTypography>
    </View>
    <AtTypography variant="caption" color="#4A5568">
      {value}
    </AtTypography>
  </View>
));
Field.displayName = 'Field';

function formatVencimiento(days: number): string {
  if (days < 0) return `${days} días`;
  if (days === 0) return 'Hoy';
  return `${days} días`;
}

/** Placeholder para las columnas vacías de Notion. */
function orDash(value: string): string {
  return value.trim() || '--';
}

export const MlVehiculoDetailCard = memo<MlVehiculoDetailCardProps>(
  ({ poliza, todayIso, highlighted = false }) => {
    const days = diffInDays(poliza.vigenciaFin, todayIso);
    const inactiva = isInactiva(poliza);
    const vencida = days < 0;
    const venceProximo = days >= 0 && days <= 60;
    // Una póliza inactiva no alerta por vencimiento.
    const alert = !inactiva && (vencida || venceProximo);
    const color = vencida ? '#DC2626' : '#D97706';

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
              Vehículo
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
              {poliza.costo ? formatCurrency(poliza.costo) : '--'}
            </AtTypography>
          </View>
        </View>

        <AtDivider />

        <View className="flex-row gap-4">
          <Field
            icon="shield"
            iconVariant="community"
            label="Aseguradora"
            value={orDash(poliza.aseguradora)}
          />
          {poliza.empresaName ? (
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
            value={orDash(poliza.broker)}
          />
          <Field
            icon="format-list-numbered"
            label="Número"
            value={orDash(poliza.numero)}
          />
        </View>

        {/* El tablero de Notion no siempre tiene la columna Asignación. */}
        {!!poliza.asignacion.trim() && (
          <View className="flex-row gap-4">
            <Field
              icon="place"
              label="Asignación"
              value={poliza.asignacion}
            />
            <View className="flex-1" />
          </View>
        )}

        <View className="flex-row gap-4">
          <Field
            icon="schedule"
            label="Vigencia"
            value={formatVigenciaDate(poliza.vigenciaFin)}
          />
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-1.5">
              {alert && <AtIcon name="warning-amber" size="sm" color={color} />}
              <AtTypography
                variant="bodyBold"
                color={alert ? color : '#1A1F36'}
              >
                Vencimiento
              </AtTypography>
            </View>
            <AtTypography
              variant="caption"
              color={alert ? color : '#4A5568'}
            >
              {formatVencimiento(days)}
            </AtTypography>
          </View>
        </View>
      </View>
    );
  },
);

MlVehiculoDetailCard.displayName = 'MlVehiculoDetailCard';

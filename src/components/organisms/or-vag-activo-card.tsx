/**
 * Organism: OrVagActivoCard
 *
 * Tarjeta expandible de un activo de VAG. Colapsada muestra nombre + tipo;
 * expandida agrega fecha de adquisición, grid de detalle (valores, avalúo,
 * seguro, matrícula…), la ficha catastral con acceso al documento y los
 * "Movimientos consolidados" agrupados (Activos/Administrativos/Financieros)
 * cuyas filas navegan al movimiento en la vista Movimientos.
 */

import React, { memo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { MlDetailGrid } from '@/src/components/molecules/ml-detail-grid';
import { formatCurrency } from '@/src/utils/currency';
import type {
  VagActivo,
  VagActivoDoc,
  VagActivoGrupo,
} from '@/src/types/vag.types';

interface OrVagActivoCardProps {
  activo: VagActivo;
  /** Documento adjunto del activo (null/undefined = sin documento). */
  doc?: VagActivoDoc | null;
  /** Subida en curso para ESTE activo (deshabilita las acciones). */
  uploading?: boolean;
  onMovimientoPress?: (movimientoId: string) => void;
  onVerDocumento?: (doc: VagActivoDoc) => void;
  onSubirDocumento?: (activo: VagActivo) => void;
  initiallyExpanded?: boolean;
}

const SOFT_BG = '#F5F7FA';

function GrupoBlock({
  grupo,
  onMovimientoPress,
}: {
  grupo: VagActivoGrupo;
  onMovimientoPress?: (movimientoId: string) => void;
}) {
  return (
    <View className="gap-2">
      <AtTypography variant="bodyBold" color="#1A1F36">
        {grupo.titulo}
      </AtTypography>

      {/* Subpartida */}
      <View
        className="bg-bg-card rounded-lg px-3 py-2.5"
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.06)',
        }}
      >
        <View className="flex-row items-center justify-between">
          <AtTypography variant="captionBold" color="#1A1F36">
            Subpartida
          </AtTypography>
          {grupo.monto != null && (
            <AtTypography
              variant="captionBold"
              color="#1A1F36"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCurrency(grupo.monto)}
            </AtTypography>
          )}
        </View>
        <AtTypography variant="caption" color="#4A5568">
          {grupo.subpartida}
        </AtTypography>
      </View>

      {/* Items → movimiento */}
      {grupo.items.map((item) => (
        <Pressable
          key={item.id}
          onPress={
            item.movimientoId && onMovimientoPress
              ? () => onMovimientoPress(item.movimientoId!)
              : undefined
          }
          className="flex-row items-center rounded-lg px-3 py-2.5"
          style={{ backgroundColor: SOFT_BG, borderCurve: 'continuous' }}
        >
          <View className="flex-1 gap-0.5">
            <AtTypography variant="captionBold" color="#1A1F36">
              {item.nombre}
            </AtTypography>
            <AtTypography
              variant="caption"
              color="#4A5568"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCurrency(item.monto)}
            </AtTypography>
          </View>
          <AtIcon name="arrow-forward" size="sm" color="#4A5568" />
        </Pressable>
      ))}
    </View>
  );
}

export const OrVagActivoCard = memo<OrVagActivoCardProps>(
  ({
    activo,
    doc,
    uploading = false,
    onMovimientoPress,
    onVerDocumento,
    onSubirDocumento,
    initiallyExpanded = false,
  }) => {
    const [expanded, setExpanded] = useState(initiallyExpanded);
    const narrow = useWindowDimensions().width < 360;

    // Campos sin fuente contable llegan null → '--'.
    const money = (v: number | null) => (v == null ? '--' : formatCurrency(v));
    const pairs = [
      { label: 'Valor de adquisición', value: money(activo.valorAdquisicion) },
      { label: 'Valor estimado', value: money(activo.valorEstimado) },
      { label: 'Valor contable a la fecha', value: money(activo.valorContable) },
      { label: 'Avaluo Catastral', value: money(activo.avaluoCatastral) },
      { label: 'Valor Predial', value: money(activo.valorPredial) },
      { label: 'Tipo de activo', value: activo.tipo },
      { label: 'Valor de Seguro', value: money(activo.valorSeguro) },
      { label: 'Vigencia', value: activo.vigencia ?? '--' },
      { label: 'Aseguradora', value: activo.aseguradora ?? '--' },
      { label: 'Ciudad', value: activo.ciudad ?? '--' },
      { label: 'Dirección', value: activo.direccion ?? '--' },
      { label: 'Número de matrícula', value: activo.numeroMatricula ?? '--' },
    ];

    return (
      <View
        className="bg-bg-card rounded-xl px-4 py-4 gap-3"
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.08)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header: nombre + tipo + chevron */}
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          className="flex-row items-center justify-between"
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <View className="flex-1 mr-2">
            <AtTypography variant="bodyBold" color="#1A1F36" numberOfLines={1}>
              {activo.nombre}
            </AtTypography>
            <AtTypography variant="caption" color="#4A5568">
              {activo.tipo}
            </AtTypography>
          </View>
          <AtIcon
            name={expanded ? 'expand-less' : 'expand-more'}
            size="md"
            color="#1A1F36"
          />
        </Pressable>

        {expanded && (
          <>
            {/* Fecha de adquisición */}
            <View
              className="flex-row items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ backgroundColor: SOFT_BG, borderCurve: 'continuous' }}
            >
              <View
                className="bg-bg-card rounded-lg items-center justify-center"
                style={{ width: 36, height: 36, borderCurve: 'continuous' }}
              >
                <AtIcon name="slideshow" size="md" color="#1A1F36" />
              </View>
              <View>
                <AtTypography variant="captionBold" color="#1A1F36">
                  Fecha de adquisición
                </AtTypography>
                <AtTypography variant="caption" color="#4A5568">
                  {activo.fechaAdquisicion}
                </AtTypography>
              </View>
            </View>

            {/* Detalle */}
            <MlDetailGrid pairs={pairs} />

            {/* Ficha catastral + documento adjunto */}
            {/* 320dp: las acciones dejaban ~40px a "Ficha catastral"; bajan a
                una segunda línea alineadas con el texto (20 icono + 12 gap). */}
            <View
              className="flex-row flex-wrap items-center gap-3 rounded-lg px-3 py-3"
              style={{
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: '#5B8DEF',
                backgroundColor: '#F4F8FF',
                rowGap: narrow ? 8 : undefined,
              }}
            >
              <AtIcon name="menu-book" size="md" color="#1A1F36" />
              <View className="flex-1">
                <AtTypography variant="captionBold" color="#1A1F36">
                  Ficha catastral
                </AtTypography>
                <AtTypography
                  variant="caption"
                  color="#4A5568"
                  selectable
                  numberOfLines={1}
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {activo.fichaCatastral?.numero ??
                    doc?.archivoOriginal ??
                    '--'}
                </AtTypography>
              </View>
              <View
                className="flex-row"
                style={narrow ? { width: '100%', paddingLeft: 32 } : undefined}
              >
                {doc ? (
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => onVerDocumento?.(doc)}
                      disabled={uploading}
                      className="flex-row items-center gap-1.5"
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Ver documento"
                    >
                      <AtTypography variant="captionBold" color="#1A3FE8">
                        Ver documento
                      </AtTypography>
                      <AtIcon name="visibility" size="sm" color="#1A3FE8" />
                    </Pressable>
                    <Pressable
                      onPress={() => onSubirDocumento?.(activo)}
                      disabled={uploading}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Reemplazar documento"
                    >
                      <AtIcon
                        name={uploading ? 'hourglass-empty' : 'file-upload'}
                        size="sm"
                        color="#1A3FE8"
                      />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => onSubirDocumento?.(activo)}
                    disabled={uploading}
                    className="flex-row items-center gap-1.5"
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Subir documento"
                  >
                    <AtTypography variant="captionBold" color="#1A3FE8">
                      {uploading ? 'Subiendo…' : 'Subir documento'}
                    </AtTypography>
                    <AtIcon
                      name={uploading ? 'hourglass-empty' : 'file-upload'}
                      size="sm"
                      color="#1A3FE8"
                    />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Movimientos consolidados */}
            <AtTypography variant="bodyBold" color="#1A1F36">
              Movimientos consolidados
            </AtTypography>
            {activo.gruposMovimientos.map((grupo) => (
              <GrupoBlock
                key={grupo.id}
                grupo={grupo}
                onMovimientoPress={onMovimientoPress}
              />
            ))}
          </>
        )}
      </View>
    );
  },
);

OrVagActivoCard.displayName = 'OrVagActivoCard';

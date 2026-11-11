/**
 * Organism: OrEmpresaTercerosList
 *
 * Buscador "Buscar por tercero" + encabezado de columnas
 * (Nombre tercero / Total) + filas (dot de color + nombre a la izquierda,
 * monto a la derecha). Para el detalle de "Otras compañías".
 *
 * Con `selectedId`/`onSelectChange` las filas seleccionan un tercero
 * (cross-filtrado con el donut, como OrTercerosList de financiero): la
 * lista colapsa a la fila elegida, resaltada en índigo; tap de nuevo
 * deselecciona.
 */

import React, { memo, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { formatMoney2 } from '@/src/utils/currency';
import type { EmpresaTercero } from '@/src/types/empresas.types';

interface OrEmpresaTercerosListProps {
  terceros: EmpresaTercero[];
  onTerceroPress?: (id: string) => void;
  /** Tercero seleccionado (cross-filtrado con el donut). */
  selectedId?: string | null;
  onSelectChange?: (id: string | null) => void;
}

export const OrEmpresaTercerosList = memo<OrEmpresaTercerosListProps>(
  ({ terceros, onTerceroPress, selectedId = null, onSelectChange }) => {
    const [searchText, setSearchText] = useState('');

    // La selección tiene prioridad sobre el buscador: colapsa la lista a
    // la fila elegida (mismo comportamiento que financiero/ingresos).
    const filtered = useMemo(() => {
      if (selectedId) {
        return terceros.filter((t) => t.id === selectedId);
      }
      const q = searchText.trim().toLowerCase();
      if (!q) return terceros;
      return terceros.filter((t) => t.name.toLowerCase().includes(q));
    }, [terceros, selectedId, searchText]);

    return (
      <View className="gap-3 px-4">
        {/* Buscador */}
        <View
          className="flex-row items-center bg-bg-card px-4 gap-3"
          style={{
            borderRadius: 24,
            borderCurve: 'continuous',
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.08)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          }}
        >
          <AtIcon name="search" size="sm" color="#8892A4" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar por tercero"
            placeholderTextColor="#8892A4"
            className="flex-1 p-0"
            style={{ fontFamily: 'Roboto_400Regular', fontSize: 14, color: '#1A1F36' }}
          />
        </View>

        {/* Encabezado de columnas */}
        <View
          className="flex-row items-center justify-between px-1 pb-2"
          style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' }}
        >
          <AtTypography variant="captionBold" color="#1A1F36">
            Nombre tercero
          </AtTypography>
          <AtTypography variant="captionBold" color="#1A1F36">
            Total
          </AtTypography>
        </View>

        {/* Filas — zebra: alternan fondo transparente y card blanca; la
            fila seleccionada se resalta en índigo (lenguaje de
            OrTercerosList de financiero) */}
        <View>
          {filtered.map((tercero, idx) => {
            const isSelected = selectedId === tercero.id;
            return (
            <Pressable
              key={tercero.id}
              onPress={() => {
                if (onSelectChange) {
                  onSelectChange(isSelected ? null : tercero.id);
                } else {
                  onTerceroPress?.(tercero.id);
                }
              }}
              disabled={!onSelectChange && !onTerceroPress}
              className={`flex-row items-center gap-3 px-3 py-3 rounded-lg ${
                !isSelected && idx % 2 === 1 ? 'bg-bg-card' : ''
              }`}
              style={{
                borderCurve: 'continuous',
                borderWidth: isSelected ? 1 : idx % 2 === 1 ? 1 : 0,
                borderColor: isSelected
                  ? 'rgba(99, 102, 241, 0.45)'
                  : 'rgba(0,0,0,0.05)',
                backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : undefined,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: tercero.color,
                  flexShrink: 0,
                }}
              />
              <AtTypography
                variant="body"
                color="#1A1F36"
                numberOfLines={2}
                className="flex-1"
              >
                {tercero.name}
              </AtTypography>
              <AtTypography
                variant="caption"
                color={isSelected ? '#1A1F36' : '#8892A4'}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatMoney2(tercero.amount)}
              </AtTypography>
            </Pressable>
            );
          })}

          {filtered.length === 0 && (
            <View className="items-center py-8">
              <AtTypography variant="body" color="#8892A4">
                No se encontraron terceros
              </AtTypography>
            </View>
          )}
        </View>
      </View>
    );
  },
);

OrEmpresaTercerosList.displayName = 'OrEmpresaTercerosList';

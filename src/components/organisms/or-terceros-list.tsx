/**
 * Organism: OrTercerosList
 *
 * Search bar + scrollable list of terceros (vendors/suppliers).
 * Used in Costos/Gastos → Grupos → Terceros views.
 *
 * Each row:
 *   - Gradient color swatch (AtColorDot with gradientColors)
 *   - Bold name + amount below in lighter style
 *   - Soft delta chip (AtDeltaIndicator appearance="soft")
 */

import React, { memo, useState, useMemo } from 'react';
import { View, TextInput, Pressable } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtColorDot } from '@/src/components/atoms/at-color-dot';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { formatCurrency } from '@/src/utils/currency';
import type { ThirdParty } from '@/src/types/domain.types';

interface OrTercerosListProps {
  terceros: ThirdParty[];
  onTerceroPress?: (id: string) => void;
  selectedId?: string | null;
  onSelectChange?: (id: string | null) => void;
  /** Id used by the donut for its aggregated "Otros" slice. When this id is
   *  selected, the first `otrosTopCount` rows are dimmed (they're already
   *  represented as individual slices) and the rest are highlighted. */
  otrosId?: string;
  otrosTopCount?: number;
}

export const OrTercerosList = memo<OrTercerosListProps>(
  ({
    terceros,
    onTerceroPress,
    selectedId = null,
    onSelectChange,
    otrosId,
    otrosTopCount = 8,
  }) => {
    const topIds = new Set(
      otrosId ? terceros.slice(0, otrosTopCount).map((t) => t.id) : [],
    );
    const [searchText, setSearchText] = useState('');

    const filtered = useMemo(() => {
      // Selection takes precedence over text search: when an item is selected
      // (or the donut's "Otros" bucket), the list collapses to just that
      // selection so the user sees only the relevant rows.
      if (selectedId) {
        if (otrosId && selectedId === otrosId) {
          return terceros.filter((_, i) => i >= otrosTopCount);
        }
        return terceros.filter((t) => t.id === selectedId);
      }
      if (!searchText.trim()) return terceros;
      const lower = searchText.toLowerCase();
      return terceros.filter((t) => t.name.toLowerCase().includes(lower));
    }, [terceros, searchText, selectedId, otrosId, otrosTopCount]);

    return (
      <View className="gap-4">
        {/* Search bar — white card, rounded-full, magnifying glass left */}
        <View className="px-4">
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
              placeholder="Buscar por terceros"
              placeholderTextColor="#8892A4"
              className="flex-1 p-0"
              style={{ fontFamily: 'Roboto_400Regular', fontSize: 14, color: '#1A1F36' }}
            />
          </View>
        </View>

        {/* Tercero rows */}
        <View className="px-4 gap-4">
          {filtered.map((tercero) => {
            const isSelected = selectedId === tercero.id;
            const isOtrosSelected = !!otrosId && selectedId === otrosId;
            const isInTopBucket = topIds.has(tercero.id);
            // When the "Otros" slice is selected, the top-N rows (which
            // already have their own slice in the donut) are dimmed.
            const inOtrosGroup = isOtrosSelected && !isInTopBucket;
            const dimmed =
              (selectedId != null && !isSelected && !isOtrosSelected) ||
              (isOtrosSelected && isInTopBucket);
            const highlight = isSelected || inOtrosGroup;
            return (
              <Pressable
                key={tercero.id}
                onPress={() => {
                  onSelectChange?.(isSelected ? null : tercero.id);
                  onTerceroPress?.(tercero.id);
                }}
                className="flex-row items-center gap-3"
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: highlight ? 8 : 0,
                  marginHorizontal: highlight ? -8 : 0,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  backgroundColor: highlight
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'transparent',
                  borderWidth: highlight ? 1 : 0,
                  borderColor: highlight
                    ? 'rgba(99, 102, 241, 0.4)'
                    : 'transparent',
                  opacity: dimmed ? 0.45 : 1,
                }}
              >
                {/* Gradient color swatch */}
                <AtColorDot
                  color={tercero.color}
                  gradientColors={tercero.gradientColors}
                  size="lg"
                  shape="square"
                />

                {/* Name + amount stacked */}
                <View className="flex-1 gap-0.5">
                  <AtTypography variant="bodyBold" numberOfLines={1}>
                    {tercero.name}
                  </AtTypography>
                  <AtTypography variant="caption" color="#8892A4" selectable style={{ fontVariant: ['tabular-nums'] }}>
                    {formatCurrency(tercero.amount, { currency: 'USD', compact: false })}
                  </AtTypography>
                </View>

                {/* Soft delta chip */}
                <AtDeltaIndicator value={tercero.deltaPercent} size="sm" appearance="soft" />
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

OrTercerosList.displayName = 'OrTercerosList';

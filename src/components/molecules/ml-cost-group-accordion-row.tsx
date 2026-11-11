/**
 * Molecule: MlCostGroupAccordionRow
 *
 * Accordion row for per-client cost group lists. Each row shows:
 *   - Gradient swatch (left)
 *   - Group name + soft delta chip
 *   - Total amount (below name)
 *   - Chevron toggle (right) — only when sub-items are provided
 *
 * When expanded, renders a light-grey sub-item block. Each sub-item shows
 * name + amount on the left and an arrow-forward icon on the right.
 * Sub-items are tappable via `onSubItemPress(subItemId)`.
 */

import React, { memo, useState } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtColorDot } from '@/src/components/atoms/at-color-dot';
import { formatCurrency } from '@/src/utils/currency';

export interface CostGroupSubItem {
  id: string;
  name: string;
  amount: number;
}

export interface MlCostGroupAccordionRowProps {
  name: string;
  amount: number;
  /** Null/undefined = sin comparativo: el chip de delta no se renderiza. */
  deltaPercent?: number | null;
  gradientColors: [string, string];
  subItems?: CostGroupSubItem[];
  onSubItemPress?: (subItemId: string) => void;
  // Direct-entry mode: when there are no sub-items, tapping the row calls
  // this handler instead of toggling the accordion. The chevron switches
  // to arrow-forward so the affordance is unambiguous.
  onPress?: () => void;
  initiallyExpanded?: boolean;
}

export const MlCostGroupAccordionRow = memo<MlCostGroupAccordionRowProps>(
  ({
    name,
    amount,
    deltaPercent,
    gradientColors,
    subItems,
    onSubItemPress,
    onPress,
    initiallyExpanded = false,
  }) => {
    const hasSubItems = Array.isArray(subItems) && subItems.length > 0;
    const [expanded, setExpanded] = useState(initiallyExpanded);
    const handlePress = hasSubItems
      ? () => setExpanded((prev) => !prev)
      : onPress;
    const trailingIconName = hasSubItems
      ? expanded
        ? 'expand-less'
        : 'expand-more'
      : onPress
        ? 'arrow-forward'
        : null;

    return (
      <View
        className="bg-bg-card mx-4 rounded-xl overflow-hidden"
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.08)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* ── Parent row ── */}
        <Pressable
          onPress={handlePress}
          className="flex-row items-center gap-3 px-4 py-4"
        >
          {/* Gradient swatch */}
          <AtColorDot
            color={gradientColors[0]}
            gradientColors={gradientColors}
            size="md"
          />

          {/* Name + delta + amount stacked */}
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-2">
              <AtTypography
                variant="bodyBold"
                color="#1A1F36"
                numberOfLines={1}
                className="flex-shrink"
              >
                {name}
              </AtTypography>
              {deltaPercent != null && (
                <AtDeltaIndicator value={deltaPercent} size="sm" appearance="soft" />
              )}
            </View>
            <AtTypography
              variant="caption"
              color="#8892A4"
              selectable
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCurrency(amount)}
            </AtTypography>
          </View>

          {/* Trailing icon: expand chevron when there are sub-items,
              arrow-forward when in direct-entry mode. */}
          {trailingIconName && (
            <AtIcon name={trailingIconName} size="md" color="#8892A4" />
          )}
        </Pressable>

        {/* ── Expanded sub-items block ── */}
        {hasSubItems && expanded && (
          <View style={{ backgroundColor: '#F5F7FA' }}>
            {/* Top separator between parent row and sub-items */}
            <View
              style={{
                height: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
              }}
            />
            {subItems!.map((item, index) => (
              <View key={item.id}>
                <Pressable
                  onPress={onSubItemPress ? () => onSubItemPress(item.id) : undefined}
                  disabled={!onSubItemPress}
                  className="flex-row items-center px-4 py-3"
                >
                  {/* Sub-item name + amount */}
                  <View className="flex-1 gap-0.5">
                    <AtTypography variant="captionBold" color="#1A1F36" numberOfLines={1}>
                      {item.name}
                    </AtTypography>
                    <AtTypography
                      variant="caption"
                      color="#8892A4"
                      selectable
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {formatCurrency(item.amount)}
                    </AtTypography>
                  </View>
                  {/* Arrow right — solo cuando el sub-item navega */}
                  {onSubItemPress && (
                    <AtIcon name="arrow-forward" size="sm" color="#8892A4" />
                  )}
                </Pressable>
                {/* Divider between sub-items (skip after last) */}
                {index < subItems!.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      marginHorizontal: 16,
                      backgroundColor: 'rgba(0, 0, 0, 0.06)',
                    }}
                  />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  },
);

MlCostGroupAccordionRow.displayName = 'MlCostGroupAccordionRow';

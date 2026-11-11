/**
 * Organism: OrFinancialSummary
 *
 * Two layout modes for the Financiero index screen:
 *
 * OrPrimaryMetrics — three dark (#0A1432) cards stacked vertically.
 *   Each card: icon + label + arrow-forward on the LEFT, delta chip on the RIGHT,
 *   and the big amount on the line below.
 *
 * OrSecondaryMetrics — two light cards in an equal-width row.
 *   Each card: icon → label → amount → delta chip, all centered.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtDeltaIndicator } from '@/src/components/atoms/at-delta-indicator';
import { AtMetricValue } from '@/src/components/atoms/at-metric-value';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

// ─── Shared types ────────────────────────────────────────────────────────────

export interface FinancialMetric {
  id: string;
  label: string;
  value: number;
  deltaPercent?: number;
  icon?: MaterialIconName;
  iconColor?: string;
  ctaLabel?: string;
}

// ─── Primary metrics (three dark cards stacked) ──────────────────────────────

interface OrPrimaryMetricsProps {
  metrics: FinancialMetric[];
  onMetricPress?: (id: string) => void;
  className?: string;
}

const DARK_CARD_BG = '#0A1432';
const DARK_CARD_RADIUS = 8;

export const OrPrimaryMetrics = memo<OrPrimaryMetricsProps>(
  ({ metrics, onMetricPress, className }) => {
    return (
      <View className={`gap-3 px-4 ${className ?? ''}`}>
        {metrics.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => onMetricPress?.(m.id)}
            style={{
              backgroundColor: DARK_CARD_BG,
              borderRadius: DARK_CARD_RADIUS,
              borderCurve: 'continuous',
              paddingHorizontal: 16,
              paddingVertical: 14,
              gap: 6,
            }}
          >
            {/* Top row: icon + label + arrow  |  delta chip */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Left group */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                {m.icon && (
                  <AtIcon name={m.icon} size="md" color="#FFFFFF" />
                )}
                <AtTypography variant="captionBold" color="rgba(255,255,255,0.75)">
                  {m.label}
                </AtTypography>
                <AtIcon name="arrow-forward" size="sm" color="rgba(255,255,255,0.5)" />
              </View>

              {/* Right: delta chip */}
              {m.deltaPercent != null && (
                <AtDeltaIndicator value={m.deltaPercent} size="sm" appearance="soft" />
              )}
            </View>

            {/* Amount — full width below */}
            <AtMetricValue value={m.value} size="md" color="#FFFFFF" />
          </Pressable>
        ))}
      </View>
    );
  },
);

OrPrimaryMetrics.displayName = 'OrPrimaryMetrics';

// ─── Secondary metrics (two light cards side-by-side) ────────────────────────

interface OrSecondaryMetricsProps {
  metrics: FinancialMetric[];
  className?: string;
}

const LIGHT_CARD_BORDER = '#3A5BC4';

export const OrSecondaryMetrics = memo<OrSecondaryMetricsProps>(
  ({ metrics, className }) => {
    return (
      <View
        className={`px-4 ${className ?? ''}`}
        style={{ flexDirection: 'row', gap: 12 }}
      >
        {metrics.map((m) => (
          <View
            key={m.id}
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: DARK_CARD_RADIUS,
              borderCurve: 'continuous',
              borderWidth: 1.5,
              borderColor: LIGHT_CARD_BORDER,
              paddingHorizontal: 12,
              paddingVertical: 14,
              alignItems: 'center',
              gap: 6,
            }}
          >
            {/* Icon */}
            {m.icon && (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(58, 91, 196, 0.10)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AtIcon name={m.icon} size="md" color={m.iconColor ?? LIGHT_CARD_BORDER} />
              </View>
            )}

            {/* Label */}
            <AtTypography variant="caption" color="#8892A4" className="text-center">
              {m.label}
            </AtTypography>

            {/* Amount — fit: a 320dp la card mide ~111px y el número se partía */}
            <AtMetricValue value={m.value} size="md" color="#1A1F36" fit />

            {/* Delta */}
            {m.deltaPercent != null && (
              <AtDeltaIndicator value={m.deltaPercent} size="sm" appearance="soft" />
            )}
          </View>
        ))}
      </View>
    );
  },
);

OrSecondaryMetrics.displayName = 'OrSecondaryMetrics';

// ─── Legacy export kept for backwards-compat (not used after this refactor) ──

interface OrFinancialSummaryProps {
  title?: string;
  metrics: FinancialMetric[];
  columns?: 2 | 3;
  onMetricPress?: (id: string) => void;
  className?: string;
}

/** @deprecated Use OrPrimaryMetrics or OrSecondaryMetrics instead. */
export const OrFinancialSummary = memo<OrFinancialSummaryProps>(
  ({ title, metrics, columns = 3, onMetricPress, className }) => {
    if (columns === 3) {
      return (
        <OrPrimaryMetrics
          metrics={metrics}
          onMetricPress={onMetricPress}
          className={className}
        />
      );
    }
    return <OrSecondaryMetrics metrics={metrics} className={className} />;
  },
);

OrFinancialSummary.displayName = 'OrFinancialSummary';

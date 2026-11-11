/**
 * Organism: OrFinancieroSection
 *
 * Dashboard section showing a horizontal carousel of company cards.
 * Section header ("Financiero") with a gradient period badge on the
 * right, carousel of MlCompanyCard, and a right-aligned navy CTA
 * ("Ver empresas") that navigates to /financiero.
 */

import React, { memo } from 'react';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtStatusBadge } from '@/src/components/atoms/at-status-badge';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { MlCompanyCard } from '@/src/components/molecules/ml-company-card';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/src/theme/gradients';

export interface CompanySummary {
  id: string;
  name: string;
  totalLabel: string;
  totalValue: number;
  deltaPercent?: number;
}

interface OrFinancieroSectionProps {
  title?: string;
  periodLabel?: string;
  companies: CompanySummary[];
  onCompanyPress?: (id: string) => void;
  onViewAll?: () => void;
  ctaLabel?: string;
}

export const OrFinancieroSection = memo<OrFinancieroSectionProps>(
  ({
    title = 'Financiero',
    periodLabel = 'Hoy',
    companies,
    onCompanyPress,
    onViewAll,
    ctaLabel = 'Ver empresas',
  }) => {
    return (
      <View className="gap-4">
        <View className="flex-row justify-between items-center px-4">
          <AtTypography variant="h2">{title}</AtTypography>
          <AtStatusBadge label={periodLabel} variant="gradient" size="md" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-4"
        >
          {companies.map((c) => (
            <MlCompanyCard
              key={c.id}
              name={c.name}
              totalLabel={c.totalLabel}
              totalValue={c.totalValue}
              deltaPercent={c.deltaPercent}
              onPress={() => onCompanyPress?.(c.id)}
            />
          ))}
        </ScrollView>

        <View className="items-end px-4">
          <Pressable
            onPress={onViewAll}
            style={{
              borderRadius: 8,
              borderCurve: 'continuous',
              overflow: 'hidden',
              boxShadow: '0 2px 6px rgba(4, 17, 63, 0.35)',
            }}
          >
            <LinearGradient
              colors={gradients.buttonBlue.colors}
              start={gradients.buttonBlue.start}
              end={gradients.buttonBlue.end}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AtTypography variant="captionBold" color="#FFFFFF">
                {ctaLabel}
              </AtTypography>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  },
);

OrFinancieroSection.displayName = 'OrFinancieroSection';

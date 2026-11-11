/**
 * Organism: CategoryCarousel
 *
 * Horizontal scroll of CategoryTab cards.
 * Matches mockup: [Ingresos] [Costos] [Gastos] [Utilidad]
 */

import React, { memo } from 'react';
import { ScrollView, View } from 'react-native';
import { CategoryTab } from '@/src/components/molecules/category-tab';
import { tokens } from '@/src/theme/tokens';
import { mockCategories } from '@/src/services/mock/data.mock';

export const CategoryCarousel = memo(() => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: tokens.spacing.md,
        paddingHorizontal: tokens.spacing.lg,
      }}
    >
      {mockCategories.map((cat) => (
        <CategoryTab
          key={cat.id}
          label={cat.label}
          icon={cat.icon}
          actionLabel={cat.actionLabel}
        />
      ))}
    </ScrollView>
  );
});

CategoryCarousel.displayName = 'CategoryCarousel';

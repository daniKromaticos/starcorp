/**
 * Organism: OrCategoryCarousel
 *
 * Horizontal scroll of MlCategoryTab cards.
 * Receives the selected category id from the parent so it can drive the
 * chart data shown in the Empresas (Consolidado) card.
 */

import React, { memo } from 'react';
import { ScrollView } from '@/src/tw';
import { MlCategoryTab } from '@/src/components/molecules/ml-category-tab';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export interface CategoryItem {
  id: string;
  label: string;
  icon: MaterialIconName;
  actionLabel: string;
}

interface OrCategoryCarouselProps {
  categories: CategoryItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onActionPress?: (id: string) => void;
}

export const OrCategoryCarousel = memo<OrCategoryCarouselProps>(
  ({ categories, selectedId, onSelect, onActionPress }) => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-4"
      >
        {categories.map((cat) => (
          <MlCategoryTab
            key={cat.id}
            label={cat.label}
            icon={cat.icon}
            actionLabel={cat.actionLabel}
            selected={selectedId === cat.id}
            onSelect={() => onSelect(cat.id)}
            onActionPress={
              onActionPress ? () => onActionPress(cat.id) : undefined
            }
          />
        ))}
      </ScrollView>
    );
  },
);

OrCategoryCarousel.displayName = 'OrCategoryCarousel';

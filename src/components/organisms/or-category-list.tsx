/**
 * Organism: OrCategoryList
 *
 * List of category rows with icons, labels, and amounts.
 * Used in consolidated detail views (Ingreso, Costo, Gastos breakdown).
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { MlCategoryRow } from '@/src/components/molecules/ml-category-row';
import { AtDivider } from '@/src/components/atoms/at-divider';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export interface CategoryListItem {
  id: string;
  label: string;
  amount: number;
  icon?: MaterialIconName;
  color?: string;
}

interface OrCategoryListProps {
  categories: CategoryListItem[];
  onCategoryPress?: (id: string) => void;
  onEdit?: (id: string) => void;
  showDividers?: boolean;
  className?: string;
}

export const OrCategoryList = memo<OrCategoryListProps>(
  ({ categories, onCategoryPress, onEdit, showDividers = true, className }) => {
    return (
      <View className={className}>
        {categories.map((cat, i) => (
          <React.Fragment key={cat.id}>
            <MlCategoryRow
              label={cat.label}
              amount={cat.amount}
              icon={cat.icon}
              color={cat.color}
              onPress={() => onCategoryPress?.(cat.id)}
              onEdit={onEdit ? () => onEdit(cat.id) : undefined}
            />
            {showDividers && i < categories.length - 1 && (
              <AtDivider className="mx-4" />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  },
);

OrCategoryList.displayName = 'OrCategoryList';

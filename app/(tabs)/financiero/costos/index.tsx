import React from 'react';
import { OrQBSectionDetail } from '@/src/components/organisms/or-qb-section-detail';

export default function FinancieroCostosScreen() {
  return (
    <OrQBSectionDetail
      group="COGS"
      breadcrumbLabel="Costos"
      defaultIcon="shopping-bag"
    />
  );
}

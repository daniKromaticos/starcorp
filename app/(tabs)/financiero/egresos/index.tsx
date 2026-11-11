import React from 'react';
import { OrQBSectionDetail } from '@/src/components/organisms/or-qb-section-detail';

export default function FinancieroEgresosScreen() {
  return (
    <OrQBSectionDetail
      group="Expenses"
      breadcrumbLabel="Egresos"
      defaultIcon="credit-card"
    />
  );
}

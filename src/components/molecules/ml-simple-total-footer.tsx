/**
 * Molecule: MlSimpleTotalFooter
 *
 * Footer navy con label "Total" arriba y valor grande debajo (alineados a la
 * derecha). Pensado para informes con un único agregado (ej. Asociados).
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';

interface MlSimpleTotalFooterProps {
  label?: string;
  value: number | string;
  className?: string;
}

export const MlSimpleTotalFooter = memo<MlSimpleTotalFooterProps>(
  ({ label = 'Total', value, className }) => {
    return (
      <View
        className={`rounded-lg px-4 py-3 items-end ${className ?? ''}`}
        style={{
          backgroundColor: '#0F1B4A',
          borderCurve: 'continuous',
        }}
      >
        <AtTypography variant="bodyBold" color="#FFFFFF">
          {label}
        </AtTypography>
        <AtTypography variant="metricSmall" color="#FFFFFF">
          {typeof value === 'number' ? value.toLocaleString('es-VE') : value}
        </AtTypography>
      </View>
    );
  },
);

MlSimpleTotalFooter.displayName = 'MlSimpleTotalFooter';

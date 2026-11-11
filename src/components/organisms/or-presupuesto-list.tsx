/**
 * Organism: OrPresupuestoList
 *
 * Lista de empresas del Informe Presupuesto. Cada empresa es una fila
 * desplegable (MlPresupuestoEmpresaRow) con sus centros de costos.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { MlPresupuestoEmpresaRow } from '@/src/components/molecules/ml-presupuesto-empresa-row';
import type { PresupuestoEmpresa } from '@/src/types/presupuesto.types';

interface OrPresupuestoListProps {
  empresas: PresupuestoEmpresa[];
}

export const OrPresupuestoList = memo<OrPresupuestoListProps>(({ empresas }) => {
  return (
    <View className="gap-3 px-4">
      {empresas.map((e, idx) => (
        <MlPresupuestoEmpresaRow
          key={e.id}
          empresa={e}
          openByDefault={idx === 0}
        />
      ))}
    </View>
  );
});

OrPresupuestoList.displayName = 'OrPresupuestoList';

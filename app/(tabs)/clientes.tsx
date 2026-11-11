import React from 'react';
import { router } from 'expo-router';
import { TmConsolidatedList } from '@/src/components/templates/tm-consolidated-list';
import { OrConsolidadoClientList } from '@/src/components/organisms/or-consolidado-client-list';
import { OrConsolidadoClientListHeader } from '@/src/components/organisms/or-consolidado-client-list-header';

export default function ClientesScreen() {
  return (
    <TmConsolidatedList
      breadcrumbs={['Clientes']}
      onBack={() => router.back()}
      pinnedHeader={<OrConsolidadoClientListHeader categoryId="ingresos" />}
    >
      <OrConsolidadoClientList
        categoryId="ingresos"
        onClientPress={(clientId) =>
          router.push(
            `/ingresos/${encodeURIComponent(clientId)}` as Parameters<
              typeof router.push
            >[0],
          )
        }
      />
    </TmConsolidatedList>
  );
}

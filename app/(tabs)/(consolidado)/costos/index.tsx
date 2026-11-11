import React from 'react';
import { router } from 'expo-router';
import { TmConsolidatedList } from '@/src/components/templates/tm-consolidated-list';
import { OrConsolidadoClientList } from '@/src/components/organisms/or-consolidado-client-list';
import { OrConsolidadoClientListHeader } from '@/src/components/organisms/or-consolidado-client-list-header';

export default function CostosConsolidadoScreen() {
  return (
    <TmConsolidatedList
      breadcrumbs={['Costos consolidado']}
      onBack={() => router.back()}
      pinnedHeader={<OrConsolidadoClientListHeader categoryId="costos" />}
    >
      <OrConsolidadoClientList
        categoryId="costos"
        onClientPress={(clientId) =>
          router.push(
            `/costos/${encodeURIComponent(clientId)}` as Parameters<
              typeof router.push
            >[0],
          )
        }
      />
    </TmConsolidatedList>
  );
}

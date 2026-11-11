/**
 * Organism: OrClientList
 *
 * Scrollable list of clients with search capability.
 * Used in Ingresos/Costos/Gastos consolidated views.
 */

import React, { memo, useState, useMemo } from 'react';
import { View, ScrollView } from '@/src/tw';
import { MlClientRow } from '@/src/components/molecules/ml-client-row';
import { MlSearchBar } from '@/src/components/molecules/ml-search-bar';
import { AtTypography } from '@/src/components/atoms/at-typography';

export interface ClientListItem {
  id: string;
  name: string;
  color: string;
  revenue?: number;
  deltaPercent?: number;
}

interface OrClientListProps {
  clients: ClientListItem[];
  title?: string;
  count?: number;
  showSearch?: boolean;
  onClientPress?: (id: string) => void;
  onMenuPress?: () => void;
  className?: string;
}

export const OrClientList = memo<OrClientListProps>(
  ({ clients, title, count, showSearch = false, onClientPress, onMenuPress, className }) => {
    const [searchText, setSearchText] = useState('');

    const filtered = useMemo(() => {
      if (!searchText.trim()) return clients;
      const lower = searchText.toLowerCase();
      return clients.filter((c) => c.name.toLowerCase().includes(lower));
    }, [clients, searchText]);

    return (
      <View className={`gap-3 ${className ?? ''}`}>
        {showSearch && (
          <View className="px-4 pt-2">
            <MlSearchBar onSearch={setSearchText} onMenuPress={onMenuPress} />
          </View>
        )}

        {title && (
          <View className="flex-row items-center gap-2 px-4">
            <AtTypography variant="bodyBold">
              {title}
            </AtTypography>
            {count != null && (
              <AtTypography variant="caption" color="#8892A4">
                ({count})
              </AtTypography>
            )}
          </View>
        )}

        <ScrollView className="flex-1">
          {filtered.map((client) => (
            <MlClientRow
              key={client.id}
              name={client.name}
              color={client.color}
              revenue={client.revenue}
              deltaPercent={client.deltaPercent}
              onPress={() => onClientPress?.(client.id)}
            />
          ))}
          {filtered.length === 0 && (
            <View className="items-center py-8">
              <AtTypography variant="body" color="#8892A4">
                No se encontraron resultados
              </AtTypography>
            </View>
          )}
        </ScrollView>
      </View>
    );
  },
);

OrClientList.displayName = 'OrClientList';

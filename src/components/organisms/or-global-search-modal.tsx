/**
 * Organism: OrGlobalSearchModal
 *
 * App-wide search controlled by [[global-search.store]]. Filters across two
 * sources: QB empresas (financiero) and PBI clientes (consolidado).
 *
 *   - Empresa tap → setActiveRealmId(id) + router.push('/financiero')
 *   - Cliente tap → router.push('/ingresos/[clientId]')
 *
 * The modal owns its own query string; closing it resets state via unmount.
 */

import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import {
  useGlobalSearch,
  type GlobalSearchResult,
} from '@/src/hooks/queries/use-global-search';
import { useGlobalSearchStore } from '@/src/stores/global-search.store';
import { useQBStore } from '@/src/stores/qb.store';
import { Pressable, TextInput, View } from '@/src/tw';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Modal, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OrGlobalSearchModal() {
  const isOpen = useGlobalSearchStore((s) => s.isOpen);
  const close = useGlobalSearchStore((s) => s.close);
  const setActiveRealmId = useQBStore((s) => s.setActiveRealmId);
  const insets = useSafeAreaInsets();
  const narrow = useWindowDimensions().width < 360;
  const [query, setQuery] = useState('');

  const { empresas, clientes, isLoading } = useGlobalSearch({ query });

  const handleClose = useCallback(() => {
    setQuery('');
    close();
  }, [close]);

  const handleSelect = useCallback(
    (result: GlobalSearchResult) => {
      handleClose();
      if (result.kind === 'empresa') {
        setActiveRealmId(result.id);
        router.push('/financiero');
      } else {
        router.push(
          `/ingresos/${encodeURIComponent(result.id)}` as Parameters<
            typeof router.push
          >[0],
        );
      }
    },
    [handleClose, setActiveRealmId],
  );

  const totalResults = empresas.length + clientes.length;
  const showEmpty = query.trim() !== '' && !isLoading && totalResults === 0;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
    >
      <View
        className="flex-1 bg-bg-secondary"
        style={{ paddingTop: insets.top }}
      >
        {/* Header: search input + cancel */}
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          {/* 320dp: padding menor para que el placeholder no quede tan corto */}
          <View
            className={
              narrow
                ? 'flex-1 flex-row items-center gap-3 bg-bg-card pl-4 pr-4 py-3 rounded-full'
                : 'flex-1 flex-row items-center gap-3 bg-bg-card pl-5 pr-5 py-3 rounded-full'
            }
            style={{
              borderCurve: 'continuous',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
            }}
          >
            <AtIcon name="search" size="md" color="#8892A4" />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por cliente o empresa"
              placeholderTextColor="#8892A4"
              className="flex-1 p-0 text-ink-primary text-base"
              style={{ fontFamily: 'Roboto_400Regular' }}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <AtIcon name="close" size="sm" color="#8892A4" />
              </Pressable>
            )}
          </View>
          <Pressable onPress={handleClose} hitSlop={8}>
            <AtTypography variant="bodyBold" color="#20307E">
              Cancelar
            </AtTypography>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {empresas.length > 0 && (
            <ResultSection
              title="Empresas"
              results={empresas}
              onSelect={handleSelect}
            />
          )}
          {clientes.length > 0 && (
            <ResultSection
              title="Clientes"
              results={clientes}
              onSelect={handleSelect}
            />
          )}

          {showEmpty && (
            <View className="items-center gap-2 px-6 pt-12">
              <AtIcon name="search-off" size="lg" color="#8892A4" />
              <AtTypography variant="bodyBold" color="#1A1F36">
                Sin coincidencias
              </AtTypography>
              <AtTypography variant="caption" color="#8892A4" className="text-center">
                No encontramos empresas ni clientes con ese nombre.
              </AtTypography>
            </View>
          )}

          {query.trim() === '' && !isLoading && totalResults > 0 && (
            <View className="px-6 pt-6 pb-4">
              <AtTypography variant="caption" color="#8892A4">
                Escribe para filtrar entre {empresas.length} empresa
                {empresas.length === 1 ? '' : 's'} y {clientes.length} cliente
                {clientes.length === 1 ? '' : 's'}.
              </AtTypography>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

interface ResultSectionProps {
  title: string;
  results: GlobalSearchResult[];
  onSelect: (result: GlobalSearchResult) => void;
}

function ResultSection({ title, results, onSelect }: ResultSectionProps) {
  return (
    <View className="pt-4">
      <AtTypography
        variant="overline"
        color="#8892A4"
        className="px-4 pb-2 uppercase"
      >
        {title}
      </AtTypography>
      <View className="bg-bg-card mx-4 rounded-xl overflow-hidden"
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.08)',
        }}
      >
        {results.map((r, i) => (
          <View key={`${r.kind}-${r.id}`}>
            <Pressable
              onPress={() => onSelect(r)}
              className="flex-row items-center gap-3 px-4 py-3"
            >
              <AtIcon
                name={r.kind === 'empresa' ? 'business' : 'person'}
                size="md"
                color="#20307E"
              />
              <View className="flex-1">
                <AtTypography variant="body" color="#1A1F36" numberOfLines={1}>
                  {r.kind === 'empresa' ? `${r.name} (empresa)` : r.name}
                </AtTypography>
              </View>
              <AtIcon name="arrow-forward" size="sm" color="#8892A4" />
            </Pressable>
            {i < results.length - 1 && (
              <View
                style={{
                  height: 1,
                  marginHorizontal: 16,
                  backgroundColor: 'rgba(0, 0, 0, 0.06)',
                }}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

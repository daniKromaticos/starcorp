/**
 * Organism: OrAsociadosFiltersSheet
 *
 * Bottom sheet de filtros del Informe Asociados activos.
 *   • Radio buttons "Por área" (Todos + áreas reales de empleadosHotel, dinámicas)
 *   • Dropdown multi-select "Clientes" con buscador + chips removibles
 *   • Botón "Aplicar filtros"
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-native';
import { Pressable, ScrollView, TextInput, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtRadio } from '@/src/components/atoms/at-radio';
import { MlFilterChip } from '@/src/components/molecules/ml-filter-chip';

const ENTER = 240;
const EXIT = 220;

/** 'todos' o un nombre de área concreto. */
export type AreaFilter = string;

export interface AsociadosFilters {
  area: AreaFilter;
  clientIds: string[];
}

interface ClientOption {
  id: string;
  name: string;
}

interface OrAsociadosFiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  clients: ClientOption[];
  /** Áreas disponibles para filtrar (dinámicas, de los datos). */
  areas: string[];
  initialFilters: AsociadosFilters;
  onApply: (filters: AsociadosFilters) => void;
  showClientFilter?: boolean;
}

export const OrAsociadosFiltersSheet = memo<OrAsociadosFiltersSheetProps>(
  ({
    visible,
    onClose,
    clients,
    areas,
    initialFilters,
    onApply,
    showClientFilter = true,
  }) => {
    const insets = useSafeAreaInsets();
    const [mounted, setMounted] = useState(visible);
    const [area, setArea] = useState<AreaFilter>(initialFilters.area);
    const [selectedIds, setSelectedIds] = useState<string[]>(initialFilters.clientIds);
    const [search, setSearch] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const areaOptions = useMemo<{ value: AreaFilter; label: string }[]>(
      () => [
        { value: 'todos', label: 'Todos' },
        ...areas.map((a) => ({ value: a, label: a })),
      ],
      [areas],
    );

    useEffect(() => {
      if (visible) {
        setMounted(true);
        setArea(initialFilters.area);
        setSelectedIds(initialFilters.clientIds);
        setSearch('');
        setDropdownOpen(false);
        return;
      }
      const timer = setTimeout(() => setMounted(false), EXIT + 50);
      return () => clearTimeout(timer);
    }, [visible, initialFilters]);

    const filteredClients = useMemo(() => {
      const q = search.trim().toLowerCase();
      if (!q) return clients;
      return clients.filter((c) => c.name.toLowerCase().includes(q));
    }, [clients, search]);

    const selected = useMemo(
      () => clients.filter((c) => selectedIds.includes(c.id)),
      [clients, selectedIds],
    );

    const appliedCount = useMemo(() => {
      let n = 0;
      if (area !== 'todos') n += 1;
      n += selectedIds.length;
      return n;
    }, [area, selectedIds]);

    const toggleClient = useCallback((id: string) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    }, []);

    const handleClear = useCallback(() => {
      setArea('todos');
      setSelectedIds([]);
      setSearch('');
    }, []);

    const handleApply = useCallback(() => {
      onApply({ area, clientIds: selectedIds });
      onClose();
    }, [area, onApply, onClose, selectedIds]);

    if (!mounted) return null;

    return (
      <Modal
        visible={mounted}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, pointerEvents: visible ? 'auto' : 'none' }}>
          {visible && (
            <Animated.View
              key="sheet-overlay"
              entering={FadeIn.duration(ENTER)}
              exiting={FadeOut.duration(EXIT)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
              }}
            >
              <Pressable onPress={onClose} style={{ flex: 1 }} />
            </Animated.View>
          )}

          {visible && (
            <Animated.View
              key="sheet-panel"
              entering={SlideInDown.duration(ENTER)}
              exiting={SlideOutDown.duration(EXIT)}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingBottom: insets.bottom + 12,
                maxHeight: '85%',
              }}
            >
              <View className="flex-row justify-between items-center px-6 pt-6 pb-3">
                <AtTypography variant="h3">Filtros</AtTypography>
                <Pressable onPress={onClose} hitSlop={8}>
                  <AtIcon name="close" size="lg" color="#1A1F36" />
                </Pressable>
              </View>

              <View className="flex-row justify-between items-center px-6 pb-3">
                <AtTypography variant="caption" color="#4A5568">
                  Filtros aplicados: {appliedCount}
                </AtTypography>
                <Pressable onPress={handleClear} hitSlop={6}>
                  <AtTypography variant="captionBold" color="#1A3FE8">
                    Borrar filtros
                  </AtTypography>
                </Pressable>
              </View>

              <ScrollView
                className="flex-1"
                contentContainerClassName="gap-4 px-6 pb-4"
                keyboardShouldPersistTaps="handled"
              >
                <View className="gap-3">
                  <AtTypography variant="bodyBold">Por área</AtTypography>
                  <View className="gap-3">
                    {areaOptions.map((opt) => (
                      <AtRadio
                        key={opt.value}
                        selected={area === opt.value}
                        label={opt.label}
                        onPress={() => setArea(opt.value)}
                      />
                    ))}
                  </View>
                </View>

                {showClientFilter && (
                  <>
                    <View
                      className="h-px"
                      style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
                    />

                    <View className="gap-3">
                      <AtTypography variant="bodyBold">Clientes</AtTypography>

                      <View
                        className="flex-row items-center gap-2 rounded-full bg-bg-secondary px-4 py-3"
                        style={{ borderCurve: 'continuous' }}
                      >
                        <AtIcon name="search" size="md" color="#8892A4" />
                        <TextInput
                          value={search}
                          onChangeText={setSearch}
                          placeholder="Buscar por cliente"
                          placeholderTextColor="#8892A4"
                          className="flex-1 p-0 text-ink-primary text-base"
                          style={{ fontFamily: 'Roboto_400Regular' }}
                        />
                      </View>

                      {selected.length > 0 && (
                        <View className="flex-row flex-wrap gap-2">
                          {selected.map((c) => (
                            <MlFilterChip
                              key={c.id}
                              label={c.name}
                              onRemove={() => toggleClient(c.id)}
                            />
                          ))}
                        </View>
                      )}

                      <Pressable
                        onPress={() => setDropdownOpen((o) => !o)}
                        className="flex-row items-center justify-between rounded-full bg-bg-card px-4 py-3"
                        style={{
                          borderCurve: 'continuous',
                          borderWidth: 1,
                          borderColor: 'rgba(0,0,0,0.08)',
                        }}
                      >
                        <AtTypography variant="body" color="#8892A4">
                          Seleccione
                        </AtTypography>
                        <AtIcon
                          name={dropdownOpen ? 'expand-less' : 'expand-more'}
                          size="md"
                          color="#1A1F36"
                        />
                      </Pressable>

                      {dropdownOpen && (
                        <View
                          className="rounded-lg bg-bg-card"
                          style={{
                            borderCurve: 'continuous',
                            borderWidth: 1,
                            borderColor: 'rgba(0,0,0,0.08)',
                            maxHeight: 220,
                          }}
                        >
                          <ScrollView
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                          >
                            {filteredClients.length === 0 && (
                              <View className="px-4 py-3">
                                <AtTypography variant="caption" color="#8892A4">
                                  Sin resultados
                                </AtTypography>
                              </View>
                            )}
                            {filteredClients.map((c, i) => {
                              const isSel = selectedIds.includes(c.id);
                              return (
                                <Pressable
                                  key={c.id}
                                  onPress={() => toggleClient(c.id)}
                                  className="flex-row items-center justify-between px-4 py-3"
                                  style={{
                                    borderTopWidth: i === 0 ? 0 : 1,
                                    borderTopColor: 'rgba(0,0,0,0.06)',
                                  }}
                                >
                                  <AtTypography variant="body">{c.name}</AtTypography>
                                  {isSel && (
                                    <AtIcon name="check" size="md" color="#1A3FE8" />
                                  )}
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>

              <View className="px-6 pt-3">
                <Pressable
                  onPress={handleApply}
                  className="rounded-lg items-center justify-center py-4"
                  style={{
                    backgroundColor: '#0F1B4A',
                    borderCurve: 'continuous',
                  }}
                >
                  <AtTypography variant="bodyBold" color="#FFFFFF">
                    Aplicar filtros
                  </AtTypography>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    );
  },
);

OrAsociadosFiltersSheet.displayName = 'OrAsociadosFiltersSheet';

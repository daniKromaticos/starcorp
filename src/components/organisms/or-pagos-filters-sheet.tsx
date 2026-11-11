/**
 * Organism: OrPagosFiltersSheet
 *
 * Bottom sheet de filtros del Informe Pagos. Secciones:
 *   • Rango de fechas (inicio / fin, formato yyyy-mm-dd)
 *   • Empresa generadora (multi-select)
 *   • Centro de costos (multi-select)
 *   • Empleado / hotel (multi-select)
 *
 * Cada multi-select abre un dropdown buscable y muestra los items
 * elegidos como chips removibles.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, useWindowDimensions } from 'react-native';
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
import { MlFilterChip } from '@/src/components/molecules/ml-filter-chip';
import type { PagosFilters } from '@/src/types/pagos.types';

const ENTER = 240;
const EXIT = 220;

interface Option {
  id: string;
  name: string;
}

interface OrPagosFiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  initialFilters: PagosFilters;
  empresas: Option[];
  centrosCostos: Option[];
  empleados: Option[];
  onApply: (filters: PagosFilters) => void;
}

export const OrPagosFiltersSheet = memo<OrPagosFiltersSheetProps>(
  ({
    visible,
    onClose,
    initialFilters,
    empresas,
    centrosCostos,
    empleados,
    onApply,
  }) => {
    const insets = useSafeAreaInsets();
    const [mounted, setMounted] = useState(visible);

    const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom ?? '');
    const [dateTo, setDateTo] = useState(initialFilters.dateTo ?? '');
    const [empresaIds, setEmpresaIds] = useState<string[]>(initialFilters.empresaIds);
    const [centroIds, setCentroIds] = useState<string[]>(initialFilters.centroCostosIds);
    const [empleadoIds, setEmpleadoIds] = useState<string[]>(initialFilters.empleadoIds);

    const [openSection, setOpenSection] = useState<'empresa' | 'centro' | 'empleado' | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
      if (visible) {
        setMounted(true);
        setDateFrom(initialFilters.dateFrom ?? '');
        setDateTo(initialFilters.dateTo ?? '');
        setEmpresaIds(initialFilters.empresaIds);
        setCentroIds(initialFilters.centroCostosIds);
        setEmpleadoIds(initialFilters.empleadoIds);
        setOpenSection(null);
        setSearch('');
        return;
      }
      const timer = setTimeout(() => setMounted(false), EXIT + 50);
      return () => clearTimeout(timer);
    }, [visible, initialFilters]);

    const appliedCount = useMemo(() => {
      let n = 0;
      if (dateFrom) n += 1;
      if (dateTo) n += 1;
      n += empresaIds.length + centroIds.length + empleadoIds.length;
      return n;
    }, [dateFrom, dateTo, empresaIds, centroIds, empleadoIds]);

    const handleClear = useCallback(() => {
      setDateFrom('');
      setDateTo('');
      setEmpresaIds([]);
      setCentroIds([]);
      setEmpleadoIds([]);
    }, []);

    const handleApply = useCallback(() => {
      onApply({
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        empresaIds,
        centroCostosIds: centroIds,
        empleadoIds,
      });
      onClose();
    }, [centroIds, dateFrom, dateTo, empleadoIds, empresaIds, onApply, onClose]);

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
              key="overlay"
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
              key="panel"
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
                maxHeight: '90%',
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
                contentContainerClassName="gap-5 px-6 pb-4"
                keyboardShouldPersistTaps="handled"
              >
                <View className="gap-3">
                  <AtTypography variant="bodyBold">Rango de fechas</AtTypography>
                  <View className="flex-row gap-3">
                    <DateInput
                      label="Desde"
                      value={dateFrom}
                      onChange={setDateFrom}
                    />
                    <DateInput
                      label="Hasta"
                      value={dateTo}
                      onChange={setDateTo}
                    />
                  </View>
                </View>

                <MultiSelectSection
                  title="Empresa generadora"
                  options={empresas}
                  selectedIds={empresaIds}
                  toggle={(id) =>
                    setEmpresaIds((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                    )
                  }
                  open={openSection === 'empresa'}
                  onToggleOpen={() =>
                    setOpenSection((s) => (s === 'empresa' ? null : 'empresa'))
                  }
                  search={openSection === 'empresa' ? search : ''}
                  onSearchChange={setSearch}
                />

                <MultiSelectSection
                  title="Centro de costos"
                  options={centrosCostos}
                  selectedIds={centroIds}
                  toggle={(id) =>
                    setCentroIds((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                    )
                  }
                  open={openSection === 'centro'}
                  onToggleOpen={() =>
                    setOpenSection((s) => (s === 'centro' ? null : 'centro'))
                  }
                  search={openSection === 'centro' ? search : ''}
                  onSearchChange={setSearch}
                />

                <MultiSelectSection
                  title="Empleado / hotel"
                  options={empleados}
                  selectedIds={empleadoIds}
                  toggle={(id) =>
                    setEmpleadoIds((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                    )
                  }
                  open={openSection === 'empleado'}
                  onToggleOpen={() =>
                    setOpenSection((s) => (s === 'empleado' ? null : 'empleado'))
                  }
                  search={openSection === 'empleado' ? search : ''}
                  onSearchChange={setSearch}
                />
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

OrPagosFiltersSheet.displayName = 'OrPagosFiltersSheet';

interface DateInputProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
}

function DateInput({ label, value, onChange }: DateInputProps) {
  // 320dp: con px-4 + icono al input le quedaban ~66px y "yyyy-mm-dd" no
  // cabía; en angosto se oculta el icono y se reduce el padding.
  const isNarrow = useWindowDimensions().width < 360;
  return (
    <View className="flex-1 gap-1">
      <AtTypography variant="caption" color="#4A5568">
        {label}
      </AtTypography>
      <View
        className={`flex-row items-center gap-2 rounded-full bg-bg-secondary py-3 ${isNarrow ? 'px-3' : 'px-4'}`}
        style={{ borderCurve: 'continuous' }}
      >
        {!isNarrow && <AtIcon name="event" size="md" color="#8892A4" />}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="yyyy-mm-dd"
          placeholderTextColor="#8892A4"
          autoCapitalize="none"
          className="flex-1 p-0 text-ink-primary text-base"
          style={{ fontFamily: 'Roboto_400Regular' }}
        />
      </View>
    </View>
  );
}

interface MultiSelectSectionProps {
  title: string;
  options: Option[];
  selectedIds: string[];
  toggle: (id: string) => void;
  open: boolean;
  onToggleOpen: () => void;
  search: string;
  onSearchChange: (next: string) => void;
}

function MultiSelectSection({
  title,
  options,
  selectedIds,
  toggle,
  open,
  onToggleOpen,
  search,
  onSearchChange,
}: MultiSelectSectionProps) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const selected = useMemo(
    () => options.filter((o) => selectedIds.includes(o.id)),
    [options, selectedIds],
  );

  return (
    <View className="gap-3">
      <AtTypography variant="bodyBold">{title}</AtTypography>

      {open && (
        <View
          className="flex-row items-center gap-2 rounded-full bg-bg-secondary px-4 py-3"
          style={{ borderCurve: 'continuous' }}
        >
          <AtIcon name="search" size="md" color="#8892A4" />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Buscar"
            placeholderTextColor="#8892A4"
            className="flex-1 p-0 text-ink-primary text-base"
            style={{ fontFamily: 'Roboto_400Regular' }}
          />
        </View>
      )}

      {selected.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {selected.map((o) => (
            <MlFilterChip key={o.id} label={o.name} onRemove={() => toggle(o.id)} />
          ))}
        </View>
      )}

      <Pressable
        onPress={onToggleOpen}
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
        <AtIcon name={open ? 'expand-less' : 'expand-more'} size="md" color="#1A1F36" />
      </Pressable>

      {open && (
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
            {filtered.length === 0 && (
              <View className="px-4 py-3">
                <AtTypography variant="caption" color="#8892A4">
                  Sin resultados
                </AtTypography>
              </View>
            )}
            {filtered.map((o, i) => {
              const isSel = selectedIds.includes(o.id);
              return (
                <Pressable
                  key={o.id}
                  onPress={() => toggle(o.id)}
                  className="flex-row items-center justify-between px-4 py-3"
                  style={{
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: 'rgba(0,0,0,0.06)',
                  }}
                >
                  <AtTypography variant="body">{o.name}</AtTypography>
                  {isSel && <AtIcon name="check" size="md" color="#1A3FE8" />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

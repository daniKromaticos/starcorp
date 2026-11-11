/**
 * Organism: OrEmpresaFiltersSheet
 *
 * Bottom sheet de filtros del detalle de "Otras compañías". Selección
 * única por año y por mes (radios). Solo UI: el padre usa el resultado
 * para el chip de periodo y el conteo de aplicados.
 */

import React, { memo, useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { gradients } from '@/src/theme/gradients';
import type { EmpresaFilters } from '@/src/types/empresas.types';

const ENTER = 240;
const EXIT = 220;

export const DEFAULT_EMPRESA_FILTERS: EmpresaFilters = {
  year: 'corriente',
  month: 'ultimo',
};

const YEAR_OPTIONS: { id: string; label: string }[] = [
  { id: 'corriente', label: 'Año corriente' },
  { id: '2022', label: '2022' },
  { id: '2023', label: '2023' },
  { id: '2024', label: '2024' },
  { id: '2025', label: '2025' },
];

const MONTH_OPTIONS: { id: string; label: string }[] = [
  { id: 'ultimo', label: 'Último mes' },
  { id: '1', label: 'Enero' },
  { id: '2', label: 'Febrero' },
  { id: '3', label: 'Marzo' },
  { id: '4', label: 'Abril' },
  { id: '5', label: 'Mayo' },
  { id: '6', label: 'Junio' },
  { id: '7', label: 'Julio' },
  { id: '8', label: 'Agosto' },
  { id: '9', label: 'Septiembre' },
  { id: '10', label: 'Octubre' },
  { id: '11', label: 'Noviembre' },
  { id: '12', label: 'Diciembre' },
];

interface OrEmpresaFiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  initialFilters: EmpresaFilters;
  onApply: (filters: EmpresaFilters) => void;
}

export const OrEmpresaFiltersSheet = memo<OrEmpresaFiltersSheetProps>(
  ({ visible, onClose, initialFilters, onApply }) => {
    const insets = useSafeAreaInsets();
    const [mounted, setMounted] = useState(visible);
    const [year, setYear] = useState(initialFilters.year);
    const [month, setMonth] = useState(initialFilters.month);

    useEffect(() => {
      if (visible) {
        setMounted(true);
        setYear(initialFilters.year);
        setMonth(initialFilters.month);
        return;
      }
      const timer = setTimeout(() => setMounted(false), EXIT + 50);
      return () => clearTimeout(timer);
    }, [visible, initialFilters]);

    // Año + mes siempre tienen una selección → 2 filtros aplicados.
    const appliedCount = (year ? 1 : 0) + (month ? 1 : 0);

    const handleClear = () => {
      setYear(DEFAULT_EMPRESA_FILTERS.year);
      setMonth(DEFAULT_EMPRESA_FILTERS.month);
    };

    const handleApply = () => {
      onApply({ year, month });
      onClose();
    };

    if (!mounted) return null;

    const grad = gradients.buttonBlue;

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
                <RadioSection
                  title="Por año"
                  options={YEAR_OPTIONS}
                  value={year}
                  onChange={setYear}
                />
                <RadioSection
                  title="Por mes"
                  options={MONTH_OPTIONS}
                  value={month}
                  onChange={setMonth}
                />
              </ScrollView>

              <View className="px-6 pt-3">
                <Pressable
                  onPress={handleApply}
                  className="rounded-lg overflow-hidden"
                  style={{ borderCurve: 'continuous' }}
                >
                  <LinearGradient
                    colors={grad.colors}
                    start={grad.start}
                    end={grad.end}
                    style={{
                      paddingVertical: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AtTypography variant="bodyBold" color="#FFFFFF">
                      Aplicar filtros
                    </AtTypography>
                  </LinearGradient>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    );
  },
);

OrEmpresaFiltersSheet.displayName = 'OrEmpresaFiltersSheet';

interface RadioSectionProps {
  title: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}

function RadioSection({ title, options, value, onChange }: RadioSectionProps) {
  return (
    <View className="gap-3">
      <AtTypography variant="bodyBold">{title}</AtTypography>
      <View className="flex-row flex-wrap">
        {options.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === opt.id }}
            className="flex-row items-center gap-2 py-2"
            style={{ width: '50%' }}
          >
            <RadioDot selected={value === opt.id} />
            <AtTypography variant="body" color="#1A1F36" numberOfLines={1}>
              {opt.label}
            </AtTypography>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#E8952E',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected && (
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#E8952E',
          }}
        />
      )}
    </View>
  );
}

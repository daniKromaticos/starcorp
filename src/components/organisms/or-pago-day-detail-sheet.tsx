/**
 * Organism: OrPagoDayDetailSheet
 *
 * Bottom sheet azul "Detalle del día" del Informe Pagos. Se abre al tocar
 * una celda del calendario y muestra, en una card blanca: la fecha completa,
 * el monto total del día y la etiqueta de nivel (bajo/medio/alto) con su dot
 * de color según el bucket.
 */

import React, { memo, useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { Pressable, View } from '@/src/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { formatCurrency } from '@/src/utils/currency';
import {
  formatFullDate,
  MONTO_BUCKET_COLOR,
  MONTO_BUCKET_LABEL,
  type MontoBucket,
} from '@/src/types/pagos.types';

const ENTER = 240;
const EXIT = 220;

interface OrPagoDayDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Día en ISO yyyy-mm-dd, o null. */
  iso: string | null;
  total: number;
  bucket: MontoBucket;
}

function formatMonto(value: number): string {
  const base = formatCurrency(value);
  const decimals = value.toFixed(2).split('.')[1];
  return `${base},${decimals}`;
}

export const OrPagoDayDetailSheet = memo<OrPagoDayDetailSheetProps>(
  ({ visible, onClose, iso, total, bucket }) => {
    const insets = useSafeAreaInsets();
    const [mounted, setMounted] = useState(visible);

    useEffect(() => {
      if (visible) {
        setMounted(true);
        return;
      }
      const timer = setTimeout(() => setMounted(false), EXIT + 50);
      return () => clearTimeout(timer);
    }, [visible]);

    if (!mounted || !iso) return null;

    const tone = MONTO_BUCKET_COLOR[bucket];

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
              key="day-sheet-overlay"
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
              key="day-sheet-panel"
              entering={SlideInDown.duration(ENTER)}
              exiting={SlideOutDown.duration(EXIT)}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#4C84F0',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 10,
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 20,
                gap: 16,
              }}
            >
              {/* Drag handle */}
              <View
                style={{
                  alignSelf: 'center',
                  width: 44,
                  height: 5,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.7)',
                }}
              />

              <View className="flex-row items-center justify-between">
                <AtTypography variant="h3" color="#FFFFFF">
                  Detalle del día
                </AtTypography>
                <Pressable onPress={onClose} hitSlop={8}>
                  <AtIcon name="close" size="lg" color="#FFFFFF" />
                </Pressable>
              </View>

              <View
                className="bg-white rounded-lg p-5 gap-2"
                style={{ borderCurve: 'continuous' }}
              >
                <AtTypography variant="bodyBold" color="#4A5568">
                  {formatFullDate(iso)}
                </AtTypography>
                <AtTypography
                  variant="h1"
                  color="#1A1F36"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {formatMonto(total)}
                </AtTypography>
                <View className="flex-row items-center gap-2">
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: tone.dot,
                    }}
                  />
                  <AtTypography variant="body" color="#4A5568">
                    {MONTO_BUCKET_LABEL[bucket]}
                  </AtTypography>
                </View>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    );
  },
);

OrPagoDayDetailSheet.displayName = 'OrPagoDayDetailSheet';

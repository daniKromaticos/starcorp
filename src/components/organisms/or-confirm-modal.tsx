/**
 * Organism: OrConfirmModal
 *
 * Modal centrado de confirmación destructiva (eliminar apartado /
 * archivo): título + X, mensaje, "Cancelar" (link azul) y botón navy
 * de confirmación.
 */

import React, { memo } from 'react';
import { ActivityIndicator, Modal } from 'react-native';
import { Pressable, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';

const NAVY = '#0F1B4A';
const BLUE = '#1A3FE8';

interface OrConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  question?: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const OrConfirmModal = memo<OrConfirmModalProps>(
  ({
    visible,
    title,
    message,
    question = '¿Está seguro de querer eliminarlo?',
    confirmLabel = 'Eliminar',
    loading,
    onCancel,
    onConfirm,
  }) => {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onCancel}
      >
        <Pressable
          onPress={loading ? undefined : onCancel}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 20,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <AtTypography variant="h3" color="#1A1F36" style={{ flexShrink: 1 }}>
                {title}
              </AtTypography>
              <Pressable onPress={onCancel} hitSlop={8} disabled={loading}>
                <AtIcon name="close" size="lg" color="#1A1F36" />
              </Pressable>
            </View>

            <AtTypography variant="body" color="#4A5568">
              {message}
            </AtTypography>
            <AtTypography variant="body" color="#4A5568" className="mt-3">
              {question}
            </AtTypography>

            {/* 320dp: si "Cancelar" + botón largo no caben, el botón baja */}
            <View className="flex-row flex-wrap items-center justify-end gap-x-5 gap-y-3 mt-5">
              <Pressable onPress={onCancel} hitSlop={8} disabled={loading}>
                <AtTypography variant="bodyBold" color={BLUE}>
                  Cancelar
                </AtTypography>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={loading}
                accessibilityRole="button"
                className="rounded-lg px-5"
                style={{
                  backgroundColor: NAVY,
                  borderCurve: 'continuous',
                  paddingVertical: 10,
                  opacity: loading ? 0.6 : 1,
                  minWidth: 96,
                  alignItems: 'center',
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AtTypography variant="bodyBold" color="#FFFFFF">
                    {confirmLabel}
                  </AtTypography>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

OrConfirmModal.displayName = 'OrConfirmModal';

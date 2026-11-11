/**
 * Molecule: MlSelectField
 *
 * Selector de una opción con el look de los inputs del Repositorio:
 * label + campo con chevron que abre un modal con la lista de opciones.
 */

import React, { memo, useState } from 'react';
import { Modal } from 'react-native';
import { Pressable, ScrollView, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';

export interface SelectOption {
  id: string;
  label: string;
}

interface MlSelectFieldProps {
  label: string;
  placeholder?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (id: string) => void;
  required?: boolean;
}

export const MlSelectField = memo<MlSelectFieldProps>(
  ({ label, placeholder = 'Selecciona', options, value, onChange, required }) => {
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => o.id === value);

    return (
      <View className="gap-2">
        <AtTypography variant="captionBold" color="#1A1F36">
          {label}
          {required ? <AtTypography variant="captionBold" color="#E53E3E"> *</AtTypography> : null}
        </AtTypography>

        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={label}
          className="bg-bg-card flex-row items-center justify-between"
          style={{
            borderRadius: 10,
            borderCurve: 'continuous',
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.12)',
          }}
        >
          <AtTypography
            variant="body"
            color={selected ? '#1A1F36' : '#8892A4'}
            numberOfLines={1}
            className="flex-1 mr-2"
            style={{ fontSize: 14 }}
          >
            {selected?.label ?? placeholder}
          </AtTypography>
          <AtIcon name="expand-more" size="md" color="#4A5568" />
        </Pressable>

        <Modal
          visible={open}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            onPress={() => setOpen(false)}
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
                maxHeight: '60%',
                overflow: 'hidden',
              }}
            >
              <View className="px-5 pt-5 pb-2">
                <AtTypography variant="h3">{label}</AtTypography>
              </View>
              <ScrollView contentContainerClassName="pb-3">
                {options.length === 0 ? (
                  <View className="px-5 py-4">
                    <AtTypography variant="body" color="#4A5568">
                      No hay opciones disponibles.
                    </AtTypography>
                  </View>
                ) : (
                  options.map((opt) => (
                    <Pressable
                      key={opt.id}
                      onPress={() => {
                        onChange(opt.id);
                        setOpen(false);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: opt.id === value }}
                      className="flex-row items-center justify-between px-5 py-3"
                    >
                      <AtTypography
                        variant={opt.id === value ? 'bodyBold' : 'body'}
                        color="#1A1F36"
                        numberOfLines={1}
                        className="flex-1 mr-2"
                      >
                        {opt.label}
                      </AtTypography>
                      {opt.id === value && (
                        <AtIcon name="check" size="md" color="#1A3FE8" />
                      )}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  },
);

MlSelectField.displayName = 'MlSelectField';

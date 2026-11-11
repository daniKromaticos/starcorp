/**
 * Molecule: MlPeriodSelect
 *
 * Tappable badge that opens a popover with period options. Used in the
 * consolidated list header — replaces the static "{period} ▾" pill so the
 * user can change the active period without a separate top filter bar.
 */

import React, { memo, useState } from 'react';
import { Modal } from 'react-native';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';

export interface PeriodSelectOption {
  key: string;
  label: string;
}

interface MlPeriodSelectProps {
  options: PeriodSelectOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export const MlPeriodSelect = memo<MlPeriodSelectProps>(
  ({ options, selectedKey, onSelect }) => {
    const [open, setOpen] = useState(false);
    const selectedLabel =
      options.find((o) => o.key === selectedKey)?.label ?? '';

    return (
      <>
        <Pressable
          onPress={() => setOpen(true)}
          className="flex-row items-center gap-1 bg-bg-card px-3 py-1.5 rounded-full"
          style={{ borderCurve: 'continuous' }}
        >
          <AtTypography variant="captionBold">
            {selectedLabel} {'▾'}
          </AtTypography>
        </Pressable>

        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            onPress={() => setOpen(false)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.35)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              className="bg-bg-card rounded-2xl py-1 overflow-hidden"
              style={{
                minWidth: 200,
                borderCurve: 'continuous',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              }}
            >
              {options.map((opt) => {
                const selected = opt.key === selectedKey;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      onSelect(opt.key);
                      setOpen(false);
                    }}
                    className={`px-4 py-3 ${selected ? 'bg-bg-secondary' : ''}`}
                  >
                    <AtTypography
                      variant={selected ? 'captionBold' : 'caption'}
                      color={selected ? '#E8952E' : '#1A1F36'}
                    >
                      {opt.label}
                    </AtTypography>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      </>
    );
  },
);

MlPeriodSelect.displayName = 'MlPeriodSelect';

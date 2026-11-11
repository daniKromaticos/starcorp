/**
 * Molecule: MlPeriodDropdown
 *
 * Period selector trigger shown as a pill with label + chevron.
 * Tapping opens a modal with the 5 period options.
 * Writes to useFiltersStore so drill-down screens share the selection.
 */

import React, { memo, useCallback, useState } from 'react';
import { Modal } from 'react-native';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { useFiltersStore } from '@/src/stores/filters.store';
import { PERIOD_LABELS } from '@/src/utils/date';
import type { PeriodKey } from '@/src/types/domain.types';

const PERIODS: PeriodKey[] = ['today', '1w', '1m', '3m', '12m'];

interface MlPeriodDropdownProps {
  className?: string;
}

export const MlPeriodDropdown = memo<MlPeriodDropdownProps>(({ className }) => {
  const activePeriodKey = useFiltersStore((s) => s.activePeriodKey);
  const setActivePeriod = useFiltersStore((s) => s.setActivePeriod);
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (key: PeriodKey) => {
      setActivePeriod(key);
      setOpen(false);
    },
    [setActivePeriod],
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center gap-1 bg-bg-card rounded-full px-4 py-2 ${className ?? ''}`}
        style={{
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.08)',
        }}
      >
        <AtTypography variant="captionBold" color="#1A1F36">
          {PERIOD_LABELS[activePeriodKey]}
        </AtTypography>
        <AtIcon name="keyboard-arrow-down" size="sm" color="#4A5568" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
          onPress={() => setOpen(false)}
        >
          <View
            className="bg-bg-card rounded-lg py-2 w-56 overflow-hidden"
            style={{
              borderCurve: 'continuous',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
            }}
          >
            {PERIODS.map((key) => {
              const isSelected = key === activePeriodKey;
              return (
                <Pressable
                  key={key}
                  onPress={() => handleSelect(key)}
                  className="flex-row items-center justify-between px-4 py-3"
                >
                  <AtTypography
                    variant={isSelected ? 'bodyBold' : 'body'}
                    color={isSelected ? '#E8952E' : '#1A1F36'}
                  >
                    {PERIOD_LABELS[key]}
                  </AtTypography>
                  {isSelected && (
                    <AtIcon name="check" size="sm" color="#E8952E" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
});

MlPeriodDropdown.displayName = 'MlPeriodDropdown';

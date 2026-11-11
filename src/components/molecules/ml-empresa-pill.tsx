/**
 * Molecule: MlEmpresaPill
 *
 * Pill del carousel de empresas del Informe Seguros. Cuadrado navy con
 * icono "company" centrado y nombre debajo. Estado `dim` aplica
 * opacidad reducida cuando la pill está inactiva (Histórico).
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { AtIcon } from '@/src/components/atoms/at-icon';

interface MlEmpresaPillProps {
  name: string;
  active?: boolean;
  dim?: boolean;
  onPress: () => void;
}

export const MlEmpresaPill = memo<MlEmpresaPillProps>(
  ({ name, active = false, dim = false, onPress }) => {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="items-center gap-2"
        style={{ width: 84, opacity: dim ? 0.5 : 1 }}
      >
        <View
          className="items-center justify-center rounded-lg"
          style={{
            width: 64,
            height: 64,
            backgroundColor: '#0F1B4A',
            borderCurve: 'continuous',
            borderWidth: active ? 2 : 0,
            borderColor: '#1A3FE8',
          }}
        >
          <View
            className="items-center justify-center"
            style={{
              width: 38,
              height: 38,
              backgroundColor: '#FFFFFF',
              borderRadius: 4,
              borderCurve: 'continuous',
            }}
          >
            <AtIcon name="account-balance" size={20} color="#0F1B4A" />
          </View>
        </View>
        <AtTypography
          variant="captionBold"
          color="#1A1F36"
          numberOfLines={2}
          style={{ textAlign: 'center' }}
        >
          {name}
        </AtTypography>
      </Pressable>
    );
  },
);

MlEmpresaPill.displayName = 'MlEmpresaPill';

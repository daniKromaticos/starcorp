/**
 * Molecule: MlPasswordStrength
 *
 * Barra de fortaleza (4 segmentos) + checklist de requisitos para la
 * pantalla de reestablecer contraseña. Los requisitos son los mismos
 * que valida el flujo: 8+ caracteres, 1 mayúscula, 1 número.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';

export const PASSWORD_REQUIREMENTS = [
  { label: 'Debe contener al menos 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Debe contener al menos 1 mayúscula', test: (p: string) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { label: 'Debe contener al menos 1 caracter numérico', test: (p: string) => /\d/.test(p) },
] as const;

export function isPasswordValid(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((r) => r.test(password));
}

const SEGMENT_COLORS = ['#E53E3E', '#DD6B20', '#ECC94B', '#38A169'];

interface MlPasswordStrengthProps {
  password: string;
}

export const MlPasswordStrength = memo<MlPasswordStrengthProps>(({ password }) => {
  const met = PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length;
  // 4to segmento: contraseña larga además de cumplir todo
  const score = password.length === 0 ? 0 : met + (met === 3 && password.length >= 12 ? 1 : 0);
  const activeColor = SEGMENT_COLORS[Math.max(0, score - 1)];

  return (
    <View className="gap-2">
      <View className="flex-row" style={{ gap: 6 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <View
            key={i}
            className="flex-1"
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: i < score ? activeColor : 'rgba(0, 0, 0, 0.10)',
            }}
          />
        ))}
      </View>
      <View>
        {PASSWORD_REQUIREMENTS.map((req) => (
          <AtTypography
            key={req.label}
            variant="caption"
            color={password.length > 0 && req.test(password) ? '#38A169' : '#4A5568'}
          >
            {req.label}
          </AtTypography>
        ))}
      </View>
    </View>
  );
});

MlPasswordStrength.displayName = 'MlPasswordStrength';

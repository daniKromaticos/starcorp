/**
 * Molecule: MlRoleChip
 *
 * Chip de privilegio del usuario: "Super admin" (azul) para el dueño
 * de la cuenta, "Usuario" (naranja) para los invitados por él.
 */

import React, { memo } from 'react';
import { View } from '@/src/tw';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { ROLE_LABELS, type UserRole } from '@/src/types/auth.types';

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: '#3B82F6',
  usuario: '#E8952E',
};

interface MlRoleChipProps {
  role: UserRole;
}

export const MlRoleChip = memo<MlRoleChipProps>(({ role }) => {
  return (
    <View
      className="self-start"
      style={{
        backgroundColor: ROLE_COLORS[role],
        borderRadius: 9999,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <AtTypography variant="captionBold" color="#FFFFFF">
        {ROLE_LABELS[role]}
      </AtTypography>
    </View>
  );
});

MlRoleChip.displayName = 'MlRoleChip';

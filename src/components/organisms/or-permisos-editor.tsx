/**
 * Organism: OrPermisosEditor
 *
 * Editor de permisos por sección: cada sección es una card con un
 * toggle maestro (activa/desactiva todos sus permisos) y un toggle por
 * permiso. Controlado: recibe el set de claves activas y emite el nuevo
 * array completo en cada cambio. Usado por crear usuario y editar
 * permisos.
 */

import React, { memo, useCallback } from 'react';
import { View } from '@/src/tw';
import { AtToggleSwitch } from '@/src/components/atoms/at-toggle-switch';
import { AtTypography } from '@/src/components/atoms/at-typography';
import {
  PERMISSION_SECTIONS,
  type PermissionSection,
} from '@/src/config/permissions';

interface OrPermisosEditorProps {
  selected: string[];
  onChange: (next: string[]) => void;
  /** Secciones a mostrar (default: todas). */
  sections?: PermissionSection[];
  disabled?: boolean;
}

export const OrPermisosEditor = memo<OrPermisosEditorProps>(
  ({ selected, onChange, sections = PERMISSION_SECTIONS, disabled }) => {
    const isOn = useCallback(
      (key: string) => selected.includes(key),
      [selected],
    );

    const togglePermission = (key: string, next: boolean) => {
      onChange(
        next ? [...selected, key] : selected.filter((k) => k !== key),
      );
    };

    const toggleSection = (section: PermissionSection, next: boolean) => {
      const keys = section.permissions.map((p) => p.key);
      const without = selected.filter((k) => !keys.includes(k));
      onChange(next ? [...without, ...keys] : without);
    };

    return (
      <View className="gap-4">
        {sections.map((section) => {
          const allOn = section.permissions.every((p) => isOn(p.key));
          return (
            <View
              key={section.id}
              className="bg-bg-card"
              style={{ borderRadius: 14, borderCurve: 'continuous' }}
            >
              <View
                className="flex-row items-center justify-between px-4"
                style={{
                  paddingVertical: 14,
                  backgroundColor: '#F6F8FA',
                  borderTopLeftRadius: 14,
                  borderTopRightRadius: 14,
                }}
              >
                <AtTypography variant="captionBold" color="#1A1F36">
                  {section.label}
                </AtTypography>
                <AtToggleSwitch
                  value={allOn}
                  onChange={(next) => toggleSection(section, next)}
                  disabled={disabled}
                />
              </View>
              {section.permissions.map((perm) => (
                <View
                  key={perm.key}
                  className="flex-row items-center justify-between px-4"
                  style={{
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <AtTypography
                    variant="caption"
                    color="#1A1F36"
                    className="flex-1 pr-3"
                  >
                    {perm.label}
                  </AtTypography>
                  <AtToggleSwitch
                    value={isOn(perm.key)}
                    onChange={(next) => togglePermission(perm.key, next)}
                    disabled={disabled}
                  />
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  },
);

OrPermisosEditor.displayName = 'OrPermisosEditor';

/**
 * Organism: OrRepoArchivoRow
 *
 * Fila de archivo del Repositorio: badge con la extensión (PDF., DOCX.…),
 * nombre + filename original y acción "Ver documento 👁". En modo edición
 * agrega íconos de eliminar y renombrar (el lápiz convierte el nombre en
 * un TextInput inline; el padre recibe el nuevo nombre en onNameChange y
 * lo persiste con "Guardar cambios").
 */

import React, { memo, useState } from 'react';
import { Pressable, TextInput, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import type { RepoArchivo } from '@/src/types/repositorio.types';

const BLUE = '#1A3FE8';

function extensionBadge(archivo: RepoArchivo): string {
  const source = archivo.archivoOriginal ?? archivo.storagePath;
  const dot = source.lastIndexOf('.');
  const ext = dot > 0 ? source.slice(dot + 1) : 'DOC';
  return `${ext.toUpperCase().slice(0, 4)}.`;
}

interface OrRepoArchivoRowProps {
  archivo: RepoArchivo;
  onView: () => void;
  viewLabel?: string;
  /** Modo edición: muestra eliminar + renombrar. */
  onDelete?: () => void;
  onNameChange?: (nombre: string) => void;
  /** Rename pendiente de guardar (lo administra el padre). */
  nombreOverride?: string;
}

export const OrRepoArchivoRow = memo<OrRepoArchivoRowProps>(
  ({
    archivo,
    onView,
    viewLabel = 'Ver documento',
    onDelete,
    onNameChange,
    nombreOverride,
  }) => {
    // El nombre mostrado siempre sale de props (dato fresco del server o
    // rename pendiente); el estado local solo vive mientras se edita.
    const displayName = nombreOverride ?? archivo.nombre;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(displayName);

    const startEditing = () => {
      setDraft(displayName);
      setEditing(true);
    };

    const commitName = () => {
      setEditing(false);
      const trimmed = draft.trim();
      if (!trimmed || trimmed === displayName) return;
      onNameChange?.(trimmed);
    };

    return (
      <View className="flex-row items-center gap-3 py-2">
        {onDelete && (
          <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel="Eliminar archivo">
            <AtIcon name="delete-outline" size="md" color={BLUE} />
          </Pressable>
        )}
        {onNameChange && (
          <Pressable
            onPress={() => (editing ? commitName() : startEditing())}
            hitSlop={8}
            accessibilityLabel="Renombrar archivo"
          >
            <AtIcon name={editing ? 'check' : 'edit'} size="md" color={BLUE} />
          </Pressable>
        )}

        <View
          className="items-center justify-center bg-bg-card"
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.08)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          }}
        >
          <AtTypography variant="label" color="#1A1F36">
            {extensionBadge(archivo)}
          </AtTypography>
        </View>

        <View className="flex-1 gap-0.5">
          {editing ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onBlur={commitName}
              onSubmitEditing={commitName}
              autoFocus
              className="p-0"
              style={{
                fontFamily: 'Roboto_500Medium',
                fontSize: 13,
                color: '#1A1F36',
                borderBottomWidth: 1,
                borderBottomColor: BLUE,
                paddingBottom: 2,
              }}
            />
          ) : (
            <AtTypography variant="captionBold" color="#1A1F36" numberOfLines={1}>
              {displayName}
            </AtTypography>
          )}
          {archivo.archivoOriginal && (
            <AtTypography variant="caption" color="#8892A4" numberOfLines={1}>
              {archivo.archivoOriginal}
            </AtTypography>
          )}
        </View>

        <Pressable
          onPress={onView}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${viewLabel} ${archivo.nombre}`}
          className="flex-row items-center gap-1.5"
        >
          <AtTypography variant="captionBold" color={BLUE}>
            {viewLabel}
          </AtTypography>
          <AtIcon name="visibility" size="md" color={BLUE} />
        </Pressable>
      </View>
    );
  },
);

OrRepoArchivoRow.displayName = 'OrRepoArchivoRow';

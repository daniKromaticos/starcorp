/**
 * Molecule: MlInlineSearch
 *
 * Buscador local de una vista (card blanca redondeada con lupa), mismo
 * estilo que el buscador de terceros. Distinto del MlSearchBar global
 * (que abre la búsqueda global y el drawer).
 */

import React, { memo } from 'react';
import { TextInput, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';

interface MlInlineSearchProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}

export const MlInlineSearch = memo<MlInlineSearchProps>(
  ({ value, onChangeText, placeholder }) => {
    return (
      <View
        className="flex-row items-center bg-bg-card px-4 gap-3"
        style={{
          borderRadius: 24,
          borderCurve: 'continuous',
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.08)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        <AtIcon name="search" size="sm" color="#8892A4" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8892A4"
          className="flex-1 p-0"
          style={{ fontFamily: 'Roboto_400Regular', fontSize: 14, color: '#1A1F36' }}
        />
      </View>
    );
  },
);

MlInlineSearch.displayName = 'MlInlineSearch';

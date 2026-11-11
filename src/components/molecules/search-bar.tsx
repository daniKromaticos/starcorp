/**
 * Molecule: SearchBar
 *
 * Search input with icon — matches mockup header.
 */

import React, { memo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text, TextInput } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';
import { shadows } from '@/src/theme/shadows';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
  onMenuPress?: () => void;
}

export const SearchBar = memo<SearchBarProps>(
  ({
    placeholder = 'Buscar por cliente o empresa',
    onSearch,
    onMenuPress,
  }) => {
    const [text, setText] = useState('');

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: tokens.color.background.card,
          borderRadius: tokens.radius.lg,
          borderCurve: 'continuous',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
          gap: tokens.spacing.md,
          boxShadow: shadows.sm,
          borderWidth: 1,
          borderColor: tokens.color.border.default,
        }}
      >
        {/* Menu icon */}
        <Pressable onPress={onMenuPress} hitSlop={8}>
          <Text style={{ fontSize: 18, color: tokens.color.ink.secondary }}>
            ☰
          </Text>
        </Pressable>

        {/* Search icon */}
        <Text style={{ fontSize: 16, color: tokens.color.ink.tertiary }}>
          🔍
        </Text>

        {/* Input */}
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            onSearch?.(t);
          }}
          placeholder={placeholder}
          placeholderTextColor={tokens.color.ink.tertiary}
          style={{
            flex: 1,
            fontSize: 15,
            color: tokens.color.ink.primary,
            padding: 0,
          }}
        />
      </View>
    );
  },
);

SearchBar.displayName = 'SearchBar';

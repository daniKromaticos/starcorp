/**
 * Modal Screen — placeholder
 */

import React from 'react';
import { View } from 'react-native';
import { Text } from '@/src/tw';
import { tokens } from '@/src/theme/tokens';

export default function ModalScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tokens.color.background.primary,
      }}
    >
      <Text style={{ ...tokens.typography.h2, color: tokens.color.ink.primary }}>
        Modal
      </Text>
    </View>
  );
}

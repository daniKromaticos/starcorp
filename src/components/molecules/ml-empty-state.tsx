/**
 * Molecule: MlEmptyState
 *
 * Centered icon + title + optional description and an optional action button.
 * Used as a fallback when a list/section has no data for the active filter.
 */

import React, { memo } from 'react';
import { Pressable, View } from '@/src/tw';
import { AtIcon } from '@/src/components/atoms/at-icon';
import { AtTypography } from '@/src/components/atoms/at-typography';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/src/theme/gradients';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MlEmptyStateProps {
  icon?: MaterialIconName;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const MlEmptyState = memo<MlEmptyStateProps>(
  ({ icon = 'inbox', title, description, action }) => {
    return (
      <View className="items-center px-6 py-10 gap-3">
        <View
          className="w-14 h-14 rounded-full bg-bg-secondary items-center justify-center"
          style={{ borderCurve: 'continuous' }}
        >
          <AtIcon name={icon} size="lg" color="#8892A4" />
        </View>
        <View className="items-center gap-1">
          <AtTypography variant="bodyBold" color="#1A1F36">
            {title}
          </AtTypography>
          {description && (
            <AtTypography
              variant="caption"
              color="#8892A4"
              style={{ textAlign: 'center' }}
            >
              {description}
            </AtTypography>
          )}
        </View>
        {action && (
          <Pressable
            onPress={action.onPress}
            style={{
              borderRadius: 8,
              borderCurve: 'continuous',
              overflow: 'hidden',
              marginTop: 4,
              boxShadow: '0 2px 6px rgba(4, 17, 63, 0.35)',
            }}
          >
            <LinearGradient
              colors={gradients.buttonBlue.colors}
              start={gradients.buttonBlue.start}
              end={gradients.buttonBlue.end}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AtTypography variant="captionBold" color="#FFFFFF">
                {action.label}
              </AtTypography>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    );
  },
);

MlEmptyState.displayName = 'MlEmptyState';

/**
 * Molecule: MlSearchBar
 *
 * Search input with hamburger menu icon, search icon and the session
 * user's avatar on the right (taps through to the profile screen).
 * Migrated to NativeWind + AtIcon.
 */

import { AtAvatar } from "@/src/components/atoms/at-avatar";
import { AtIcon } from "@/src/components/atoms/at-icon";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { useAuthStore } from "@/src/stores/auth.store";
import { Pressable, TextInput, View } from "@/src/tw";
import { useRouter } from "expo-router";
import React, { memo, useState } from "react";
import { useWindowDimensions } from "react-native";

interface MlSearchBarProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
  onMenuPress?: () => void;
  // Trigger mode: when provided, the input is replaced with a tappable
  // placeholder that fires `onPress`. Use this when the actual search UI
  // lives in a modal/portal and the bar is just an entry point.
  onPress?: () => void;
  /** Oculta el avatar de perfil (visible por defecto). */
  hideAvatar?: boolean;
}

export const MlSearchBar = memo<MlSearchBarProps>(
  ({
    placeholder = "Buscar por cliente o empresa",
    onSearch,
    onMenuPress,
    onPress,
    hideAvatar,
  }) => {
    const [text, setText] = useState("");
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const isTrigger = typeof onPress === "function";
    // 320dp: con gap-4 y pl-5/pr-5 el placeholder quedaba en ~120px.
    const narrow = useWindowDimensions().width < 360;
    const pillClass = narrow
      ? "flex-1 flex-row items-center gap-3 bg-bg-card pl-4 pr-4 py-4 rounded-full"
      : "flex-1 flex-row items-center gap-3 bg-bg-card pl-5 pr-5 py-4 rounded-full";

    return (
      <View
        className={
          narrow ? "flex-row items-center gap-3" : "flex-row items-center gap-4"
        }
      >
        <Pressable onPress={onMenuPress} hitSlop={12}>
          <AtIcon name="menu" size="lg" color="#1A1F36" />
        </Pressable>

        {isTrigger ? (
          <Pressable
            onPress={onPress}
            className={pillClass}
            style={{
              borderCurve: "continuous",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
            }}
          >
            <AtIcon name="search" size="md" color="#8892A4" />
            <AtTypography
              variant="body"
              color="#8892A4"
              className="flex-1"
              numberOfLines={1}
            >
              {placeholder}
            </AtTypography>
          </Pressable>
        ) : (
          <View
            className={pillClass}
            style={{
              borderCurve: "continuous",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
            }}
          >
            <AtIcon name="search" size="md" color="#8892A4" />

            <TextInput
              value={text}
              onChangeText={(t) => {
                setText(t);
                onSearch?.(t);
              }}
              placeholder={placeholder}
              placeholderTextColor="#8892A4"
              className="flex-1 p-0 text-ink-primary text-base"
              style={{ fontFamily: "Roboto_400Regular" }}
            />
          </View>
        )}

        {!hideAvatar && (
          <Pressable
            onPress={() => router.navigate("/(tabs)/perfil" as never)}
            accessibilityRole="button"
            accessibilityLabel="Mi perfil"
            hitSlop={8}
          >
            <AtAvatar size={40} uri={user?.avatarUrl} name={user?.name} />
          </Pressable>
        )}
      </View>
    );
  },
);

MlSearchBar.displayName = "MlSearchBar";

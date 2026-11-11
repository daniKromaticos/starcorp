/**
 * Organism: OrDrawer
 *
 * Lateral navigation panel. REWRITTEN:
 * - Reanimated instead of old Animated API
 * - Pressable instead of TouchableOpacity
 * - useWindowDimensions instead of Dimensions.get
 * - NativeWind + AtTypography + AtIcon
 */

import { AtAvatar } from "@/src/components/atoms/at-avatar";
import { AtIcon } from "@/src/components/atoms/at-icon";
import { AtGradientIcon } from "@/src/components/atoms/at-gradient-icon";
import { AtTypography } from "@/src/components/atoms/at-typography";
import { Pressable, ScrollView, View } from "@/src/tw";
import type { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal } from "react-native";
import { useLogout } from "@/src/hooks/mutations/use-auth";
import { useAuthStore } from "@/src/stores/auth.store";
import { hasPermission } from "@/src/types/auth.types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideOutLeft,
} from "react-native-reanimated";

const ENTER_DURATION = 280;
const EXIT_DURATION = 260;

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

export interface DrawerMenuItem {
  id: string;
  label: string;
  icon: IoniconsName;
}

export interface OrDrawerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  activeSection?: string;
  menuItems?: DrawerMenuItem[];
  onItemPress?: (id: string) => void;
}

const DRAWER_WIDTH = 280;

const DEFAULT_MENU_ITEMS: DrawerMenuItem[] = [
  { id: "consolidado", label: "Consolidado", icon: "home" },
  { id: "financiero", label: "Financiero", icon: "wallet" },
  { id: "clientes", label: "Clientes", icon: "people" },
  { id: "informes", label: "Informes", icon: "megaphone" },
  { id: "reportes", label: "Reportes", icon: "stats-chart" },
  { id: "empresas", label: "Otras compañías", icon: "briefcase" },
  { id: "usuarios", label: "Usuarios", icon: "people-circle" },
  { id: "qb", label: "Conexión QuickBooks", icon: "link" },
];

const ROUTE_MAP: Record<string, string> = {
  consolidado: "/(tabs)",
  financiero: "/(tabs)/financiero",
  clientes: "/(tabs)/clientes",
  informes: "/(tabs)/informes",
  reportes: "/(tabs)/reportes",
  empresas: "/(tabs)/empresas",
  usuarios: "/(tabs)/usuarios",
  perfil: "/(tabs)/perfil",
  qb: "/connect",
};

export const OrDrawer = memo<OrDrawerProps>(
  ({
    visible,
    onClose,
    title,
    activeSection = "consolidado",
    menuItems,
    onItemPress,
  }) => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [mounted, setMounted] = useState(visible);
    const { mutate: doLogout, isPending: logoutPending } = useLogout();
    const user = useAuthStore((s) => s.user);

    // Usuarios y Conexión QuickBooks son exclusivos del super admin;
    // el resto de secciones exige el permiso base `{id}.ver`.
    const items = (menuItems ?? DEFAULT_MENU_ITEMS).filter((item) => {
      if (item.id === "usuarios" || item.id === "qb") {
        return user?.role === "super_admin";
      }
      return hasPermission(user, `${item.id}.ver`);
    });

    useEffect(() => {
      if (visible) {
        setMounted(true);
        return;
      }
      const timer = setTimeout(() => setMounted(false), EXIT_DURATION + 50);
      return () => clearTimeout(timer);
    }, [visible]);

    const handleItemPress = useCallback(
      (id: string) => {
        onClose();
        setTimeout(() => {
          if (onItemPress) {
            onItemPress(id);
          } else {
            const route = ROUTE_MAP[id];
            if (route) {
              router.navigate(route as never);
            }
          }
        }, EXIT_DURATION);
      },
      [onItemPress, onClose, router],
    );

    const handleLogout = useCallback(() => {
      // El gate de app/_layout.tsx navega solo al login al caer la sesión.
      doLogout();
    }, [doLogout]);

    if (!mounted) {
      return null;
    }

    const showContent = visible;

    return (
      <Modal
        visible={mounted}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View
          style={{
            flex: 1,
            pointerEvents: visible ? "auto" : "none",
          }}
        >
          {showContent && (
            <Animated.View
              key="drawer-overlay"
              entering={FadeIn.duration(ENTER_DURATION)}
              exiting={FadeOut.duration(EXIT_DURATION)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
              }}
            >
              <Pressable onPress={onClose} style={{ flex: 1 }} />
            </Animated.View>
          )}

          {showContent && (
            <Animated.View
              key="drawer-panel"
              entering={SlideInLeft.duration(ENTER_DURATION)}
              exiting={SlideOutLeft.duration(EXIT_DURATION)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: DRAWER_WIDTH,
                backgroundColor: "#FFFFFF",
                paddingTop: insets.top + 16,
                paddingBottom: insets.bottom,
                boxShadow: "2px 0 8px rgba(0, 0, 0, 0.25)",
              }}
            >
              <View className="flex-row justify-end items-center px-6 pb-4">
                <Pressable onPress={onClose} hitSlop={8}>
                  <AtIcon name="close" size="lg" color="#1A1F36" />
                </Pressable>
              </View>

              <View className="px-4 pb-6">
                <Pressable
                  onPress={() => handleItemPress("perfil")}
                  accessibilityRole="button"
                  accessibilityLabel="Ver mi perfil"
                  className="flex-row items-center gap-3 p-3"
                  style={{
                    backgroundColor: "#F6F8FA",
                    borderRadius: 14,
                    borderCurve: "continuous",
                  }}
                >
                  <AtAvatar size={44} uri={user?.avatarUrl} name={user?.name} />
                  <View className="flex-1">
                    <AtTypography
                      variant="bodyBold"
                      color="#1A1F36"
                      numberOfLines={1}
                    >
                      {user?.name || "Usuario"}
                    </AtTypography>
                    <AtTypography
                      variant="caption"
                      color="#4A5568"
                      numberOfLines={1}
                    >
                      {user?.email ?? ""}
                    </AtTypography>
                  </View>
                </Pressable>
              </View>

              {/* Con muchas secciones (super admin) el listado no cabe en
                  pantallas de teléfono: scrollea, y el pie (Mi perfil /
                  Cerrar sesión) queda fijo abajo. */}
              <ScrollView
                className="flex-1"
                contentContainerClassName="px-6 gap-6 pb-4"
              >
                {items.map((item) => {
                  const isActive = item.id === activeSection;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleItemPress(item.id)}
                      className="flex-row items-center gap-4"
                    >
                      <AtGradientIcon
                        name={item.icon}
                        variant="ionicons"
                        size={36}
                        gradient={isActive ? "brandOrange" : "brandNavy"}
                      />
                      <AtTypography variant="bodyBold" color="#1A1F36">
                        {item.label}
                      </AtTypography>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View
                className="mx-6"
                style={{
                  height: 1,
                  backgroundColor: "rgba(0, 0, 0, 0.08)",
                  marginTop: 12,
                  marginBottom: 20,
                }}
              />

              <View className="px-6" style={{ paddingBottom: 20 }}>
                <Pressable
                  onPress={() => handleItemPress("perfil")}
                  className="flex-row items-center gap-4"
                >
                  <AtGradientIcon
                    name="settings"
                    variant="ionicons"
                    size={36}
                    gradient={
                      activeSection === "perfil" ? "brandOrange" : "brandNavy"
                    }
                  />
                  <AtTypography variant="bodyBold" color="#1A1F36">
                    Mi perfil
                  </AtTypography>
                </Pressable>
              </View>

              <View className="px-6" style={{ paddingBottom: 12 }}>
                <Pressable
                  onPress={handleLogout}
                  disabled={logoutPending}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar sesión"
                  className="flex-row items-center gap-4"
                  style={{ opacity: logoutPending ? 0.6 : 1 }}
                >
                  {logoutPending ? (
                    <View
                      className="items-center justify-center"
                      style={{ width: 36, height: 36 }}
                    >
                      <ActivityIndicator size="small" color="#1A1F36" />
                    </View>
                  ) : (
                    <AtGradientIcon
                      name="log-out"
                      variant="ionicons"
                      size={36}
                      gradient="brandNavy"
                    />
                  )}
                  <AtTypography variant="bodyBold" color="#1A1F36">
                    Cerrar sesión
                  </AtTypography>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    );
  },
);

OrDrawer.displayName = "OrDrawer";

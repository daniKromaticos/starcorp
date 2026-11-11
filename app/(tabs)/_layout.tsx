/**
 * Tab Layout
 *
 * Bottom tab navigation matching the mockup tab bar.
 * Gradient icons (brandOrange active / brandNavy inactive) to match drawer.
 */

import { AtGradientIcon } from "@/src/components/atoms/at-gradient-icon";
import { OrGlobalSearchModal } from "@/src/components/organisms/or-global-search-modal";
import { useCompanies } from "@/src/hooks/queries/use-companies";
import { useAuthStore } from "@/src/stores/auth.store";
import { hasPermission } from "@/src/types/auth.types";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const companies = useCompanies();
  const user = useAuthStore((s) => s.user);
  // Tabs.Protected elimina la ruta para quien no tiene el permiso base:
  // ni aparece en el tab bar ni es navegable (el navigator cae a la
  // primera sección permitida al iniciar).
  const can = (key: string) => hasPermission(user, key);

  if (companies.isPending) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F8FA" }}>
        <ActivityIndicator color="#20307E" />
      </View>
    );
  }

  if (companies.isError || !companies.data || companies.data.length === 0) {
    return <Redirect href="/connect" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#E8952E",
        tabBarInactiveTintColor: "#20307E",
        headerShown: false,
        // Ancho fijo por tab: con Dynamic Type grande las etiquetas se truncan.
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: "#F6F8FA",
          borderTopWidth: 1,
          borderTopColor: "rgba(0, 0, 0, 0.08)",
          paddingTop: 5,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        // Sin el padding lateral por defecto (5px) cada tab tiene 64px a
        // 320dp: alcanza para "Consolidado" (~60px a 11px).
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarLabelStyle: {
          fontFamily: "Roboto_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Protected guard={can("consolidado.ver")}>
        <Tabs.Screen
          name="(consolidado)"
          options={{
            title: "Consolidado",
            tabBarIcon: ({ focused, size }) => (
              <AtGradientIcon
                name="home"
                variant="ionicons"
                size={size}
                gradient={focused ? "brandOrange" : "brandNavy"}
              />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={can("financiero.ver")}>
        <Tabs.Screen
          name="financiero"
          options={{
            title: "Financiero",
            tabBarIcon: ({ focused, size }) => (
              <AtGradientIcon
                name="wallet"
                variant="ionicons"
                size={size}
                gradient={focused ? "brandOrange" : "brandNavy"}
              />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={can("informes.ver")}>
        <Tabs.Screen
          name="informes"
          options={{
            title: "Informes",
            tabBarIcon: ({ focused, size }) => (
              <AtGradientIcon
                name="megaphone"
                variant="ionicons"
                size={size}
                gradient={focused ? "brandOrange" : "brandNavy"}
              />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={can("reportes.ver")}>
        <Tabs.Screen
          name="reportes"
          options={{
            title: "Reportes",
            tabBarIcon: ({ focused, size }) => (
              <AtGradientIcon
                name="stats-chart"
                variant="ionicons"
                size={size}
                gradient={focused ? "brandOrange" : "brandNavy"}
              />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={can("empresas.ver")}>
        <Tabs.Screen
          name="empresas"
          options={{
            // "Otras Compañías" (~95px) no cabía en ningún teléfono; la
            // pantalla conserva el título largo.
            title: "Compañías",
            tabBarIcon: ({ focused, size }) => (
              <AtGradientIcon
                name="briefcase"
                variant="ionicons"
                size={size}
                gradient={focused ? "brandOrange" : "brandNavy"}
              />
            ),
          }}
        />
      </Tabs.Protected>
      {/* Perfil primero entre las ocultas: ruta inicial de respaldo si el
          usuario no tiene ningún permiso de sección. */}
      <Tabs.Screen name="perfil" options={{ href: null }} />
      <Tabs.Protected guard={can("clientes.ver")}>
        <Tabs.Screen name="clientes" options={{ href: null }} />
      </Tabs.Protected>
      <Tabs.Protected guard={user?.role === "super_admin"}>
        <Tabs.Screen name="usuarios" options={{ href: null }} />
      </Tabs.Protected>
      <Tabs.Screen name="egresos" options={{ href: null }} />
      <Tabs.Screen name="ingresos" options={{ href: null }} />
      <Tabs.Screen name="costos" options={{ href: null }} />
      <Tabs.Screen name="gastos" options={{ href: null }} />
      <Tabs.Screen name="utilidad" options={{ href: null }} />
      </Tabs>

      <OrGlobalSearchModal />
    </View>
  );
}

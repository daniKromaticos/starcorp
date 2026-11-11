/**
 * Root Layout
 *
 * Wraps the app with all required providers:
 * - ThemeProvider (React Navigation)
 * - QueryClientProvider (TanStack Query)
 * - Roboto fonts via expo-font
 * - Global CSS (NativeWind/Tailwind)
 *
 * Gate de sesión: las rutas de la app solo son accesibles con una
 * sesión Supabase real (no anónima); si no la hay — o el usuario está
 * a mitad del flujo de recuperación de contraseña — se muestra el
 * grupo (auth). Ver src/stores/auth.store.ts.
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import 'react-native-reanimated';

import '@/src/global.css';
import { queryClient } from '@/src/config/query-client';
import { subscribeAppStateFocus } from '@/src/config/query-focus';
import { subscribeOtaUpdates } from '@/src/config/ota-updates';
import { OrToast } from '@/src/components/organisms/or-toast';
import { useAuthStore } from '@/src/stores/auth.store';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  const authStatus = useAuthStore((s) => s.status);
  const passwordRecovery = useAuthStore((s) => s.passwordRecovery);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => initialize(), [initialize]);

  // Sin este puente, refetchOnWindowFocus no dispara en native.
  useEffect(() => subscribeAppStateFocus(), []);

  // Aplica las updates OTA sin esperar a un arranque en frío.
  useEffect(() => subscribeOtaUpdates(), []);

  const ready = fontsLoaded && authStatus !== 'loading';

  if (ready) {
    SplashScreen.hideAsync();
  }

  if (!ready) {
    return null;
  }

  const isSignedIn = authStatus === 'signedIn' && !passwordRecovery;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Protected guard={isSignedIn}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="connect" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: 'modal', title: 'Modal', headerShown: true }}
              />
              <Stack.Screen
                name="settings"
                options={{ presentation: 'modal', title: 'Configuración', headerShown: true }}
              />
            </Stack.Protected>
            <Stack.Protected guard={!isSignedIn}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
          <OrToast />
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

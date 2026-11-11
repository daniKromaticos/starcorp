/**
 * Puente AppState → focusManager de TanStack Query.
 *
 * `refetchOnWindowFocus` está pensado para web: escucha eventos del DOM
 * que en React Native no existen, así que sin este puente la opción no
 * hace absolutamente nada y los informes se quedan con el snapshot
 * cacheado hasta que la query se remonta estando stale.
 *
 * Con esto, volver a la app desde background marca las queries como
 * "focused" y TanStack refetchea las que estén stale (staleTime de 5 min
 * en `query-client.ts`). Cargar una póliza en Notion y volver a la app
 * alcanza para verla.
 */

import { focusManager } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

function handleAppStateChange(status: AppStateStatus) {
  // En web el focusManager ya tiene su propio listener del DOM.
  if (Platform.OS === 'web') return;
  focusManager.setFocused(status === 'active');
}

/** Suscribe el puente. Devuelve la función para desuscribir. */
export function subscribeAppStateFocus(): () => void {
  const subscription = AppState.addEventListener(
    'change',
    handleAppStateChange,
  );
  return () => subscription.remove();
}

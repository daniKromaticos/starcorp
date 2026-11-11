/**
 * Updates OTA (EAS Update) que se aplican solas.
 *
 * Por defecto expo-updates descarga la update al abrir la app pero la
 * aplica recién en el SIGUIENTE arranque en frío. En iPhone la app casi
 * nunca se cierra del todo, así que los usuarios se quedaban días con la
 * versión vieja aunque la update ya estuviera publicada.
 *
 * Esto busca la update al arrancar y cada vez que la app vuelve a primer
 * plano (con un mínimo de tiempo entre chequeos), la descarga y recarga
 * la app para aplicarla de una.
 *
 * Ojo: una update solo llega a binarios con el mismo runtimeVersion
 * (policy `appVersion` en app.json) y del mismo canal (eas.json).
 */

import * as Updates from 'expo-updates';
import { AppState, Platform, type AppStateStatus } from 'react-native';

/** Mínimo entre chequeos al volver a primer plano. */
const MIN_CHECK_INTERVAL_MS = 5 * 60 * 1000;

let lastCheckAt = 0;
let checking = false;

async function checkAndApply(force = false) {
  if (checking) return;
  const now = Date.now();
  if (!force && now - lastCheckAt < MIN_CHECK_INTERVAL_MS) return;

  checking = true;
  lastCheckAt = now;
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (!isAvailable) return;
    const { isNew } = await Updates.fetchUpdateAsync();
    if (isNew) await Updates.reloadAsync();
  } catch (error) {
    // Sin red o servidor caído: se reintenta en el próximo foreground.
    console.warn('[ota-updates] no se pudo actualizar', error);
  } finally {
    checking = false;
  }
}

function handleAppStateChange(status: AppStateStatus) {
  if (status === 'active') void checkAndApply();
}

/** Chequea al arrancar y en cada foreground. Devuelve la función para desuscribir. */
export function subscribeOtaUpdates(): () => void {
  // En dev (Metro) y web expo-updates no aplica.
  if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) {
    return () => {};
  }

  void checkAndApply(true);
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}

/** Texto corto para identificar qué está corriendo el usuario. */
export function getAppVersionLabel(): string {
  const runtime = Updates.runtimeVersion ?? '—';
  if (__DEV__ || !Updates.isEnabled) return `v${runtime} · dev`;
  if (Updates.isEmbeddedLaunch || !Updates.updateId) {
    return `v${runtime} · ${Updates.channel ?? 'sin canal'} · build original`;
  }
  const date = Updates.createdAt
    ? Updates.createdAt.toISOString().slice(0, 16).replace('T', ' ')
    : '';
  return `v${runtime} · ${Updates.channel ?? 'sin canal'} · ${Updates.updateId.slice(0, 8)}${date ? ` · ${date}` : ''}`;
}

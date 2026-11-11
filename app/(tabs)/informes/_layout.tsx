import { StackActions, type NavigationState } from '@react-navigation/native';
import { Stack, useNavigation, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { getInformeOrigin, setInformeOrigin } from '@/src/utils/informe-origin';

// El grid de Informes queda siempre debajo de cualquier informe. Sin esto,
// entrar a un informe desde otra pestaña (Consolidado, detalle de cliente)
// crea el stack de Informes con ese informe como raíz: el "atrás" sale de
// la pestaña pero el informe se queda ahí, y el siguiente informe se apila
// encima — al volver aparecía el primero. Los push cross-tab deben ir con
// `withAnchor: true` para que este anchor se cargue.
export const unstable_settings = {
  anchor: 'index',
};

export default function InformesLayout() {
  // Navegación de la pestaña "informes" dentro de Tabs.
  const tabNavigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    // Tocar la pestaña Informes es entrar "por Informes": el atrás vuelve a
    // comportarse normal (grid). Corre antes del popToTop por defecto del tab.
    const unsubTabPress = tabNavigation.addListener('tabPress' as never, () => {
      setInformeOrigin(null);
    });

    // Al salir de la pestaña tras entrar desde Home, se deja el stack en el
    // grid: la próxima visita a Informes arranca limpia y los informes
    // abiertos desde Home no se acumulan uno encima de otro.
    const unsubBlur = tabNavigation.addListener('blur', () => {
      if (getInformeOrigin() !== 'home') return;
      setInformeOrigin(null);
      const tabState = tabNavigation.getState() as NavigationState | undefined;
      const stackState = tabState?.routes.find((r) => r.name === 'informes')
        ?.state as NavigationState | undefined;
      if (stackState?.key && stackState.index > 0) {
        tabNavigation.dispatch({ ...StackActions.popToTop(), target: stackState.key });
      }
    });

    return () => {
      unsubTabPress();
      unsubBlur();
    };
  }, [tabNavigation]);

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      screenListeners={{
        // Cualquier "atrás" (botón, hardware de Android, swipe de iOS) de un
        // informe abierto desde Home vuelve a Home en lugar de al grid. El pop
        // sigue su curso en segundo plano; el blur de arriba deja el stack en
        // el grid.
        beforeRemove: () => {
          if (getInformeOrigin() !== 'home') return;
          setTimeout(() => router.navigate('/'), 0);
        },
      }}
    />
  );
}

/**
 * Auth Store — Zustand
 *
 * Estado de la sesión Supabase para el gate de navegación
 * (app/_layout.tsx). La persistencia de la sesión la maneja el propio
 * cliente de Supabase (AsyncStorage, ver src/config/supabase.ts); aquí
 * solo se refleja el estado para la UI.
 *
 * `passwordRecovery`: al verificar el código OTP de recovery Supabase
 * crea una sesión real. Sin este flag, el gate mandaría al usuario a la
 * app antes de que escriba su nueva contraseña. Mientras esté en true,
 * el usuario permanece en el grupo (auth) hasta completar el cambio.
 */

import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '@/src/services/auth/auth.service';
import { toAuthUser, type AuthStatus, type AuthUser } from '@/src/types/auth.types';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: AuthUser | null;
  passwordRecovery: boolean;

  setSession: (session: Session | null) => void;
  setPasswordRecovery: (value: boolean) => void;
  /** Lee la sesión persistida y se suscribe a cambios. Devuelve unsubscribe. */
  initialize: () => () => void;
}

/** Las sesiones anónimas (usadas antes del login real) no cuentan como login. */
function isRealSession(session: Session | null): session is Session {
  return !!session && !session.user.is_anonymous;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,
  user: null,
  passwordRecovery: false,

  setSession: (session) => {
    if (isRealSession(session)) {
      set({ status: 'signedIn', session, user: toAuthUser(session.user) });
    } else {
      set({ status: 'signedOut', session: null, user: null, passwordRecovery: false });
    }
  },

  setPasswordRecovery: (value) => set({ passwordRecovery: value }),

  initialize: () => {
    getSession()
      .then((session) => useAuthStore.getState().setSession(session))
      .catch(() => set({ status: 'signedOut', session: null, user: null }));

    return onAuthStateChange((session) => {
      const state = useAuthStore.getState();
      // Durante el flujo de recovery, verifyOtp emite SIGNED_IN: reflejar
      // la sesión sin sacar al usuario del grupo (auth) — el flag manda.
      state.setSession(session);
    });
  },
}));

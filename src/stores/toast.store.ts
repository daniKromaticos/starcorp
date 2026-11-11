/**
 * Toast Store — Zustand
 *
 * Toast global de confirmación (banner verde superior). Se muestra con
 * showToast('...') desde cualquier pantalla; OrToast (montado en el
 * root layout) lo renderiza y lo auto-oculta.
 */

import { create } from 'zustand';

interface ToastState {
  message: string | null;
  /** Cambia en cada show para reiniciar el timer aunque el texto se repita. */
  nonce: number;
  show: (message: string) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  nonce: 0,
  show: (message) => set((s) => ({ message, nonce: s.nonce + 1 })),
  hide: () => set({ message: null }),
}));

export function showToast(message: string) {
  useToastStore.getState().show(message);
}

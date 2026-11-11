/**
 * Global Search store — controls the app-wide search modal.
 *
 * Any screen / floating trigger can call `open()` to show it. The modal
 * unmounts when closed so its internal query state resets between sessions.
 */

import { create } from 'zustand';

interface GlobalSearchState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useGlobalSearchStore = create<GlobalSearchState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

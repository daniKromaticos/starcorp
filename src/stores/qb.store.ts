/**
 * QuickBooks Store — active company (realm) selection.
 *
 * Hooks read activeRealmId from here and pass it to qbQuery so the
 * Edge Function knows which connected company's tokens to use.
 */

import { create } from 'zustand';

interface QBState {
  activeRealmId: string | null;
  setActiveRealmId: (realmId: string | null) => void;
}

export const useQBStore = create<QBState>((set) => ({
  activeRealmId: null,
  setActiveRealmId: (realmId) => set({ activeRealmId: realmId }),
}));

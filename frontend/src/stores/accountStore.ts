import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AccountState {
  selectedAccountId: string | null; // null = unified inbox
  setSelectedAccount: (id: string | null) => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      selectedAccountId: null, // Default to unified inbox
      setSelectedAccount: (id) => set({ selectedAccountId: id }),
    }),
    { name: 'account-filter' }
  )
);

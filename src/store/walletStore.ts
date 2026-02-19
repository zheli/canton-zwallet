import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WalletState {
  partyId: string | null
  isSetupComplete: boolean

  setPartyId: (id: string) => void
  clearWallet: () => void
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      partyId: null,
      isSetupComplete: false,

      setPartyId: (id) => set({ partyId: id, isSetupComplete: true }),
      clearWallet: () => set({ partyId: null, isSetupComplete: false }),
    }),
    {
      name: 'canton-zwallet-wallet',
      partialize: (state) => ({
        partyId: state.partyId,
        isSetupComplete: state.isSetupComplete,
      }),
    },
  ),
)

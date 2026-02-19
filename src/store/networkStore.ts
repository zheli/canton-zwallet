import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type NetworkName, NETWORKS, DEFAULT_NETWORK } from '../config/networks'

interface NetworkState {
  selectedNetwork: NetworkName
  customValidatorUrl: string
  customLedgerApiUrl: string
  jwtToken: string

  setSelectedNetwork: (network: NetworkName) => void
  setCustomValidatorUrl: (url: string) => void
  setCustomLedgerApiUrl: (url: string) => void
  setJwtToken: (token: string) => void

  getValidatorUrl: () => string
  getLedgerApiUrl: () => string
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      selectedNetwork: DEFAULT_NETWORK,
      customValidatorUrl: '',
      customLedgerApiUrl: '',
      jwtToken: '',

      setSelectedNetwork: (network) => set({ selectedNetwork: network }),
      setCustomValidatorUrl: (url) => set({ customValidatorUrl: url }),
      setCustomLedgerApiUrl: (url) => set({ customLedgerApiUrl: url }),
      setJwtToken: (token) => set({ jwtToken: token }),

      getValidatorUrl: () => {
        const { selectedNetwork, customValidatorUrl } = get()
        if (customValidatorUrl) return customValidatorUrl
        return NETWORKS[selectedNetwork].validatorUrl
      },

      getLedgerApiUrl: () => {
        const { selectedNetwork, customLedgerApiUrl } = get()
        if (customLedgerApiUrl) return customLedgerApiUrl
        return NETWORKS[selectedNetwork].ledgerApiUrl
      },
    }),
    {
      name: 'canton-zwallet-network',
      partialize: (state) => ({
        selectedNetwork: state.selectedNetwork,
        customValidatorUrl: state.customValidatorUrl,
        customLedgerApiUrl: state.customLedgerApiUrl,
        jwtToken: state.jwtToken,
      }),
    },
  ),
)

import axios from 'axios'
import { useNetworkStore } from '../store/networkStore'

const DEFAULT_REGISTRY_URL = 'http://localhost:4000'

export function getRegistryUrl(): string {
  const { selectedNetwork } = useNetworkStore.getState()
  switch (selectedNetwork) {
    case 'devnet':
      return 'https://registry.dev.global.canton.network'
    case 'testnet':
      return 'https://registry.test.global.canton.network'
    case 'mainnet':
      return 'https://registry.global.canton.network'
    default:
      return DEFAULT_REGISTRY_URL
  }
}

export async function getTransferFactory(registryUrl: string): Promise<string> {
  const response = await axios.get<{ factoryId: string }>(
    `${registryUrl}/token-standard/transfer-factory`,
  )
  return response.data.factoryId
}

export interface TokenMetadata {
  symbol: string
  decimals: number
}

export async function getTokenMetadata(
  registryUrl: string,
  instrumentId: string,
): Promise<TokenMetadata> {
  const response = await axios.get<TokenMetadata>(
    `${registryUrl}/token-standard/instruments/${instrumentId}`,
  )
  return response.data
}

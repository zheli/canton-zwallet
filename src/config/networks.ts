export type NetworkName =
  | 'sandbox'
  | 'localnet'
  | 'devnet'
  | 'testnet'
  | 'mainnet'

export interface NetworkConfig {
  name: NetworkName
  label: string
  validatorUrl: string
  ledgerApiUrl: string
}

export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  sandbox: {
    name: 'sandbox',
    label: 'Sandbox',
    validatorUrl: 'http://localhost:5003',
    ledgerApiUrl: 'http://localhost:7575',
  },
  localnet: {
    name: 'localnet',
    label: 'Local Net',
    validatorUrl: 'http://localhost:5003',
    ledgerApiUrl: 'http://localhost:7575',
  },
  devnet: {
    name: 'devnet',
    label: 'Dev Net',
    validatorUrl: 'https://validator.dev.global.canton.network',
    ledgerApiUrl: 'https://ledger.dev.global.canton.network',
  },
  testnet: {
    name: 'testnet',
    label: 'Test Net',
    validatorUrl: 'https://validator.test.global.canton.network',
    ledgerApiUrl: 'https://ledger.test.global.canton.network',
  },
  mainnet: {
    name: 'mainnet',
    label: 'Main Net',
    validatorUrl: 'https://validator.global.canton.network',
    ledgerApiUrl: 'https://ledger.global.canton.network',
  },
}

export const DEFAULT_NETWORK: NetworkName = 'sandbox'

import { useQuery } from '@tanstack/react-query'
import { getActiveContractsByInterface } from '../api/ledger'
import { useWalletStore } from '../store/walletStore'

const HOLDING_INTERFACE_ID = 'Splice.Api.Token.HoldingV1:Holding'

export interface Holding {
  contractId: string
  templateId: string
  amount: string
  unit: string
  issuer: string
  owner: string
}

function parseHolding(contract: {
  contractId: string
  templateId: string
  payload: Record<string, unknown>
}): Holding | null {
  const p = contract.payload as Record<string, unknown>
  const amount = p['amount']
  const unit = p['unit']
  const issuer = p['issuer']
  const owner = p['owner']

  if (typeof amount !== 'string' || typeof unit !== 'string') return null

  return {
    contractId: contract.contractId,
    templateId: contract.templateId,
    amount,
    unit,
    issuer: typeof issuer === 'string' ? issuer : '',
    owner: typeof owner === 'string' ? owner : '',
  }
}

export function useHoldings() {
  const partyId = useWalletStore((s) => s.partyId)

  return useQuery({
    queryKey: ['holdings', partyId],
    queryFn: async () => {
      const response = await getActiveContractsByInterface({
        filter: {
          interfaceFilters: [
            {
              interfaceId: HOLDING_INTERFACE_ID,
              includeCreateArgumentsBlob: false,
            },
          ],
        },
        activeAtOffset: '',
        verbose: false,
      })
      return response.activeContracts
        .map(parseHolding)
        .filter((h): h is Holding => h !== null)
    },
    refetchInterval: 30_000,
    enabled: Boolean(partyId),
  })
}

import { useQuery } from '@tanstack/react-query'
import { getTransactions, type LedgerTransaction } from '../api/ledger'
import { useWalletStore } from '../store/walletStore'

export interface Transaction {
  txId: string
  commandId: string
  timestamp: string
  kind: 'send' | 'receive'
  amount: string
  counterparty: string
}

function parseTransaction(tx: LedgerTransaction, partyId: string): Transaction | null {
  const txId = tx.transactionId ?? ''
  const commandId = tx.commandId ?? ''
  const timestamp = tx.effectiveAt ?? new Date().toISOString()

  for (const event of tx.events ?? []) {
    const created = event.created
    if (!created) continue

    const payload = created.payload ?? {}
    const signatories = created.signatories ?? []

    const sender = payload['sender'] as string | undefined
    const receiver = payload['receiver'] as string | undefined
    const amount = payload['amount'] as string | undefined

    if (sender || receiver) {
      const kind: 'send' | 'receive' = sender === partyId ? 'send' : 'receive'
      const counterparty = kind === 'send' ? (receiver ?? '') : (sender ?? '')
      return { txId, commandId, timestamp, kind, amount: amount ?? '0', counterparty }
    }

    if (signatories.length > 0) {
      const kind: 'send' | 'receive' = signatories.includes(partyId) ? 'send' : 'receive'
      const counterparty = signatories.find((s) => s !== partyId) ?? ''
      return { txId, commandId, timestamp, kind, amount: '0', counterparty }
    }
  }

  return null
}

export function useTransactions() {
  const partyId = useWalletStore((s) => s.partyId)

  return useQuery({
    queryKey: ['transactions', partyId],
    queryFn: async () => {
      const effectivePartyId =
        partyId ?? localStorage.getItem('wallet-party-id') ?? ''
      if (!effectivePartyId) return []
      const data = await getTransactions(effectivePartyId)
      return (data.transactions ?? [])
        .map((tx) => parseTransaction(tx, effectivePartyId))
        .filter((tx): tx is Transaction => tx !== null)
    },
    refetchInterval: 60_000,
    enabled: Boolean(partyId ?? localStorage.getItem('wallet-party-id')),
  })
}

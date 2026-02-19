import { Alert, Box, CircularProgress, Container, List, Typography } from '@mui/material'
import TxRow from '../components/TxRow'
import { useTransactions } from '../hooks/useTransactions'
import { useWalletStore } from '../store/walletStore'

export default function HistoryView() {
  const partyId = useWalletStore((s) => s.partyId) ?? localStorage.getItem('wallet-party-id')
  const { data: transactions = [], isLoading, error } = useTransactions()

  if (!partyId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Setup required
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your Canton wallet to view transaction history.
        </Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Transaction History
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load transactions:{' '}
          {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      )}

      {!isLoading && !error && transactions.length === 0 && (
        <Alert severity="info">No transactions found.</Alert>
      )}

      {transactions.length > 0 && (
        <List disablePadding>
          {transactions.map((tx) => (
            <TxRow
              key={tx.txId}
              txId={tx.txId}
              timestamp={tx.timestamp}
              kind={tx.kind}
              amount={tx.amount}
              counterparty={tx.counterparty}
            />
          ))}
        </List>
      )}
    </Container>
  )
}

import { Alert, Box, Button, CircularProgress, Container, Divider, Stack, Typography } from '@mui/material'
import NetworkSelector from '../components/NetworkSelector'
import HoldingCard from '../components/HoldingCard'
import { useHoldings } from '../hooks/useHoldings'
import { useWalletStore } from '../store/walletStore'

export default function WalletView() {
  const partyId = useWalletStore((s) => s.partyId)
  const { data: holdings = [], isLoading, error } = useHoldings()

  if (!partyId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Setup required
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create your Canton wallet to view your holdings.
        </Typography>
        <Button variant="contained" href="/setup">
          Set Up Wallet
        </Button>
      </Container>
    )
  }

  const totalByUnit: Record<string, number> = {}
  for (const h of holdings) {
    const key = h.unit || 'Unknown'
    totalByUnit[key] = (totalByUnit[key] ?? 0) + parseFloat(h.amount)
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Canton Wallet</Typography>
        <NetworkSelector />
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 3, wordBreak: 'break-all' }}
      >
        {partyId}
      </Typography>

      {Object.keys(totalByUnit).length > 0 && (
        <>
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Balance
            </Typography>
            {Object.entries(totalByUnit).map(([unit, total]) => (
              <Box key={unit} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  {unit}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {total}
                </Typography>
              </Box>
            ))}
          </Box>
          <Divider sx={{ mb: 3 }} />
        </>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load holdings:{' '}
          {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      )}

      {!isLoading && !error && holdings.length === 0 && (
        <Alert severity="info">No holdings found on this network.</Alert>
      )}

      <Stack spacing={2}>
        {holdings.map((holding) => (
          <HoldingCard
            key={holding.contractId}
            contractId={holding.contractId}
            templateId={holding.templateId}
            amount={holding.amount}
            unit={holding.unit}
          />
        ))}
      </Stack>
    </Container>
  )
}

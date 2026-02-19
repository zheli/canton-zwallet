import { Box, Card, CardContent, Typography } from '@mui/material'

interface HoldingCardProps {
  contractId: string
  templateId: string
  amount: string
  unit: string
}

export default function HoldingCard({ amount, unit, templateId }: HoldingCardProps) {
  const tokenName = unit || templateId.split(':').pop() || 'Token'

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="h5" component="span" fontWeight="medium">
            {amount}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {tokenName}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {templateId}
        </Typography>
      </CardContent>
    </Card>
  )
}

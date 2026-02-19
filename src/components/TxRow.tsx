import { ListItem, ListItemText, Typography, Box, Chip } from '@mui/material'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

export interface TxRowProps {
  txId: string
  timestamp: string
  kind: 'send' | 'receive'
  amount: string
  counterparty: string
}

export default function TxRow({ timestamp, kind, amount, counterparty }: TxRowProps) {
  const isSend = kind === 'send'
  const label = isSend ? 'Sent' : 'Received'
  const color = isSend ? 'error' : 'success'
  const Icon = isSend ? ArrowUpwardIcon : ArrowDownwardIcon
  const amountPrefix = isSend ? '-' : '+'

  const formattedTime = new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  return (
    <ListItem
      divider
      sx={{ alignItems: 'flex-start', px: 0 }}
    >
      <Box sx={{ mr: 1.5, mt: 0.5, color: `${color}.main` }}>
        <Icon fontSize="small" />
      </Box>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip label={label} size="small" color={color} variant="outlined" />
            <Typography variant="body2" fontWeight="medium" color={`${color}.main`}>
              {amountPrefix}
              {amount}
            </Typography>
          </Box>
        }
        secondary={
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {formattedTime}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ wordBreak: 'break-all' }}
            >
              {isSend ? 'To: ' : 'From: '}
              {counterparty || '—'}
            </Typography>
          </Box>
        }
      />
    </ListItem>
  )
}

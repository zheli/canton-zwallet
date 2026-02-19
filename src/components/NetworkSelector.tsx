import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import { type NetworkName, NETWORKS } from '../config/networks'
import { useNetworkStore } from '../store/networkStore'

export default function NetworkSelector() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const {
    selectedNetwork,
    customValidatorUrl,
    customLedgerApiUrl,
    jwtToken,
    setSelectedNetwork,
    setCustomValidatorUrl,
    setCustomLedgerApiUrl,
    setJwtToken,
    getValidatorUrl,
    getLedgerApiUrl,
  } = useNetworkStore()

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={NETWORKS[selectedNetwork].label}
          size="small"
          color="primary"
          variant="outlined"
        />
        <Tooltip title="Network settings">
          <IconButton size="small" onClick={() => setDrawerOpen(true)}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 360, p: 3 } }}
      >
        <Typography variant="h6" gutterBottom>
          Network Settings
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>Network</InputLabel>
            <Select<NetworkName>
              value={selectedNetwork}
              label="Network"
              onChange={(e) => setSelectedNetwork(e.target.value as NetworkName)}
            >
              {Object.values(NETWORKS).map((net) => (
                <MenuItem key={net.name} value={net.name}>
                  {net.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider>
            <Typography variant="caption" color="text.secondary">
              Overrides (leave blank for defaults)
            </Typography>
          </Divider>

          <TextField
            label="Custom Validator URL"
            value={customValidatorUrl}
            onChange={(e) => setCustomValidatorUrl(e.target.value)}
            placeholder={NETWORKS[selectedNetwork].validatorUrl}
            size="small"
            fullWidth
          />

          <TextField
            label="Custom Ledger JSON API URL"
            value={customLedgerApiUrl}
            onChange={(e) => setCustomLedgerApiUrl(e.target.value)}
            placeholder={NETWORKS[selectedNetwork].ledgerApiUrl}
            size="small"
            fullWidth
          />

          <TextField
            label="JWT Token"
            value={jwtToken}
            onChange={(e) => setJwtToken(e.target.value)}
            type="password"
            size="small"
            fullWidth
            multiline
            minRows={2}
          />

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Effective Validator URL
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {getValidatorUrl()}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Effective Ledger API URL
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {getLedgerApiUrl()}
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={() => setDrawerOpen(false)}
            fullWidth
          >
            Done
          </Button>
        </Stack>
      </Drawer>
    </>
  )
}

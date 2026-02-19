import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { useHoldings, type Holding } from '../hooks/useHoldings'
import { useWalletStore } from '../store/walletStore'
import { getRegistryUrl, getTransferFactory } from '../api/registry'
import { prepareCommand, submitTransfer } from '../api/ledger'
import { deriveKeyFromPasskey } from '../crypto/passkey'
import { seedToKeypair, signBytes } from '../crypto/ed25519'

type SendState = 'idle' | 'confirming' | 'sending' | 'success' | 'error'

function base64UrlToArrayBuffer(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

async function derivePrivateKey(): Promise<Uint8Array> {
  const keyStorage = localStorage.getItem('wallet-key-storage')
  if (keyStorage === 'aes-gcm') {
    throw new Error('Password-protected wallets require password unlock — not yet supported in send flow')
  }
  const credentialIdB64url = localStorage.getItem('wallet-credential-id') ?? ''
  if (!credentialIdB64url) {
    throw new Error('No wallet credential found. Please set up your wallet first.')
  }
  const credentialIdBuf = base64UrlToArrayBuffer(credentialIdB64url)
  return deriveKeyFromPasskey(credentialIdBuf)
}

export default function SendView() {
  const storePartyId = useWalletStore((s) => s.partyId)
  const partyId = storePartyId ?? localStorage.getItem('wallet-party-id') ?? ''

  const { data: holdings = [] } = useHoldings()

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedHoldingId, setSelectedHoldingId] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [txId, setTxId] = useState('')

  // Unique tokens (by unit) for the selector
  const uniqueHoldings: Holding[] = []
  const seenUnits = new Set<string>()
  for (const h of holdings) {
    if (!seenUnits.has(h.unit)) {
      seenUnits.add(h.unit)
      uniqueHoldings.push(h)
    }
  }

  const selectedHolding = holdings.find((h) => h.contractId === selectedHoldingId) ?? null

  if (!partyId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Setup required
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your Canton wallet to send tokens.
        </Typography>
      </Container>
    )
  }

  const canSubmit =
    recipient.trim() !== '' &&
    amount.trim() !== '' &&
    parseFloat(amount) > 0 &&
    selectedHoldingId !== ''

  async function handleSend() {
    if (!selectedHolding) return
    setSendState('sending')
    setErrorMsg('')
    try {
      // 1. Discover transfer factory
      const registryUrl = getRegistryUrl()
      const factoryId = await getTransferFactory(registryUrl)

      // 2. Prepare transfer command
      const prepareResp = await prepareCommand({
        actAs: [partyId],
        commands: [
          {
            ExerciseCommand: {
              template_id: 'Splice.Api.Token.TransferFactory:TransferFactory',
              contract_id: factoryId,
              choice: 'TransferFactory_Transfer',
              choice_argument: {
                instructors: [partyId],
                inputs: [
                  {
                    holdingCid: selectedHolding.contractId,
                    amount: amount,
                  },
                ],
                outputs: [
                  {
                    receiver: recipient.trim(),
                    amount: amount,
                    lock: null,
                  },
                ],
              },
            },
          },
        ],
      })

      // 3. Re-derive key from passkey (triggers WebAuthn browser prompt)
      const seed = await derivePrivateKey()
      const keypair = await seedToKeypair(seed)

      // 4. Hash prepared transaction bytes and sign
      const txBytes = Uint8Array.from(atob(prepareResp.transaction), (c) => c.charCodeAt(0))
      const hashBuffer = await crypto.subtle.digest('SHA-256', txBytes)
      const hashBytes = new Uint8Array(hashBuffer)
      const sigBytes = await signBytes(hashBytes, keypair.privateKey)
      const sigBase64 = uint8ArrayToBase64(sigBytes)

      // 5. Submit signed transfer
      const submitResp = await submitTransfer({
        preparedTxBytes: prepareResp.transaction,
        partySignatures: [{ party: partyId, signature: sigBase64 }],
      })

      setTxId(submitResp.transactionId ?? '')
      setSendState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setSendState('error')
    }
  }

  if (sendState === 'success') {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          Transfer submitted successfully!
        </Alert>
        {txId && (
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            Transaction ID: {txId}
          </Typography>
        )}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => {
              setSendState('idle')
              setRecipient('')
              setAmount('')
              setSelectedHoldingId('')
              setTxId('')
            }}
          >
            Send Another
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Send Tokens
      </Typography>

      {sendState === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSendState('idle')}>
          {errorMsg}
        </Alert>
      )}

      <Box component="form" noValidate sx={{ mt: 2 }}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="token-select-label">Token</InputLabel>
          <Select
            labelId="token-select-label"
            label="Token"
            value={selectedHoldingId}
            onChange={(e) => setSelectedHoldingId(e.target.value)}
            disabled={holdings.length === 0}
          >
            {uniqueHoldings.map((h) => (
              <MenuItem key={h.contractId} value={h.contractId}>
                {h.unit} (balance: {holdings
                  .filter((x) => x.unit === h.unit)
                  .reduce((acc, x) => acc + parseFloat(x.amount), 0)
                  .toString()})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Recipient Party ID"
          fullWidth
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          sx={{ mb: 3 }}
          placeholder="e.g. Alice::12345..."
          helperText="Canton party identifier of the recipient"
        />

        <TextField
          label="Amount"
          fullWidth
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          sx={{ mb: 3 }}
          inputProps={{ inputMode: 'decimal' }}
          helperText={selectedHolding ? `Available: ${selectedHolding.amount} ${selectedHolding.unit}` : ''}
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={!canSubmit || sendState === 'sending'}
          onClick={() => setSendState('confirming')}
        >
          Review Transfer
        </Button>
      </Box>

      {/* Confirm dialog */}
      <Dialog open={sendState === 'confirming'} onClose={() => setSendState('idle')} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Transfer</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Amount</Typography>
              <Typography variant="body2" fontWeight="medium">
                {amount} {selectedHolding?.unit}
              </Typography>
            </Box>
            <Divider />
            <Typography variant="caption" color="text.secondary">To</Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {recipient}
            </Typography>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              You will be prompted to authenticate with your passkey to sign this transaction.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendState('idle')}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={sendState === 'sending'}
          >
            {sendState === 'sending' ? <CircularProgress size={20} /> : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sending overlay */}
      {sendState === 'sending' && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.4)',
            zIndex: 9999,
            gap: 2,
          }}
        >
          <CircularProgress color="inherit" sx={{ color: 'white' }} />
          <Typography color="white" variant="body2">
            Signing and submitting transfer…
          </Typography>
        </Box>
      )}
    </Container>
  )
}

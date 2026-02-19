import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import NetworkSelector from '../components/NetworkSelector'
import { prepareExternalPartyTopology, submitExternalPartyTopology } from '../api/validator'
import { createPasskey } from '../crypto/passkey'
import { seedToKeypair, pubkeyToBase58 } from '../crypto/ed25519'
import { storeEncryptedKey } from '../crypto/storage'

const STEPS = ['Create Wallet', 'Network', 'Party Info', 'Register']

type WalletStep = 'idle' | 'creating' | 'need-password' | 'storing' | 'done' | 'error'

export default function SetupView() {
  const [activeStep, setActiveStep] = useState(0)

  // Phase 2: Passkey / crypto state
  const [walletStep, setWalletStep] = useState<WalletStep>('idle')
  const [pendingSeed, setPendingSeed] = useState<Uint8Array<ArrayBuffer> | null>(null)
  const [pendingCredIdB64, setPendingCredIdB64] = useState<string>('')
  const [password, setPassword] = useState('')

  // Phase 3: Party / registration state
  const [partyId, setPartyId] = useState('')
  const [partyName, setPartyName] = useState('')
  const [participantId, setParticipantId] = useState('')
  const [transaction, setTransaction] = useState('')
  const [transactionHash, setTransactionHash] = useState('')
  const [signedBy, setSignedBy] = useState('')
  const [signature, setSignature] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleCreateWallet() {
    setError('')
    setWalletStep('creating')
    try {
      const result = await createPasskey()
      if (result.prfSupported) {
        const { publicKey } = await seedToKeypair(result.seed)
        const pid = pubkeyToBase58(publicKey)
        localStorage.setItem('wallet-credential-id', result.credentialIdB64)
        localStorage.setItem('wallet-party-id', pid)
        setPartyId(pid)
        setSignedBy(pid)
        setWalletStep('done')
      } else {
        const randomSeed = crypto.getRandomValues(new Uint8Array(32))
        setPendingSeed(randomSeed)
        setPendingCredIdB64(result.credentialIdB64)
        setWalletStep('need-password')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setWalletStep('error')
    }
  }

  async function handlePasswordSubmit() {
    if (!password || password.length < 8 || !pendingSeed) return
    setError('')
    setWalletStep('storing')
    try {
      await storeEncryptedKey(pendingSeed, password)
      const { publicKey } = await seedToKeypair(pendingSeed)
      const pid = pubkeyToBase58(publicKey)
      localStorage.setItem('wallet-credential-id', pendingCredIdB64)
      localStorage.setItem('wallet-party-id', pid)
      localStorage.setItem('wallet-key-storage', 'aes-gcm')
      setPartyId(pid)
      setSignedBy(pid)
      setWalletStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setWalletStep('error')
    }
  }

  const handlePrepare = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await prepareExternalPartyTopology({
        party_id: partyId,
        party_name: partyName,
        participant_id: participantId || undefined,
      })
      setTransaction(result.transaction)
      setTransactionHash(result.transaction_hash)
      setActiveStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Prepare failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      await submitExternalPartyTopology({
        transaction,
        signed_by: signedBy,
        signature,
      })
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="success">
          Party registered successfully! You can now use your Canton wallet.
        </Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" href="/">
            Go to Wallet
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Canton Wallet Setup</Typography>
        <NetworkSelector />
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Step 0: Create Wallet (Phase 2 — passkey + Ed25519 key derivation) */}
      {activeStep === 0 && (
        <Stack spacing={3}>
          {walletStep === 'idle' && (
            <>
              <Typography variant="body2" color="text.secondary">
                Create a passkey to secure your Canton wallet. Your Ed25519 private key
                is derived from the passkey using WebAuthn PRF — it never leaves your device.
              </Typography>
              <Button variant="contained" size="large" fullWidth onClick={handleCreateWallet}>
                Create Passkey Wallet
              </Button>
            </>
          )}

          {(walletStep === 'creating' || walletStep === 'storing') && (
            <Stack alignItems="center" spacing={2}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                {walletStep === 'creating'
                  ? 'Creating passkey — follow your browser prompt…'
                  : 'Encrypting and storing key…'}
              </Typography>
            </Stack>
          )}

          {walletStep === 'need-password' && (
            <>
              <Alert severity="info">
                Your authenticator does not support WebAuthn PRF. Your key will be
                encrypted with a password and stored locally instead.
              </Alert>
              <TextField
                label="Wallet Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputProps={{ minLength: 8 }}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handlePasswordSubmit}
                disabled={password.length < 8}
              >
                Set Password &amp; Create Wallet
              </Button>
            </>
          )}

          {walletStep === 'done' && (
            <>
              <Alert severity="success">Wallet created!</Alert>
              <Typography variant="body2" color="text.secondary">
                Your Canton Party ID:
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all',
                  bgcolor: 'action.hover',
                }}
              >
                {partyId}
              </Paper>
              <Button variant="contained" fullWidth onClick={() => setActiveStep(1)}>
                Next: Choose Network
              </Button>
            </>
          )}

          {walletStep === 'error' && (
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setWalletStep('idle')
                setError('')
              }}
            >
              Try Again
            </Button>
          )}
        </Stack>
      )}

      {/* Step 1: Network (Phase 3) */}
      {activeStep === 1 && (
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Choose the Canton network you want to connect to. You can change this
            later from the network settings icon.
          </Typography>
          <NetworkSelector />
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={() => setActiveStep(0)} fullWidth>
              Back
            </Button>
            <Button variant="contained" onClick={() => setActiveStep(2)} fullWidth>
              Next
            </Button>
          </Stack>
        </Stack>
      )}

      {/* Step 2: Party Info (Phase 3) */}
      {activeStep === 2 && (
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Confirm your Canton party details. The party ID is pre-filled from your passkey.
          </Typography>

          <TextField
            label="Party ID"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            required
            fullWidth
            helperText="Derived from your passkey keypair"
          />

          <TextField
            label="Display Name"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Participant ID (optional)"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            fullWidth
          />

          <Divider />

          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={() => setActiveStep(1)} fullWidth>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handlePrepare}
              disabled={!partyId || !partyName || loading}
              fullWidth
            >
              {loading ? <CircularProgress size={20} /> : 'Prepare Registration'}
            </Button>
          </Stack>
        </Stack>
      )}

      {/* Step 3: Register (Phase 3) */}
      {activeStep === 3 && (
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Sign the prepared transaction with your party key and submit.
          </Typography>

          <TextField
            label="Transaction (prepared)"
            value={transaction}
            InputProps={{ readOnly: true }}
            multiline
            minRows={3}
            fullWidth
            size="small"
          />

          <TextField
            label="Transaction Hash"
            value={transactionHash}
            InputProps={{ readOnly: true }}
            fullWidth
            size="small"
          />

          <Divider>
            <Typography variant="caption">Your signature</Typography>
          </Divider>

          <TextField
            label="Signed By (party ID)"
            value={signedBy}
            onChange={(e) => setSignedBy(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Signature (base64)"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            required
            fullWidth
            multiline
            minRows={2}
          />

          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={() => setActiveStep(2)} fullWidth>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!signedBy || !signature || loading}
              fullWidth
            >
              {loading ? <CircularProgress size={20} /> : 'Submit Registration'}
            </Button>
          </Stack>
        </Stack>
      )}
    </Container>
  )
}

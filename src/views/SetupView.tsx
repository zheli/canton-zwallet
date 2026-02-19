import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import NetworkSelector from '../components/NetworkSelector'
import {
  prepareExternalPartyTopology,
  submitExternalPartyTopology,
} from '../api/validator'

const STEPS = ['Network', 'Party Info', 'Register']

export default function SetupView() {
  const [activeStep, setActiveStep] = useState(0)

  // Party info
  const [partyId, setPartyId] = useState('')
  const [partyName, setPartyName] = useState('')
  const [participantId, setParticipantId] = useState('')

  // Registration state
  const [transaction, setTransaction] = useState('')
  const [transactionHash, setTransactionHash] = useState('')
  const [signedBy, setSignedBy] = useState('')
  const [signature, setSignature] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
      setActiveStep(2)
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

      {activeStep === 0 && (
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Choose the Canton network you want to connect to. You can change this
            later from the network settings icon.
          </Typography>
          <NetworkSelector />
          <Button
            variant="contained"
            onClick={() => setActiveStep(1)}
            fullWidth
          >
            Next
          </Button>
        </Stack>
      )}

      {activeStep === 1 && (
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Enter your Canton party details. The party ID must match your
            on-ledger identity.
          </Typography>

          <TextField
            label="Party ID"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            required
            fullWidth
            helperText="e.g. alice::12abc..."
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
            <Button variant="outlined" onClick={() => setActiveStep(0)} fullWidth>
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

      {activeStep === 2 && (
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
            <Button variant="outlined" onClick={() => setActiveStep(1)} fullWidth>
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

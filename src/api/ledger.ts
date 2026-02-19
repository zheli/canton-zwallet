import axios from 'axios'
import { useNetworkStore } from '../store/networkStore'

function getHeaders() {
  const { jwtToken } = useNetworkStore.getState()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`
  }
  return headers
}

// Active contracts / holdings

export interface ActiveContractsRequest {
  filter: {
    filtersByParty: Record<
      string,
      { cumulative: { templateFilters: Array<{ templateId: string }> } }
    >
  }
  verbose?: boolean
}

export interface ContractPayload {
  contractId: string
  templateId: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface ActiveContractsResponse {
  activeContracts: ContractPayload[]
}

export async function getActiveContracts(
  request: ActiveContractsRequest,
): Promise<ActiveContractsResponse> {
  const { getLedgerApiUrl } = useNetworkStore.getState()
  const baseUrl = getLedgerApiUrl()
  const response = await axios.post<ActiveContractsResponse>(
    `${baseUrl}/v1/state/active-contracts`,
    request,
    { headers: getHeaders() },
  )
  return response.data
}

// Interface filter active contracts (for Splice token holdings)

export interface InterfaceFilterRequest {
  filter: {
    interfaceFilters: Array<{
      interfaceId: string
      includeCreateArgumentsBlob: boolean
    }>
  }
  activeAtOffset: string
  verbose: boolean
}

export async function getActiveContractsByInterface(
  request: InterfaceFilterRequest,
): Promise<ActiveContractsResponse> {
  const { getLedgerApiUrl } = useNetworkStore.getState()
  const baseUrl = getLedgerApiUrl()
  const response = await axios.post<ActiveContractsResponse>(
    `${baseUrl}/v1/state/active-contracts`,
    request,
    { headers: getHeaders() },
  )
  return response.data
}

// Commands: prepare + submit

export interface CommandPrepareRequest {
  actAs: string[]
  readAs?: string[]
  commands: Array<Record<string, unknown>>
  workflowId?: string
  commandId?: string
  deduplicationPeriod?: { seconds: number }
  minLedgerTimeAbs?: string
  minLedgerTimeRel?: { seconds: number }
  submissionId?: string
  packageIdSelectionPreference?: string[]
}

export interface CommandPrepareResponse {
  transaction: string
}

export interface CommandSubmitRequest {
  transaction: string
  signed_by: string
  signature: string
}

export interface CommandSubmitResponse {
  transactionId: string
}

export async function prepareCommand(
  request: CommandPrepareRequest,
): Promise<CommandPrepareResponse> {
  const { getLedgerApiUrl } = useNetworkStore.getState()
  const baseUrl = getLedgerApiUrl()
  const response = await axios.post<CommandPrepareResponse>(
    `${baseUrl}/v1/commands/prepare`,
    request,
    { headers: getHeaders() },
  )
  return response.data
}

export async function submitCommand(
  request: CommandSubmitRequest,
): Promise<CommandSubmitResponse> {
  const { getLedgerApiUrl } = useNetworkStore.getState()
  const baseUrl = getLedgerApiUrl()
  const response = await axios.post<CommandSubmitResponse>(
    `${baseUrl}/v1/commands/submit`,
    request,
    { headers: getHeaders() },
  )
  return response.data
}

// Transfer submit (party-signature format)

export interface TransferSubmitRequest {
  preparedTxBytes: string
  partySignatures: Array<{
    party: string
    signature: string
  }>
}

export async function submitTransfer(
  request: TransferSubmitRequest,
): Promise<CommandSubmitResponse> {
  const { getLedgerApiUrl } = useNetworkStore.getState()
  const baseUrl = getLedgerApiUrl()
  const response = await axios.post<CommandSubmitResponse>(
    `${baseUrl}/v1/commands/submit`,
    request,
    { headers: getHeaders() },
  )
  return response.data
}

// Transaction history

export interface LedgerTransactionEvent {
  created?: {
    templateId?: string
    payload?: Record<string, unknown>
    signatories?: string[]
  }
  archived?: {
    templateId?: string
  }
}

export interface LedgerTransaction {
  transactionId?: string
  commandId?: string
  effectiveAt?: string
  events?: LedgerTransactionEvent[]
}

export interface TransactionsResponse {
  transactions: LedgerTransaction[]
}

export async function getTransactions(partyId: string): Promise<TransactionsResponse> {
  const { getLedgerApiUrl } = useNetworkStore.getState()
  const baseUrl = getLedgerApiUrl()
  const response = await axios.get<TransactionsResponse>(`${baseUrl}/v1/transactions`, {
    headers: getHeaders(),
    params: { parties: partyId },
  })
  return response.data
}

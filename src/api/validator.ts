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

export interface PrepareTopologyRequest {
  party_id: string
  party_name: string
  participant_id?: string
}

export interface PrepareTopologyResponse {
  transaction: string
  transaction_hash: string
}

export interface SubmitTopologyRequest {
  transaction: string
  signed_by: string
  signature: string
}

export interface SubmitTopologyResponse {
  status: string
}

export async function prepareExternalPartyTopology(
  request: PrepareTopologyRequest,
): Promise<PrepareTopologyResponse> {
  const { getValidatorUrl } = useNetworkStore.getState()
  const baseUrl = getValidatorUrl()
  const response = await axios.post<PrepareTopologyResponse>(
    `${baseUrl}/v0/admin/external-party/topology/prepare`,
    request,
    { headers: getHeaders() },
  )
  return response.data
}

export async function submitExternalPartyTopology(
  request: SubmitTopologyRequest,
): Promise<SubmitTopologyResponse> {
  const { getValidatorUrl } = useNetworkStore.getState()
  const baseUrl = getValidatorUrl()
  const response = await axios.post<SubmitTopologyResponse>(
    `${baseUrl}/v0/admin/external-party/topology/submit`,
    request,
    { headers: getHeaders() },
  )
  return response.data
}

/**
 * WebAuthn credential creation with PRF extension.
 * PRF eval derives a deterministic 32-byte seed from the passkey.
 */

import { browserSupportsWebAuthn, bufferToBase64URLString } from '@simplewebauthn/browser'

// Fixed salt for deterministic PRF evaluation across sessions.
// Use length constructor so TS infers Uint8Array<ArrayBuffer>.
const PRF_SALT_STR = 'canton-zwallet-prf-v1'
const PRF_SALT = (() => {
  const bytes = new Uint8Array(PRF_SALT_STR.length)
  for (let i = 0; i < PRF_SALT_STR.length; i++) bytes[i] = PRF_SALT_STR.charCodeAt(i)
  return bytes
})()

// Cast result of getClientExtensionResults() through unknown to avoid
// the DOM lib's AuthenticationExtensionsPRFValues.first: BufferSource intersection
// producing BufferSource & ArrayBuffer, which Uint8Array constructor can't accept.
type PRFClientExtResults = {
  prf?: { results?: { first?: ArrayBuffer; second?: ArrayBuffer }; enabled?: boolean }
}

export interface PasskeyResult {
  /** Raw credential ID as ArrayBuffer for use in allowCredentials */
  credentialIdBuf: ArrayBuffer
  /** Base64URL-encoded credential ID for storage */
  credentialIdB64: string
  /** 32-byte PRF-derived seed, or empty (length 0) if PRF not supported */
  seed: Uint8Array<ArrayBuffer>
  prfSupported: boolean
}

/**
 * Create a new WebAuthn passkey with PRF extension.
 * Attempts to evaluate PRF during registration; if not supported,
 * falls back to an authentication assertion for PRF eval.
 */
export async function createPasskey(): Promise<PasskeyResult> {
  if (!browserSupportsWebAuthn()) {
    throw new Error('WebAuthn is not supported in this browser')
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userId = crypto.getRandomValues(new Uint8Array(16))

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Canton Zwallet',
        id: window.location.hostname || 'localhost',
      },
      user: {
        id: userId,
        name: 'zwallet-user',
        displayName: 'Zwallet User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 },  // RS256
      ],
      authenticatorSelection: {
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required',
      },
      extensions: {
        prf: { eval: { first: PRF_SALT } },
      } as AuthenticationExtensionsClientInputs,
    },
  }) as PublicKeyCredential | null

  if (!credential) {
    throw new Error('Passkey creation was cancelled or failed')
  }

  const credentialIdBuf: ArrayBuffer = credential.rawId
  const credentialIdB64 = bufferToBase64URLString(credentialIdBuf)
  const extResults = credential.getClientExtensionResults() as unknown as PRFClientExtResults
  const prfFirst = extResults.prf?.results?.first

  if (prfFirst) {
    return {
      credentialIdBuf,
      credentialIdB64,
      seed: new Uint8Array(prfFirst) as Uint8Array<ArrayBuffer>,
      prfSupported: true,
    }
  }

  // PRF not evaluated during registration — try via authentication assertion
  return evalPRFViaAssertion(credentialIdBuf, credentialIdB64)
}

/**
 * Evaluate PRF via an authentication assertion.
 * Some authenticators only expose PRF during get(), not create().
 */
async function evalPRFViaAssertion(
  credentialIdBuf: ArrayBuffer,
  credentialIdB64: string,
): Promise<PasskeyResult> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: 'public-key', id: credentialIdBuf }],
      userVerification: 'required',
      extensions: {
        prf: { eval: { first: PRF_SALT } },
      } as AuthenticationExtensionsClientInputs,
    },
  }) as PublicKeyCredential | null

  if (!assertion) {
    throw new Error('Authentication assertion was cancelled or failed')
  }

  const extResults = assertion.getClientExtensionResults() as unknown as PRFClientExtResults
  const prfFirst = extResults.prf?.results?.first

  if (prfFirst) {
    return {
      credentialIdBuf,
      credentialIdB64,
      seed: new Uint8Array(prfFirst) as Uint8Array<ArrayBuffer>,
      prfSupported: true,
    }
  }

  // PRF not supported by this authenticator
  return {
    credentialIdBuf,
    credentialIdB64,
    seed: new Uint8Array(0),
    prfSupported: false,
  }
}

/**
 * Re-derive seed from an existing passkey using PRF.
 * Called on subsequent logins to unlock the wallet.
 */
export async function deriveKeyFromPasskey(credentialIdBuf: ArrayBuffer): Promise<Uint8Array<ArrayBuffer>> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: 'public-key', id: credentialIdBuf }],
      userVerification: 'required',
      extensions: {
        prf: { eval: { first: PRF_SALT } },
      } as AuthenticationExtensionsClientInputs,
    },
  }) as PublicKeyCredential | null

  if (!assertion) {
    throw new Error('Authentication assertion was cancelled or failed')
  }

  const extResults = assertion.getClientExtensionResults() as unknown as PRFClientExtResults
  const prfFirst = extResults.prf?.results?.first

  if (!prfFirst) {
    throw new Error('PRF evaluation failed — authenticator may not support PRF')
  }

  return new Uint8Array(prfFirst) as Uint8Array<ArrayBuffer>
}

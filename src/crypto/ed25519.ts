/**
 * Ed25519 operations: seed → keypair, sign bytes, pubkey → base58 party fingerprint.
 * Uses @noble/ed25519 (async API only — no external sha512 dependency needed).
 */

import * as ed from '@noble/ed25519'

// Base58 alphabet (Bitcoin/Canton convention)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export interface Ed25519Keypair {
  /** 32-byte private seed (the raw 32-byte input to Ed25519) */
  privateKey: Uint8Array
  /** 32-byte compressed public key */
  publicKey: Uint8Array
}

/**
 * Derive an Ed25519 keypair from a 32-byte seed.
 * In @noble/ed25519 v2, the private key IS the seed.
 */
export async function seedToKeypair(seed: Uint8Array): Promise<Ed25519Keypair> {
  if (seed.length !== 32) {
    throw new Error(`Expected 32-byte seed, got ${seed.length}`)
  }
  const publicKey = await ed.getPublicKeyAsync(seed)
  return { privateKey: seed, publicKey }
}

/**
 * Sign a message with Ed25519.
 * Returns 64-byte signature.
 */
export async function signBytes(
  message: Uint8Array,
  privateKey: Uint8Array,
): Promise<Uint8Array> {
  return ed.signAsync(message, privateKey)
}

/**
 * Verify an Ed25519 signature.
 */
export async function verifyBytes(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  return ed.verifyAsync(signature, message, publicKey)
}

/**
 * Encode a public key as a base58 party fingerprint.
 * This is the Canton party ID format.
 */
export function pubkeyToBase58(pubkey: Uint8Array): string {
  return base58Encode(pubkey)
}

/**
 * Encode bytes as base58 (Bitcoin alphabet).
 */
function base58Encode(bytes: Uint8Array): string {
  // Count leading zero bytes
  let leadingZeros = 0
  for (const b of bytes) {
    if (b !== 0) break
    leadingZeros++
  }

  // Convert byte array to big integer
  let num = BigInt(0)
  for (const b of bytes) {
    num = num * BigInt(256) + BigInt(b)
  }

  // Convert to base58 digits
  let result = ''
  const base = BigInt(58)
  while (num > BigInt(0)) {
    const remainder = num % base
    num = num / base
    result = BASE58_ALPHABET[Number(remainder)] + result
  }

  // Prepend '1' for each leading zero byte
  return '1'.repeat(leadingZeros) + result
}

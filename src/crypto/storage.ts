/**
 * IndexedDB fallback with AES-GCM encryption.
 * Used when the authenticator does not support the WebAuthn PRF extension.
 * The Ed25519 seed is encrypted with a key derived from a user password via PBKDF2.
 */

const DB_NAME = 'canton-zwallet'
const DB_VERSION = 1
const STORE_NAME = 'keys'
const KEY_RECORD_ID = 'wallet-seed'

interface StoredKeyRecord {
  id: string
  /** AES-GCM encrypted seed */
  encryptedSeed: ArrayBuffer
  /** 12-byte IV for AES-GCM, serialized as plain array for IndexedDB */
  iv: number[]
  /** 16-byte salt for PBKDF2, serialized as plain array for IndexedDB */
  salt: number[]
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`))
  })
}

/**
 * Derive an AES-256-GCM key from a user password using PBKDF2-SHA-256.
 */
async function deriveAESKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt and store the Ed25519 seed in IndexedDB.
 * Call this when PRF is not available and the user has provided a password.
 */
export async function storeEncryptedKey(seed: Uint8Array<ArrayBuffer>, password: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const aesKey = await deriveAESKey(password, salt)
  const encryptedSeed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, seed)

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const record: StoredKeyRecord = {
      id: KEY_RECORD_ID,
      encryptedSeed,
      // Serialize typed arrays as plain number arrays for reliable IndexedDB storage
      iv: Array.from(iv),
      salt: Array.from(salt),
    }
    const request = store.put(record)
    request.onsuccess = () => resolve()
    request.onerror = () =>
      reject(new Error(`Failed to store key: ${request.error?.message}`))
  })
}

/**
 * Load and decrypt the stored Ed25519 seed from IndexedDB.
 * Returns null if no key has been stored.
 * Throws if the password is wrong (AES-GCM auth tag mismatch).
 */
export async function loadEncryptedKey(password: string): Promise<Uint8Array | null> {
  const db = await openDB()
  const record = await new Promise<StoredKeyRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(KEY_RECORD_ID)
    request.onsuccess = () => resolve(request.result as StoredKeyRecord | undefined)
    request.onerror = () =>
      reject(new Error(`Failed to read key: ${request.error?.message}`))
  })

  if (!record) return null

  // Reconstruct typed arrays from serialized number arrays
  const salt = new Uint8Array(record.salt)
  const iv = new Uint8Array(record.iv)
  const aesKey = await deriveAESKey(password, salt)
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      record.encryptedSeed,
    )
    return new Uint8Array(decrypted)
  } catch {
    throw new Error('Decryption failed — incorrect password')
  }
}

/**
 * Check whether an encrypted key has been stored in IndexedDB.
 */
export async function hasStoredKey(): Promise<boolean> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.count(KEY_RECORD_ID)
    request.onsuccess = () => resolve(request.result > 0)
    request.onerror = () =>
      reject(new Error(`Failed to check stored key: ${request.error?.message}`))
  })
}

/**
 * Delete the stored key from IndexedDB (e.g., on wallet reset).
 */
export async function deleteStoredKey(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(KEY_RECORD_ID)
    request.onsuccess = () => resolve()
    request.onerror = () =>
      reject(new Error(`Failed to delete key: ${request.error?.message}`))
  })
}

/**
 * Simple Crypto Utility using Web Crypto API
 * Uses PBKDF2 for key derivation and AES-GCM for encryption.
 */

// Configuration
const PBKDF2_ITERATIONS = 310000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // 12 bytes is recommended for GCM
const KEY_LENGTH = 256;

// Helpers for Hex conversion
export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBuffer(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g);
  if (!match) return new Uint8Array();
  return new Uint8Array(match.map(byte => parseInt(byte, 16)));
}

export function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Derives a CryptoKey from a password and salt.
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts data using a CryptoKey.
 */
export async function encryptData(key: CryptoKey, text: string): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    enc.encode(text)
  );

  return {
    iv: iv,
    ciphertext: new Uint8Array(ciphertextBuffer)
  };
}

/**
 * Decrypts data using a CryptoKey.
 */
export async function decryptData(key: CryptoKey, iv: Uint8Array, ciphertext: Uint8Array): Promise<string> {
  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      ciphertext
    );
    
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (e) {
    throw new Error("Decryption failed. Wrong password?");
  }
}

/**
 * Encrypts text using a CryptoKey.
 * Returns hex strings for storage.
 */
export async function encryptWithKey(text: string, key: CryptoKey): Promise<{ iv: string; ciphertext: string }> {
  const { iv, ciphertext } = await encryptData(key, text);

  return {
    iv: bufferToHex(iv),
    ciphertext: bufferToHex(ciphertext)
  };
}

/**
 * Decrypts ciphertext using a CryptoKey.
 * Expects hex strings.
 */
export async function decryptWithKey(ivHex: string, ciphertextHex: string, key: CryptoKey): Promise<string> {
  const iv = hexToBuffer(ivHex);
  const ciphertext = hexToBuffer(ciphertextHex);
  
  return decryptData(key, iv, ciphertext);
}

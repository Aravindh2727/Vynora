/**
 * Vynora Secure Client-Side Vault Cryptography Engine
 * Uses Web Crypto API (SubtleCrypto) for industry-standard PBKDF2 key derivation
 * and AES-GCM (256-bit) authenticated encryption.
 * Master keys and decrypted credentials NEVER leave client memory and are never sent to Firestore.
 */

// Helper to convert Uint8Array to Base64
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 to Uint8Array
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 1. Derives an AES-GCM 256-bit CryptoKey from a Master Password using PBKDF2 with 100,000 iterations.
 */
export async function deriveVaultKey(masterPassword: string, userSalt: string = 'vynora_vault_default_salt'): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(masterPassword);
  const saltBuffer = encoder.encode(userSalt);

  // Import raw password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive AES-GCM 256 key
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 2. Encrypts plaintext string using AES-GCM (256-bit).
 * Output format: base64(iv_12bytes + ciphertext)
 */
export async function encryptVaultItem(plaintext: string, key: CryptoKey): Promise<string> {
  if (!plaintext) return '';
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plaintext);

  // Generate 12-byte initialization vector (IV)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encodedData
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  return bufferToBase64(combined);
}

/**
 * 3. Decrypts AES-GCM base64 string.
 * Gracefully handles legacy unencrypted text if decryption fails.
 */
export async function decryptVaultItem(ciphertextBase64: string, key: CryptoKey): Promise<string> {
  if (!ciphertextBase64) return '';
  try {
    const combined = base64ToBuffer(ciphertextBase64);
    if (combined.length < 13) {
      // Too short to be encrypted with 12-byte IV, return as legacy plaintext
      return ciphertextBase64;
    }

    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    // If decryption errors out, it could be legacy plaintext
    return ciphertextBase64;
  }
}

/**
 * 4. Cryptographically Secure Password Generator
 */
export function generateSecurePassword(options: {
  length?: number;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  includeUppercase?: boolean;
} = {}): string {
  const length = options.length || 16;
  const includeNumbers = options.includeNumbers ?? true;
  const includeSymbols = options.includeSymbols ?? true;
  const includeUppercase = options.includeUppercase ?? true;

  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charset = lower;
  if (includeUppercase) charset += upper;
  if (includeNumbers) charset += numbers;
  if (includeSymbols) charset += symbols;

  const randomValues = new Uint32Array(length);
  window.crypto.getRandomValues(randomValues);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }

  return password;
}

/**
 * 5. Secure Clipboard Copy with Auto-Clear After Specified Seconds
 */
export async function copyToClipboardSecure(text: string, clearAfterSeconds: number = 30): Promise<void> {
  if (!navigator.clipboard) return;
  await navigator.clipboard.writeText(text);

  if (clearAfterSeconds > 0) {
    setTimeout(async () => {
      try {
        const currentText = await navigator.clipboard.readText();
        if (currentText === text) {
          await navigator.clipboard.writeText('');
        }
      } catch {
        // Permission might be denied or tab inactive, ignore
      }
    }, clearAfterSeconds * 1000);
  }
}

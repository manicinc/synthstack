/**
 * Encryption Service
 *
 * AES-256-GCM encryption for sensitive data like API keys.
 * Uses ENCRYPTION_KEY environment variable.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment
 * Key should be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for encryption');
  }

  // If key is hex-encoded (64 chars = 32 bytes), decode it
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // Otherwise, derive a key from the string using PBKDF2
  // Use a fixed salt for deterministic key derivation
  const salt = Buffer.from('synthstack-encryption-salt-v1', 'utf8');
  return crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt a plaintext string
 * Returns base64-encoded string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine iv, authTag, and ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(ciphertext, 'hex'),
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt a base64-encoded encrypted string
 * Expects format: iv:authTag:ciphertext (combined)
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encrypted, 'base64');

  // Extract iv, authTag, and ciphertext
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);

  return plaintext.toString('utf8');
}

/**
 * Generate a secure encryption key (for setup instructions)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get a hint for an API key (last 4 characters)
 */
export function getKeyHint(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) {
    return '****';
  }
  return `...${apiKey.slice(-4)}`;
}

/**
 * Validate encryption key is configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}

/**
 * Hash a value for comparison (without storing the original)
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

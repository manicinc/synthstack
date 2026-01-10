/**
 * @file services/__tests__/encryption.test.ts
 * @description Tests for encryption service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  generateEncryptionKey,
  getKeyHint,
  isEncryptionConfigured,
  hashValue,
} from '../encryption.js';

describe('Encryption Service', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a test encryption key (64 hex chars = 32 bytes)
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt an empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt a long string', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~\n\t\r';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt unicode characters', () => {
      const plaintext = '你好世界 🔐 مرحبا العالم';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt JSON string', () => {
      const data = { apiKey: 'sk-test-123', secret: 'my-secret' };
      const plaintext = JSON.stringify(data);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it('should produce different ciphertexts for same plaintext (due to random IV)', () => {
      const plaintext = 'Same message';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should produce base64 encoded output', () => {
      const plaintext = 'Test';
      const encrypted = encrypt(plaintext);

      // Base64 pattern
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should throw error when encryption key is not set', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required');
    });

    it('should throw error when decrypting with wrong key', () => {
      const plaintext = 'Secret';
      const encrypted = encrypt(plaintext);

      // Change the key
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      expect(() => decrypt(encrypted)).toThrow();
    });

    it('should throw error when decrypting corrupted data', () => {
      expect(() => decrypt('not-valid-base64!!')).toThrow();
    });

    it('should throw error when decrypting truncated data', () => {
      const encrypted = encrypt('test');
      const truncated = encrypted.slice(0, 10);

      expect(() => decrypt(truncated)).toThrow();
    });
  });

  describe('key derivation', () => {
    it('should work with non-hex key (derives key from string)', () => {
      process.env.ENCRYPTION_KEY = 'my-secret-passphrase';

      const plaintext = 'Test with derived key';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce consistent results with same passphrase', () => {
      process.env.ENCRYPTION_KEY = 'consistent-passphrase';

      const plaintext = 'Test';
      const encrypted1 = encrypt(plaintext);

      // Simulate re-initialization
      process.env.ENCRYPTION_KEY = 'consistent-passphrase';

      const decrypted = decrypt(encrypted1);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key.length).toBe(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateEncryptionKey());
      }

      expect(keys.size).toBe(100);
    });

    it('should generate valid encryption key', () => {
      const key = generateEncryptionKey();
      process.env.ENCRYPTION_KEY = key;

      const plaintext = 'Test with generated key';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('getKeyHint', () => {
    it('should return last 4 characters with ellipsis', () => {
      expect(getKeyHint('sk-test-1234567890')).toBe('...7890');
      expect(getKeyHint('api_key_abcdefghij')).toBe('...ghij');
    });

    it('should return **** for short keys', () => {
      expect(getKeyHint('abc')).toBe('****');
      expect(getKeyHint('ab')).toBe('****');
      expect(getKeyHint('a')).toBe('****');
    });

    it('should return **** for empty string', () => {
      expect(getKeyHint('')).toBe('****');
    });

    it('should return **** for null/undefined', () => {
      expect(getKeyHint(null as any)).toBe('****');
      expect(getKeyHint(undefined as any)).toBe('****');
    });

    it('should handle exactly 4 character key', () => {
      expect(getKeyHint('abcd')).toBe('...abcd');
    });
  });

  describe('isEncryptionConfigured', () => {
    it('should return true when ENCRYPTION_KEY is set', () => {
      process.env.ENCRYPTION_KEY = 'some-key';
      expect(isEncryptionConfigured()).toBe(true);
    });

    it('should return false when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(isEncryptionConfigured()).toBe(false);
    });

    it('should return false when ENCRYPTION_KEY is empty', () => {
      process.env.ENCRYPTION_KEY = '';
      expect(isEncryptionConfigured()).toBe(false);
    });
  });

  describe('hashValue', () => {
    it('should produce consistent SHA-256 hash', () => {
      const value = 'test-value';
      const hash1 = hashValue(value);
      const hash2 = hashValue(value);

      expect(hash1).toBe(hash2);
    });

    it('should produce 64-character hex string', () => {
      const hash = hashValue('anything');

      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should produce different hashes for different values', () => {
      const hash1 = hashValue('value1');
      const hash2 = hashValue('value2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce known hash for test vector', () => {
      // SHA-256 of "hello" is known
      const hash = hashValue('hello');
      expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('should handle empty string', () => {
      const hash = hashValue('');
      // SHA-256 of empty string
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle unicode', () => {
      const hash = hashValue('🔐');
      expect(hash.length).toBe(64);
    });
  });
});

describe('Integration: Full encryption workflow', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  it('should support API key storage workflow', () => {
    // Generate a new encryption key
    const encryptionKey = generateEncryptionKey();
    process.env.ENCRYPTION_KEY = encryptionKey;

    // Simulate storing API key
    const apiKey = 'sk-live-1234567890abcdef';

    // Check encryption is configured
    expect(isEncryptionConfigured()).toBe(true);

    // Encrypt the API key
    const encrypted = encrypt(apiKey);

    // Store hint for display
    const hint = getKeyHint(apiKey);
    expect(hint).toBe('...cdef');

    // Store hash for lookup
    const hash = hashValue(apiKey);
    expect(hash.length).toBe(64);

    // Later: retrieve and decrypt
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(apiKey);

    // Verify hash matches
    expect(hashValue(decrypted)).toBe(hash);
  });
});

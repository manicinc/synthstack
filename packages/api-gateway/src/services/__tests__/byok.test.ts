/**
 * @file services/__tests__/byok.test.ts
 * @description Comprehensive tests for BYOK (Bring Your Own Keys) service
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

// Mock the database pool
const mockQuery = vi.fn();
vi.mock('../../config/database', () => ({
  pool: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

// Mock encryption service
vi.mock('../encryption', () => ({
  encrypt: vi.fn((text: string) => `encrypted_${text}`),
  decrypt: vi.fn((text: string) => text.replace('encrypted_', '')),
  getKeyHint: vi.fn((key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`),
  isEncryptionConfigured: vi.fn(() => true),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock fetch for API validation
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import {
  getProviders,
  getUserApiKeys,
  saveApiKey,
  deleteApiKey,
  getDecryptedApiKey,
  hasValidApiKey,
  hasByokEnabled,
  testApiKey,
  logApiKeyUsage,
  getUsageStats,
  type ApiKey,
  type ApiProvider,
} from '../byok.js';
import { isEncryptionConfigured } from '../encryption';

describe('BYOK Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  // ============================================
  // PROVIDER TESTS
  // ============================================

  describe('getProviders', () => {
    it('should return enabled API providers', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'openai',
            name: 'OpenAI',
            description: 'GPT-4, GPT-3.5, DALL-E',
            docs_url: 'https://platform.openai.com/docs',
            key_format_hint: 'sk-...',
            is_enabled: true,
          },
          {
            id: 'anthropic',
            name: 'Anthropic',
            description: 'Claude models',
            docs_url: 'https://docs.anthropic.com',
            key_format_hint: 'sk-ant-...',
            is_enabled: true,
          },
        ],
      });

      const result = await getProviders();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('openai');
      expect(result[0].name).toBe('OpenAI');
      expect(result[1].id).toBe('anthropic');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('is_enabled = true'));
    });

    it('should return empty array when no providers exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await getProviders();

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // USER API KEYS TESTS
  // ============================================

  describe('getUserApiKeys', () => {
    it('should return user API keys with provider info', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            user_id: 'user-1',
            provider: 'openai',
            provider_name: 'OpenAI',
            key_hint: 'sk-a...xyz1',
            is_active: true,
            is_valid: true,
            last_error: null,
            total_requests: 100,
            total_tokens: 50000,
            last_used_at: new Date('2024-01-15'),
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const result = await getUserApiKeys('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('key-1');
      expect(result[0].provider).toBe('openai');
      expect(result[0].providerName).toBe('OpenAI');
      expect(result[0].isValid).toBe(true);
      expect(result[0].totalRequests).toBe(100);
    });

    it('should return empty array for user with no keys', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await getUserApiKeys('new-user');

      expect(result).toEqual([]);
    });

    it('should use provider ID as name when provider_name is null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            user_id: 'user-1',
            provider: 'openai',
            provider_name: null,
            key_hint: 'sk-a...xyz1',
            is_active: true,
            is_valid: true,
            last_error: null,
            total_requests: 0,
            total_tokens: 0,
            last_used_at: null,
            created_at: new Date(),
          },
        ],
      });

      const result = await getUserApiKeys('user-1');

      expect(result[0].providerName).toBe('openai');
    });
  });

  // ============================================
  // SAVE API KEY TESTS
  // ============================================

  describe('saveApiKey', () => {
    it('should save and validate OpenAI API key', async () => {
      // Mock successful OpenAI validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      // Mock database upsert
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            user_id: 'user-1',
            provider: 'openai',
            key_hint: 'sk-t...st12',
            is_active: true,
            is_valid: true,
            last_error: null,
            total_requests: 0,
            total_tokens: 0,
            last_used_at: null,
            created_at: new Date(),
          },
        ],
      });

      const result = await saveApiKey({
        userId: 'user-1',
        provider: 'openai',
        apiKey: 'sk-test123456789012345',
      });

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('openai');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test123456789012345',
          }),
        })
      );
    });

    it('should save and validate Anthropic API key', async () => {
      // Mock successful Anthropic validation (200 or 429 = valid key)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            user_id: 'user-1',
            provider: 'anthropic',
            key_hint: 'sk-a...test',
            is_active: true,
            is_valid: true,
            last_error: null,
            total_requests: 0,
            total_tokens: 0,
            last_used_at: null,
            created_at: new Date(),
          },
        ],
      });

      const result = await saveApiKey({
        userId: 'user-1',
        provider: 'anthropic',
        apiKey: 'sk-ant-test123456789',
      });

      expect(result.isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'sk-ant-test123456789',
          }),
        })
      );
    });

    it('should handle invalid OpenAI key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            user_id: 'user-1',
            provider: 'openai',
            key_hint: 'sk-t...st12',
            is_active: true,
            is_valid: false,
            last_error: 'Invalid API key',
            total_requests: 0,
            total_tokens: 0,
            last_used_at: null,
            created_at: new Date(),
          },
        ],
      });

      const result = await saveApiKey({
        userId: 'user-1',
        provider: 'openai',
        apiKey: 'sk-invalidkey123',
      });

      expect(result.isValid).toBe(false);
      expect(result.lastError).toBe('Invalid API key');
    });

    it('should handle Anthropic rate limit as valid key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429, // Rate limit = key is valid
        json: () => Promise.resolve({}),
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            user_id: 'user-1',
            provider: 'anthropic',
            key_hint: 'sk-a...test',
            is_active: true,
            is_valid: true,
            last_error: null,
            total_requests: 0,
            total_tokens: 0,
            last_used_at: null,
            created_at: new Date(),
          },
        ],
      });

      const result = await saveApiKey({
        userId: 'user-1',
        provider: 'anthropic',
        apiKey: 'sk-ant-test123456789',
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject keys that are too short', async () => {
      await expect(
        saveApiKey({
          userId: 'user-1',
          provider: 'openai',
          apiKey: 'short',
        })
      ).rejects.toThrow('Invalid API key format');
    });

    it('should throw error when encryption not configured', async () => {
      vi.mocked(isEncryptionConfigured).mockReturnValueOnce(false);

      await expect(
        saveApiKey({
          userId: 'user-1',
          provider: 'openai',
          apiKey: 'sk-test123456789012345',
        })
      ).rejects.toThrow('Encryption not configured');
    });

    it('should handle network errors during validation', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            user_id: 'user-1',
            provider: 'openai',
            key_hint: 'sk-t...st12',
            is_active: true,
            is_valid: false,
            last_error: 'Network error',
            total_requests: 0,
            total_tokens: 0,
            last_used_at: null,
            created_at: new Date(),
          },
        ],
      });

      const result = await saveApiKey({
        userId: 'user-1',
        provider: 'openai',
        apiKey: 'sk-test123456789012345',
      });

      expect(result.isValid).toBe(false);
      expect(result.lastError).toBe('Network error');
    });

    it('should mark unknown provider key as invalid', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            user_id: 'user-1',
            provider: 'unknown',
            key_hint: 'key-...test',
            is_active: true,
            is_valid: false,
            last_error: 'Unknown provider',
            total_requests: 0,
            total_tokens: 0,
            last_used_at: null,
            created_at: new Date(),
          },
        ],
      });

      const result = await saveApiKey({
        userId: 'user-1',
        provider: 'unknown',
        apiKey: 'key-unknownprovider123',
      });

      expect(result.isValid).toBe(false);
      expect(result.lastError).toBe('Unknown provider');
    });
  });

  // ============================================
  // DELETE API KEY TESTS
  // ============================================

  describe('deleteApiKey', () => {
    it('should delete user API key and return true', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await deleteApiKey('user-1', 'key-1');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_api_keys'),
        ['key-1', 'user-1']
      );
    });

    it('should return false when key not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await deleteApiKey('user-1', 'non-existent');

      expect(result).toBe(false);
    });

    it('should not delete key belonging to another user', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await deleteApiKey('other-user', 'key-1');

      expect(result).toBe(false);
    });
  });

  // ============================================
  // GET DECRYPTED API KEY TESTS
  // ============================================

  describe('getDecryptedApiKey', () => {
    it('should return decrypted API key for valid key', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ encrypted_key: 'encrypted_sk-test123' }],
      });

      const result = await getDecryptedApiKey('user-1', 'openai');

      expect(result).toBe('sk-test123');
    });

    it('should return null when no key exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await getDecryptedApiKey('user-1', 'openai');

      expect(result).toBeNull();
    });

    it('should only return active and valid keys', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await getDecryptedApiKey('user-1', 'openai');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true AND is_valid = true'),
        ['user-1', 'openai']
      );
    });
  });

  // ============================================
  // HAS VALID API KEY TESTS
  // ============================================

  describe('hasValidApiKey', () => {
    it('should return true when user has valid key for provider', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await hasValidApiKey('user-1', 'openai');

      expect(result).toBe(true);
    });

    it('should return false when user has no valid key', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await hasValidApiKey('user-1', 'openai');

      expect(result).toBe(false);
    });
  });

  describe('hasByokEnabled', () => {
    it('should return true when user has any valid BYOK key', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await hasByokEnabled('user-1');

      expect(result).toBe(true);
    });

    it('should return false when user has no valid keys', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await hasByokEnabled('user-1');

      expect(result).toBe(false);
    });
  });

  // ============================================
  // TEST API KEY TESTS
  // ============================================

  describe('testApiKey', () => {
    it('should revalidate OpenAI key and update status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ provider: 'openai', encrypted_key: 'encrypted_sk-test123' }],
      });
      mockFetch.mockResolvedValueOnce({ ok: true });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Update status

      const result = await testApiKey('user-1', 'key-1');

      expect(result.valid).toBe(true);
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE user_api_keys'),
        [true, null, 'key-1']
      );
    });

    it('should return error when key not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await testApiKey('user-1', 'non-existent');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Key not found');
    });

    it('should update invalid status when validation fails', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ provider: 'openai', encrypted_key: 'encrypted_sk-test123' }],
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await testApiKey('user-1', 'key-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE user_api_keys'),
        [false, 'Invalid API key', 'key-1']
      );
    });
  });

  // ============================================
  // LOG API KEY USAGE TESTS
  // ============================================

  describe('logApiKeyUsage', () => {
    it('should log usage data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await logApiKeyUsage({
        apiKeyId: 'key-1',
        userId: 'user-1',
        provider: 'openai',
        model: 'gpt-4',
        endpoint: '/chat/completions',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        estimatedCostCents: 10,
        success: true,
        responseTimeMs: 1500,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO api_key_usage'),
        expect.arrayContaining([
          'key-1',
          'user-1',
          'openai',
          'gpt-4',
          '/chat/completions',
          100,
          200,
          300,
          10,
          true,
          undefined,
          1500,
        ])
      );
    });

    it('should log errors without throwing', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw
      await expect(
        logApiKeyUsage({
          apiKeyId: 'key-1',
          userId: 'user-1',
          provider: 'openai',
          success: false,
          errorMessage: 'API error',
        })
      ).resolves.not.toThrow();
    });
  });

  // ============================================
  // GET USAGE STATS TESTS
  // ============================================

  describe('getUsageStats', () => {
    it('should return aggregated usage statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { provider: 'openai', requests: '100', tokens: '50000', cost: '500' },
          { provider: 'anthropic', requests: '50', tokens: '25000', cost: '250' },
        ],
      });

      const result = await getUsageStats('user-1', 30);

      expect(result.totalRequests).toBe(150);
      expect(result.totalTokens).toBe(75000);
      expect(result.estimatedCostCents).toBe(750);
      expect(result.byProvider.openai.requests).toBe(100);
      expect(result.byProvider.anthropic.requests).toBe(50);
    });

    it('should return zeros when no usage', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await getUsageStats('user-1');

      expect(result.totalRequests).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.estimatedCostCents).toBe(0);
      expect(result.byProvider).toEqual({});
    });

    it('should use default 30 days period', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await getUsageStats('user-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '1 day' * $2"),
        ['user-1', 30]
      );
    });

    it('should respect custom period', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await getUsageStats('user-1', 7);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['user-1', 7]);
    });
  });
});

/**
 * BYOK Test Fixtures
 *
 * Reusable test data for BYOK scenarios
 */

import type { ByokContext } from '../services/llm-router/byok-router';

// ============================================
// User Fixtures
// ============================================

export const users = {
  /**
   * Premium user with both credits and BYOK keys configured
   */
  premiumWithBoth: {
    id: 'user-premium-both',
    email: 'premium-both@test.com',
    subscriptionTier: 'premium',
    credits: 10000,
    byokKeys: ['openai', 'anthropic'],
  },

  /**
   * Premium user with only internal credits (no BYOK)
   */
  premiumCreditsOnly: {
    id: 'user-premium-credits',
    email: 'premium-credits@test.com',
    subscriptionTier: 'premium',
    credits: 5000,
    byokKeys: [],
  },

  /**
   * Premium user with only BYOK keys (no credits)
   */
  premiumByokOnly: {
    id: 'user-premium-byok',
    email: 'premium-byok@test.com',
    subscriptionTier: 'premium',
    credits: 0,
    byokKeys: ['openai'],
  },

  /**
   * Premium user with no credits and no BYOK
   */
  premiumEmpty: {
    id: 'user-premium-empty',
    email: 'premium-empty@test.com',
    subscriptionTier: 'premium',
    credits: 0,
    byokKeys: [],
  },

  /**
   * Free tier user (should not have access to BYOK)
   */
  freeTier: {
    id: 'user-free',
    email: 'free@test.com',
    subscriptionTier: 'free',
    credits: 100,
    byokKeys: [],
  },

  /**
   * Lifetime license user with BYOK and credits
   */
  lifetime: {
    id: 'user-lifetime',
    email: 'lifetime@test.com',
    subscriptionTier: 'lifetime',
    credits: 50000,
    byokKeys: ['openai', 'anthropic'],
  },
};

// ============================================
// API Key Fixtures
// ============================================

export const apiKeys = {
  openai: {
    valid: {
      id: 'key-openai-valid',
      provider: 'openai',
      apiKey: 'sk-test-valid-key-1234567890abcdef',
      keyHint: 'sk-...cdef',
      isActive: true,
      isValid: true,
      lastError: null,
      totalRequests: 1250,
      totalTokens: 425000,
      lastUsedAt: new Date('2026-01-10T15:30:00Z'),
    },
    invalid: {
      id: 'key-openai-invalid',
      provider: 'openai',
      apiKey: 'sk-test-invalid-key',
      keyHint: 'sk-...key',
      isActive: true,
      isValid: false,
      lastError: 'Invalid API key',
      totalRequests: 0,
      totalTokens: 0,
      lastUsedAt: null,
    },
    rateLimit: {
      id: 'key-openai-rate-limit',
      provider: 'openai',
      apiKey: 'sk-test-rate-limit-key',
      keyHint: 'sk-...key',
      isActive: true,
      isValid: true,
      lastError: 'Rate limit exceeded',
      totalRequests: 5000,
      totalTokens: 2000000,
      lastUsedAt: new Date('2026-01-10T15:30:00Z'),
    },
  },

  anthropic: {
    valid: {
      id: 'key-anthropic-valid',
      provider: 'anthropic',
      apiKey: 'sk-ant-test-valid-key-1234567890abcdef',
      keyHint: 'sk-ant-...cdef',
      isActive: true,
      isValid: true,
      lastError: null,
      totalRequests: 300,
      totalTokens: 100000,
      lastUsedAt: new Date('2026-01-10T14:00:00Z'),
    },
    invalid: {
      id: 'key-anthropic-invalid',
      provider: 'anthropic',
      apiKey: 'sk-ant-test-invalid-key',
      keyHint: 'sk-ant-...key',
      isActive: true,
      isValid: false,
      lastError: 'Invalid API key',
      totalRequests: 0,
      totalTokens: 0,
      lastUsedAt: null,
    },
  },
};

// ============================================
// Feature Flag Fixtures
// ============================================

export const featureFlags = {
  /**
   * Flow A: Credit-First Mode
   * Use internal credits first, fallback to BYOK
   */
  creditFirst: {
    byokEnabled: true,
    byokUsesInternalCredits: true,
    byokOnlyMode: false,
  },

  /**
   * Flow B: BYOK-First Mode (Default)
   * Use BYOK first, fallback to internal credits
   */
  byokFirst: {
    byokEnabled: true,
    byokUsesInternalCredits: false,
    byokOnlyMode: false,
  },

  /**
   * Flow C: BYOK-Only Mode
   * Never use internal keys, BYOK required
   */
  byokOnly: {
    byokEnabled: true,
    byokUsesInternalCredits: false,
    byokOnlyMode: true,
  },

  /**
   * BYOK Disabled
   * All users use internal keys
   */
  byokDisabled: {
    byokEnabled: false,
    byokUsesInternalCredits: false,
    byokOnlyMode: false,
  },
};

// ============================================
// BYOK Context Fixtures
// ============================================

export const byokContexts = {
  /**
   * Premium user with both credits and BYOK (BYOK-first mode)
   */
  premiumBothByokFirst: (): ByokContext => ({
    userId: users.premiumWithBoth.id,
    hasCredits: true,
    byokProviders: users.premiumWithBoth.byokKeys,
    flags: featureFlags.byokFirst,
  }),

  /**
   * Premium user with both credits and BYOK (Credit-first mode)
   */
  premiumBothCreditFirst: (): ByokContext => ({
    userId: users.premiumWithBoth.id,
    hasCredits: true,
    byokProviders: users.premiumWithBoth.byokKeys,
    flags: featureFlags.creditFirst,
  }),

  /**
   * Premium user with only credits (no BYOK)
   */
  premiumCreditsOnly: (): ByokContext => ({
    userId: users.premiumCreditsOnly.id,
    hasCredits: true,
    byokProviders: [],
    flags: featureFlags.byokFirst,
  }),

  /**
   * Premium user with only BYOK (no credits)
   */
  premiumByokOnly: (): ByokContext => ({
    userId: users.premiumByokOnly.id,
    hasCredits: false,
    byokProviders: users.premiumByokOnly.byokKeys,
    flags: featureFlags.byokFirst,
  }),

  /**
   * Premium user with neither credits nor BYOK
   */
  premiumEmpty: (): ByokContext => ({
    userId: users.premiumEmpty.id,
    hasCredits: false,
    byokProviders: [],
    flags: featureFlags.byokFirst,
  }),

  /**
   * BYOK-only mode with keys configured
   */
  byokOnlyWithKeys: (): ByokContext => ({
    userId: users.premiumWithBoth.id,
    hasCredits: true,
    byokProviders: users.premiumWithBoth.byokKeys,
    flags: featureFlags.byokOnly,
  }),

  /**
   * BYOK-only mode without keys (should error)
   */
  byokOnlyNoKeys: (): ByokContext => ({
    userId: users.premiumEmpty.id,
    hasCredits: true,
    byokProviders: [],
    flags: featureFlags.byokOnly,
  }),
};

// ============================================
// Mock API Responses
// ============================================

export const mockResponses = {
  openai: {
    chat: {
      success: {
        id: 'chatcmpl-test123',
        object: 'chat.completion',
        created: 1704902400,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a test response from OpenAI.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 20,
          total_tokens: 70,
        },
      },
      error: {
        invalid_key: {
          error: {
            message: 'Incorrect API key provided',
            type: 'invalid_request_error',
            param: null,
            code: 'invalid_api_key',
          },
        },
        rate_limit: {
          error: {
            message: 'Rate limit reached',
            type: 'rate_limit_error',
            param: null,
            code: 'rate_limit_exceeded',
          },
        },
      },
    },
    embeddings: {
      success: {
        object: 'list',
        data: [
          {
            object: 'embedding',
            embedding: new Array(1536).fill(0.1),
            index: 0,
          },
        ],
        model: 'text-embedding-ada-002',
        usage: {
          prompt_tokens: 8,
          total_tokens: 8,
        },
      },
    },
  },

  anthropic: {
    chat: {
      success: {
        id: 'msg_test123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'This is a test response from Anthropic.',
          },
        ],
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 45,
          output_tokens: 25,
        },
      },
      error: {
        invalid_key: {
          type: 'error',
          error: {
            type: 'authentication_error',
            message: 'Invalid API key',
          },
        },
      },
    },
  },
};

// ============================================
// Usage Log Fixtures
// ============================================

export const usageLogs = {
  byok: {
    openai: {
      id: 'usage-byok-openai-1',
      apiKeyId: apiKeys.openai.valid.id,
      userId: users.premiumWithBoth.id,
      provider: 'openai',
      model: 'gpt-4',
      promptTokens: 50,
      completionTokens: 20,
      totalTokens: 70,
      estimatedCostCents: 35,
      responseTimeMs: 1250,
      error: null,
      createdAt: new Date('2026-01-10T15:30:00Z'),
    },
    anthropic: {
      id: 'usage-byok-anthropic-1',
      apiKeyId: apiKeys.anthropic.valid.id,
      userId: users.premiumWithBoth.id,
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      promptTokens: 45,
      completionTokens: 25,
      totalTokens: 70,
      estimatedCostCents: 180,
      responseTimeMs: 980,
      error: null,
      createdAt: new Date('2026-01-10T14:00:00Z'),
    },
  },
  internal: {
    copilot: {
      id: 'tx-internal-copilot-1',
      userId: users.premiumCreditsOnly.id,
      transactionType: 'deduction',
      costCents: 50,
      balanceAfter: 4950,
      serviceType: 'copilot',
      serviceRequestId: 'req-copilot-123',
      description: 'Copilot chat completion',
      createdAt: new Date('2026-01-10T16:00:00Z'),
    },
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get expected routing decision for a given context
 */
export function getExpectedRouting(
  hasCredits: boolean,
  hasByok: boolean,
  flags: typeof featureFlags.byokFirst
): 'internal' | 'byok' | 'error' {
  // Flow C: BYOK-Only Mode (highest precedence)
  if (flags.byokOnlyMode) {
    return hasByok ? 'byok' : 'error';
  }

  // Flow A: Credit-First Mode
  if (flags.byokUsesInternalCredits) {
    if (hasCredits) return 'internal';
    if (hasByok) return 'byok';
    return 'error';
  }

  // Flow B: BYOK-First Mode (default)
  if (hasByok && flags.byokEnabled) return 'byok';
  if (hasCredits) return 'internal';
  return 'error';
}

/**
 * Create a minimal BYOK context for testing
 */
export function createByokContext(
  userId: string,
  hasCredits: boolean,
  byokProviders: string[],
  flags: typeof featureFlags.byokFirst
): ByokContext {
  return {
    userId,
    hasCredits,
    byokProviders,
    flags,
  };
}

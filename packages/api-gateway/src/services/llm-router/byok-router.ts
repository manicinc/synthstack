/**
 * BYOK-Aware LLM Router
 *
 * Extends the standard LLM Router with BYOK (Bring Your Own Keys) support.
 * Handles feature flag logic for credit-first vs BYOK-first routing.
 *
 * Three modes controlled by feature flags:
 * - Flow A (Credit-First): Use internal credits first, fallback to BYOK when out
 * - Flow B (BYOK-First): Use BYOK first if configured, fallback to internal credits
 * - Flow C (BYOK-Only): Never use internal keys, ONLY accept user BYOK
 *
 * Features:
 * - Automatic key source selection based on feature flags
 * - Usage tracking to api_key_usage table for BYOK
 * - Graceful fallback when BYOK keys fail (if credits available)
 * - Rate limit bypass for BYOK users
 * - Support for all AI services (chat, embeddings, transcription)
 */

import { getLLMRouter, type LLMRequestOptions, type LLMResponse, type TaskHint, type LLMStreamEvent, type LLMProvider } from './index.js';
import { featureFlagsService } from '../featureFlags.js';
import { getUserApiKeyForProvider, getUserByokProviders, logByokUsage } from '../byok.js';
import { OpenAIAdapter } from './adapters/openai.js';
import { AnthropicAdapter } from './adapters/anthropic.js';
import { logger } from '../../utils/logger.js';
import { pool } from '../../config/database.js';

// ============================================
// Types
// ============================================

export interface ByokContext {
  userId: string;
  hasCredits: boolean;
  byokProviders: string[];
  flags: {
    byokEnabled: boolean;
    byokUsesInternalCredits: boolean;
    byokOnlyMode: boolean;
  };
}

export interface KeySourceDecision {
  source: 'internal' | 'byok' | 'error';
  reason: string;
}

export interface ByokLLMResponse extends LLMResponse {
  keySource: 'internal' | 'byok';
  byokKeyId?: string;
}

export interface ByokLLMStreamEvent extends LLMStreamEvent {
  keySource?: 'internal' | 'byok';
  reason?: string;
}

// ============================================
// BYOK-Aware LLM Router Class
// ============================================

export class ByokAwareLLMRouter {
  private baseRouter = getLLMRouter();

  /**
   * Get BYOK context for a user
   * Fetches credits, BYOK keys, and feature flags
   */
  async getByokContext(userId: string): Promise<ByokContext> {
    // Check feature flags
    const [byokEnabled, byokUsesInternalCredits, byokOnlyMode] = await Promise.all([
      featureFlagsService.hasFeature(userId, 'byok_enabled'),
      this.getSystemFlag('byok_uses_internal_credits'),
      this.getSystemFlag('byok_only_mode'),
    ]);

    // Check user's credit balance
    const hasCredits = await this.checkUserHasCredits(userId);

    // Get user's BYOK providers
    const byokProviders = byokEnabled ? await getUserByokProviders(userId) : [];

    return {
      userId,
      hasCredits,
      byokProviders,
      flags: {
        byokEnabled,
        byokUsesInternalCredits,
        byokOnlyMode,
      },
    };
  }

  /**
   * Get system-level feature flag (not user-specific)
   */
  private async getSystemFlag(key: string): Promise<boolean> {
    try {
      const result = await pool.query<{ is_enabled: boolean }>(
        `SELECT is_enabled FROM feature_flags WHERE key = $1`,
        [key]
      );
      return result.rows.length > 0 ? result.rows[0].is_enabled : false;
    } catch (err) {
      logger.error(`Failed to get system flag ${key}`, err);
      return false;
    }
  }

  /**
   * Check if user has credits available
   */
  private async checkUserHasCredits(userId: string): Promise<boolean> {
    try {
      const result = await pool.query<{ credits_remaining: number }>(
        'SELECT credits_remaining FROM app_users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) return false;
      return (result.rows[0].credits_remaining || 0) > 0;
    } catch (err) {
      logger.error('Failed to check user credits', err);
      return false;
    }
  }

  /**
   * Determine which API key source to use based on flags and user state
   * Returns: 'internal' | 'byok' | 'error'
   */
  determineKeySource(context: ByokContext): KeySourceDecision {
    const { hasCredits, byokProviders, flags } = context;
    const hasByok = byokProviders.length > 0;

    // Flow C: BYOK-only mode
    if (flags.byokOnlyMode) {
      if (hasByok) {
        return { source: 'byok', reason: 'BYOK-only mode: User has BYOK keys' };
      }
      return {
        source: 'error',
        reason: 'BYOK-only mode enabled but user has no BYOK keys configured. Please add your API keys in Settings.',
      };
    }

    // Flow A: Credit-first with BYOK fallback
    if (flags.byokUsesInternalCredits) {
      if (hasCredits) {
        return { source: 'internal', reason: 'Credit-first mode: User has credits' };
      }
      if (hasByok) {
        return { source: 'byok', reason: 'Credit-first mode: Out of credits, using BYOK fallback' };
      }
      return {
        source: 'error',
        reason: 'No credits remaining and no BYOK keys configured. Please purchase credits or add your API keys.',
      };
    }

    // Flow B: BYOK-first (default when byok_uses_internal_credits = false)
    if (hasByok && flags.byokEnabled) {
      return { source: 'byok', reason: 'BYOK-first mode: User has BYOK keys' };
    }
    if (hasCredits) {
      return { source: 'internal', reason: 'BYOK-first mode: No BYOK, using internal with credits' };
    }
    return {
      source: 'error',
      reason: 'No BYOK keys configured and no credits remaining. Please add your API keys or purchase credits.',
    };
  }

  /**
   * Create adapter with BYOK key for specific provider
   */
  private async createByokAdapter(
    userId: string,
    provider: string
  ): Promise<{ adapter: OpenAIAdapter | AnthropicAdapter; keyId: string } | null> {
    const keyData = await getUserApiKeyForProvider(userId, provider);
    if (!keyData) return null;

    let adapter: OpenAIAdapter | AnthropicAdapter;
    if (provider === 'openai') {
      adapter = new OpenAIAdapter(keyData.apiKey);
    } else if (provider === 'anthropic') {
      adapter = new AnthropicAdapter(keyData.apiKey);
    } else {
      return null;
    }

    return { adapter, keyId: keyData.keyId };
  }

  /**
   * Infer provider from model name or hint
   */
  private inferProvider(options: LLMRequestOptions, hint?: TaskHint): string {
    // Check hint first
    if (hint?.preferProvider) return hint.preferProvider;

    // Infer from model name
    const model = options.model?.toLowerCase() || '';
    if (model.includes('gpt') || model.includes('openai') || model.includes('o1')) return 'openai';
    if (model.includes('claude') || model.includes('anthropic')) return 'anthropic';

    // Default to OpenAI (most common)
    return 'openai';
  }

  /**
   * Chat with BYOK-aware routing
   */
  async chat(
    options: LLMRequestOptions,
    hint?: TaskHint
  ): Promise<ByokLLMResponse> {
    if (!options.userId) {
      throw new Error('userId required for BYOK-aware routing');
    }

    const context = await this.getByokContext(options.userId);
    const keySource = this.determineKeySource(context);

    logger.info('BYOK routing decision', {
      userId: options.userId,
      source: keySource.source,
      reason: keySource.reason,
      flags: context.flags,
    });

    if (keySource.source === 'error') {
      const error = new Error(keySource.reason) as any;
      error.code = context.flags.byokOnlyMode ? 'BYOK_REQUIRED' : 'INSUFFICIENT_CREDITS';
      error.statusCode = 402;
      throw error;
    }

    // Use BYOK
    if (keySource.source === 'byok') {
      const provider = this.inferProvider(options, hint);
      const byokAdapter = await this.createByokAdapter(options.userId, provider);

      if (!byokAdapter) {
        // If BYOK adapter creation failed, try fallback to internal if allowed
        if (context.hasCredits && !context.flags.byokOnlyMode) {
          logger.warn('BYOK adapter creation failed, falling back to internal credits', {
            userId: options.userId,
            provider,
          });
          // Fall through to use internal keys
        } else {
          throw new Error(`No BYOK key found for provider: ${provider}`);
        }
      } else {
        // Execute with BYOK adapter
        const startTime = Date.now();
        try {
          // Initialize base router to get model selection
          await this.baseRouter.initialize();
          const model = (this.baseRouter as any).selectModel(options, hint);

          const response = await byokAdapter.adapter.chat(options, model);
          const latencyMs = Date.now() - startTime;

          // Log BYOK usage
          await logByokUsage(
            byokAdapter.keyId,
            options.userId,
            provider,
            model.id,
            {
              prompt: response.usage.promptTokens,
              completion: response.usage.completionTokens,
              total: response.usage.totalTokens,
            },
            Math.round(response.estimatedCost * 100), // Convert to cents
            latencyMs
          );

          logger.info('BYOK request completed', {
            userId: options.userId,
            provider,
            model: model.id,
            tokens: response.usage.totalTokens,
            latencyMs,
          });

          return {
            ...response,
            keySource: 'byok',
            byokKeyId: byokAdapter.keyId,
          };
        } catch (error) {
          // BYOK failed - try fallback to internal if allowed
          if (context.hasCredits && !context.flags.byokOnlyMode) {
            logger.warn('BYOK request failed, falling back to internal credits', {
              userId: options.userId,
              error: (error as Error).message,
            });
            // Fall through to use internal keys
          } else {
            throw error;
          }
        }
      }
    }

    // Use internal keys (either primary path or fallback from BYOK failure)
    const response = await this.baseRouter.chat(options, hint);
    return {
      ...response,
      keySource: 'internal',
    };
  }

  /**
   * Stream chat with BYOK-aware routing
   */
  async *streamChat(
    options: LLMRequestOptions,
    hint?: TaskHint
  ): AsyncGenerator<ByokLLMStreamEvent> {
    if (!options.userId) {
      yield { type: 'error', error: 'userId required for BYOK-aware routing' };
      return;
    }

    const context = await this.getByokContext(options.userId);
    const keySource = this.determineKeySource(context);

    logger.info('BYOK routing decision (streaming)', {
      userId: options.userId,
      source: keySource.source,
      reason: keySource.reason,
      flags: context.flags,
    });

    if (keySource.source === 'error') {
      yield { type: 'error', error: keySource.reason };
      return;
    }

    // Emit metadata event with routing info
    yield {
      type: 'metadata' as any,
      keySource: keySource.source,
      reason: keySource.reason,
    };

    // Use BYOK
    if (keySource.source === 'byok') {
      const provider = this.inferProvider(options, hint);
      const byokAdapter = await this.createByokAdapter(options.userId, provider);

      if (!byokAdapter) {
        // If BYOK adapter creation failed, try fallback to internal if allowed
        if (context.hasCredits && !context.flags.byokOnlyMode) {
          logger.warn('BYOK adapter creation failed, falling back to internal credits (streaming)', {
            userId: options.userId,
            provider,
          });
          // Fall through to use internal keys
        } else {
          yield { type: 'error', error: `No BYOK key found for provider: ${provider}` };
          return;
        }
      } else {
        // Execute with BYOK adapter
        const startTime = Date.now();
        try {
          await this.baseRouter.initialize();
          const model = (this.baseRouter as any).selectModel(options, hint);

          let totalTokens = 0;
          for await (const event of byokAdapter.adapter.streamChat(options, model)) {
            yield { ...event, keySource: 'byok' };

            // Track completion tokens if available
            if (event.type === 'done' && event.usage) {
              totalTokens = event.usage.totalTokens;
            }
          }

          const latencyMs = Date.now() - startTime;

          // Log BYOK usage for streaming
          await logByokUsage(
            byokAdapter.keyId,
            options.userId,
            provider,
            model.id,
            { total: totalTokens },
            undefined, // Cost calculated from tokens by logging function
            latencyMs
          );

          logger.info('BYOK stream completed', {
            userId: options.userId,
            provider,
            model: model.id,
            tokens: totalTokens,
            latencyMs,
          });

          return;
        } catch (error) {
          // BYOK failed - try fallback to internal if allowed
          if (context.hasCredits && !context.flags.byokOnlyMode) {
            logger.warn('BYOK stream failed, falling back to internal credits', {
              userId: options.userId,
              error: (error as Error).message,
            });
            // Fall through to use internal keys
          } else {
            yield { type: 'error', error: (error as Error).message };
            return;
          }
        }
      }
    }

    // Use internal keys (either primary path or fallback from BYOK failure)
    for await (const event of this.baseRouter.streamChat(options, hint)) {
      yield { ...event, keySource: 'internal' };
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const byokRouter = new ByokAwareLLMRouter();

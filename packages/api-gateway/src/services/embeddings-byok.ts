/**
 * BYOK-Aware Embeddings Service
 *
 * Wraps the standard embeddings service with BYOK (Bring Your Own Keys) support.
 * Routes embeddings requests to either internal or user-provided OpenAI keys
 * based on feature flags and user configuration.
 *
 * Features:
 * - Automatic key source selection based on BYOK router
 * - Usage tracking to api_key_usage table for BYOK
 * - Graceful fallback when BYOK keys fail
 * - Support for all embedding methods (single, batch, document)
 */

import OpenAI from 'openai';
import { embeddingsService } from './embeddings.js';
import { byokRouter } from './llm-router/byok-router.js';
import { getUserApiKeyForProvider, logByokUsage } from './byok.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { ChunkOptions, Chunk } from './chunking.js';

// ============================================
// BYOK-Aware Embeddings Service Class
// ============================================

export class ByokAwareEmbeddingsService {
  /**
   * Generate embedding for a single text with BYOK-aware routing
   */
  async generateEmbedding(text: string, userId: string): Promise<number[]> {
    if (!userId) {
      throw new Error('userId required for BYOK-aware embeddings');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    const context = await byokRouter.getByokContext(userId);
    const keySource = byokRouter.determineKeySource(context);

    logger.info('BYOK routing decision (embeddings)', {
      userId,
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
      const provider = 'openai'; // Embeddings only support OpenAI for now
      const byokKey = await getUserApiKeyForProvider(userId, provider);

      if (!byokKey) {
        // If BYOK key fetch failed, try fallback to internal if allowed
        if (context.hasCredits && !context.flags.byokOnlyMode) {
          logger.warn('BYOK key not found, falling back to internal credits', {
            userId,
            provider,
          });
          // Fall through to use internal service
        } else {
          throw new Error(`No BYOK key found for provider: ${provider}`);
        }
      } else {
        // Execute with BYOK key
        const startTime = Date.now();
        try {
          const openai = new OpenAI({
            apiKey: byokKey.apiKey,
          });

          const response = await openai.embeddings.create({
            model: config.copilot.embeddingModel,
            input: text.trim(),
            encoding_format: 'float',
          });

          if (!response.data || response.data.length === 0) {
            throw new Error('No embedding returned from OpenAI');
          }

          const latencyMs = Date.now() - startTime;

          // Log BYOK usage
          await logByokUsage(
            byokKey.keyId,
            userId,
            provider,
            config.copilot.embeddingModel,
            {
              prompt: response.usage?.prompt_tokens || 0,
              total: response.usage?.total_tokens || 0,
            },
            undefined, // Cost calculated from tokens by logging function
            latencyMs
          );

          logger.info('BYOK embeddings request completed', {
            userId,
            provider,
            model: config.copilot.embeddingModel,
            tokens: response.usage?.total_tokens || 0,
            latencyMs,
          });

          return response.data[0].embedding;
        } catch (error) {
          // BYOK failed - try fallback to internal if allowed
          if (context.hasCredits && !context.flags.byokOnlyMode) {
            logger.warn('BYOK embeddings request failed, falling back to internal credits', {
              userId,
              error: (error as Error).message,
            });
            // Fall through to use internal service
          } else {
            throw error;
          }
        }
      }
    }

    // Use internal service (either primary path or fallback from BYOK failure)
    return embeddingsService.generateEmbedding(text);
  }

  /**
   * Generate embeddings for multiple texts in batch with BYOK-aware routing
   */
  async generateEmbeddings(texts: string[], userId: string): Promise<number[][]> {
    if (!userId) {
      throw new Error('userId required for BYOK-aware embeddings');
    }

    if (texts.length === 0) {
      return [];
    }

    const validTexts = texts.filter((text) => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      throw new Error('Cannot generate embeddings for empty texts');
    }

    const context = await byokRouter.getByokContext(userId);
    const keySource = byokRouter.determineKeySource(context);

    logger.info('BYOK routing decision (batch embeddings)', {
      userId,
      source: keySource.source,
      reason: keySource.reason,
      textCount: validTexts.length,
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
      const provider = 'openai';
      const byokKey = await getUserApiKeyForProvider(userId, provider);

      if (!byokKey) {
        if (context.hasCredits && !context.flags.byokOnlyMode) {
          logger.warn('BYOK key not found, falling back to internal credits', {
            userId,
            provider,
          });
          // Fall through
        } else {
          throw new Error(`No BYOK key found for provider: ${provider}`);
        }
      } else {
        const startTime = Date.now();
        try {
          const openai = new OpenAI({
            apiKey: byokKey.apiKey,
          });

          // Batch processing with same logic as original service
          const batchSize = 100;
          const embeddings: number[][] = [];
          let totalTokens = 0;

          for (let i = 0; i < validTexts.length; i += batchSize) {
            const batch = validTexts.slice(i, i + batchSize);

            const response = await openai.embeddings.create({
              model: config.copilot.embeddingModel,
              input: batch.map((text) => text.trim()),
              encoding_format: 'float',
            });

            embeddings.push(...response.data.map((item) => item.embedding));
            totalTokens += response.usage?.total_tokens || 0;
          }

          const latencyMs = Date.now() - startTime;

          // Log BYOK usage for batch
          await logByokUsage(
            byokKey.keyId,
            userId,
            provider,
            config.copilot.embeddingModel,
            {
              total: totalTokens,
            },
            undefined,
            latencyMs
          );

          logger.info('BYOK batch embeddings request completed', {
            userId,
            provider,
            model: config.copilot.embeddingModel,
            textCount: validTexts.length,
            tokens: totalTokens,
            latencyMs,
          });

          return embeddings;
        } catch (error) {
          if (context.hasCredits && !context.flags.byokOnlyMode) {
            logger.warn('BYOK batch embeddings request failed, falling back to internal credits', {
              userId,
              error: (error as Error).message,
            });
            // Fall through
          } else {
            throw error;
          }
        }
      }
    }

    // Use internal service
    return embeddingsService.generateEmbeddings(texts);
  }

  /**
   * Generate embedding for a document with chunking support
   */
  async generateDocumentEmbedding(
    content: string,
    userId: string,
    chunkSize: number = 4000
  ): Promise<{ chunks: string[]; embeddings: number[][] }> {
    if (!userId) {
      throw new Error('userId required for BYOK-aware embeddings');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty document');
    }

    const context = await byokRouter.getByokContext(userId);
    const keySource = byokRouter.determineKeySource(context);

    if (keySource.source === 'error') {
      const error = new Error(keySource.reason) as any;
      error.code = context.flags.byokOnlyMode ? 'BYOK_REQUIRED' : 'INSUFFICIENT_CREDITS';
      error.statusCode = 402;
      throw error;
    }

    // Use internal service for chunking, then route embeddings based on key source
    // The chunking logic is the same, only the embedding generation differs
    const result = await embeddingsService.generateDocumentEmbedding(content, chunkSize);

    // If using BYOK, regenerate embeddings with BYOK key
    if (keySource.source === 'byok') {
      const embeddings = await this.generateEmbeddings(result.chunks, userId);
      return { chunks: result.chunks, embeddings };
    }

    return result;
  }

  /**
   * Generate embeddings with full chunk metadata
   */
  async generateDocumentEmbeddingWithMetadata(
    content: string,
    userId: string,
    options: Partial<ChunkOptions> = {}
  ): Promise<{ chunks: Chunk[]; embeddings: number[][] }> {
    if (!userId) {
      throw new Error('userId required for BYOK-aware embeddings');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty document');
    }

    const context = await byokRouter.getByokContext(userId);
    const keySource = byokRouter.determineKeySource(context);

    if (keySource.source === 'error') {
      const error = new Error(keySource.reason) as any;
      error.code = context.flags.byokOnlyMode ? 'BYOK_REQUIRED' : 'INSUFFICIENT_CREDITS';
      error.statusCode = 402;
      throw error;
    }

    // Use internal service for chunking
    const result = await embeddingsService.generateDocumentEmbeddingWithMetadata(content, options);

    // If using BYOK, regenerate embeddings with BYOK key
    if (keySource.source === 'byok') {
      const chunkTexts = result.chunks.map((c) => c.content);
      const embeddings = await this.generateEmbeddings(chunkTexts, userId);
      return { chunks: result.chunks, embeddings };
    }

    return result;
  }

  /**
   * Check if embeddings service is available (delegates to base service)
   */
  isAvailable(): boolean {
    return embeddingsService.isAvailable();
  }

  /**
   * Get the embedding model being used
   */
  getModel(): string {
    return embeddingsService.getModel();
  }

  /**
   * Get the embedding dimension
   */
  getDimension(): number {
    return embeddingsService.getDimension();
  }
}

// ============================================
// Singleton Instance
// ============================================

export const byokEmbeddingsService = new ByokAwareEmbeddingsService();

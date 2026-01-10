/**
 * API Keys Routes
 *
 * Endpoints for managing BYOK (Bring Your Own Keys) API keys.
 * Requires authentication and premium subscription.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getProviders,
  getUserApiKeys,
  saveApiKey,
  deleteApiKey,
  testApiKey,
  getUsageStats,
  getUserByokProviders,
} from '../services/byok';
import { isEncryptionConfigured } from '../services/encryption';
import { logger } from '../utils/logger';
import { byokRouter } from '../services/llm-router/byok-router.js';
import { featureFlagsService } from '../services/featureFlags.js';

// ============================================
// Types
// ============================================

interface SaveKeyBody {
  provider: string;
  apiKey: string;
}

interface KeyParams {
  id: string;
}

interface UsageQuery {
  days?: string;
}

// ============================================
// Routes
// ============================================

export default async function apiKeysRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    if (!userId) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Check if encryption is configured
    if (!isEncryptionConfigured()) {
      reply.status(503).send({
        error: 'Service Unavailable',
        message: 'BYOK is not configured on this server. Contact administrator.',
      });
      return;
    }
  });

  /**
   * GET /api/v1/api-keys/providers
   * List supported API providers
   */
  fastify.get('/providers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const providers = await getProviders();
      return { providers };
    } catch (err) {
      logger.error('Failed to get providers', err);
      reply.status(500).send({ error: 'Failed to get providers' });
    }
  });

  /**
   * GET /api/v1/api-keys
   * List user's API keys (without actual key values)
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    try {
      const keys = await getUserApiKeys(userId);
      return { keys };
    } catch (err) {
      logger.error('Failed to get API keys', err);
      reply.status(500).send({ error: 'Failed to get API keys' });
    }
  });

  /**
   * POST /api/v1/api-keys
   * Add or update an API key
   */
  fastify.post<{ Body: SaveKeyBody }>(
    '/',
    async (request: FastifyRequest<{ Body: SaveKeyBody }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { provider, apiKey } = request.body;

      // Validate input
      if (!provider || !apiKey) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'Provider and apiKey are required',
        });
        return;
      }

      // Validate provider
      const providers = await getProviders();
      const validProvider = providers.find((p) => p.id === provider);
      if (!validProvider) {
        reply.status(400).send({
          error: 'Bad Request',
          message: `Invalid provider: ${provider}. Supported: ${providers.map((p) => p.id).join(', ')}`,
        });
        return;
      }

      try {
        const key = await saveApiKey({ userId, provider, apiKey });

        // Don't return the actual key
        return {
          success: true,
          key: {
            id: key.id,
            provider: key.provider,
            providerName: validProvider.name,
            keyHint: key.keyHint,
            isActive: key.isActive,
            isValid: key.isValid,
            lastError: key.lastError,
          },
          message: key.isValid
            ? 'API key added and validated successfully'
            : `API key added but validation failed: ${key.lastError}`,
        };
      } catch (err) {
        logger.error('Failed to save API key', err);
        reply.status(500).send({
          error: 'Failed to save API key',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * DELETE /api/v1/api-keys/:id
   * Remove an API key
   */
  fastify.delete<{ Params: KeyParams }>(
    '/:id',
    async (request: FastifyRequest<{ Params: KeyParams }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { id } = request.params;

      try {
        const deleted = await deleteApiKey(userId, id);

        if (!deleted) {
          reply.status(404).send({
            error: 'Not Found',
            message: 'API key not found',
          });
          return;
        }

        return { success: true, message: 'API key deleted' };
      } catch (err) {
        logger.error('Failed to delete API key', err);
        reply.status(500).send({ error: 'Failed to delete API key' });
      }
    }
  );

  /**
   * POST /api/v1/api-keys/:id/test
   * Test/validate an API key
   */
  fastify.post<{ Params: KeyParams }>(
    '/:id/test',
    async (request: FastifyRequest<{ Params: KeyParams }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const { id } = request.params;

      try {
        const result = await testApiKey(userId, id);

        return {
          success: result.valid,
          valid: result.valid,
          error: result.error,
          message: result.valid ? 'API key is valid' : `Validation failed: ${result.error}`,
        };
      } catch (err) {
        logger.error('Failed to test API key', err);

        if (err instanceof Error && err.message.includes('not found')) {
          reply.status(404).send({
            error: 'Not Found',
            message: 'API key not found',
          });
          return;
        }

        reply.status(500).send({ error: 'Failed to test API key' });
      }
    }
  );

  /**
   * GET /api/v1/api-keys/usage
   * Get API key usage statistics
   */
  fastify.get<{ Querystring: UsageQuery }>(
    '/usage',
    async (request: FastifyRequest<{ Querystring: UsageQuery }>, reply: FastifyReply) => {
      const userId = (request as any).userId;
      const days = parseInt(request.query.days || '30', 10);

      try {
        const stats = await getUsageStats(userId, days);

        return {
          period: `${days} days`,
          ...stats,
          estimatedCostDollars: (stats.estimatedCostCents / 100).toFixed(2),
        };
      } catch (err) {
        logger.error('Failed to get usage stats', err);
        reply.status(500).send({ error: 'Failed to get usage statistics' });
      }
    }
  );

  /**
   * GET /api/v1/api-keys/settings
   * Get BYOK configuration and routing information for current user
   */
  fastify.get('/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    try {
      // Get BYOK context and routing decision
      const byokContext = await byokRouter.getByokContext(userId);
      const keySource = byokRouter.determineKeySource(byokContext);

      // Check if user has byok_enabled feature flag
      const byokEnabled = await featureFlagsService.hasFeature(userId, 'byok_enabled');

      return {
        enabled: byokEnabled, // Whether BYOK UI should be visible for this user
        flags: {
          byokEnabled: byokContext.flags.byokEnabled,
          byokUsesInternalCredits: byokContext.flags.byokUsesInternalCredits,
          byokOnlyMode: byokContext.flags.byokOnlyMode,
        },
        hasCredits: byokContext.hasCredits,
        hasByokKeys: byokContext.byokProviders.length > 0,
        byokProviders: byokContext.byokProviders,
        keySource: {
          source: keySource.source,
          reason: keySource.reason,
        },
      };
    } catch (err) {
      logger.error('Failed to get BYOK settings', err);
      reply.status(500).send({ error: 'Failed to get BYOK settings' });
    }
  });
}

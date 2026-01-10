/**
 * Feature Flags Routes
 *
 * Exposes feature access information for frontend/extensions.
 * Uses direct PostgreSQL queries for feature flag lookups.
 */

import { FastifyPluginAsync } from 'fastify';

// Tier hierarchy for comparison
const TIER_ORDER: Record<string, number> = {
  community: 0,
  subscriber: 1,
  premium: 2,
  lifetime: 3,
};

function tierMeetsRequirement(userTier: string, requiredTier: string): boolean {
  const userLevel = TIER_ORDER[userTier] ?? 0;
  const requiredLevel = TIER_ORDER[requiredTier] ?? 0;
  return userLevel >= requiredLevel;
}

const featuresRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/features - Get current user's feature access
   * Requires authentication
   */
  fastify.get(
    '/features',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Features'],
        summary: 'Get current user feature access',
        description: 'Returns the user tier and feature access flags',
      },
    },
    async (request, reply) => {
      const user = request.user as { id: string; subscription_tier: string };
      const userTier = user.subscription_tier || 'community';

      // Get all enabled feature flags using the new schema
      const flagsResult = await fastify.pg.query(`
        SELECT key, name, description, category, is_enabled, is_premium, min_tier
        FROM feature_flags
        WHERE is_enabled = true
      `);

      // Build features map
      const features: Record<string, boolean> = {};
      for (const flag of flagsResult.rows) {
        const requiredTier = flag.min_tier || 'community';
        const hasAccess = tierMeetsRequirement(userTier, requiredTier);
        features[flag.key] = hasAccess;
      }

      // Get edition config
      const editionResult = await fastify.pg.query(`
        SELECT edition, max_docs_indexed, max_credits_per_month, is_active
        FROM edition_config
        WHERE is_active = true
        LIMIT 1
      `);

      const edition = editionResult.rows[0] || {
        edition: 'community',
        max_docs_indexed: 10,
        max_credits_per_month: 50,
      };

      // Calculate limits based on tier
      let maxDocsIndexed = edition.max_docs_indexed;
      let maxCreditsPerMonth = edition.max_credits_per_month;

      if (userTier === 'premium' || userTier === 'lifetime') {
        maxDocsIndexed = Infinity;
        maxCreditsPerMonth = Infinity;
      } else if (userTier === 'subscriber') {
        maxDocsIndexed = 25;
        maxCreditsPerMonth = 100;
      }

      return {
        userId: user.id,
        tier: userTier,
        features,
        limits: {
          maxDocsIndexed,
          maxCreditsPerMonth,
          creditsUsedThisMonth: 0, // TODO: Calculate from credit_transactions
        },
        edition: edition.edition,
      };
    }
  );

  /**
   * GET /api/v1/features/list - Get all available features (public)
   */
  fastify.get(
    '/features/list',
    {
      schema: {
        tags: ['Features'],
        summary: 'List all available features',
        description: 'Returns all feature flags (public endpoint)',
      },
    },
    async (request, reply) => {
      const result = await fastify.pg.query(`
        SELECT key, name, description, category, is_premium, min_tier
        FROM feature_flags
        WHERE is_enabled = true
        ORDER BY sort_order, key
      `);

      return {
        features: result.rows.map((f) => ({
          key: f.key,
          name: f.name,
          description: f.description,
          category: f.category,
          isPremium: f.is_premium,
          minTier: f.min_tier,
        })),
      };
    }
  );

  /**
   * GET /api/v1/features/edition - Get current edition info
   */
  fastify.get(
    '/features/edition',
    {
      schema: {
        tags: ['Features'],
        summary: 'Get edition configuration',
        description: 'Returns the current SynthStack edition (community vs premium)',
      },
    },
    async (request, reply) => {
      const result = await fastify.pg.query(`
        SELECT edition, max_docs_indexed, max_credits_per_month, is_active
        FROM edition_config
        WHERE is_active = true
        LIMIT 1
      `);

      const edition = result.rows[0] || {
        edition: 'community',
        max_docs_indexed: 10,
        max_credits_per_month: 50,
        is_active: true,
      };

      return {
        edition: edition.edition,
        isActive: edition.is_active,
        maxDocsIndexed: edition.max_docs_indexed,
        maxCreditsPerMonth: edition.max_credits_per_month,
      };
    }
  );

  /**
   * GET /api/v1/features/check/:key - Check if user has access to a specific feature
   * Requires authentication
   */
  fastify.get(
    '/features/check/:key',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Features'],
        summary: 'Check feature access',
        params: {
          type: 'object',
          properties: {
            key: { type: 'string' },
          },
          required: ['key'],
        },
      },
    },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      const user = request.user as { id: string; subscription_tier: string };
      const userTier = user.subscription_tier || 'community';

      const result = await fastify.pg.query(
        `
        SELECT key, name, description, is_enabled, is_premium, min_tier
        FROM feature_flags
        WHERE key = $1 AND is_enabled = true
      `,
        [key]
      );

      if (result.rows.length === 0) {
        return {
          key,
          hasAccess: false,
          reason: 'Feature not found',
        };
      }

      const flag = result.rows[0];
      const requiredTier = flag.min_tier || 'community';
      const hasAccess = tierMeetsRequirement(userTier, requiredTier);

      return {
        key,
        hasAccess,
        userTier,
        requiredTier,
        isPremium: flag.is_premium,
        reason: hasAccess ? 'Access granted' : `Requires ${requiredTier} tier`,
      };
    }
  );
};

export default featuresRoutes;

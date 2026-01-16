/**
 * Feature Flags Middleware
 *
 * Protects routes based on feature flag requirements.
 * Returns 403 with upgrade prompt for premium features when user doesn't have access.
 */

import { FastifyRequest, FastifyReply, FastifyInstance, HookHandlerDoneFunction } from 'fastify';
import { featureFlagsService, UserTier } from '../services/featureFlags.js';

// ============================================
// Types
// ============================================

export interface FeatureGateOptions {
  /**
   * Feature key(s) required for access
   * If multiple, user must have ALL features
   */
  features: string | string[];

  /**
   * Minimum tier required (alternative to feature check)
   */
  minTier?: UserTier;

  /**
   * Custom error message
   */
  errorMessage?: string;

  /**
   * Include upgrade URL in error response
   */
  includeUpgradeUrl?: boolean;
}

export interface FeatureGateError {
  error: string;
  code: 'PREMIUM_REQUIRED' | 'FEATURE_DISABLED' | 'TIER_REQUIRED';
  feature?: string;
  requiredTier?: UserTier;
  currentTier?: UserTier;
  upgradeUrl?: string;
}

// ============================================
// Middleware Factory
// ============================================

/**
 * Create a feature gate middleware
 *
 * Usage:
 * ```typescript
 * fastify.get('/agents', {
 *   preHandler: requireFeature({ features: 'ai_cofounders' })
 * }, handler);
 * ```
 */
export function requireFeature(options: FeatureGateOptions) {
  const {
    features,
    minTier,
    errorMessage,
    includeUpgradeUrl = true,
  } = options;

  const featureList = Array.isArray(features) ? features : [features];

  return async function featureGateHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Get user ID from authenticated request
    const userId = (request as any).user?.id;

    if (!userId) {
      reply.status(401).send({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Check minimum tier if specified
    if (minTier) {
      const userTier = await featureFlagsService.getUserTier(userId);
      const tierOrder: Record<UserTier, number> = {
        community: 0,
        subscriber: 1,
        premium: 2,
        lifetime: 3,
      };

      if (tierOrder[userTier] < tierOrder[minTier]) {
        const errorResponse: FeatureGateError = {
          error: errorMessage || `This feature requires ${minTier} tier or higher`,
          code: 'TIER_REQUIRED',
          requiredTier: minTier,
          currentTier: userTier,
        };

        if (includeUpgradeUrl) {
          errorResponse.upgradeUrl = '/pricing';
        }

        reply.status(403).send(errorResponse);
        return;
      }
    }

    // Check all required features
    for (const featureKey of featureList) {
      const hasAccess = await featureFlagsService.hasFeature(userId, featureKey);

      if (!hasAccess) {
        const flag = await featureFlagsService.getFlag(featureKey);
        const userTier = await featureFlagsService.getUserTier(userId);

        const errorResponse: FeatureGateError = {
          error: errorMessage || `This feature requires a premium subscription`,
          code: flag?.isPremium ? 'PREMIUM_REQUIRED' : 'FEATURE_DISABLED',
          feature: featureKey,
          currentTier: userTier,
          requiredTier: flag?.minTier || undefined,
        };

        if (includeUpgradeUrl) {
          errorResponse.upgradeUrl = '/pricing';
        }

        reply.status(403).send(errorResponse);
        return;
      }
    }

    // All checks passed - continue to route handler
  };
}

/**
 * Shorthand for requiring AI Cofounders access
 */
export function requireAICofounders(errorMessage?: string) {
  return requireFeature({
    features: 'ai_cofounders',
    errorMessage: errorMessage || 'AI Co-Founders is a premium feature. Upgrade to unlock all 6 AI agents.',
  });
}

/**
 * Shorthand for requiring GitHub integration access
 */
export function requireGitHub(errorMessage?: string) {
  return requireFeature({
    features: 'github_integration',
    errorMessage: errorMessage || 'GitHub integration is a premium feature.',
  });
}

/**
 * Shorthand for requiring AI suggestions access
 */
export function requireAISuggestions(errorMessage?: string) {
  return requireFeature({
    features: 'ai_suggestions',
    errorMessage: errorMessage || 'AI Suggestions is a premium feature.',
  });
}

/**
 * Shorthand for requiring subscriber tier (basic chat, doc upload)
 */
export function requireSubscriber(errorMessage?: string) {
  return requireFeature({
    features: [],
    minTier: 'subscriber',
    errorMessage: errorMessage || 'This feature requires a subscription.',
  });
}

/**
 * Shorthand for requiring premium tier
 */
export function requirePremium(errorMessage?: string) {
  return requireFeature({
    features: [],
    minTier: 'premium',
    errorMessage: errorMessage || 'This feature requires a premium subscription.',
  });
}

// ============================================
// Fastify Plugin
// ============================================

/**
 * Register feature flags decorators on Fastify instance
 */
export async function featureFlagsPlugin(
  fastify: FastifyInstance,
  _options: Record<string, unknown>,
  done: HookHandlerDoneFunction
): Promise<void> {
  // Decorate request with feature check helper
  fastify.decorateRequest('hasFeature', null);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const userId = (request as any).user?.id;

    // Add helper method to check features within route handlers
    (request as any).hasFeature = async (featureKey: string): Promise<boolean> => {
      if (!userId) return false;
      return featureFlagsService.hasFeature(userId, featureKey);
    };

    // Add helper to get full feature access
    (request as any).getFeatureAccess = async () => {
      if (!userId) return null;
      return featureFlagsService.getUserFeatureAccess(userId);
    };
  });

  done();
}

// ============================================
// Route-Level Feature Check (Non-blocking)
// ============================================

/**
 * Get feature access without blocking
 * Useful for conditionally showing content
 */
export async function checkFeatureAccess(
  request: FastifyRequest,
  featureKey: string
): Promise<{ hasAccess: boolean; tier: UserTier }> {
  const userId = (request as any).user?.id;

  if (!userId) {
    return { hasAccess: false, tier: 'community' };
  }

  const hasAccess = await featureFlagsService.hasFeature(userId, featureKey);
  const tier = await featureFlagsService.getUserTier(userId);

  return { hasAccess, tier };
}

// ============================================
// Feature Flags Route (API Endpoint)
// ============================================

/**
 * Register feature flags API endpoint
 * GET /api/v1/features - Get user's feature access
 */
export async function registerFeatureFlagsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get current user's feature access
  fastify.get('/features', {
    preHandler: (fastify as any).authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const access = await featureFlagsService.getUserFeatureAccess(userId);
    const edition = await featureFlagsService.getEditionConfig();

    return reply.send({
      ...access,
      edition: edition.edition,
    });
  });

  // Get all available features (public info)
  fastify.get('/features/list', async (_request: FastifyRequest, reply: FastifyReply) => {
    const flags = await featureFlagsService.getAllFlags();
    const edition = await featureFlagsService.getEditionConfig();

    // Return public info only (no internal settings)
    const publicFlags = flags.map(flag => ({
      key: flag.key,
      name: flag.name,
      description: flag.description,
      category: flag.category,
      isPremium: flag.isPremium,
      minTier: flag.minTier,
    }));

    return reply.send({
      edition: edition.edition,
      features: publicFlags,
    });
  });
}

/**
 * @file plugins/conditional-features.ts
 * @description Conditional feature loading plugin - COMMUNITY EDITION
 * @module @synthstack/api-gateway/plugins
 *
 * COMMUNITY EDITION: Copilot and Referrals are NOT available.
 * This plugin is simplified to only log that these features are disabled.
 */

import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

// ============================================
// TYPE DECLARATIONS
// ============================================

declare module 'fastify' {
  interface FastifyInstance {
    features: {
      copilot: boolean;
      referrals: boolean;
    };
  }
}

// ============================================
// PLUGIN
// ============================================

async function conditionalFeaturesPlugin(fastify: FastifyInstance): Promise<void> {
  // COMMUNITY: Features are always disabled
  const features = {
    copilot: false,
    referrals: false,
  };

  // Decorate Fastify instance with feature flags
  fastify.decorate('features', features);

  fastify.log.info('📦 SynthStack Community Edition');
  fastify.log.info('   - Copilot/Agentic AI: ❌ Not available (PRO feature)');
  fastify.log.info('   - Referrals & Rewards: ❌ Not available (PRO feature)');
  fastify.log.info('   Upgrade to PRO at: https://synthstack.app/pricing');
}

export default fp(conditionalFeaturesPlugin, {
  name: 'conditional-features',
  dependencies: ['@fastify/postgres'],
});

/**
 * @file plugins/conditional-features.ts
 * @description Conditional feature loading plugin
 * @module @synthstack/api-gateway/plugins
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
      aiAgents: boolean;
      copilotRag: boolean;
      referrals: boolean;
    };
  }
}

// ============================================
// PLUGIN
// ============================================

async function conditionalFeaturesPlugin(fastify: FastifyInstance): Promise<void> {
  // NOTE: strict parsing: only the exact string "true" enables a flag.
  // This avoids accidental enablement from values like "TRUE", "1", "yes", etc.
  const isTrue = (value: string | undefined): boolean => value === 'true';

  const enabledCopilot = isTrue(process.env.ENABLE_COPILOT);
  const enabledReferrals = isTrue(process.env.ENABLE_REFERRALS);

  // Defaults:
  // - If ENABLE_AI_AGENTS is unset, default to ENABLE_COPILOT (legacy behavior).
  // - If ENABLE_COPILOT_RAG is unset, default to ENABLE_AI_AGENTS.
  const enabledAiAgents =
    process.env.ENABLE_AI_AGENTS === undefined
      ? enabledCopilot
      : isTrue(process.env.ENABLE_AI_AGENTS);

  const enabledCopilotRag =
    process.env.ENABLE_COPILOT_RAG === undefined
      ? enabledAiAgents
      : isTrue(process.env.ENABLE_COPILOT_RAG);

  const features = {
    copilot: enabledCopilot,
    aiAgents: enabledAiAgents,
    copilotRag: enabledCopilotRag,
    referrals: enabledReferrals,
  };

  // Decorate Fastify instance with feature flags
  fastify.decorate('features', features);

  fastify.log.info('🎛️  Feature flags');
  fastify.log.info(`   - Copilot: ${features.copilot ? '✅ Enabled' : '❌ Disabled'}`);
  fastify.log.info(`   - AI Agents: ${features.aiAgents ? '✅ Enabled' : '❌ Disabled'}`);
  fastify.log.info(`   - Copilot RAG: ${features.copilotRag ? '✅ Enabled' : '❌ Disabled'}`);
  fastify.log.info(`   - Referrals & Rewards: ${features.referrals ? '✅ Enabled' : '❌ Disabled'}`);
}

export default fp(conditionalFeaturesPlugin, {
  name: 'conditional-features',
  dependencies: ['@fastify/postgres'],
});

/**
 * @file plugins/referral-services.ts
 * @description Fastify plugin to initialize referral system services from @synthstack/referrals-credits
 * @module @synthstack/api-gateway/plugins
 */

import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { v4 as uuidv4 } from 'uuid';
import {
  ReferralService,
  DiscountService,
  StatsService,
  RewardService,
  createPgAdapter,
} from '@synthstack/referrals-credits';

// ============================================
// TYPE DECLARATIONS
// ============================================

declare module 'fastify' {
  interface FastifyInstance {
    referralService: ReferralService;
    discountService: DiscountService;
    statsService: StatsService;
    rewardService: RewardService;
  }
}

// ============================================
// PLUGIN
// ============================================

async function referralServicesPlugin(fastify: FastifyInstance): Promise<void> {
  // Create database adapter from Fastify's PostgreSQL pool
  const db = createPgAdapter(fastify.pg.pool);

  // Service dependencies with ID generator
  const deps = {
    db,
    generateId: uuidv4,
  };

  // Instantiate all services
  const referralService = new ReferralService(deps);
  const discountService = new DiscountService(deps);
  const statsService = new StatsService(deps);
  const rewardService = new RewardService(deps);

  // Decorate Fastify instance with services
  fastify.decorate('referralService', referralService);
  fastify.decorate('discountService', discountService);
  fastify.decorate('statsService', statsService);
  fastify.decorate('rewardService', rewardService);

  fastify.log.info('🎁 Referral services initialized');
}

export default fp(referralServicesPlugin, {
  name: 'referral-services',
  dependencies: ['@fastify/postgres'],
});

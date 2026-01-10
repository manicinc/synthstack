/**
 * @synthstack/referrals-credits
 *
 * Referral system, discount codes, and workflow credit cost calculator for SynthStack
 */

// Types
export * from './types/index.js';

// Constants
export * from './constants/index.js';

// Utilities
export * from './utils/index.js';

// Database adapters
export * from './database/index.js';

// Services
export * from './services/index.js';

// Re-export commonly used items at top level for convenience
export {
  ReferralService,
  DiscountService,
  StatsService,
  RewardService,
  calculateWorkflowCreditCost,
  estimateWorkflowCost,
  extractPremiumNodes,
  checkCreditSufficiency,
  getFreeExecutionsRemaining,
  isExecutionFree,
} from './services/index.js';

export { createPgAdapter } from './database/pg-adapter.js';
export { createNoOpAdapter } from './database/database-adapter.js';

import type { SubscriptionTier } from '../types/credits.js';

/**
 * Free executions per day by tier (before credits are charged)
 */
export const FREE_EXECUTIONS_PER_TIER: Record<SubscriptionTier | string, number> = {
  free: 0,
  maker: 5,
  pro: 20,
  agency: 100,
  enterprise: 500,
  lifetime: 30,
  unlimited: 999999,
};

/**
 * Get free executions for a subscription tier
 */
export function getFreeExecutionsForTier(tier: SubscriptionTier | string): number {
  return FREE_EXECUTIONS_PER_TIER[tier] ?? 0;
}

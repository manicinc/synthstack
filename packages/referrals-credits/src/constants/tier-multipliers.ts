import type { SubscriptionTier } from '../types/credits.js';

/**
 * Tier-based credit multipliers
 * Lower tiers pay more per execution to encourage upgrades
 */
export const TIER_WORKFLOW_MULTIPLIERS: Record<SubscriptionTier | string, number> = {
  free: 2.0,        // 2x cost - discourage heavy usage on free tier
  maker: 1.5,       // 1.5x cost
  pro: 1.0,         // Base cost
  agency: 0.75,     // 25% discount
  enterprise: 0.5,  // 50% discount
  lifetime: 0.8,    // 20% discount
  unlimited: 0.5,   // 50% discount (same as enterprise)
};

/**
 * Get the multiplier for a subscription tier
 */
export function getTierMultiplier(tier: SubscriptionTier | string): number {
  return TIER_WORKFLOW_MULTIPLIERS[tier] ?? TIER_WORKFLOW_MULTIPLIERS.free;
}

/**
 * Get all available tiers
 */
export function getAvailableTiers(): string[] {
  return Object.keys(TIER_WORKFLOW_MULTIPLIERS);
}

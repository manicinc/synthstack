/**
 * ML Request Cost Calculation Service
 *
 * Calculates credit costs for ML service requests (embeddings, RAG, analysis, etc.)
 * This is separate from workflow cost calculation.
 */

import type { SubscriptionTier } from '../stripe.js';

// ============================================
// ML Endpoint Cost Configuration
// ============================================

export interface MLEndpointCost {
  base: number;         // Base cost in credits
  premium: boolean;     // Is this a premium endpoint?
  perItem?: number;     // Cost per item for batch operations
  perToken?: number;    // Cost per 1000 tokens (for LLM operations)
}

/**
 * ML Endpoint Cost Table
 * Base costs for different ML service endpoints
 */
export const ML_ENDPOINT_COSTS: Record<string, MLEndpointCost> = {
  // Embeddings (2-5 credits)
  '/embeddings/generate': { base: 2, premium: true },
  '/embeddings/batch': { base: 5, premium: true, perItem: 0.1 },
  '/embeddings/similarity': { base: 1, premium: false },
  '/embeddings/search': { base: 2, premium: true },

  // RAG Operations (3-7 credits)
  '/rag/query': { base: 3, premium: true },
  '/rag/ingest': { base: 2, premium: true },
  '/rag/update': { base: 2, premium: true },
  '/rag/delete': { base: 1, premium: false },
  '/rag/search': { base: 3, premium: true },
  '/rag/batch-ingest': { base: 7, premium: true, perItem: 0.2 },

  // Analysis (4-8 credits)
  '/analysis/generate': { base: 4, premium: true, perToken: 0.001 },
  '/analysis/sentiment': { base: 3, premium: true },
  '/analysis/summarize': { base: 5, premium: true, perToken: 0.001 },
  '/analysis/classify': { base: 3, premium: true },
  '/analysis/extract': { base: 4, premium: true },
  '/analysis/batch': { base: 8, premium: true, perItem: 0.3 },

  // Complexity Estimation (3-5 credits)
  '/complexity/estimate': { base: 3, premium: true },
  '/complexity/analyze': { base: 4, premium: true },
  '/complexity/batch': { base: 5, premium: true, perItem: 0.2 },

  // Transcription (10-20 credits, high cost)
  '/transcription/transcribe': { base: 10, premium: true },
  '/transcription/convert': { base: 5, premium: true },
  '/transcription/batch': { base: 20, premium: true, perItem: 1.0 },
  '/transcription/translate': { base: 12, premium: true },
  '/transcription/diarize': { base: 15, premium: true },

  // Copilot / Agent Operations (3-10 credits)
  '/copilot/chat': { base: 3, premium: true, perToken: 0.001 },
  '/copilot/complete': { base: 2, premium: true },
  '/agents/execute': { base: 5, premium: true },
  '/agents/analyze': { base: 4, premium: true },
  '/langgraph/execute': { base: 10, premium: true },
};

/**
 * Tier-based Credit Multipliers (reuse from workflow system)
 * Higher tiers get discounts on ML operations
 */
export const ML_TIER_MULTIPLIERS: Record<string, number> = {
  free: 2.0,         // 2x cost (expensive for free tier)
  maker: 1.5,        // 1.5x cost
  pro: 1.0,          // Base cost
  agency: 0.5,       // 50% discount
  enterprise: 0.5,   // 50% discount
  lifetime: 0.75,    // 25% discount
  unlimited: 0.0,    // No cost
  admin: 0.0,        // No cost
};

/**
 * Max cost cap to prevent runaway charges
 */
export const ML_MAX_COST_CAP = 100;

/**
 * Duration penalty (add 1 credit per 30 seconds)
 */
export const ML_DURATION_THRESHOLD_MS = 30000;

// ============================================
// Cost Calculation Functions
// ============================================

export interface MLCostEstimate {
  estimatedCost: number;
  baseCost: number;
  tierMultiplier: number;
  isPremium: boolean;
  canAfford: boolean;
  creditsRemaining: number;
  breakdown: string;
}

export interface MLCostCalculation {
  actualCost: number;
  baseCost: number;
  durationCost: number;
  tierMultiplier: number;
  wasCapped: boolean;
  breakdown: string;
}

/**
 * Estimate ML request cost before execution
 * Used for pre-flight credit checks
 */
export function estimateMLRequestCost(
  endpoint: string,
  tier: SubscriptionTier | string,
  payload?: any,
  creditsRemaining?: number
): MLCostEstimate {
  // Get endpoint config or default
  const endpointConfig = getEndpointConfig(endpoint);
  const tierMultiplier = ML_TIER_MULTIPLIERS[tier] ?? 1.0;

  // Calculate base cost
  let baseCost = endpointConfig.base;

  // Adjust for batch operations
  if (endpointConfig.perItem && payload) {
    const itemCount = getItemCount(payload);
    if (itemCount > 1) {
      baseCost += (itemCount - 1) * endpointConfig.perItem;
    }
  }

  // Apply tier multiplier
  const estimatedCost = Math.ceil(Math.min(baseCost * tierMultiplier, ML_MAX_COST_CAP));

  // Build breakdown
  const breakdown = buildCostBreakdown({
    baseCost,
    tierMultiplier,
    tier,
    isPremium: endpointConfig.premium,
    estimatedCost,
  });

  return {
    estimatedCost,
    baseCost,
    tierMultiplier,
    isPremium: endpointConfig.premium,
    canAfford: creditsRemaining !== undefined ? creditsRemaining >= estimatedCost : true,
    creditsRemaining: creditsRemaining ?? 0,
    breakdown,
  };
}

/**
 * Calculate actual ML request cost after execution
 * Includes duration-based penalty
 */
export function calculateMLRequestCost(
  endpoint: string,
  tier: SubscriptionTier | string,
  durationMs: number,
  statusCode: number,
  payload?: any
): MLCostCalculation {
  // Failed requests cost nothing
  if (statusCode >= 400) {
    return {
      actualCost: 0,
      baseCost: 0,
      durationCost: 0,
      tierMultiplier: 1.0,
      wasCapped: false,
      breakdown: 'Failed request - no charge',
    };
  }

  // Get base estimate
  const estimate = estimateMLRequestCost(endpoint, tier, payload);

  // Add duration penalty (1 credit per 30 seconds)
  const durationCost = Math.floor(durationMs / ML_DURATION_THRESHOLD_MS);

  // Calculate total cost
  const rawCost = estimate.estimatedCost + durationCost;
  const actualCost = Math.min(rawCost, ML_MAX_COST_CAP);
  const wasCapped = rawCost > ML_MAX_COST_CAP;

  // Build breakdown
  const breakdown = buildCostBreakdown({
    baseCost: estimate.baseCost,
    tierMultiplier: estimate.tierMultiplier,
    tier,
    isPremium: estimate.isPremium,
    estimatedCost: estimate.estimatedCost,
    durationCost,
    actualCost,
    wasCapped,
  });

  return {
    actualCost,
    baseCost: estimate.baseCost,
    durationCost,
    tierMultiplier: estimate.tierMultiplier,
    wasCapped,
    breakdown,
  };
}

/**
 * Check if user can afford ML request
 */
export function canAffordMLRequest(
  endpoint: string,
  tier: SubscriptionTier | string,
  creditsRemaining: number,
  payload?: any
): { canAfford: boolean; required: number; remaining: number; deficit: number } {
  const estimate = estimateMLRequestCost(endpoint, tier, payload, creditsRemaining);

  return {
    canAfford: estimate.canAfford,
    required: estimate.estimatedCost,
    remaining: creditsRemaining,
    deficit: Math.max(0, estimate.estimatedCost - creditsRemaining),
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get endpoint configuration
 * Falls back to default if endpoint not found
 */
function getEndpointConfig(endpoint: string): MLEndpointCost {
  // Try exact match first
  if (ML_ENDPOINT_COSTS[endpoint]) {
    return ML_ENDPOINT_COSTS[endpoint];
  }

  // Try to match by prefix (e.g., /api/v1/copilot/chat -> /copilot/chat)
  for (const [key, config] of Object.entries(ML_ENDPOINT_COSTS)) {
    if (endpoint.includes(key)) {
      return config;
    }
  }

  // Default cost for unknown endpoints
  return { base: 1, premium: false };
}

/**
 * Extract item count from payload for batch operations
 */
function getItemCount(payload: any): number {
  if (!payload || typeof payload !== 'object') {
    return 1;
  }

  // Common batch payload structures
  if (Array.isArray(payload.texts)) return payload.texts.length;
  if (Array.isArray(payload.documents)) return payload.documents.length;
  if (Array.isArray(payload.items)) return payload.items.length;
  if (Array.isArray(payload.files)) return payload.files.length;

  return 1;
}

/**
 * Build human-readable cost breakdown
 */
function buildCostBreakdown(params: {
  baseCost: number;
  tierMultiplier: number;
  tier: string;
  isPremium: boolean;
  estimatedCost: number;
  durationCost?: number;
  actualCost?: number;
  wasCapped?: boolean;
}): string {
  const parts: string[] = [];

  parts.push(`Base: ${params.baseCost} credit${params.baseCost !== 1 ? 's' : ''}`);

  if (params.isPremium) {
    parts.push('Premium endpoint');
  }

  if (params.tierMultiplier !== 1.0) {
    parts.push(`${params.tier} tier: ${params.tierMultiplier}x multiplier`);
  }

  if (params.durationCost && params.durationCost > 0) {
    parts.push(`Duration: +${params.durationCost} credit${params.durationCost !== 1 ? 's' : ''}`);
  }

  if (params.wasCapped) {
    parts.push(`Capped at ${ML_MAX_COST_CAP} credits`);
  }

  const finalCost = params.actualCost ?? params.estimatedCost;
  parts.push(`Total: ${finalCost} credit${finalCost !== 1 ? 's' : ''}`);

  return parts.join(' | ');
}

/**
 * Get tier multiplier
 */
export function getTierMultiplier(tier: SubscriptionTier | string): number {
  return ML_TIER_MULTIPLIERS[tier] ?? 1.0;
}

/**
 * Check if endpoint is premium
 */
export function isMLEndpointPremium(endpoint: string): boolean {
  const config = getEndpointConfig(endpoint);
  return config.premium;
}

/**
 * Get all ML endpoint costs (for admin/documentation)
 */
export function getAllMLEndpointCosts(): Record<string, MLEndpointCost> {
  return { ...ML_ENDPOINT_COSTS };
}

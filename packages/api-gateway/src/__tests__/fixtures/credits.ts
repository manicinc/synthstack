/**
 * Test Credit Fixtures
 *
 * Pre-defined credit data for testing the credit system
 */

export const TIER_MULTIPLIERS = {
  free: 2.0,
  maker: 1.5,
  pro: 1.0,
  agency: 0.5,
  enterprise: 0.5,
  lifetime: 0.8,
  unlimited: 0.0,
  admin: 0.0,
} as const;

export const FREE_EXECUTIONS_PER_DAY = {
  free: 0,
  maker: 5,
  pro: 20,
  agency: 100,
  enterprise: 500,
  lifetime: 30,
  unlimited: 999999,
  admin: 999999,
} as const;

export const ML_ENDPOINT_COSTS = {
  '/embeddings/generate': { base: 2, premium: true },
  '/embeddings/batch': { base: 5, premium: true },
  '/embeddings/similarity': { base: 1, premium: false },
  '/rag/index': { base: 3, premium: true },
  '/rag/search': { base: 2, premium: true },
  '/rag/query': { base: 4, premium: true },
  '/analysis/text': { base: 3, premium: true },
  '/analysis/generate': { base: 4, premium: true },
  '/analysis/classify': { base: 3, premium: true },
  '/analysis/summarize': { base: 3, premium: true },
  '/analysis/sentiment': { base: 1, premium: false },
  '/analysis/keywords': { base: 1, premium: false },
  '/complexity/estimate': { base: 3, premium: true },
  '/complexity/analyze': { base: 3, premium: true },
  '/transcription/transcribe': { base: 10, premium: true },
  '/transcription/audio/base64': { base: 10, premium: true },
  '/transcription/convert': { base: 2, premium: false },
} as const;

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType: 'credit' | 'deduction' | 'adjustment' | 'refund';
  referenceType?: string;
  referenceId?: string;
  description?: string;
  createdAt: Date;
}

export function createTestCreditTransaction(params: Partial<CreditTransaction>): CreditTransaction {
  return {
    id: crypto.randomUUID(),
    userId: params.userId || '00000000-0000-0000-0000-000000000001',
    amount: params.amount || 0,
    transactionType: params.transactionType || 'credit',
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    description: params.description,
    createdAt: params.createdAt || new Date(),
  };
}

export const TEST_WORKFLOW_COSTS = {
  simple: {
    flowId: 'simple-flow',
    durationMs: 5000,
    nodesExecuted: 5,
    premiumNodesUsed: [],
    baseCost: 1,
    durationCost: 0, // < 30s
    complexityCost: 0, // < 10 nodes
    premiumNodeCost: 0,
    tierMultiplier: 1.0,
    totalCost: 1,
  },
  moderate: {
    flowId: 'moderate-flow',
    durationMs: 45000,
    nodesExecuted: 15,
    premiumNodesUsed: ['synthstack-agent'],
    baseCost: 1,
    durationCost: 1, // 1 per 30s
    complexityCost: 1, // 1 per 10 nodes
    premiumNodeCost: 3, // synthstack-agent
    tierMultiplier: 1.0,
    totalCost: 6, // (1 + 1 + 1 + 3) * 1.0
  },
  complex: {
    flowId: 'complex-flow',
    durationMs: 120000,
    nodesExecuted: 35,
    premiumNodesUsed: ['synthstack-agent', 'openai', 'anthropic', 'notion'],
    baseCost: 1,
    durationCost: 4, // 4 per 30s intervals
    complexityCost: 3, // 3 per 10 nodes
    premiumNodeCost: 8, // 3 + 2 + 2 + 1
    tierMultiplier: 1.0,
    totalCost: 16, // (1 + 4 + 3 + 8) * 1.0
  },
};

export function estimateMLRequestCost(endpoint: string, tier: string, payloadSize = 1): number {
  const endpointConfig = ML_ENDPOINT_COSTS[endpoint as keyof typeof ML_ENDPOINT_COSTS] || { base: 1, premium: false };
  const tierMultiplier = TIER_MULTIPLIERS[tier as keyof typeof TIER_MULTIPLIERS] || 1.0;

  let cost = endpointConfig.base * payloadSize;
  cost = Math.ceil(cost * tierMultiplier);

  return Math.min(cost, 100); // Cap at 100
}

export function createTestMLRequest(params: {
  userId: string;
  endpoint: string;
  tier: string;
  durationMs?: number;
  statusCode?: number;
}) {
  const estimatedCost = estimateMLRequestCost(params.endpoint, params.tier);
  const durationMs = params.durationMs || 1000;
  const durationCredits = Math.floor(durationMs / 30000);
  const actualCost = params.statusCode && params.statusCode >= 400 ? 0 : estimatedCost + durationCredits;

  return {
    id: crypto.randomUUID(),
    userId: params.userId,
    organizationId: '00000000-0000-0000-0000-000000000001',
    serviceName: 'fastapi',
    endpoint: params.endpoint,
    method: 'POST',
    statusCode: params.statusCode || 200,
    durationMs,
    creditsCharged: actualCost,
    createdAt: new Date(),
  };
}

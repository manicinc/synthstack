/**
 * @file services/credits/workflow-cost.ts
 * @description Workflow credit cost calculator for Node-RED executions
 * 
 * Calculates credit costs based on:
 * - Base cost (minimum per execution)
 * - Duration (time-based scaling)
 * - Complexity (nodes executed)
 * - Premium nodes (AI, external APIs)
 */

import type { SubscriptionTier } from '../stripe.js';

// ============================================
// TYPES
// ============================================

export interface WorkflowCreditCost {
  baseCost: number;
  durationCost: number;
  complexityCost: number;
  premiumNodeCost: number;
  totalCost: number;
  breakdown: string;
  details: {
    durationMs: number;
    nodesExecuted: number;
    premiumNodesUsed: string[];
    tierMultiplier: number;
  };
}

export interface WorkflowCostEstimate {
  estimatedMinCost: number;
  estimatedMaxCost: number;
  breakdown: string;
  canAfford: boolean;
  creditsRemaining: number;
}

export interface CreditDeductionResult {
  success: boolean;
  creditsDeducted: number;
  newBalance: number;
  transactionId?: string;
  error?: string;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Premium nodes that incur additional credit costs
 * These nodes typically make external API calls or use AI services
 */
export const PREMIUM_NODES: Record<string, number> = {
  // AI/LLM nodes - highest cost
  'synthstack-agent': 3,
  'synthstack-openai': 2,
  'synthstack-anthropic': 2,
  'synthstack-gemini': 2,
  
  // External API integrations - medium cost
  'synthstack-slack': 1,
  'synthstack-discord': 1,
  'synthstack-twilio': 2,
  'synthstack-gmail': 1,
  'synthstack-notion': 1,
  'synthstack-github': 1,
  'synthstack-jira': 1,
  'synthstack-sheets': 1,
  'synthstack-drive': 1,
  
  // Payment/financial - higher cost due to sensitivity
  'synthstack-stripe': 2,
  
  // Directus operations - base cost (included)
  'synthstack-directus': 0,
  
  // Knowledge base - medium cost (vector search)
  'synthstack-kb': 1,
};

/**
 * Tier-based credit multipliers
 * Lower tiers pay more per execution to encourage upgrades
 */
export const TIER_WORKFLOW_MULTIPLIERS: Record<SubscriptionTier | string, number> = {
  free: 2.0,      // 2x cost - discourage heavy usage on free tier
  maker: 1.5,     // 1.5x cost
  pro: 1.0,       // Base cost
  agency: 0.75,   // 25% discount
  enterprise: 0.5, // 50% discount
  lifetime: 0.8,  // 20% discount
  unlimited: 0.5, // 50% discount (same as enterprise)
};

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
 * Cost calculation constants
 */
export const COST_CONSTANTS = {
  BASE_COST: 1,                    // Minimum 1 credit per execution
  DURATION_THRESHOLD_MS: 30000,    // 30 seconds
  DURATION_COST_PER_UNIT: 1,       // 1 credit per 30 seconds
  NODES_THRESHOLD: 10,             // 10 nodes
  COMPLEXITY_COST_PER_UNIT: 1,     // 1 credit per 10 nodes
  MAX_COST_CAP: 100,               // Maximum 100 credits per execution
};

// ============================================
// COST CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate the credit cost for a workflow execution
 * 
 * Formula:
 * workflow_credits = (base_cost + duration_cost + complexity_cost + premium_node_cost) * tier_multiplier
 * 
 * @param durationMs - Execution duration in milliseconds
 * @param nodesExecuted - Number of nodes executed in the flow
 * @param premiumNodesUsed - Array of premium node types used
 * @param tier - User's subscription tier (affects multiplier)
 * @returns WorkflowCreditCost with full breakdown
 */
export function calculateWorkflowCreditCost(
  durationMs: number,
  nodesExecuted: number,
  premiumNodesUsed: string[] = [],
  tier: SubscriptionTier | string = 'free'
): WorkflowCreditCost {
  // Base cost - minimum per execution
  const baseCost = COST_CONSTANTS.BASE_COST;
  
  // Duration cost - 1 credit per 30 seconds
  const durationCost = Math.floor(durationMs / COST_CONSTANTS.DURATION_THRESHOLD_MS) * COST_CONSTANTS.DURATION_COST_PER_UNIT;
  
  // Complexity cost - 1 credit per 10 nodes
  const complexityCost = Math.floor(nodesExecuted / COST_CONSTANTS.NODES_THRESHOLD) * COST_CONSTANTS.COMPLEXITY_COST_PER_UNIT;
  
  // Premium node cost - sum of all premium node costs
  const premiumNodeCost = premiumNodesUsed.reduce((total, nodeType) => {
    const nodeCost = PREMIUM_NODES[nodeType] || 0;
    return total + nodeCost;
  }, 0);
  
  // Calculate raw total
  const rawTotal = baseCost + durationCost + complexityCost + premiumNodeCost;
  
  // Apply tier multiplier
  const tierMultiplier = TIER_WORKFLOW_MULTIPLIERS[tier] || TIER_WORKFLOW_MULTIPLIERS.free;
  const multipliedTotal = Math.ceil(rawTotal * tierMultiplier);
  
  // Apply cap
  const totalCost = Math.min(multipliedTotal, COST_CONSTANTS.MAX_COST_CAP);
  
  // Generate breakdown string
  const breakdownParts: string[] = [];
  breakdownParts.push(`Base: ${baseCost}`);
  if (durationCost > 0) {
    breakdownParts.push(`Duration (${Math.floor(durationMs / 1000)}s): +${durationCost}`);
  }
  if (complexityCost > 0) {
    breakdownParts.push(`Complexity (${nodesExecuted} nodes): +${complexityCost}`);
  }
  if (premiumNodeCost > 0) {
    breakdownParts.push(`Premium nodes (${premiumNodesUsed.length}): +${premiumNodeCost}`);
  }
  if (tierMultiplier !== 1.0) {
    breakdownParts.push(`Tier multiplier (${tier}): x${tierMultiplier}`);
  }
  
  const breakdown = breakdownParts.join(' | ') + ` = ${totalCost} credits`;
  
  return {
    baseCost,
    durationCost,
    complexityCost,
    premiumNodeCost,
    totalCost,
    breakdown,
    details: {
      durationMs,
      nodesExecuted,
      premiumNodesUsed,
      tierMultiplier,
    },
  };
}

/**
 * Estimate credit cost before execution (for pre-flight checks)
 * Uses flow metadata to estimate likely cost range
 * 
 * @param flowNodeCount - Total nodes in the flow
 * @param flowNodeTypes - Array of node types in the flow
 * @param tier - User's subscription tier
 * @param creditsRemaining - User's current credit balance
 * @returns WorkflowCostEstimate with min/max range
 */
export function estimateWorkflowCost(
  flowNodeCount: number,
  flowNodeTypes: string[],
  tier: SubscriptionTier | string,
  creditsRemaining: number
): WorkflowCostEstimate {
  // Find premium nodes in the flow
  const premiumNodesInFlow = flowNodeTypes.filter(nodeType => 
    PREMIUM_NODES[nodeType] !== undefined && PREMIUM_NODES[nodeType] > 0
  );
  
  // Minimum estimate: fast execution, few nodes actually run
  const minCost = calculateWorkflowCreditCost(
    1000,  // 1 second (fast)
    Math.ceil(flowNodeCount * 0.3),  // Assume 30% of nodes execute
    premiumNodesInFlow.slice(0, Math.ceil(premiumNodesInFlow.length * 0.5)),  // 50% of premium nodes
    tier
  );
  
  // Maximum estimate: slow execution, all nodes run
  const maxCost = calculateWorkflowCreditCost(
    120000,  // 2 minutes (slow)
    flowNodeCount,  // All nodes execute
    premiumNodesInFlow,  // All premium nodes used
    tier
  );
  
  const canAfford = creditsRemaining >= minCost.totalCost;
  
  const breakdown = `Estimated ${minCost.totalCost}-${maxCost.totalCost} credits ` +
    `(${flowNodeCount} nodes, ${premiumNodesInFlow.length} premium)`;
  
  return {
    estimatedMinCost: minCost.totalCost,
    estimatedMaxCost: maxCost.totalCost,
    breakdown,
    canAfford,
    creditsRemaining,
  };
}

/**
 * Extract premium node types from a flow's node list
 * 
 * @param nodes - Array of flow nodes with type property
 * @returns Array of premium node type strings
 */
export function extractPremiumNodes(nodes: Array<{ type: string; [key: string]: unknown }>): string[] {
  const premiumNodes: string[] = [];
  
  for (const node of nodes) {
    if (PREMIUM_NODES[node.type] !== undefined && PREMIUM_NODES[node.type] > 0) {
      premiumNodes.push(node.type);
    }
  }
  
  return premiumNodes;
}

/**
 * Check if user has enough credits for estimated workflow execution
 * 
 * @param creditsRemaining - User's current credit balance
 * @param estimatedCost - Estimated credit cost
 * @returns Object with canExecute flag and details
 */
export function checkCreditSufficiency(
  creditsRemaining: number,
  estimatedCost: number
): { canExecute: boolean; creditsNeeded: number; shortfall: number } {
  const canExecute = creditsRemaining >= estimatedCost;
  const shortfall = canExecute ? 0 : estimatedCost - creditsRemaining;
  
  return {
    canExecute,
    creditsNeeded: estimatedCost,
    shortfall,
  };
}

/**
 * Get the number of free executions remaining for today
 * 
 * @param tier - User's subscription tier
 * @param executionsToday - Number of executions already made today
 * @returns Number of free executions remaining
 */
export function getFreeExecutionsRemaining(
  tier: SubscriptionTier | string,
  executionsToday: number
): number {
  const freeLimit = FREE_EXECUTIONS_PER_TIER[tier] || 0;
  return Math.max(0, freeLimit - executionsToday);
}

/**
 * Determine if an execution should be free (within daily free tier limit)
 * 
 * @param tier - User's subscription tier
 * @param executionsToday - Number of executions already made today
 * @returns Boolean indicating if execution is free
 */
export function isExecutionFree(
  tier: SubscriptionTier | string,
  executionsToday: number
): boolean {
  return getFreeExecutionsRemaining(tier, executionsToday) > 0;
}



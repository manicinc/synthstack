/**
 * Workflow credit cost calculator service
 *
 * Calculates credit costs based on:
 * - Base cost (minimum per execution)
 * - Duration (time-based scaling)
 * - Complexity (nodes executed)
 * - Premium nodes (AI, external APIs)
 */

import { COST_CONSTANTS } from '../constants/cost-constants.js';
import { PREMIUM_NODES } from '../constants/premium-nodes.js';
import { TIER_WORKFLOW_MULTIPLIERS, getTierMultiplier } from '../constants/tier-multipliers.js';
import { FREE_EXECUTIONS_PER_TIER, getFreeExecutionsForTier } from '../constants/free-executions.js';
import type {
  SubscriptionTier,
  WorkflowCreditCost,
  WorkflowCostEstimate,
  CreditSufficiency,
  FlowNode,
} from '../types/credits.js';

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
  const durationCost =
    Math.floor(durationMs / COST_CONSTANTS.DURATION_THRESHOLD_MS) * COST_CONSTANTS.DURATION_COST_PER_UNIT;

  // Complexity cost - 1 credit per 10 nodes
  const complexityCost =
    Math.floor(nodesExecuted / COST_CONSTANTS.NODES_THRESHOLD) * COST_CONSTANTS.COMPLEXITY_COST_PER_UNIT;

  // Premium node cost - sum of all premium node costs
  const premiumNodeCost = premiumNodesUsed.reduce((total, nodeType) => {
    const nodeCost = PREMIUM_NODES[nodeType] || 0;
    return total + nodeCost;
  }, 0);

  // Calculate raw total
  const rawTotal = baseCost + durationCost + complexityCost + premiumNodeCost;

  // Apply tier multiplier
  const tierMultiplier = getTierMultiplier(tier);
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
  const premiumNodesInFlow = flowNodeTypes.filter(
    (nodeType) => PREMIUM_NODES[nodeType] !== undefined && PREMIUM_NODES[nodeType] > 0
  );

  // Minimum estimate: fast execution, few nodes actually run
  const minCost = calculateWorkflowCreditCost(
    1000, // 1 second (fast)
    Math.ceil(flowNodeCount * 0.3), // Assume 30% of nodes execute
    premiumNodesInFlow.slice(0, Math.ceil(premiumNodesInFlow.length * 0.5)), // 50% of premium nodes
    tier
  );

  // Maximum estimate: slow execution, all nodes run
  const maxCost = calculateWorkflowCreditCost(
    120000, // 2 minutes (slow)
    flowNodeCount, // All nodes execute
    premiumNodesInFlow, // All premium nodes used
    tier
  );

  const canAfford = creditsRemaining >= minCost.totalCost;

  const breakdown =
    `Estimated ${minCost.totalCost}-${maxCost.totalCost} credits ` +
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
export function extractPremiumNodes(nodes: FlowNode[]): string[] {
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
export function checkCreditSufficiency(creditsRemaining: number, estimatedCost: number): CreditSufficiency {
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
export function getFreeExecutionsRemaining(tier: SubscriptionTier | string, executionsToday: number): number {
  const freeLimit = getFreeExecutionsForTier(tier);
  return Math.max(0, freeLimit - executionsToday);
}

/**
 * Determine if an execution should be free (within daily free tier limit)
 *
 * @param tier - User's subscription tier
 * @param executionsToday - Number of executions already made today
 * @returns Boolean indicating if execution is free
 */
export function isExecutionFree(tier: SubscriptionTier | string, executionsToday: number): boolean {
  return getFreeExecutionsRemaining(tier, executionsToday) > 0;
}

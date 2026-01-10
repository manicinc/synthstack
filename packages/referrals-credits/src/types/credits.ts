/**
 * Workflow credit cost types
 */

export type SubscriptionTier = 'free' | 'maker' | 'pro' | 'agency' | 'enterprise' | 'lifetime' | 'unlimited';

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

export interface CreditSufficiency {
  canExecute: boolean;
  creditsNeeded: number;
  shortfall: number;
}

export interface FlowNode {
  type: string;
  [key: string]: unknown;
}

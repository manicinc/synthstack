/**
 * Workflow types for SynthStack (Node-RED based)
 */

export interface Workflow {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  flowJson: string;
  isEnabled: boolean;
  isPublished: boolean;
  version: number;
  lastDeployedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  z: string;
  wires: string[][];
  properties?: Record<string, unknown>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  triggeredBy: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  creditsCharged: number;
  premiumNodesUsed: string[];
  isFreeExecution: boolean;
  errorMessage?: string;
}

export type ExecutionStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface WorkflowCreditConfig {
  tier: string;
  costMultiplier: number;
  freeExecutionsPerDay: number;
  maxCreditsPerExecution: number;
}

export interface PremiumNodeCost {
  nodeType: string;
  category: NodeCategory;
  creditCost: number;
  description: string;
}

export type NodeCategory =
  | 'ai'
  | 'integration'
  | 'communication'
  | 'financial'
  | 'database'
  | 'utility';

export interface WorkflowCostEstimate {
  baseCost: number;
  premiumNodesCost: number;
  totalCost: number;
  multiplier: number;
  isFree: boolean;
  freeExecutionsRemaining: number;
  breakdown: Array<{
    nodeType: string;
    cost: number;
  }>;
}

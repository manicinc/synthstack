/**
 * Workflow Cost Service Tests
 *
 * Comprehensive tests for credit cost calculation
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWorkflowCreditCost,
  estimateWorkflowCost,
  extractPremiumNodes,
  checkCreditSufficiency,
  getFreeExecutionsRemaining,
  isExecutionFree,
} from '../../../src/services/workflow-cost-service.js';
import { COST_CONSTANTS } from '../../../src/constants/cost-constants.js';
import { PREMIUM_NODES } from '../../../src/constants/premium-nodes.js';

describe('calculateWorkflowCreditCost', () => {
  describe('Base cost', () => {
    it('should have minimum 1 credit base cost', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'pro');
      expect(result.baseCost).toBe(COST_CONSTANTS.BASE_COST);
      expect(result.totalCost).toBeGreaterThanOrEqual(1);
    });

    it('should include base cost in total', () => {
      const result = calculateWorkflowCreditCost(1000, 5, [], 'pro');
      expect(result.totalCost).toBeGreaterThanOrEqual(result.baseCost);
    });
  });

  describe('Duration cost', () => {
    it('should add no cost under 30s threshold', () => {
      const result = calculateWorkflowCreditCost(29999, 0, [], 'pro');
      expect(result.durationCost).toBe(0);
    });

    it('should add 1 credit per 30 seconds', () => {
      const result = calculateWorkflowCreditCost(60000, 0, [], 'pro');
      expect(result.durationCost).toBe(2);
    });

    it('should handle exact boundary (30000ms)', () => {
      const result = calculateWorkflowCreditCost(30000, 0, [], 'pro');
      expect(result.durationCost).toBe(1);
    });

    it('should handle long durations', () => {
      const result = calculateWorkflowCreditCost(300000, 0, [], 'pro'); // 5 minutes
      expect(result.durationCost).toBe(10);
    });

    it('should floor partial time units', () => {
      const result = calculateWorkflowCreditCost(45000, 0, [], 'pro'); // 45 seconds
      expect(result.durationCost).toBe(1);
    });
  });

  describe('Complexity cost', () => {
    it('should add no cost under 10 nodes', () => {
      const result = calculateWorkflowCreditCost(0, 9, [], 'pro');
      expect(result.complexityCost).toBe(0);
    });

    it('should add 1 credit per 10 nodes', () => {
      const result = calculateWorkflowCreditCost(0, 20, [], 'pro');
      expect(result.complexityCost).toBe(2);
    });

    it('should handle exact boundary (10 nodes)', () => {
      const result = calculateWorkflowCreditCost(0, 10, [], 'pro');
      expect(result.complexityCost).toBe(1);
    });

    it('should handle large node counts', () => {
      const result = calculateWorkflowCreditCost(0, 100, [], 'pro');
      expect(result.complexityCost).toBe(10);
    });

    it('should floor partial node units', () => {
      const result = calculateWorkflowCreditCost(0, 15, [], 'pro');
      expect(result.complexityCost).toBe(1);
    });
  });

  describe('Premium nodes', () => {
    it('should sum all premium node costs', () => {
      const nodes = ['synthstack-openai', 'synthstack-anthropic']; // 2 + 2 = 4
      const result = calculateWorkflowCreditCost(0, 0, nodes, 'pro');
      expect(result.premiumNodeCost).toBe(4);
    });

    it('should handle synthstack-agent (cost: 3)', () => {
      const result = calculateWorkflowCreditCost(0, 0, ['synthstack-agent'], 'pro');
      expect(result.premiumNodeCost).toBe(3);
    });

    it('should handle unknown nodes as 0 cost', () => {
      const result = calculateWorkflowCreditCost(0, 0, ['unknown-node'], 'pro');
      expect(result.premiumNodeCost).toBe(0);
    });

    it('should handle synthstack-directus (cost: 0)', () => {
      const result = calculateWorkflowCreditCost(0, 0, ['synthstack-directus'], 'pro');
      expect(result.premiumNodeCost).toBe(0);
    });

    it('should accumulate multiple of same node', () => {
      const nodes = ['synthstack-openai', 'synthstack-openai', 'synthstack-openai'];
      const result = calculateWorkflowCreditCost(0, 0, nodes, 'pro');
      expect(result.premiumNodeCost).toBe(6);
    });

    it('should handle mixed premium and free nodes', () => {
      const nodes = ['synthstack-agent', 'synthstack-directus', 'synthstack-slack'];
      const result = calculateWorkflowCreditCost(0, 0, nodes, 'pro');
      expect(result.premiumNodeCost).toBe(4); // 3 + 0 + 1
    });

    it('should handle empty premium nodes array', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'pro');
      expect(result.premiumNodeCost).toBe(0);
    });
  });

  describe('Tier multipliers', () => {
    it('should apply 2.0x for free tier', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'free');
      expect(result.details.tierMultiplier).toBe(2.0);
      expect(result.totalCost).toBe(2); // 1 * 2.0 = 2
    });

    it('should apply 1.5x for maker tier', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'maker');
      expect(result.details.tierMultiplier).toBe(1.5);
      expect(result.totalCost).toBe(2); // ceil(1 * 1.5) = 2
    });

    it('should apply 1.0x for pro tier (base)', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'pro');
      expect(result.details.tierMultiplier).toBe(1.0);
      expect(result.totalCost).toBe(1);
    });

    it('should apply 0.75x for agency tier', () => {
      const result = calculateWorkflowCreditCost(0, 20, [], 'agency');
      expect(result.details.tierMultiplier).toBe(0.75);
      // Base: 1 + Complexity: 2 = 3, * 0.75 = 2.25, ceil = 3
      expect(result.totalCost).toBe(3);
    });

    it('should apply 0.5x for enterprise tier', () => {
      const result = calculateWorkflowCreditCost(0, 20, [], 'enterprise');
      expect(result.details.tierMultiplier).toBe(0.5);
      // Base: 1 + Complexity: 2 = 3, * 0.5 = 1.5, ceil = 2
      expect(result.totalCost).toBe(2);
    });

    it('should apply 0.5x for unlimited tier', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'unlimited');
      expect(result.details.tierMultiplier).toBe(0.5);
      expect(result.totalCost).toBe(1); // ceil(1 * 0.5) = 1
    });

    it('should round up after multiplier', () => {
      // Create a scenario where multiplier creates a fraction
      const result = calculateWorkflowCreditCost(0, 0, ['synthstack-slack'], 'agency');
      // Base: 1 + Premium: 1 = 2, * 0.75 = 1.5, ceil = 2
      expect(result.totalCost).toBe(2);
    });

    it('should default to free tier multiplier for unknown tier', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'unknown-tier');
      expect(result.details.tierMultiplier).toBe(2.0);
    });
  });

  describe('Cost cap', () => {
    it('should cap at MAX_COST_CAP (100)', () => {
      // Create a very expensive workflow
      const manyPremiumNodes = Array(50).fill('synthstack-agent'); // 50 * 3 = 150 credits
      const result = calculateWorkflowCreditCost(300000, 500, manyPremiumNodes, 'free');
      expect(result.totalCost).toBe(COST_CONSTANTS.MAX_COST_CAP);
    });

    it('should not cap costs below MAX_COST_CAP', () => {
      const result = calculateWorkflowCreditCost(60000, 50, ['synthstack-agent'], 'pro');
      expect(result.totalCost).toBeLessThan(COST_CONSTANTS.MAX_COST_CAP);
    });
  });

  describe('Breakdown string', () => {
    it('should include base cost in breakdown', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'pro');
      expect(result.breakdown).toContain('Base: 1');
    });

    it('should include duration in breakdown when present', () => {
      const result = calculateWorkflowCreditCost(60000, 0, [], 'pro');
      expect(result.breakdown).toContain('Duration');
    });

    it('should include complexity in breakdown when present', () => {
      const result = calculateWorkflowCreditCost(0, 20, [], 'pro');
      expect(result.breakdown).toContain('Complexity');
    });

    it('should include premium nodes in breakdown when present', () => {
      const result = calculateWorkflowCreditCost(0, 0, ['synthstack-agent'], 'pro');
      expect(result.breakdown).toContain('Premium nodes');
    });

    it('should include tier multiplier when not 1.0', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'free');
      expect(result.breakdown).toContain('Tier multiplier');
    });

    it('should not include tier multiplier for pro tier', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'pro');
      expect(result.breakdown).not.toContain('Tier multiplier');
    });
  });

  describe('Details object', () => {
    it('should include all input parameters in details', () => {
      const nodes = ['synthstack-agent'];
      const result = calculateWorkflowCreditCost(30000, 15, nodes, 'maker');

      expect(result.details.durationMs).toBe(30000);
      expect(result.details.nodesExecuted).toBe(15);
      expect(result.details.premiumNodesUsed).toEqual(nodes);
      expect(result.details.tierMultiplier).toBe(1.5);
    });
  });
});

describe('estimateWorkflowCost', () => {
  it('should return min and max estimates', () => {
    const result = estimateWorkflowCost(20, ['synthstack-agent', 'synthstack-openai'], 'pro', 100);

    expect(result.estimatedMinCost).toBeLessThanOrEqual(result.estimatedMaxCost);
    expect(result.estimatedMinCost).toBeGreaterThanOrEqual(1);
  });

  it('should set canAfford based on min cost', () => {
    const result = estimateWorkflowCost(20, [], 'pro', 1);
    expect(result.canAfford).toBe(true);

    const result2 = estimateWorkflowCost(20, [], 'pro', 0);
    expect(result2.canAfford).toBe(false);
  });

  it('should include credits remaining', () => {
    const result = estimateWorkflowCost(20, [], 'pro', 50);
    expect(result.creditsRemaining).toBe(50);
  });

  it('should include breakdown string', () => {
    const result = estimateWorkflowCost(20, ['synthstack-agent'], 'pro', 100);
    expect(result.breakdown).toContain('Estimated');
    expect(result.breakdown).toContain('nodes');
    expect(result.breakdown).toContain('premium');
  });

  it('should filter premium nodes from flow types', () => {
    const flowTypes = ['function', 'synthstack-agent', 'debug', 'synthstack-directus'];
    const result = estimateWorkflowCost(10, flowTypes, 'pro', 100);

    // Only synthstack-agent is premium (synthstack-directus has 0 cost)
    expect(result.breakdown).toContain('1 premium');
  });
});

describe('extractPremiumNodes', () => {
  it('should extract premium nodes from flow', () => {
    const nodes = [
      { type: 'synthstack-agent' },
      { type: 'function' },
      { type: 'synthstack-openai' },
      { type: 'debug' },
    ];

    const result = extractPremiumNodes(nodes);
    expect(result).toEqual(['synthstack-agent', 'synthstack-openai']);
  });

  it('should return empty array for no premium nodes', () => {
    const nodes = [
      { type: 'function' },
      { type: 'debug' },
      { type: 'synthstack-directus' }, // 0 cost
    ];

    const result = extractPremiumNodes(nodes);
    expect(result).toEqual([]);
  });

  it('should handle empty node array', () => {
    const result = extractPremiumNodes([]);
    expect(result).toEqual([]);
  });

  it('should include duplicates', () => {
    const nodes = [
      { type: 'synthstack-agent' },
      { type: 'synthstack-agent' },
    ];

    const result = extractPremiumNodes(nodes);
    expect(result).toEqual(['synthstack-agent', 'synthstack-agent']);
  });
});

describe('checkCreditSufficiency', () => {
  it('should return canExecute true when sufficient credits', () => {
    const result = checkCreditSufficiency(100, 50);
    expect(result.canExecute).toBe(true);
    expect(result.shortfall).toBe(0);
  });

  it('should return canExecute false when insufficient credits', () => {
    const result = checkCreditSufficiency(30, 50);
    expect(result.canExecute).toBe(false);
    expect(result.shortfall).toBe(20);
  });

  it('should return exact match as sufficient', () => {
    const result = checkCreditSufficiency(50, 50);
    expect(result.canExecute).toBe(true);
    expect(result.shortfall).toBe(0);
  });

  it('should include creditsNeeded', () => {
    const result = checkCreditSufficiency(100, 30);
    expect(result.creditsNeeded).toBe(30);
  });
});

describe('getFreeExecutionsRemaining', () => {
  it('should return 0 for free tier', () => {
    const result = getFreeExecutionsRemaining('free', 0);
    expect(result).toBe(0);
  });

  it('should return correct remaining for maker tier', () => {
    const result = getFreeExecutionsRemaining('maker', 2);
    expect(result).toBe(3); // 5 - 2
  });

  it('should return correct remaining for pro tier', () => {
    const result = getFreeExecutionsRemaining('pro', 10);
    expect(result).toBe(10); // 20 - 10
  });

  it('should return 0 when all free executions used', () => {
    const result = getFreeExecutionsRemaining('maker', 5);
    expect(result).toBe(0);
  });

  it('should return 0 when exceeded (never negative)', () => {
    const result = getFreeExecutionsRemaining('maker', 10);
    expect(result).toBe(0);
  });

  it('should handle unlimited tier', () => {
    const result = getFreeExecutionsRemaining('unlimited', 10000);
    expect(result).toBeGreaterThan(0);
  });
});

describe('isExecutionFree', () => {
  it('should return false for free tier', () => {
    const result = isExecutionFree('free', 0);
    expect(result).toBe(false);
  });

  it('should return true when within free limit', () => {
    const result = isExecutionFree('maker', 2);
    expect(result).toBe(true);
  });

  it('should return false when at limit', () => {
    const result = isExecutionFree('maker', 5);
    expect(result).toBe(false);
  });

  it('should return false when exceeded limit', () => {
    const result = isExecutionFree('maker', 10);
    expect(result).toBe(false);
  });

  it('should return true for unlimited tier', () => {
    const result = isExecutionFree('unlimited', 100000);
    expect(result).toBe(true);
  });
});

/**
 * @file services/credits/__tests__/workflow-cost.test.ts
 * @description Tests for workflow credit cost calculator
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWorkflowCreditCost,
  estimateWorkflowCost,
  extractPremiumNodes,
  checkCreditSufficiency,
  getFreeExecutionsRemaining,
  isExecutionFree,
  PREMIUM_NODES,
  TIER_WORKFLOW_MULTIPLIERS,
  FREE_EXECUTIONS_PER_TIER,
  COST_CONSTANTS,
} from '../workflow-cost.js';

describe('Workflow Cost Constants', () => {
  describe('PREMIUM_NODES', () => {
    it('should have AI nodes with highest cost', () => {
      expect(PREMIUM_NODES['synthstack-agent']).toBe(3);
      expect(PREMIUM_NODES['synthstack-openai']).toBe(2);
      expect(PREMIUM_NODES['synthstack-anthropic']).toBe(2);
    });

    it('should have integration nodes with medium cost', () => {
      expect(PREMIUM_NODES['synthstack-slack']).toBe(1);
      expect(PREMIUM_NODES['synthstack-github']).toBe(1);
      expect(PREMIUM_NODES['synthstack-notion']).toBe(1);
    });

    it('should have directus node with zero cost', () => {
      expect(PREMIUM_NODES['synthstack-directus']).toBe(0);
    });

    it('should have payment node with higher cost', () => {
      expect(PREMIUM_NODES['synthstack-stripe']).toBe(2);
    });
  });

  describe('TIER_WORKFLOW_MULTIPLIERS', () => {
    it('should penalize free tier', () => {
      expect(TIER_WORKFLOW_MULTIPLIERS.free).toBe(2.0);
    });

    it('should have base cost for pro tier', () => {
      expect(TIER_WORKFLOW_MULTIPLIERS.pro).toBe(1.0);
    });

    it('should discount enterprise tier', () => {
      expect(TIER_WORKFLOW_MULTIPLIERS.enterprise).toBe(0.5);
    });
  });

  describe('FREE_EXECUTIONS_PER_TIER', () => {
    it('should have no free executions for free tier', () => {
      expect(FREE_EXECUTIONS_PER_TIER.free).toBe(0);
    });

    it('should have limited free executions for maker', () => {
      expect(FREE_EXECUTIONS_PER_TIER.maker).toBe(5);
    });

    it('should have unlimited for unlimited tier', () => {
      expect(FREE_EXECUTIONS_PER_TIER.unlimited).toBe(999999);
    });
  });
});

describe('calculateWorkflowCreditCost', () => {
  describe('Base cost calculation', () => {
    it('should have minimum 1 credit base cost', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'pro');
      expect(result.baseCost).toBe(COST_CONSTANTS.BASE_COST);
      expect(result.baseCost).toBe(1);
    });
  });

  describe('Duration cost calculation', () => {
    it('should add no duration cost under threshold', () => {
      const result = calculateWorkflowCreditCost(29999, 0, [], 'pro');
      expect(result.durationCost).toBe(0);
    });

    it('should add 1 credit per 30 seconds', () => {
      const result = calculateWorkflowCreditCost(60000, 0, [], 'pro'); // 60 seconds
      expect(result.durationCost).toBe(2);
    });

    it('should handle exact threshold boundary', () => {
      const result = calculateWorkflowCreditCost(30000, 0, [], 'pro');
      expect(result.durationCost).toBe(1);
    });

    it('should handle long durations', () => {
      const result = calculateWorkflowCreditCost(120000, 0, [], 'pro'); // 2 minutes
      expect(result.durationCost).toBe(4);
    });
  });

  describe('Complexity cost calculation', () => {
    it('should add no complexity cost under threshold', () => {
      const result = calculateWorkflowCreditCost(0, 9, [], 'pro');
      expect(result.complexityCost).toBe(0);
    });

    it('should add 1 credit per 10 nodes', () => {
      const result = calculateWorkflowCreditCost(0, 25, [], 'pro');
      expect(result.complexityCost).toBe(2);
    });

    it('should handle exact threshold boundary', () => {
      const result = calculateWorkflowCreditCost(0, 10, [], 'pro');
      expect(result.complexityCost).toBe(1);
    });
  });

  describe('Premium node cost calculation', () => {
    it('should sum premium node costs', () => {
      const premiumNodes = ['synthstack-agent', 'synthstack-slack'];
      const result = calculateWorkflowCreditCost(0, 0, premiumNodes, 'pro');
      expect(result.premiumNodeCost).toBe(4); // 3 + 1
    });

    it('should handle unknown nodes as zero cost', () => {
      const result = calculateWorkflowCreditCost(0, 0, ['unknown-node'], 'pro');
      expect(result.premiumNodeCost).toBe(0);
    });

    it('should handle multiple of same node type', () => {
      const premiumNodes = ['synthstack-agent', 'synthstack-agent'];
      const result = calculateWorkflowCreditCost(0, 0, premiumNodes, 'pro');
      expect(result.premiumNodeCost).toBe(6); // 3 + 3
    });

    it('should handle empty premium nodes array', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'pro');
      expect(result.premiumNodeCost).toBe(0);
    });
  });

  describe('Tier multiplier application', () => {
    it('should apply 2x multiplier for free tier', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'free');
      expect(result.totalCost).toBe(2); // 1 base * 2.0
    });

    it('should apply 1x multiplier for pro tier', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'pro');
      expect(result.totalCost).toBe(1); // 1 base * 1.0
    });

    it('should apply 0.5x multiplier for enterprise tier', () => {
      const result = calculateWorkflowCreditCost(30000, 10, ['synthstack-slack'], 'enterprise');
      // 1 base + 1 duration + 1 complexity + 1 premium = 4
      // 4 * 0.5 = 2, ceil = 2
      expect(result.totalCost).toBe(2);
    });

    it('should default to free tier multiplier for unknown tier', () => {
      const result = calculateWorkflowCreditCost(0, 0, [], 'unknown');
      expect(result.details.tierMultiplier).toBe(2.0);
    });
  });

  describe('Cost cap', () => {
    it('should cap total cost at MAX_COST_CAP', () => {
      // Create expensive workflow: long duration, many nodes, lots of premium nodes
      const premiumNodes = Array(50).fill('synthstack-agent');
      const result = calculateWorkflowCreditCost(600000, 200, premiumNodes, 'free');
      expect(result.totalCost).toBeLessThanOrEqual(COST_CONSTANTS.MAX_COST_CAP);
      expect(result.totalCost).toBe(100);
    });
  });

  describe('Breakdown string', () => {
    it('should include all cost components in breakdown', () => {
      const result = calculateWorkflowCreditCost(
        60000, // 2 duration credits
        25,    // 2 complexity credits
        ['synthstack-agent'], // 3 premium credits
        'maker' // 1.5x multiplier
      );

      expect(result.breakdown).toContain('Base: 1');
      expect(result.breakdown).toContain('Duration');
      expect(result.breakdown).toContain('Complexity');
      expect(result.breakdown).toContain('Premium nodes');
      expect(result.breakdown).toContain('Tier multiplier');
      expect(result.breakdown).toContain('credits');
    });

    it('should omit zero-cost components from breakdown', () => {
      const result = calculateWorkflowCreditCost(1000, 5, [], 'pro');
      expect(result.breakdown).toContain('Base: 1');
      expect(result.breakdown).not.toContain('Duration');
      expect(result.breakdown).not.toContain('Complexity');
      expect(result.breakdown).not.toContain('Premium');
      expect(result.breakdown).not.toContain('multiplier');
    });
  });

  describe('Details object', () => {
    it('should include all input details', () => {
      const premiumNodes = ['synthstack-agent', 'synthstack-slack'];
      const result = calculateWorkflowCreditCost(45000, 15, premiumNodes, 'agency');

      expect(result.details.durationMs).toBe(45000);
      expect(result.details.nodesExecuted).toBe(15);
      expect(result.details.premiumNodesUsed).toEqual(premiumNodes);
      expect(result.details.tierMultiplier).toBe(0.75);
    });
  });
});

describe('estimateWorkflowCost', () => {
  it('should return min and max estimates', () => {
    const result = estimateWorkflowCost(
      20, // nodes in flow
      ['synthstack-agent', 'synthstack-slack', 'synthstack-directus'],
      'pro',
      100 // credits remaining
    );

    expect(result.estimatedMinCost).toBeDefined();
    expect(result.estimatedMaxCost).toBeDefined();
    expect(result.estimatedMinCost).toBeLessThanOrEqual(result.estimatedMaxCost);
  });

  it('should determine if user can afford execution', () => {
    const canAffordResult = estimateWorkflowCost(5, [], 'pro', 100);
    expect(canAffordResult.canAfford).toBe(true);

    const cannotAffordResult = estimateWorkflowCost(100,
      Array(20).fill('synthstack-agent'),
      'free',
      1
    );
    expect(cannotAffordResult.canAfford).toBe(false);
  });

  it('should filter out zero-cost premium nodes', () => {
    const result = estimateWorkflowCost(
      10,
      ['synthstack-directus', 'synthstack-directus', 'synthstack-agent'],
      'pro',
      50
    );

    // Only synthstack-agent should be counted as premium
    expect(result.breakdown).toContain('1 premium');
  });

  it('should include credits remaining in result', () => {
    const result = estimateWorkflowCost(5, [], 'pro', 42);
    expect(result.creditsRemaining).toBe(42);
  });
});

describe('extractPremiumNodes', () => {
  it('should extract only premium nodes from flow', () => {
    const nodes = [
      { type: 'synthstack-agent', id: '1' },
      { type: 'synthstack-directus', id: '2' }, // 0 cost, not premium
      { type: 'synthstack-slack', id: '3' },
      { type: 'debug', id: '4' }, // unknown, not premium
      { type: 'function', id: '5' }, // unknown, not premium
    ];

    const result = extractPremiumNodes(nodes);

    expect(result).toContain('synthstack-agent');
    expect(result).toContain('synthstack-slack');
    expect(result).not.toContain('synthstack-directus');
    expect(result).not.toContain('debug');
    expect(result).not.toContain('function');
    expect(result.length).toBe(2);
  });

  it('should handle empty node array', () => {
    const result = extractPremiumNodes([]);
    expect(result).toEqual([]);
  });

  it('should include duplicate premium nodes', () => {
    const nodes = [
      { type: 'synthstack-agent', id: '1' },
      { type: 'synthstack-agent', id: '2' },
    ];

    const result = extractPremiumNodes(nodes);
    expect(result.length).toBe(2);
  });
});

describe('checkCreditSufficiency', () => {
  it('should return true when user has enough credits', () => {
    const result = checkCreditSufficiency(100, 50);
    expect(result.canExecute).toBe(true);
    expect(result.shortfall).toBe(0);
  });

  it('should return false when user lacks credits', () => {
    const result = checkCreditSufficiency(30, 50);
    expect(result.canExecute).toBe(false);
    expect(result.shortfall).toBe(20);
  });

  it('should return true when credits exactly match', () => {
    const result = checkCreditSufficiency(50, 50);
    expect(result.canExecute).toBe(true);
    expect(result.shortfall).toBe(0);
  });

  it('should include credits needed in result', () => {
    const result = checkCreditSufficiency(100, 75);
    expect(result.creditsNeeded).toBe(75);
  });
});

describe('getFreeExecutionsRemaining', () => {
  it('should return correct remaining for pro tier', () => {
    const result = getFreeExecutionsRemaining('pro', 5);
    expect(result).toBe(15); // 20 - 5
  });

  it('should return 0 when limit exceeded', () => {
    const result = getFreeExecutionsRemaining('pro', 25);
    expect(result).toBe(0);
  });

  it('should return 0 for free tier', () => {
    const result = getFreeExecutionsRemaining('free', 0);
    expect(result).toBe(0);
  });

  it('should handle unknown tier as 0', () => {
    const result = getFreeExecutionsRemaining('unknown', 0);
    expect(result).toBe(0);
  });

  it('should never return negative', () => {
    const result = getFreeExecutionsRemaining('maker', 100);
    expect(result).toBe(0);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('isExecutionFree', () => {
  it('should return true when free executions remain', () => {
    expect(isExecutionFree('pro', 0)).toBe(true);
    expect(isExecutionFree('pro', 19)).toBe(true);
  });

  it('should return false when free executions exhausted', () => {
    expect(isExecutionFree('pro', 20)).toBe(false);
    expect(isExecutionFree('pro', 100)).toBe(false);
  });

  it('should always return false for free tier', () => {
    expect(isExecutionFree('free', 0)).toBe(false);
  });

  it('should always return true for unlimited tier', () => {
    expect(isExecutionFree('unlimited', 999998)).toBe(true);
  });
});

describe('Integration scenarios', () => {
  it('should calculate realistic simple workflow cost', () => {
    // Simple workflow: 5 seconds, 5 nodes, 1 slack notification
    const result = calculateWorkflowCreditCost(5000, 5, ['synthstack-slack'], 'pro');

    expect(result.baseCost).toBe(1);
    expect(result.durationCost).toBe(0);
    expect(result.complexityCost).toBe(0);
    expect(result.premiumNodeCost).toBe(1);
    expect(result.totalCost).toBe(2);
  });

  it('should calculate realistic complex workflow cost', () => {
    // Complex workflow: 45 seconds, 30 nodes, AI agent + multiple integrations
    const premiumNodes = [
      'synthstack-agent',
      'synthstack-openai',
      'synthstack-slack',
      'synthstack-github',
    ];
    const result = calculateWorkflowCreditCost(45000, 30, premiumNodes, 'pro');

    expect(result.baseCost).toBe(1);
    expect(result.durationCost).toBe(1); // 45s = 1 unit
    expect(result.complexityCost).toBe(3); // 30 nodes = 3 units
    expect(result.premiumNodeCost).toBe(7); // 3 + 2 + 1 + 1
    expect(result.totalCost).toBe(12);
  });

  it('should show tier impact on same workflow', () => {
    const params: [number, number, string[], string][] = [
      [30000, 20, ['synthstack-agent'], 'free'],
      [30000, 20, ['synthstack-agent'], 'pro'],
      [30000, 20, ['synthstack-agent'], 'enterprise'],
    ];

    const results = params.map(p => calculateWorkflowCreditCost(...p as [number, number, string[], string]));

    // Free tier should be most expensive
    expect(results[0].totalCost).toBeGreaterThan(results[1].totalCost);
    // Enterprise should be cheapest
    expect(results[2].totalCost).toBeLessThan(results[1].totalCost);
  });
});

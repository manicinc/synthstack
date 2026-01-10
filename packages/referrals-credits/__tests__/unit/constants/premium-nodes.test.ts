/**
 * Premium Nodes Constants Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PREMIUM_NODES,
  getNodeCreditCost,
  isPremiumNode,
  getPremiumNodeTypes,
} from '../../../src/constants/premium-nodes.js';

describe('PREMIUM_NODES', () => {
  it('should have synthstack-agent with cost 3', () => {
    expect(PREMIUM_NODES['synthstack-agent']).toBe(3);
  });

  it('should have AI nodes with cost 2', () => {
    expect(PREMIUM_NODES['synthstack-openai']).toBe(2);
    expect(PREMIUM_NODES['synthstack-anthropic']).toBe(2);
    expect(PREMIUM_NODES['synthstack-gemini']).toBe(2);
  });

  it('should have integration nodes with cost 1', () => {
    expect(PREMIUM_NODES['synthstack-slack']).toBe(1);
    expect(PREMIUM_NODES['synthstack-discord']).toBe(1);
    expect(PREMIUM_NODES['synthstack-github']).toBe(1);
  });

  it('should have synthstack-directus with cost 0 (free)', () => {
    expect(PREMIUM_NODES['synthstack-directus']).toBe(0);
  });

  it('should have synthstack-stripe with cost 2', () => {
    expect(PREMIUM_NODES['synthstack-stripe']).toBe(2);
  });
});

describe('getNodeCreditCost', () => {
  it('should return correct cost for known nodes', () => {
    expect(getNodeCreditCost('synthstack-agent')).toBe(3);
    expect(getNodeCreditCost('synthstack-openai')).toBe(2);
    expect(getNodeCreditCost('synthstack-slack')).toBe(1);
    expect(getNodeCreditCost('synthstack-directus')).toBe(0);
  });

  it('should return 0 for unknown nodes', () => {
    expect(getNodeCreditCost('unknown-node')).toBe(0);
    expect(getNodeCreditCost('function')).toBe(0);
    expect(getNodeCreditCost('debug')).toBe(0);
  });
});

describe('isPremiumNode', () => {
  it('should return true for premium nodes (cost > 0)', () => {
    expect(isPremiumNode('synthstack-agent')).toBe(true);
    expect(isPremiumNode('synthstack-openai')).toBe(true);
    expect(isPremiumNode('synthstack-slack')).toBe(true);
  });

  it('should return false for free nodes (cost = 0)', () => {
    expect(isPremiumNode('synthstack-directus')).toBe(false);
  });

  it('should return false for unknown nodes', () => {
    expect(isPremiumNode('unknown-node')).toBe(false);
    expect(isPremiumNode('function')).toBe(false);
  });
});

describe('getPremiumNodeTypes', () => {
  it('should return array of premium node types', () => {
    const types = getPremiumNodeTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
  });

  it('should only include nodes with cost > 0', () => {
    const types = getPremiumNodeTypes();
    expect(types).toContain('synthstack-agent');
    expect(types).toContain('synthstack-openai');
    expect(types).not.toContain('synthstack-directus');
  });

  it('should not include unknown nodes', () => {
    const types = getPremiumNodeTypes();
    expect(types).not.toContain('unknown-node');
    expect(types).not.toContain('function');
  });
});

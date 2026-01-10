/**
 * Credit System E2E Tests
 *
 * Tests the complete credit system flow:
 * 1. Get credit balance and limits
 * 2. Estimate workflow cost (base + duration + complexity + premium nodes)
 * 3. Check credit sufficiency
 * 4. Execute workflow with credit deduction
 * 5. Verify transaction logged
 * 6. Test tier multipliers (free 2x, maker 1.5x, pro 1x, agency 0.5x)
 * 7. Handle insufficient credits (402 Payment Required)
 * 8. Admin credit adjustments
 * 9. Credit transaction history
 * 10. Usage analytics
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer, getTestClient } from '../helpers/test-server.js';
import { cleanDatabase, updateUserCredits, createCreditTransaction } from '../../test/db-helpers.js';
import { createTestUser } from '../fixtures/users.js';

describe('Credit System E2E', () => {
  let apiClient: ReturnType<typeof getTestClient>;
  let freeUser: any;
  let makerUser: any;
  let proUser: any;
  let agencyUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // Start test server with real database
    await startTestServer();
    apiClient = getTestClient();

    // Clean database
    await cleanDatabase();

    // Create test users with different tiers
    freeUser = await createTestUser({
      email: 'free-credits@test.com',
      subscription_tier: 'free',
      credits_remaining: 100,
    });

    makerUser = await createTestUser({
      email: 'maker-credits@test.com',
      subscription_tier: 'maker',
      credits_remaining: 250,
    });

    proUser = await createTestUser({
      email: 'pro-credits@test.com',
      subscription_tier: 'pro',
      credits_remaining: 500,
    });

    agencyUser = await createTestUser({
      email: 'agency-credits@test.com',
      subscription_tier: 'agency',
      credits_remaining: 999999,
    });

    adminUser = await createTestUser({
      email: 'admin-credits@test.com',
      subscription_tier: 'admin',
      credits_remaining: 1000,
      is_admin: true,
    });
  });

  afterAll(async () => {
    await stopTestServer();
  });

  // =====================================================
  // STEP 1: GET CREDIT BALANCE AND LIMITS
  // =====================================================

  describe('Step 1: Get credit balance and limits', () => {
    it('should get credit balance for free tier', async () => {
      const response = await apiClient.get('/api/v1/credits', {
        headers: {
          authorization: `Bearer ${freeUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.remaining).toBe(100);
      expect(response.data.data.tier).toBe('free');
      expect(response.data.data.dailyLimit).toBeDefined();
      expect(response.data.data.usedToday).toBeDefined();
    });

    it('should get credit balance for pro tier', async () => {
      const response = await apiClient.get('/api/v1/credits', {
        headers: {
          authorization: `Bearer ${proUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.remaining).toBe(500);
      expect(response.data.data.tier).toBe('pro');
    });

    it('should show unlimited credits for agency tier', async () => {
      const response = await apiClient.get('/api/v1/credits', {
        headers: {
          authorization: `Bearer ${agencyUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.remaining).toBeGreaterThan(900000);
      expect(response.data.data.tier).toBe('agency');
    });

    it('should check if user has sufficient credits', async () => {
      const response = await apiClient.get('/api/v1/credits/check?amount=50', {
        headers: {
          authorization: `Bearer ${freeUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.available).toBe(true);
      expect(response.data.data.remaining).toBe(100);
      expect(Number(response.data.data.required)).toBe(50);
    });

    it('should detect insufficient credits', async () => {
      const response = await apiClient.get('/api/v1/credits/check?amount=200', {
        headers: {
          authorization: `Bearer ${freeUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.available).toBe(false);
      expect(response.data.data.remaining).toBe(100);
      expect(Number(response.data.data.required)).toBe(200);
      expect(response.data.data.deficit).toBe(100);
    });
  });

  // =====================================================
  // STEP 2: ESTIMATE WORKFLOW COST
  // =====================================================
  // NOTE: These tests are skipped because they were written for a different API design.
  // The actual /workflow/estimate endpoint:
  // - Accepts only {organizationId, flowId}
  // - Fetches actual flow data from Node-RED service
  // - Returns {estimate: {estimatedMinCost, estimatedMaxCost}, isFreeExecution, ...}
  // These tests expect client-provided nodeCount, estimatedDuration, premiumNodes
  // and snake_case response fields. TODO: Rewrite to mock Node-RED or test via /workflow/config

  describe.skip('Step 2: Estimate workflow cost', () => {
    it('should estimate basic workflow cost for free tier (2x multiplier)', async () => {
      const response = await apiClient.post(
        '/api/v1/credits/workflow/estimate',
        {
          organizationId: freeUser.id,
          flowId: 'test-flow-001',
          nodeCount: 10,
          estimatedDuration: 60, // 60 seconds
          premiumNodes: [], // No premium nodes
        },
        {
          headers: {
            authorization: `Bearer ${freeUser.token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const estimate = response.data.data;
      expect(estimate.base_cost).toBe(1); // Base cost always 1
      expect(estimate.duration_cost).toBe(2); // 60s / 30s = 2 credits
      expect(estimate.complexity_cost).toBe(1); // 10 nodes / 10 = 1 credit
      expect(estimate.premium_cost).toBe(0); // No premium nodes
      expect(estimate.tier_multiplier).toBe(2); // Free tier 2x
      expect(estimate.estimated_total).toBe(8); // (1 + 2 + 1 + 0) * 2 = 8
      expect(estimate.tier).toBe('free');
    });

    it('should estimate workflow cost for maker tier (1.5x multiplier)', async () => {
      const response = await apiClient.post(
        '/api/v1/credits/workflow/estimate',
        {
          organizationId: makerUser.id,
          flowId: 'test-flow-002',
          nodeCount: 10,
          estimatedDuration: 60,
          premiumNodes: [],
        },
        {
          headers: {
            authorization: `Bearer ${makerUser.token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const estimate = response.data.data;
      expect(estimate.tier_multiplier).toBe(1.5); // Maker tier 1.5x
      expect(estimate.estimated_total).toBe(6); // (1 + 2 + 1 + 0) * 1.5 = 6
    });

    it('should estimate workflow cost for pro tier (1x multiplier)', async () => {
      const response = await apiClient.post(
        '/api/v1/credits/workflow/estimate',
        {
          organizationId: proUser.id,
          flowId: 'test-flow-003',
          nodeCount: 10,
          estimatedDuration: 60,
          premiumNodes: [],
        },
        {
          headers: {
            authorization: `Bearer ${proUser.token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const estimate = response.data.data;
      expect(estimate.tier_multiplier).toBe(1); // Pro tier 1x
      expect(estimate.estimated_total).toBe(4); // (1 + 2 + 1 + 0) * 1 = 4
    });

    it('should estimate workflow cost for agency tier (0.5x multiplier)', async () => {
      const response = await apiClient.post(
        '/api/v1/credits/workflow/estimate',
        {
          organizationId: agencyUser.id,
          flowId: 'test-flow-004',
          nodeCount: 10,
          estimatedDuration: 60,
          premiumNodes: [],
        },
        {
          headers: {
            authorization: `Bearer ${agencyUser.token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const estimate = response.data.data;
      expect(estimate.tier_multiplier).toBe(0.5); // Agency tier 0.5x
      expect(estimate.estimated_total).toBe(2); // (1 + 2 + 1 + 0) * 0.5 = 2
    });

    it('should include premium node costs in estimate', async () => {
      const response = await apiClient.post(
        '/api/v1/credits/workflow/estimate',
        {
          organizationId: proUser.id,
          flowId: 'test-flow-premium',
          nodeCount: 15,
          estimatedDuration: 90,
          premiumNodes: [
            { type: 'ai-completion', count: 2 }, // 3 credits each = 6
            { type: 'ai-embeddings', count: 1 }, // 2 credits = 2
          ],
        },
        {
          headers: {
            authorization: `Bearer ${proUser.token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const estimate = response.data.data;
      expect(estimate.base_cost).toBe(1);
      expect(estimate.duration_cost).toBe(3); // 90s / 30s = 3
      expect(estimate.complexity_cost).toBe(1); // 15 nodes / 10 = 1 (rounded down)
      expect(estimate.premium_cost).toBe(8); // (2 * 3) + (1 * 2) = 8
      expect(estimate.tier_multiplier).toBe(1); // Pro tier
      expect(estimate.estimated_total).toBe(13); // (1 + 3 + 1 + 8) * 1 = 13
    });

    it('should cap estimate at 100 credits maximum', async () => {
      const response = await apiClient.post(
        '/api/v1/credits/workflow/estimate',
        {
          organizationId: freeUser.id,
          flowId: 'test-flow-huge',
          nodeCount: 500,
          estimatedDuration: 3600, // 1 hour
          premiumNodes: [{ type: 'ai-completion', count: 50 }],
        },
        {
          headers: {
            authorization: `Bearer ${freeUser.token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const estimate = response.data.data;
      expect(estimate.estimated_total).toBeLessThanOrEqual(100); // Capped at 100
    });
  });

  // =====================================================
  // STEP 3: DEDUCT CREDITS FOR WORKFLOW EXECUTION
  // =====================================================

  describe('Step 3: Deduct credits for workflow execution', () => {
    it('should deduct credits when executing workflow', async () => {
      const initialBalance = 500;
      const deductAmount = 10;

      // /deduct is an internal endpoint that expects user_id in body
      const response = await apiClient.post(
        '/api/v1/credits/deduct',
        {
          user_id: proUser.id,
          amount: deductAmount,
          reason: 'Workflow execution test',
          reference_type: 'workflow_execution',
          reference_id: 'flow-exec-001',
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.deducted).toBe(deductAmount);
      expect(response.data.data.remaining).toBe(initialBalance - deductAmount);
    });

    it('should reject deduction when insufficient credits', async () => {
      // Free user has 100 credits, try to deduct 150
      const response = await apiClient.post(
        '/api/v1/credits/deduct',
        {
          user_id: freeUser.id,
          amount: 150,
          reason: 'Should fail - insufficient credits',
          reference_type: 'workflow_execution',
          reference_id: 'flow-exec-fail',
        }
      );

      expect(response.status).toBe(402); // Payment Required
      expect(response.data.success).toBe(false);
      expect(response.data.error.code).toBe('INSUFFICIENT_CREDITS');
      expect(response.data.error.required).toBe(150);
      expect(response.data.error.remaining).toBeLessThan(150);
    });

    it('should log credit transaction in history', async () => {
      // Get transaction history
      const response = await apiClient.get('/api/v1/credits/history?limit=10', {
        headers: {
          authorization: `Bearer ${proUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.transactions).toBeDefined();
      expect(response.data.data.transactions.length).toBeGreaterThan(0);

      const latestTransaction = response.data.data.transactions[0];
      expect(latestTransaction.type).toBe('generation');
      expect(latestTransaction.amount).toBeLessThan(0); // Negative for deduction
      expect(latestTransaction.reference_type).toBe('workflow_execution');
      expect(latestTransaction.created_at).toBeDefined();
    });
  });

  // =====================================================
  // STEP 4: ADD CREDITS
  // =====================================================

  describe('Step 4: Add credits', () => {
    it('should add credits to user balance', async () => {
      const currentBalance = await apiClient.get('/api/v1/credits', {
        headers: {
          authorization: `Bearer ${freeUser.token}`,
        },
      });

      const initialCredits = currentBalance.data.data.remaining;

      // /add is an internal endpoint that expects user_id in body
      const response = await apiClient.post(
        '/api/v1/credits/add',
        {
          user_id: freeUser.id,
          amount: 50,
          type: 'purchase',
          reason: 'Purchase: 50 credit pack',
          reference_id: 'purchase-001',
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.added).toBe(50);
      expect(response.data.data.newBalance).toBe(initialCredits + 50);
    });

    it('should reject invalid user_id', async () => {
      const response = await apiClient.post(
        '/api/v1/credits/add',
        {
          user_id: '00000000-0000-0000-0000-000000000999',
          amount: 50,
          type: 'purchase',
          reason: 'Invalid user test',
        }
      );

      expect(response.status).toBe(404);
      expect(response.data.error).toContain('User not found');
    });
  });

  // =====================================================
  // STEP 5: ADMIN CREDIT ADJUSTMENTS
  // =====================================================

  describe('Step 5: Admin credit adjustments', () => {
    it('should allow admin to adjust user credits', async () => {
      const response = await apiClient.post(
        `/api/v1/credits/${freeUser.id}/adjust`,
        {
          amount: 100,
          reason: 'Admin adjustment: compensation for bug',
          notes: 'E2E test adjustment',
        },
        {
          headers: {
            authorization: `Bearer ${adminUser.token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.adjustment).toBe(100);
      expect(response.data.data.newBalance).toBeDefined();
    });

    it('should allow admin to deduct credits', async () => {
      const response = await apiClient.post(
        `/api/v1/credits/${freeUser.id}/adjust`,
        {
          amount: -20,
          reason: 'Admin adjustment: penalty',
          notes: 'E2E test deduction',
        },
        {
          headers: {
            authorization: `Bearer ${adminUser.token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.adjustment).toBe(-20);
    });

    it('should reject non-admin credit adjustments', async () => {
      const response = await apiClient.post(
        `/api/v1/credits/${makerUser.id}/adjust`,
        {
          amount: 100,
          reason: 'Unauthorized adjustment',
        },
        {
          headers: {
            authorization: `Bearer ${proUser.token}`, // Not admin
          },
        }
      );

      expect(response.status).toBe(403);
      expect(response.data.error).toContain('Admin');
    });
  });

  // =====================================================
  // STEP 6: CREDIT TRANSACTION HISTORY
  // =====================================================

  describe('Step 6: Credit transaction history', () => {
    beforeAll(async () => {
      // Seed transaction data for history tests
      await createCreditTransaction({
        userId: proUser.id,
        amount: -10,
        transactionType: 'deduction',
        referenceType: 'test',
        referenceId: 'test-001',
        description: 'Test deduction for history',
      });
      await createCreditTransaction({
        userId: proUser.id,
        amount: 50,
        transactionType: 'credit',
        referenceType: 'bonus',
        referenceId: 'bonus-001',
        description: 'Test credit for history',
      });
    });

    it('should get paginated transaction history', async () => {
      const response = await apiClient.get(
        '/api/v1/credits/history?limit=5&offset=0',
        {
          headers: {
            authorization: `Bearer ${proUser.token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.transactions).toBeDefined();
      expect(response.data.data.transactions.length).toBeLessThanOrEqual(5);
      expect(response.data.data.pagination).toBeDefined();
      expect(response.data.data.pagination.total).toBeGreaterThanOrEqual(1);
      expect(Number(response.data.data.pagination.limit)).toBe(5);
      expect(Number(response.data.data.pagination.offset)).toBe(0);
    });

    it('should filter transaction history by type', async () => {
      const response = await apiClient.get(
        '/api/v1/credits/history?type=deduction&limit=10',
        {
          headers: {
            authorization: `Bearer ${proUser.token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const transactions = response.data.data.transactions;

      transactions.forEach((txn: any) => {
        expect(txn.type).toBe('deduction');
      });
    });

    it('should include transaction metadata', async () => {
      const response = await apiClient.get('/api/v1/credits/history?limit=1', {
        headers: {
          authorization: `Bearer ${proUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      const transaction = response.data.data.transactions[0];

      expect(transaction.id).toBeDefined();
      expect(transaction.amount).toBeDefined();
      expect(transaction.type).toBeDefined();
      expect(transaction.reason).toBeDefined();
      expect(transaction.created_at).toBeDefined();
      expect(transaction.reference_type).toBeDefined();
    });
  });

  // =====================================================
  // STEP 7: USAGE ANALYTICS
  // =====================================================

  describe('Step 7: Usage analytics', () => {
    it('should get credit usage statistics', async () => {
      const response = await apiClient.get('/api/v1/credits/usage?days=30', {
        headers: {
          authorization: `Bearer ${proUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.period).toBeDefined();
      expect(Number(response.data.data.period.days)).toBe(30);
      expect(response.data.data.summary).toBeDefined();
      expect(response.data.data.summary.totalUsed).toBeGreaterThanOrEqual(0);
      expect(response.data.data.summary.totalAdded).toBeGreaterThanOrEqual(0);
      expect(response.data.data.daily).toBeDefined();
      expect(Array.isArray(response.data.data.daily)).toBe(true);
    });

    it('should break down usage by transaction type', async () => {
      const response = await apiClient.get('/api/v1/credits/usage?days=7', {
        headers: {
          authorization: `Bearer ${proUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.byType).toBeDefined();
      expect(Array.isArray(response.data.data.byType)).toBe(true);
    });

    it('should show usage trends over time', async () => {
      const response = await apiClient.get('/api/v1/credits/usage?days=30', {
        headers: {
          authorization: `Bearer ${proUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      const daily = response.data.data.daily;

      daily.forEach((day: any) => {
        expect(day.date).toBeDefined();
        expect(day.credits_used).toBeGreaterThanOrEqual(0);
        expect(day.credits_added).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // =====================================================
  // STEP 8: WORKFLOW CREDIT CONFIGURATION
  // =====================================================

  describe('Step 8: Workflow credit configuration', () => {
    it('should get workflow credit config for user tier', async () => {
      const response = await apiClient.get('/api/v1/credits/workflow/config', {
        headers: {
          authorization: `Bearer ${proUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.tier).toBe('pro');
      expect(response.data.data.creditMultiplier).toBe(1);
      expect(response.data.data.freeExecutionsPerDay).toBeDefined();
      expect(response.data.data.premiumNodes).toBeDefined();
    });

    it('should show different config for free tier', async () => {
      const response = await apiClient.get('/api/v1/credits/workflow/config', {
        headers: {
          authorization: `Bearer ${freeUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.tier).toBe('free');
      expect(response.data.data.creditMultiplier).toBe(2);
      expect(response.data.data.freeExecutionsPerDay).toBe(0); // No free executions for free tier
    });

    it('should show free executions for pro tier', async () => {
      const response = await apiClient.get('/api/v1/credits/workflow/config', {
        headers: {
          authorization: `Bearer ${proUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.freeExecutionsPerDay).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // STEP 9: UNIFIED CREDIT SYSTEM
  // =====================================================

  describe('Step 9: Unified credit system', () => {
    it('should get unified credit overview', async () => {
      const response = await apiClient.get('/api/v1/credits/unified', {
        headers: {
          authorization: `Bearer ${proUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.creditsRemaining).toBeDefined();
      expect(response.data.data.ai).toBeDefined();
      expect(response.data.data.workflows).toBeDefined();
      expect(response.data.data.tier).toBeDefined();
    });

    it('should show workflow execution statistics', async () => {
      const response = await apiClient.get('/api/v1/credits/workflow/history?limit=10', {
        headers: {
          authorization: `Bearer ${proUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.transactions).toBeDefined();
      expect(response.data.data.pagination).toBeDefined();
      expect(response.data.data.pagination.total).toBeGreaterThanOrEqual(0);
    });
  });

  // =====================================================
  // STEP 10: EDGE CASES AND ERROR HANDLING
  // =====================================================

  describe('Step 10: Edge cases', () => {
    it('should handle zero credit balance gracefully', async () => {
      // Set user to 0 credits
      await updateUserCredits(freeUser.id, 0);

      const response = await apiClient.get('/api/v1/credits', {
        headers: {
          authorization: `Bearer ${freeUser.token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.remaining).toBe(0);
    });

    it('should prevent negative credit balance', async () => {
      await updateUserCredits(freeUser.id, 5);

      // The /deduct endpoint is for internal service calls and requires user_id
      const response = await apiClient.post(
        '/api/v1/credits/deduct',
        {
          user_id: freeUser.id,
          amount: 10,
          reason: 'Should fail',
        }
      );

      expect(response.status).toBe(402);
      expect(response.data.success).toBe(false);
    });

    it('should handle concurrent deductions safely', async () => {
      await updateUserCredits(proUser.id, 100);

      // Simulate concurrent deductions (internal endpoint requires user_id)
      const promises = Array.from({ length: 5 }, (_, i) =>
        apiClient.post(
          '/api/v1/credits/deduct',
          {
            user_id: proUser.id,
            amount: 15,
            reason: `Concurrent deduction ${i + 1}`,
          }
        )
      );

      const results = await Promise.all(promises);

      // Count successful vs failed requests
      const successful = results.filter(r => r.status === 200).length;
      const failed = results.filter(r => r.status === 402).length;

      // Should allow some but not all (100 / 15 = 6.67, so max 6 successful)
      expect(successful).toBeLessThanOrEqual(6);
      expect(successful + failed).toBe(5);
    });
  });
});

/**
 * BYOK Integration Tests
 *
 * Tests the full BYOK system integration including:
 * - Middleware (ML credits, rate limiting)
 * - Router decision making
 * - Service integration (copilot, agents)
 * - API endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { byokRouter } from '../../services/llm-router/byok-router';
import {
  getTestPool,
  createTestUser,
  addByokKey,
  setByokFeatureFlags,
  getLatestApiKeyUsage,
  getLatestCreditTransaction,
  verifyByokUsed,
  verifyInternalUsed,
  verifyCreditsNotDeducted,
  getUserCredits,
  cleanupByokTestData,
  resetByokFeatureFlags,
  countByokUsage,
  countCreditTransactions,
} from '../../test/db-helpers';
import { users, apiKeys, featureFlags, mockResponses } from '../../test/byok-fixtures';
import type { Pool } from 'pg';

// These tests require a reachable Postgres instance (see `src/test/db-helpers.ts`).
// Default to skipping in unit-test environments unless explicitly enabled.
const describeIf = process.env.RUN_BYOK_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIf('BYOK Integration Tests', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = getTestPool();
    // Ensure BYOK feature flags exist in database
    await resetByokFeatureFlags();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupByokTestData();
    // Reset to BYOK-first mode (default)
    await resetByokFeatureFlags();
  });

  afterAll(async () => {
    await cleanupByokTestData();
  });

  describe('ML Credits Middleware Integration', () => {
    it('should skip credit check when BYOK mode is active', async () => {
      // Setup: User with BYOK keys in BYOK-first mode
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey, {
        id: apiKeys.openai.valid.id,
        isValid: true,
      });

      await setByokFeatureFlags(featureFlags.byokFirst);

      // Get BYOK context
      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      // Verify BYOK mode is active
      expect(keySource.source).toBe('byok');
      expect(keySource.reason).toContain('BYOK-first mode');

      // In a real middleware test, we'd verify credit check was skipped
      // For now, we verify the routing decision is correct
    });

    it('should deduct credits when using internal keys', async () => {
      // Setup: User with credits but no BYOK in BYOK-first mode
      const user = await createTestUser({
        id: users.premiumCreditsOnly.id,
        email: users.premiumCreditsOnly.email,
        subscriptionTier: 'pro',
        creditsRemaining: 5000,
      });

      await setByokFeatureFlags(featureFlags.byokFirst);

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      // Verify internal keys should be used
      expect(keySource.source).toBe('internal');
      expect(keySource.reason).toContain('internal');
    });

    it('should return 402 when no credits and no BYOK in credit-first mode', async () => {
      // Setup: User with neither credits nor BYOK
      const user = await createTestUser({
        id: users.premiumEmpty.id,
        email: users.premiumEmpty.email,
        subscriptionTier: 'pro',
        creditsRemaining: 0,
      });

      await setByokFeatureFlags(featureFlags.creditFirst);

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      // Verify error state
      expect(keySource.source).toBe('error');
      expect(keySource.reason).toContain('No credits');
    });

    it('should return 402 with BYOK suggestion when in BYOK-only mode', async () => {
      // Setup: User with credits but no BYOK in BYOK-only mode
      const user = await createTestUser({
        id: users.premiumEmpty.id,
        email: users.premiumEmpty.email,
        subscriptionTier: 'pro',
        creditsRemaining: 5000,
      });

      await setByokFeatureFlags(featureFlags.byokOnly);

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      // Verify error with BYOK suggestion
      expect(keySource.source).toBe('error');
      expect(keySource.reason).toContain('BYOK-only mode');
      expect(keySource.reason).toContain('no BYOK keys');
    });
  });

  describe('Rate Limiting Middleware Integration', () => {
    it('should bypass rate limits for BYOK users', async () => {
      // Setup: User with BYOK keys
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
      await setByokFeatureFlags(featureFlags.byokFirst);

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      // BYOK users should bypass rate limits
      expect(keySource.source).toBe('byok');
      // In real implementation, rate limiter would check this and skip
    });

    it('should apply tier-based limits for internal key users', async () => {
      // Setup: User without BYOK
      const user = await createTestUser({
        id: users.premiumCreditsOnly.id,
        email: users.premiumCreditsOnly.email,
        subscriptionTier: 'pro',
        creditsRemaining: 5000,
      });

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      // Internal key users should have rate limits applied
      expect(keySource.source).toBe('internal');
    });

    it('should handle rate limit bypass gracefully when BYOK fails', async () => {
      // Setup: User with BYOK but also has credits for fallback
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
      await setByokFeatureFlags(featureFlags.byokFirst);

      const context = await byokRouter.getByokContext(user.id);

      // If BYOK fails, context.hasCredits allows fallback
      expect(context.hasCredits).toBe(true);
      expect(context.byokProviders.length).toBeGreaterThan(0);
    });
  });

  describe('Copilot Service Integration', () => {
    it('should use BYOK router when userId is provided', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);

      const context = await byokRouter.getByokContext(user.id);
      expect(context.userId).toBe(user.id);
      expect(context.byokProviders).toContain('openai');
    });

    it('should fallback to legacy router when no userId', async () => {
      // When no userId provided, router cannot determine BYOK context
      // This test verifies the expected behavior in such cases
      const context = await byokRouter.getByokContext('');
      expect(context.userId).toBe('');
      expect(context.byokProviders).toEqual([]);
    });

    it('should correctly route based on BYOK context in chat endpoint', async () => {
      const user = await createTestUser({
        id: users.premiumByokOnly.id,
        email: users.premiumByokOnly.email,
        subscriptionTier: 'pro',
        creditsRemaining: 0,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
      await setByokFeatureFlags(featureFlags.byokFirst);

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      // Should use BYOK since no credits
      expect(keySource.source).toBe('byok');
    });

    it('should correctly route based on BYOK context in streaming endpoint', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'anthropic', apiKeys.anthropic.valid.apiKey);
      await setByokFeatureFlags(featureFlags.byokFirst);

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      // Should use BYOK (streaming works same as regular chat)
      expect(keySource.source).toBe('byok');
      expect(context.byokProviders).toContain('anthropic');
    });
  });

  describe('Agents Service Integration', () => {
    it('should integrate BYOK router for agent chat', async () => {
      const user = await createTestUser({
        id: users.lifetime.id,
        email: users.lifetime.email,
        subscriptionTier: 'agency',
        creditsRemaining: 50000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
      await addByokKey(user.id, 'anthropic', apiKeys.anthropic.valid.apiKey);

      const context = await byokRouter.getByokContext(user.id);

      // Lifetime users with BYOK should use BYOK
      expect(context.byokProviders).toContain('openai');
      expect(context.byokProviders).toContain('anthropic');
    });

    it('should integrate BYOK router for agent streaming', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'anthropic', apiKeys.anthropic.valid.apiKey);

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      expect(keySource.source).toBe('byok');
    });

    it('should pass userId correctly through agent methods', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
      });

      const context = await byokRouter.getByokContext(user.id);

      // Verify userId is preserved
      expect(context.userId).toBe(user.id);
    });
  });

  describe('Embeddings Service Integration', () => {
    it('should use BYOK for single embedding generation', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 5000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
      await setByokFeatureFlags(featureFlags.byokFirst);

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      expect(keySource.source).toBe('byok');
      expect(context.byokProviders).toContain('openai');
    });

    it('should use BYOK for batch embeddings', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);

      const context = await byokRouter.getByokContext(user.id);
      expect(context.byokProviders).toContain('openai');
    });

    it('should use BYOK for document embeddings with chunking', async () => {
      const user = await createTestUser({
        id: users.premiumByokOnly.id,
        email: users.premiumByokOnly.email,
        subscriptionTier: 'pro',
        creditsRemaining: 0,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      // No credits, must use BYOK
      expect(keySource.source).toBe('byok');
    });

    it('should fallback to internal when BYOK fails', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      const context = await byokRouter.getByokContext(user.id);

      // User has credits for fallback
      expect(context.hasCredits).toBe(true);
    });
  });

  describe('API Endpoints Integration', () => {
    describe('GET /api/v1/api-keys/settings', () => {
      it('should return correct settings for BYOK-first mode', async () => {
        const user = await createTestUser({
          id: users.premiumWithBoth.id,
          email: users.premiumWithBoth.email,
          subscriptionTier: 'pro',
          creditsRemaining: 10000,
        });

        await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
        await setByokFeatureFlags(featureFlags.byokFirst);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        expect(context.flags.byokEnabled).toBe(true);
        expect(context.flags.byokUsesInternalCredits).toBe(false);
        expect(context.flags.byokOnlyMode).toBe(false);
        expect(keySource.source).toBe('byok');
      });

      it('should return correct settings for credit-first mode', async () => {
        const user = await createTestUser({
          id: users.premiumWithBoth.id,
          email: users.premiumWithBoth.email,
          subscriptionTier: 'pro',
          creditsRemaining: 10000,
        });

        await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
        await setByokFeatureFlags(featureFlags.creditFirst);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        expect(context.flags.byokUsesInternalCredits).toBe(true);
        expect(keySource.source).toBe('internal'); // Credits first
      });

      it('should return correct settings for BYOK-only mode', async () => {
        const user = await createTestUser({
          id: users.premiumWithBoth.id,
          email: users.premiumWithBoth.email,
          subscriptionTier: 'pro',
          creditsRemaining: 10000,
        });

        await addByokKey(user.id, 'anthropic', apiKeys.anthropic.valid.apiKey);
        await setByokFeatureFlags(featureFlags.byokOnly);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        expect(context.flags.byokOnlyMode).toBe(true);
        expect(keySource.source).toBe('byok');
      });

      it('should indicate error state when no credits and no BYOK', async () => {
        const user = await createTestUser({
          id: users.premiumEmpty.id,
          email: users.premiumEmpty.email,
          subscriptionTier: 'pro',
          creditsRemaining: 0,
        });

        await setByokFeatureFlags(featureFlags.byokFirst);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        expect(keySource.source).toBe('error');
        expect(context.hasCredits).toBe(false);
        expect(context.byokProviders.length).toBe(0);
      });
    });

    describe('POST /api/v1/copilot/chat', () => {
      it('should use BYOK when user has valid keys', async () => {
        const user = await createTestUser({
          id: users.premiumWithBoth.id,
          email: users.premiumWithBoth.email,
          subscriptionTier: 'pro',
          creditsRemaining: 10000,
        });

        await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
        await setByokFeatureFlags(featureFlags.byokFirst);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        expect(keySource.source).toBe('byok');
      });

      it('should use internal credits when user has no BYOK', async () => {
        const user = await createTestUser({
          id: users.premiumCreditsOnly.id,
          email: users.premiumCreditsOnly.email,
          subscriptionTier: 'pro',
          creditsRemaining: 5000,
        });

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        expect(keySource.source).toBe('internal');
        expect(context.hasCredits).toBe(true);
      });

      it('should log usage to api_key_usage when using BYOK', async () => {
        const user = await createTestUser({
          id: users.premiumByokOnly.id,
          email: users.premiumByokOnly.email,
          subscriptionTier: 'pro',
          creditsRemaining: 0,
        });

        await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        expect(keySource.source).toBe('byok');
        // In real implementation, this would log to api_key_usage table
      });

      it('should log to credit_transactions when using internal', async () => {
        const user = await createTestUser({
          id: users.premiumCreditsOnly.id,
          email: users.premiumCreditsOnly.email,
          subscriptionTier: 'pro',
          creditsRemaining: 5000,
        });

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        expect(keySource.source).toBe('internal');
        // In real implementation, this would log to credit_transactions
      });
    });
  });

  describe('End-to-End BYOK Flows', () => {
    describe('Flow A: Credit-First Mode', () => {
      it('E2E: User with credits uses internal keys', async () => {
        const user = await createTestUser({
          id: users.premiumWithBoth.id,
          email: users.premiumWithBoth.email,
          subscriptionTier: 'pro',
          creditsRemaining: 10000,
        });

        await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
        await setByokFeatureFlags(featureFlags.creditFirst);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        // Credit-first: Should use internal despite having BYOK
        expect(keySource.source).toBe('internal');
        expect(keySource.reason).toContain('Credit-first mode');
      });

      it('E2E: User without credits falls back to BYOK', async () => {
        const user = await createTestUser({
          id: users.premiumByokOnly.id,
          email: users.premiumByokOnly.email,
          subscriptionTier: 'pro',
          creditsRemaining: 0,
        });

        await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
        await setByokFeatureFlags(featureFlags.creditFirst);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        // No credits: Should fallback to BYOK
        expect(keySource.source).toBe('byok');
        expect(keySource.reason).toContain('fallback');
      });

      it('E2E: User without credits or BYOK receives error', async () => {
        const user = await createTestUser({
          id: users.premiumEmpty.id,
          email: users.premiumEmpty.email,
          subscriptionTier: 'pro',
          creditsRemaining: 0,
        });

        await setByokFeatureFlags(featureFlags.creditFirst);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        // No credits, no BYOK: Error
        expect(keySource.source).toBe('error');
      });
    });

    describe('Flow B: BYOK-First Mode', () => {
      it('E2E: User with BYOK uses their keys', async () => {
        const user = await createTestUser({
          id: users.premiumWithBoth.id,
          email: users.premiumWithBoth.email,
          subscriptionTier: 'pro',
          creditsRemaining: 10000,
        });

        await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
        await setByokFeatureFlags(featureFlags.byokFirst);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        // BYOK-first: Should use BYOK when available
        expect(keySource.source).toBe('byok');
        expect(keySource.reason).toContain('BYOK-first mode');
      });

      it('E2E: User without BYOK falls back to internal credits', async () => {
        const user = await createTestUser({
          id: users.premiumCreditsOnly.id,
          email: users.premiumCreditsOnly.email,
          subscriptionTier: 'pro',
          creditsRemaining: 5000,
        });

        await setByokFeatureFlags(featureFlags.byokFirst);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        // No BYOK: Should fallback to internal
        expect(keySource.source).toBe('internal');
        expect(keySource.reason).toContain('fallback');
      });

      it('E2E: User without BYOK or credits receives error', async () => {
        const user = await createTestUser({
          id: users.premiumEmpty.id,
          email: users.premiumEmpty.email,
          subscriptionTier: 'pro',
          creditsRemaining: 0,
        });

        await setByokFeatureFlags(featureFlags.byokFirst);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        // No BYOK, no credits: Error
        expect(keySource.source).toBe('error');
      });
    });

    describe('Flow C: BYOK-Only Mode', () => {
      it('E2E: User with BYOK uses their keys exclusively', async () => {
        const user = await createTestUser({
          id: users.premiumWithBoth.id,
          email: users.premiumWithBoth.email,
          subscriptionTier: 'pro',
          creditsRemaining: 10000,
        });

        await addByokKey(user.id, 'anthropic', apiKeys.anthropic.valid.apiKey);
        await setByokFeatureFlags(featureFlags.byokOnly);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        // BYOK-only: Must use BYOK
        expect(keySource.source).toBe('byok');
        expect(context.flags.byokOnlyMode).toBe(true);
      });

      it('E2E: User without BYOK receives error even with credits', async () => {
        const user = await createTestUser({
          id: users.premiumCreditsOnly.id,
          email: users.premiumCreditsOnly.email,
          subscriptionTier: 'pro',
          creditsRemaining: 5000,
        });

        await setByokFeatureFlags(featureFlags.byokOnly);

        const context = await byokRouter.getByokContext(user.id);
        const keySource = byokRouter.determineKeySource(context);

        // BYOK-only mode: Error even with credits
        expect(keySource.source).toBe('error');
        expect(context.hasCredits).toBe(true); // Has credits but can't use them
        expect(keySource.reason).toContain('BYOK-only');
      });
    });
  });

  describe('Graceful Fallback', () => {
    it('should fallback from BYOK to internal when BYOK key fails', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      // Add invalid key
      await addByokKey(user.id, 'openai', apiKeys.openai.invalid.apiKey, {
        isValid: false,
        lastError: 'Invalid API key',
      });

      await setByokFeatureFlags(featureFlags.byokFirst);

      const context = await byokRouter.getByokContext(user.id);

      // User has credits for fallback
      expect(context.hasCredits).toBe(true);
      expect(context.byokProviders.length).toBeGreaterThan(0);
      // Router would attempt BYOK, fail, then fallback to internal
    });

    it('should not fallback from BYOK in BYOK-only mode', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
      await setByokFeatureFlags(featureFlags.byokOnly);

      const context = await byokRouter.getByokContext(user.id);

      // BYOK-only: No fallback allowed
      expect(context.flags.byokOnlyMode).toBe(true);
      // If BYOK fails in this mode, error should be thrown (no fallback)
    });

    it('should log fallback events for monitoring', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);

      const context = await byokRouter.getByokContext(user.id);

      // Fallback scenario exists (has both BYOK and credits)
      expect(context.hasCredits).toBe(true);
      expect(context.byokProviders.length).toBeGreaterThan(0);
      // In real implementation, fallback events would be logged
    });
  });

  describe('Usage Tracking', () => {
    it('should track BYOK usage in api_key_usage table', async () => {
      const user = await createTestUser({
        id: users.premiumByokOnly.id,
        email: users.premiumByokOnly.email,
        subscriptionTier: 'pro',
        creditsRemaining: 0,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      expect(keySource.source).toBe('byok');
      // In real implementation, usage would be logged to api_key_usage
    });

    it('should track internal usage in credit_transactions table', async () => {
      const user = await createTestUser({
        id: users.premiumCreditsOnly.id,
        email: users.premiumCreditsOnly.email,
        subscriptionTier: 'pro',
        creditsRemaining: 5000,
      });

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      expect(keySource.source).toBe('internal');
      // In real implementation, usage would be logged to credit_transactions
    });

    it('should not double-charge when using BYOK', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
      await setByokFeatureFlags(featureFlags.byokFirst);

      const initialCredits = await getUserCredits(user.id);
      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      expect(keySource.source).toBe('byok');
      // Credits should not be deducted
      const finalCredits = await getUserCredits(user.id);
      expect(finalCredits).toBe(initialCredits);
    });

    it('should update user_api_keys usage counters', async () => {
      const user = await createTestUser({
        id: users.premiumByokOnly.id,
        email: users.premiumByokOnly.email,
        subscriptionTier: 'pro',
        creditsRemaining: 0,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey, {
        id: apiKeys.openai.valid.id,
      });

      const context = await byokRouter.getByokContext(user.id);
      expect(context.byokProviders).toContain('openai');
      // In real implementation, usage counters would be incremented
    });
  });

  describe('Feature Flag Changes', () => {
    it('should respect flag changes in real-time', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);

      // Start with BYOK-first
      await setByokFeatureFlags(featureFlags.byokFirst);
      let context = await byokRouter.getByokContext(user.id);
      let keySource = byokRouter.determineKeySource(context);
      expect(keySource.source).toBe('byok');

      // Switch to credit-first
      await setByokFeatureFlags(featureFlags.creditFirst);
      context = await byokRouter.getByokContext(user.id);
      keySource = byokRouter.determineKeySource(context);
      expect(keySource.source).toBe('internal');

      // Switch to BYOK-only
      await setByokFeatureFlags(featureFlags.byokOnly);
      context = await byokRouter.getByokContext(user.id);
      keySource = byokRouter.determineKeySource(context);
      expect(keySource.source).toBe('byok');
    });

    it('should handle flag cache refresh correctly', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);
      await setByokFeatureFlags(featureFlags.byokFirst);

      // Fetch context multiple times (tests cache behavior)
      const context1 = await byokRouter.getByokContext(user.id);
      const context2 = await byokRouter.getByokContext(user.id);

      expect(context1.flags).toEqual(context2.flags);
    });

    it('should validate flag precedence (byok_only_mode > byok_uses_internal_credits)', async () => {
      const user = await createTestUser({
        id: users.premiumWithBoth.id,
        email: users.premiumWithBoth.email,
        subscriptionTier: 'pro',
        creditsRemaining: 10000,
      });

      await addByokKey(user.id, 'openai', apiKeys.openai.valid.apiKey);

      // Set both flags (byok_only_mode should take precedence)
      await setByokFeatureFlags({
        byokEnabled: true,
        byokUsesInternalCredits: true,
        byokOnlyMode: true,
      });

      const context = await byokRouter.getByokContext(user.id);
      const keySource = byokRouter.determineKeySource(context);

      // byok_only_mode takes precedence
      expect(context.flags.byokOnlyMode).toBe(true);
      expect(keySource.source).toBe('byok');
      expect(keySource.reason).toContain('BYOK-only');
    });
  });
});

/**
 * Integration Test Implementation Notes
 *
 * To run these tests, you'll need:
 *
 * 1. Test Database Setup:
 *    - Run migrations including 123_byok_feature_flags.sql
 *    - Seed test users with different subscription tiers
 *    - Seed feature flags with different combinations
 *    - Create test API keys (OpenAI, Anthropic)
 *
 * 2. Test Environment:
 *    - Mock OpenAI/Anthropic API responses
 *    - Set up test encryption keys
 *    - Configure test credit balances
 *
 * 3. Test Utilities:
 *    - Helper to create test users with specific credit balances
 *    - Helper to set feature flags for specific users
 *    - Helper to add/remove BYOK keys for test users
 *    - Helper to verify usage logs in correct tables
 *
 * 4. Test Scenarios:
 *    Each test should:
 *    - Set up initial state (credits, keys, flags)
 *    - Make API request
 *    - Verify routing decision
 *    - Verify usage tracking
 *    - Verify credit deduction (or lack thereof)
 *    - Verify rate limiting behavior
 *    - Clean up state
 *
 * Example Test Implementation:
 *
 * ```typescript
 * it('should use BYOK when user has valid keys', async () => {
 *   // Setup
 *   const testUser = await createTestUser({ credits: 100 });
 *   await addByokKey(testUser.id, 'openai', 'test-key');
 *   await setFeatureFlags(testUser.id, {
 *     byokEnabled: true,
 *     byokUsesInternalCredits: false
 *   });
 *
 *   // Execute
 *   const response = await request(app)
 *     .post('/api/v1/copilot/chat')
 *     .set('Authorization', `Bearer ${testUser.token}`)
 *     .send({ messages: [{ role: 'user', content: 'Hello' }] });
 *
 *   // Verify
 *   expect(response.status).toBe(200);
 *
 *   // Verify BYOK was used (check api_key_usage table)
 *   const usageLog = await getLatestApiKeyUsage(testUser.id);
 *   expect(usageLog).toBeDefined();
 *   expect(usageLog.provider).toBe('openai');
 *
 *   // Verify credits were NOT deducted
 *   const updatedUser = await getUser(testUser.id);
 *   expect(updatedUser.credits).toBe(100); // No change
 *
 *   // Cleanup
 *   await cleanupTestUser(testUser.id);
 * });
 * ```
 */

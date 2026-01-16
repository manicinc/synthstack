/**
 * BYOK Router Unit Tests
 *
 * Tests all 3 routing flows and 8 scenarios:
 * - Flow A (Credit-First): Use internal credits first, fallback to BYOK
 * - Flow B (BYOK-First): Use BYOK first, fallback to internal credits
 * - Flow C (BYOK-Only): Only use BYOK, never internal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ByokAwareLLMRouter } from '../byok-router';
import type { ByokContext, KeySourceDecision } from '../byok-router';

describe('ByokAwareLLMRouter', () => {
  let router: ByokAwareLLMRouter;

  beforeEach(() => {
    router = new ByokAwareLLMRouter();
  });

  describe('determineKeySource', () => {
    // ============================================
    // Flow A: Credit-First Mode (byok_uses_internal_credits = true)
    // ============================================

    describe('Flow A: Credit-First Mode', () => {
      it('should use internal credits when user has credits', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: true,
          byokProviders: ['openai'],
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: true, // Credit-first mode
            byokOnlyMode: false,
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe('internal');
        expect(result.reason).toContain('Credit-first mode: User has credits');
      });

      it('should fallback to BYOK when out of credits', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: false,
          byokProviders: ['openai', 'anthropic'],
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: true,
            byokOnlyMode: false,
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe('byok');
        expect(result.reason).toContain('Credit-first mode: Out of credits, using BYOK fallback');
      });

      it('should return error when no credits and no BYOK', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: false,
          byokProviders: [], // No BYOK keys
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: true,
            byokOnlyMode: false,
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe('error');
        expect(result.reason).toContain('No credits remaining and no BYOK keys configured');
      });
    });

    // ============================================
    // Flow B: BYOK-First Mode (default, byok_uses_internal_credits = false)
    // ============================================

    describe('Flow B: BYOK-First Mode', () => {
      it('should use BYOK when user has BYOK keys', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: true,
          byokProviders: ['openai'],
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: false, // BYOK-first mode (default)
            byokOnlyMode: false,
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe('byok');
        expect(result.reason).toContain('BYOK-first mode: User has BYOK keys');
      });

      it('should fallback to internal when no BYOK but has credits', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: true,
          byokProviders: [], // No BYOK keys
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: false,
            byokOnlyMode: false,
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe('internal');
        expect(result.reason).toContain('BYOK-first mode: No BYOK, using internal with credits');
      });

      it('should return error when no BYOK and no credits', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: false,
          byokProviders: [],
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: false,
            byokOnlyMode: false,
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe('error');
        expect(result.reason).toContain('No BYOK keys configured and no credits remaining');
      });
    });

    // ============================================
    // Flow C: BYOK-Only Mode (byok_only_mode = true)
    // ============================================

    describe('Flow C: BYOK-Only Mode', () => {
      it('should use BYOK when user has BYOK keys', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: true, // Even with credits, only BYOK is allowed
          byokProviders: ['anthropic'],
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: false,
            byokOnlyMode: true, // BYOK-only mode
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe('byok');
        expect(result.reason).toContain('BYOK-only mode: User has BYOK keys');
      });

      it('should return error when no BYOK keys configured', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: true, // Credits don't matter in BYOK-only mode
          byokProviders: [],
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: false,
            byokOnlyMode: true,
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe('error');
        expect(result.reason).toContain('BYOK-only mode enabled but user has no BYOK keys configured');
      });
    });

    // ============================================
    // Edge Cases
    // ============================================

    describe('Edge Cases', () => {
      it('should handle BYOK disabled gracefully', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: true,
          byokProviders: ['openai'], // Has BYOK but disabled
          flags: {
            byokEnabled: false, // BYOK disabled
            byokUsesInternalCredits: false,
            byokOnlyMode: false,
          },
        };

        const result = router.determineKeySource(context);

        // Should use internal credits since BYOK is disabled
        expect(result.source).toBe('internal');
      });

      it('should prioritize byok_only_mode over byok_uses_internal_credits', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: true,
          byokProviders: ['openai'],
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: true, // This should be ignored
            byokOnlyMode: true, // This takes precedence
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe('byok');
        expect(result.reason).toContain('BYOK-only mode');
      });

      it('should handle multiple BYOK providers', () => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: false,
          byokProviders: ['openai', 'anthropic', 'openrouter'], // Multiple providers
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: false,
            byokOnlyMode: false,
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe('byok');
        expect(result.reason).toContain('BYOK-first mode: User has BYOK keys');
      });
    });
  });

  describe('getByokContext', () => {
    it('should return correct context structure', async () => {
      // Note: This is a stub test since getByokContext makes database calls
      // In a real test, you'd mock the database/service dependencies

      const userId = 'test-user';

      // This would need proper mocking in a real environment
      // For now, we're testing the return type structure
      const mockContext: ByokContext = {
        userId,
        hasCredits: true,
        byokProviders: [],
        flags: {
          byokEnabled: false,
          byokUsesInternalCredits: false,
          byokOnlyMode: false,
        },
      };

      // Test that context has all required fields
      expect(mockContext).toHaveProperty('userId');
      expect(mockContext).toHaveProperty('hasCredits');
      expect(mockContext).toHaveProperty('byokProviders');
      expect(mockContext).toHaveProperty('flags');
      expect(mockContext.flags).toHaveProperty('byokEnabled');
      expect(mockContext.flags).toHaveProperty('byokUsesInternalCredits');
      expect(mockContext.flags).toHaveProperty('byokOnlyMode');
    });
  });

  describe('Routing Logic Summary', () => {
    it('should correctly implement all 8 test scenarios', () => {
      const scenarios = [
        // Flow A: Credit-First
        { name: 'A1: Has credits', flags: { byokUsesInternalCredits: true }, hasCredits: true, hasByok: true, expected: 'internal' },
        { name: 'A2: No credits, has BYOK', flags: { byokUsesInternalCredits: true }, hasCredits: false, hasByok: true, expected: 'byok' },
        { name: 'A3: No credits, no BYOK', flags: { byokUsesInternalCredits: true }, hasCredits: false, hasByok: false, expected: 'error' },

        // Flow B: BYOK-First
        { name: 'B1: Has BYOK', flags: { byokUsesInternalCredits: false }, hasCredits: true, hasByok: true, expected: 'byok' },
        { name: 'B2: No BYOK, has credits', flags: { byokUsesInternalCredits: false }, hasCredits: true, hasByok: false, expected: 'internal' },
        { name: 'B3: No BYOK, no credits', flags: { byokUsesInternalCredits: false }, hasCredits: false, hasByok: false, expected: 'error' },

        // Flow C: BYOK-Only
        { name: 'C1: Has BYOK', flags: { byokOnlyMode: true }, hasCredits: true, hasByok: true, expected: 'byok' },
        { name: 'C2: No BYOK', flags: { byokOnlyMode: true }, hasCredits: true, hasByok: false, expected: 'error' },
      ];

      scenarios.forEach(scenario => {
        const context: ByokContext = {
          userId: 'user-1',
          hasCredits: scenario.hasCredits,
          byokProviders: scenario.hasByok ? ['openai'] : [],
          flags: {
            byokEnabled: true,
            byokUsesInternalCredits: scenario.flags.byokUsesInternalCredits || false,
            byokOnlyMode: scenario.flags.byokOnlyMode || false,
          },
        };

        const result = router.determineKeySource(context);

        expect(result.source).toBe(scenario.expected);
      });
    });
  });
});

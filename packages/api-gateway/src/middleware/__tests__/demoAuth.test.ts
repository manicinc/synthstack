/**
 * Demo Authentication Middleware Unit Tests
 *
 * Comprehensive tests for demo session authentication including:
 * - demoAuth decorator (required demo session)
 * - optionalDemoAuth decorator (optional demo session)
 * - checkDemoRateLimit decorator (rate limiting)
 * - Utility functions (hasDemoCredits, getDemoCredits, checkDemoFeatureLimit)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import demoAuthPlugin, {
  hasDemoCredits,
  getDemoCredits,
  checkDemoFeatureLimit,
} from '../demoAuth.js';

describe('Demo Authentication Middleware', () => {
  let server: FastifyInstance;
  let mockPgQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    server = Fastify({
      logger: false,
    });

    mockPgQuery = vi.fn();
    server.decorate('pg', { query: mockPgQuery } as any);

    await server.register(demoAuthPlugin);

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await server.close();
  });

  // =====================================================
  // DEMO AUTH DECORATOR (REQUIRED)
  // =====================================================

  describe('demoAuth decorator (required session)', () => {
    it('should reject when X-Demo-Session header is missing (401)', async () => {
      server.get('/test', {
        preHandler: server.demoAuth,
      }, async () => ({ success: true }));

      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(401);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Demo session required');
      expect(result.message).toContain('X-Demo-Session');
    });

    it('should reject when demo session is invalid (401)', async () => {
      server.get('/test', {
        preHandler: server.demoAuth,
      }, async () => ({ success: true }));

      await server.ready();

      mockPgQuery.mockResolvedValue({
        rows: [], // No session found
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-demo-session': 'invalid-session-id',
        },
      });

      expect(response.statusCode).toBe(401);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired demo session');
      expect(result.message).toContain('initialize a new demo session');
    });

    it('should reject when demo session is expired (401)', async () => {
      server.get('/test', {
        preHandler: server.demoAuth,
      }, async () => ({ success: true }));

      await server.ready();

      mockPgQuery.mockResolvedValue({
        rows: [], // Expired sessions filtered by WHERE expires_at > NOW()
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-demo-session': 'expired-session-id',
        },
      });

      expect(response.statusCode).toBe(401);
      const result = response.json();
      expect(result.error).toBe('Invalid or expired demo session');
    });

    it('should accept valid demo session and attach context', async () => {
      server.get('/test', {
        preHandler: server.demoAuth,
      }, async (request: any) => ({
        success: true,
        demo: request.demo,
        isDemo: request.isDemo,
      }));

      await server.ready();

      const mockSession = {
        session_id: 'demo-session-123',
        credits_remaining: 50,
        credits_used: 25,
        referral_code: 'REF123',
        referral_credits_earned: 10,
        requests_today: 5,
        expires_at: new Date('2026-12-31'),
      };

      mockPgQuery.mockResolvedValue({
        rows: [mockSession],
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-demo-session': 'demo-session-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.isDemo).toBe(true);
      expect(result.demo).toEqual({
        isDemo: true,
        sessionId: 'demo-session-123',
        credits: 50,
        creditsUsed: 25,
        referralCode: 'REF123',
        referralCreditsEarned: 10,
        requestsToday: 5,
        expiresAt: expect.any(String),
      });

      // Verify database query
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['demo-session-123']
      );
    });

    it('should return 500 when database error occurs', async () => {
      server.get('/test', {
        preHandler: server.demoAuth,
      }, async () => ({ success: true }));

      await server.ready();

      mockPgQuery.mockRejectedValue(new Error('Database connection error'));

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-demo-session': 'demo-session-123',
        },
      });

      expect(response.statusCode).toBe(500);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to validate demo session');
    });
  });

  // =====================================================
  // OPTIONAL DEMO AUTH DECORATOR
  // =====================================================

  describe('optionalDemoAuth decorator (optional session)', () => {
    it('should not fail when X-Demo-Session header is missing', async () => {
      server.get('/test', {
        preHandler: server.optionalDemoAuth,
      }, async (request: any) => ({
        success: true,
        isDemo: request.isDemo,
        hasDemo: request.demo !== undefined,
      }));

      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.isDemo).toBe(false);
      expect(result.hasDemo).toBe(false);
    });

    it('should not fail when demo session is invalid', async () => {
      server.get('/test', {
        preHandler: server.optionalDemoAuth,
      }, async (request: any) => ({
        success: true,
        isDemo: request.isDemo,
      }));

      await server.ready();

      mockPgQuery.mockResolvedValue({
        rows: [], // Invalid session
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-demo-session': 'invalid-session',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.isDemo).toBe(false);
    });

    it('should attach demo context when valid session provided', async () => {
      server.get('/test', {
        preHandler: server.optionalDemoAuth,
      }, async (request: any) => ({
        success: true,
        demo: request.demo,
        isDemo: request.isDemo,
      }));

      await server.ready();

      const mockSession = {
        session_id: 'demo-session-456',
        credits_remaining: 100,
        credits_used: 0,
        referral_code: null,
        referral_credits_earned: 0,
        requests_today: 1,
        expires_at: new Date('2026-12-31'),
      };

      mockPgQuery.mockResolvedValue({
        rows: [mockSession],
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-demo-session': 'demo-session-456',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.isDemo).toBe(true);
      expect(result.demo).toBeDefined();
      expect(result.demo.sessionId).toBe('demo-session-456');
      expect(result.demo.credits).toBe(100);
    });

    it('should not fail on database errors', async () => {
      server.get('/test', {
        preHandler: server.optionalDemoAuth,
      }, async (request: any) => ({
        success: true,
        isDemo: request.isDemo,
      }));

      await server.ready();

      mockPgQuery.mockRejectedValue(new Error('Database error'));

      const response = await server.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-demo-session': 'demo-session-456',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.isDemo).toBe(false);
    });
  });

  // =====================================================
  // CHECK DEMO RATE LIMIT DECORATOR
  // =====================================================

  describe('checkDemoRateLimit decorator', () => {
    it('should skip rate limit check when not a demo request', async () => {
      server.get('/test', {
        preHandler: server.checkDemoRateLimit,
      }, async () => ({
        success: true,
      }));

      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(mockPgQuery).not.toHaveBeenCalled();
    });

    it('should skip rate limit check when demo context not attached', async () => {
      server.get('/test', {
        preHandler: [
          async (request: any) => {
            request.isDemo = true; // Set isDemo but no demo context
          },
          server.checkDemoRateLimit,
        ],
      }, async () => ({
        success: true,
      }));

      await server.ready();

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(mockPgQuery).not.toHaveBeenCalled();
    });

    it('should return 429 when rate limited', async () => {
      server.get('/test', {
        preHandler: [
          async (request: any) => {
            request.isDemo = true;
            request.demo = {
              isDemo: true,
              sessionId: 'demo-session-789',
              credits: 50,
              creditsUsed: 25,
              referralCode: null,
              referralCreditsEarned: 0,
              requestsToday: 100,
              expiresAt: new Date('2026-12-31'),
            };
          },
          server.checkDemoRateLimit,
        ],
      }, async () => ({
        success: true,
      }));

      await server.ready();

      // Mock rate limit check - limited
      mockPgQuery.mockResolvedValueOnce({
        rows: [{
          is_limited: true,
          limit_type: 'hourly',
          current_count: 100,
          max_count: 100,
          resets_at: new Date('2026-01-08T14:00:00Z'),
        }],
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(429);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error).toBe('rate_limit_exceeded');
      expect(result.message).toContain('Demo limit reached');
      expect(result.upgrade_url).toBe('/pricing');
      expect(result.limits.type).toBe('hourly');
      expect(result.limits.used).toBe(100);
      expect(result.limits.max).toBe(100);
      expect(result.bonus).toContain('50 free credits');
    });

    it('should pass when not rate limited and track request', async () => {
      server.get('/test', {
        preHandler: [
          async (request: any) => {
            request.isDemo = true;
            request.demo = {
              isDemo: true,
              sessionId: 'demo-session-999',
              credits: 50,
              creditsUsed: 10,
              referralCode: null,
              referralCreditsEarned: 0,
              requestsToday: 10,
              expiresAt: new Date('2026-12-31'),
            };
          },
          server.checkDemoRateLimit,
        ],
      }, async () => ({
        success: true,
      }));

      await server.ready();

      // Mock rate limit check - not limited
      mockPgQuery.mockResolvedValueOnce({
        rows: [{
          is_limited: false,
        }],
      });

      // Mock transaction for tracking
      mockPgQuery.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockPgQuery.mockResolvedValueOnce({ rows: [] }); // INSERT minute
      mockPgQuery.mockResolvedValueOnce({ rows: [] }); // INSERT hour
      mockPgQuery.mockResolvedValueOnce({ rows: [] }); // INSERT day
      mockPgQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE session
      mockPgQuery.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);

      // Verify rate limit check was called
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('check_demo_rate_limit'),
        ['demo-session-999']
      );

      // Verify tracking queries were called
      const trackingCalls = mockPgQuery.mock.calls.filter((call: any) =>
        call[0].includes('demo_rate_tracking') ||
        call[0].includes('demo_sessions')
      );
      expect(trackingCalls.length).toBeGreaterThan(0);
    });

    it('should handle rate limit check errors gracefully', async () => {
      server.get('/test', {
        preHandler: [
          async (request: any) => {
            request.isDemo = true;
            request.demo = {
              isDemo: true,
              sessionId: 'demo-session-error',
              credits: 50,
              creditsUsed: 10,
              referralCode: null,
              referralCreditsEarned: 0,
              requestsToday: 10,
              expiresAt: new Date('2026-12-31'),
            };
          },
          server.checkDemoRateLimit,
        ],
      }, async () => ({
        success: true,
      }));

      await server.ready();

      // Mock database error for rate limit check (function doesn't exist)
      // Then mock success for tracking queries
      mockPgQuery
        .mockRejectedValueOnce(new Error('function check_demo_rate_limit does not exist'))
        .mockResolvedValue({ rows: [] }); // All subsequent queries succeed

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      // Should allow through when check fails (fail open)
      expect(response.statusCode).toBe(200);
    });
  });

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  describe('Utility functions', () => {
    describe('hasDemoCredits()', () => {
      it('should return true when demo request has credits', () => {
        const request: any = {
          isDemo: true,
          demo: {
            isDemo: true,
            sessionId: 'demo-123',
            credits: 50,
            creditsUsed: 25,
            referralCode: null,
            referralCreditsEarned: 0,
            requestsToday: 5,
            expiresAt: new Date(),
          },
        };

        expect(hasDemoCredits(request)).toBe(true);
      });

      it('should return false when demo has no credits', () => {
        const request: any = {
          isDemo: true,
          demo: {
            isDemo: true,
            sessionId: 'demo-123',
            credits: 0,
            creditsUsed: 50,
            referralCode: null,
            referralCreditsEarned: 0,
            requestsToday: 50,
            expiresAt: new Date(),
          },
        };

        expect(hasDemoCredits(request)).toBe(false);
      });

      it('should return false when not a demo request', () => {
        const request: any = {
          isDemo: false,
        };

        expect(hasDemoCredits(request)).toBe(false);
      });

      it('should return false when demo context is undefined', () => {
        const request: any = {
          isDemo: true,
          demo: undefined,
        };

        expect(hasDemoCredits(request)).toBe(false);
      });
    });

    describe('getDemoCredits()', () => {
      it('should return credit count when demo exists', () => {
        const request: any = {
          demo: {
            credits: 75,
          },
        };

        expect(getDemoCredits(request)).toBe(75);
      });

      it('should return 0 when demo context is undefined', () => {
        const request: any = {};

        expect(getDemoCredits(request)).toBe(0);
      });
    });

    describe('checkDemoFeatureLimit()', () => {
      it('should return feature limit when feature exists', async () => {
        mockPgQuery.mockResolvedValue({
          rows: [{
            max_count: 10,
            description: 'Max 10 AI completions in demo mode',
          }],
        });

        const result = await checkDemoFeatureLimit(server, 'ai_completions');

        expect(result).toEqual({
          allowed: true,
          max: 10,
          description: 'Max 10 AI completions in demo mode',
        });

        expect(mockPgQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT max_count, description FROM demo_limits'),
          ['ai_completions']
        );
      });

      it('should return not allowed when feature not found', async () => {
        mockPgQuery.mockResolvedValue({
          rows: [],
        });

        const result = await checkDemoFeatureLimit(server, 'unknown_feature');

        expect(result).toEqual({
          allowed: false,
          max: 0,
          description: 'Feature not available in demo mode',
        });
      });

      it('should return not allowed when max_count is 0', async () => {
        mockPgQuery.mockResolvedValue({
          rows: [{
            max_count: 0,
            description: 'Feature disabled in demo',
          }],
        });

        const result = await checkDemoFeatureLimit(server, 'disabled_feature');

        expect(result).toEqual({
          allowed: false,
          max: 0,
          description: 'Feature disabled in demo',
        });
      });

      it('should handle database errors gracefully', async () => {
        mockPgQuery.mockRejectedValue(new Error('Database error'));

        const result = await checkDemoFeatureLimit(server, 'ai_completions');

        expect(result).toEqual({
          allowed: false,
          max: 0,
          description: 'Error checking feature limit',
        });
      });
    });
  });
});

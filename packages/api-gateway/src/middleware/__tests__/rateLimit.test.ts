/**
 * @file middleware/__tests__/rateLimit.test.ts
 * @description Tests for rate limiting middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Mock the database pool before importing the module
const mockQuery = vi.fn();
vi.mock('../../config/database', () => ({
  pool: {
    query: mockQuery,
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock BYOK router to prevent network calls
vi.mock('../../services/llm-router/byok-router.js', () => ({
  byokRouter: {
    getByokContext: vi.fn().mockResolvedValue({
      flags: { byokMode: false, byokFirstMode: false, byokOnlyMode: false },
      hasCredits: true,
      hasByokKeys: false,
    }),
    determineKeySource: vi.fn().mockReturnValue({
      source: 'internal',
      reason: 'test',
    }),
  },
}));

describe('Rate Limit Middleware', () => {
  let rateLimit: any;
  let getRateLimitsForTier: any;
  let getAllRateLimits: any;
  let canUseFeature: any;

  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply> & { _sentData?: any; _statusCode?: number };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Re-import to get fresh module with reset cache
    const module = await import('../rateLimit.js');
    rateLimit = module.rateLimit;
    getRateLimitsForTier = module.getRateLimitsForTier;
    getAllRateLimits = module.getAllRateLimits;
    canUseFeature = module.canUseFeature;

    mockRequest = {
      url: '/api/test',
      ip: '127.0.0.1',
    };

    mockReply = {
      _statusCode: 200,
      _sentData: null,
      status: vi.fn().mockImplementation(function(code: number) {
        mockReply._statusCode = code;
        return mockReply;
      }),
      send: vi.fn().mockImplementation(function(data: any) {
        mockReply._sentData = data;
        return mockReply;
      }),
      header: vi.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rateLimit factory', () => {
    it('should return a middleware function', () => {
      const middleware = rateLimit();
      expect(typeof middleware).toBe('function');
    });

    it('should accept options', () => {
      const middleware = rateLimit({
        skipAdmin: false,
        skipByok: false,
        multiplier: 0.5,
      });
      expect(typeof middleware).toBe('function');
    });
  });

  describe('unauthenticated requests', () => {
    it('should allow unauthenticated requests (no userId)', async () => {
      const middleware = rateLimit();

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });
  });

  describe('admin bypass', () => {
    it('should skip rate limiting for admin tier when skipAdmin is true', async () => {
      const middleware = rateLimit({ skipAdmin: true });
      (mockRequest as any).userId = 'admin-user-123';

      // Mock getEffectiveTier to return 'admin'
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'admin' }] });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalledWith(429);
    });
  });

  describe('BYOK bypass', () => {
    it('should skip rate limiting for byok tier when skipByok is true', async () => {
      const middleware = rateLimit({ skipByok: true });
      (mockRequest as any).userId = 'byok-user-123';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'byok' }] });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalledWith(429);
    });
  });

  describe('rate limit enforcement', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      const middleware = rateLimit();
      (mockRequest as any).userId = 'user-123';

      // Mock queries in order:
      // 1. getEffectiveTier
      // 2. getRateLimitsConfig (SELECT * FROM rate_limits)
      // 3. checkRateLimit (SELECT window_type, request_count...)
      // 4. logRateLimitExceeded (INSERT INTO rate_limit_events)
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'pro' }] }) // getEffectiveTier
        .mockResolvedValueOnce({
          rows: [{
            tier: 'pro',
            requests_per_minute: 10, // Low limit for testing
            requests_per_hour: 100,
            requests_per_day: 1000,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: null,
            max_storage_mb: null,
            max_concurrent_requests: 5,
            max_agents: 10,
            agent_memory_enabled: true,
          }]
        }) // getRateLimitsConfig
        .mockResolvedValueOnce({
          rows: [{ window_type: 'minute', request_count: 10 }] // Already at limit
        }) // checkRateLimit
        .mockResolvedValueOnce({ rows: [] }); // logRateLimitExceeded

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Too Many Requests',
        message: expect.stringContaining('requests_per_minute'),
      }));
    });

    it('should set rate limit headers when limit is exceeded', async () => {
      const middleware = rateLimit();
      (mockRequest as any).userId = 'user-123';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'pro' }] })
        .mockResolvedValueOnce({
          rows: [{
            tier: 'pro',
            requests_per_minute: 10,
            requests_per_hour: null,
            requests_per_day: null,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: null,
            max_storage_mb: null,
            max_concurrent_requests: 5,
            max_agents: 10,
            agent_memory_enabled: true,
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ window_type: 'minute', request_count: 10 }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      expect(mockReply.header).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });

    it('should allow request when under limit', async () => {
      const middleware = rateLimit();
      (mockRequest as any).userId = 'user-123';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'pro' }] })
        .mockResolvedValueOnce({
          rows: [{
            tier: 'pro',
            requests_per_minute: 100,
            requests_per_hour: null,
            requests_per_day: null,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: null,
            max_storage_mb: null,
            max_concurrent_requests: 5,
            max_agents: 10,
            agent_memory_enabled: true,
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ window_type: 'minute', request_count: 5 }] // Under limit
        })
        .mockResolvedValueOnce({ rows: [] }); // incrementRateLimit

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalledWith(429);
    });

    it('should increment rate counters when request is allowed', async () => {
      const middleware = rateLimit();
      (mockRequest as any).userId = 'user-123';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'pro' }] })
        .mockResolvedValueOnce({
          rows: [{
            tier: 'pro',
            requests_per_minute: 100,
            requests_per_hour: null,
            requests_per_day: null,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: null,
            max_storage_mb: null,
            max_concurrent_requests: 5,
            max_agents: 10,
            agent_memory_enabled: true,
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Check that increment query was called
      const calls = mockQuery.mock.calls;
      const incrementCall = calls.find((call: any[]) =>
        call[0]?.includes?.('INSERT INTO user_rate_tracking')
      );
      expect(incrementCall).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should not block on database errors', async () => {
      const middleware = rateLimit();
      (mockRequest as any).userId = 'user-123';

      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalledWith(429);
      expect(mockReply.status).not.toHaveBeenCalledWith(500);
    });
  });

  describe('request decoration', () => {
    it('should add tier info to request after successful rate limit check', async () => {
      const middleware = rateLimit();
      (mockRequest as any).userId = 'user-123';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'pro' }] })
        .mockResolvedValueOnce({
          rows: [{
            tier: 'pro',
            requests_per_minute: 100,
            requests_per_hour: null,
            requests_per_day: null,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: null,
            max_storage_mb: null,
            max_concurrent_requests: 5,
            max_agents: 10,
            agent_memory_enabled: true,
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect((mockRequest as any).userTier).toBe('pro');
      expect((mockRequest as any).rateLimits).toBeDefined();
    });
  });
});

describe('getRateLimitsForTier', () => {
  let getRateLimitsForTier: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const module = await import('../rateLimit.js');
    getRateLimitsForTier = module.getRateLimitsForTier;
  });

  it('should return limits for existing tier', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        tier: 'pro',
        requests_per_minute: 100,
        requests_per_hour: 1000,
        requests_per_day: 10000,
        max_tokens_per_request: 4000,
        tokens_per_day: 100000,
        max_documents: 100,
        max_storage_mb: 1000,
        max_concurrent_requests: 5,
        max_agents: 10,
        agent_memory_enabled: true,
      }]
    });

    const result = await getRateLimitsForTier('pro');

    expect(result).toBeDefined();
    expect(result?.tier).toBe('pro');
    expect(result?.requestsPerMinute).toBe(100);
    expect(result?.maxAgents).toBe(10);
  });

  it('should return null for non-existent tier', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getRateLimitsForTier('nonexistent');

    expect(result).toBeNull();
  });
});

describe('getAllRateLimits', () => {
  let getAllRateLimits: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const module = await import('../rateLimit.js');
    getAllRateLimits = module.getAllRateLimits;
  });

  it('should return all configured rate limits', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          tier: 'community',
          requests_per_minute: 10,
          requests_per_hour: 60,
          requests_per_day: 100,
          max_tokens_per_request: 1000,
          tokens_per_day: 5000,
          max_documents: 10,
          max_storage_mb: 100,
          max_concurrent_requests: 2,
          max_agents: 1,
          agent_memory_enabled: false,
        },
        {
          tier: 'pro',
          requests_per_minute: 100,
          requests_per_hour: 1000,
          requests_per_day: 10000,
          max_tokens_per_request: 4000,
          tokens_per_day: 100000,
          max_documents: 100,
          max_storage_mb: 1000,
          max_concurrent_requests: 5,
          max_agents: 10,
          agent_memory_enabled: true,
        },
      ]
    });

    const result = await getAllRateLimits();

    expect(result).toHaveLength(2);
    expect(result.map((r: any) => r.tier)).toContain('community');
    expect(result.map((r: any) => r.tier)).toContain('pro');
  });
});

describe('canUseFeature', () => {
  let canUseFeature: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const module = await import('../rateLimit.js');
    canUseFeature = module.canUseFeature;
  });

  describe('agents feature', () => {
    it('should allow agents when maxAgents > 0', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'pro' }] })
        .mockResolvedValueOnce({
          rows: [{
            tier: 'pro',
            requests_per_minute: 100,
            requests_per_hour: null,
            requests_per_day: null,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: null,
            max_storage_mb: null,
            max_concurrent_requests: 5,
            max_agents: 10,
            agent_memory_enabled: true,
          }]
        });

      const result = await canUseFeature('user-123', 'agents');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });

    it('should deny agents when maxAgents is 0', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'community' }] })
        .mockResolvedValueOnce({
          rows: [{
            tier: 'community',
            requests_per_minute: 10,
            requests_per_hour: null,
            requests_per_day: null,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: null,
            max_storage_mb: null,
            max_concurrent_requests: 2,
            max_agents: 0,
            agent_memory_enabled: false,
          }]
        });

      const result = await canUseFeature('user-123', 'agents');

      expect(result.allowed).toBe(false);
    });
  });

  describe('memory feature', () => {
    it('should allow memory when agentMemoryEnabled is true', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'pro' }] })
        .mockResolvedValueOnce({
          rows: [{
            tier: 'pro',
            requests_per_minute: 100,
            requests_per_hour: null,
            requests_per_day: null,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: null,
            max_storage_mb: null,
            max_concurrent_requests: 5,
            max_agents: 10,
            agent_memory_enabled: true,
          }]
        });

      const result = await canUseFeature('user-123', 'memory');

      expect(result.allowed).toBe(true);
    });

    it('should deny memory when agentMemoryEnabled is false', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'community' }] })
        .mockResolvedValueOnce({
          rows: [{
            tier: 'community',
            requests_per_minute: 10,
            requests_per_hour: null,
            requests_per_day: null,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: null,
            max_storage_mb: null,
            max_concurrent_requests: 2,
            max_agents: 0,
            agent_memory_enabled: false,
          }]
        });

      const result = await canUseFeature('user-123', 'memory');

      expect(result.allowed).toBe(false);
    });
  });

  describe('documents feature', () => {
    it('should allow unlimited documents when maxDocuments is null', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'enterprise' }] })
        .mockResolvedValueOnce({
          rows: [{
            tier: 'enterprise',
            requests_per_minute: null,
            requests_per_hour: null,
            requests_per_day: null,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: null,
            max_storage_mb: null,
            max_concurrent_requests: 50,
            max_agents: 100,
            agent_memory_enabled: true,
          }]
        });

      const result = await canUseFeature('user-123', 'documents');

      expect(result.allowed).toBe(true);
    });

    it('should return limit when maxDocuments is set', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'pro' }] })
        .mockResolvedValueOnce({
          rows: [{
            tier: 'pro',
            requests_per_minute: 100,
            requests_per_hour: null,
            requests_per_day: null,
            max_tokens_per_request: null,
            tokens_per_day: null,
            max_documents: 500,
            max_storage_mb: null,
            max_concurrent_requests: 5,
            max_agents: 10,
            agent_memory_enabled: true,
          }]
        });

      const result = await canUseFeature('user-123', 'documents');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(500);
    });
  });

  describe('missing limits', () => {
    it('should return not allowed when no limits found for tier', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tier: 'nonexistent' }] })
        .mockResolvedValueOnce({ rows: [] }); // No limits in config

      const result = await canUseFeature('user-123', 'agents');

      expect(result.allowed).toBe(false);
    });
  });
});

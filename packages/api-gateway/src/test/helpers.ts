/**
 * @file test/helpers.ts
 * @description Shared test utilities and mock factories for API Gateway tests
 */

import { vi } from 'vitest';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ============================================
// MOCK FACTORIES
// ============================================

/**
 * Create a mock Fastify instance with pg and common decorators
 */
export function createMockFastify(overrides: Partial<MockFastify> = {}): MockFastify {
  return {
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
    pg: createMockPg(),
    redis: createMockRedis(),
    ...overrides,
  };
}

/**
 * Create a mock PostgreSQL client
 */
export function createMockPg(queryResponses: Record<string, any> = {}) {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
      // Check for specific query patterns
      for (const [pattern, response] of Object.entries(queryResponses)) {
        if (sql.includes(pattern)) {
          if (typeof response === 'function') {
            return response(sql, params);
          }
          return { rows: response, rowCount: response.length };
        }
      }
      return { rows: [], rowCount: 0 };
    }),
    connect: vi.fn(),
    end: vi.fn(),
  };
}

/**
 * Create a mock Redis client
 */
export function createMockRedis() {
  const store: Map<string, string> = new Map();

  return {
    get: vi.fn().mockImplementation(async (key: string) => store.get(key) || null),
    set: vi.fn().mockImplementation(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    setex: vi.fn().mockImplementation(async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    del: vi.fn().mockImplementation(async (key: string) => {
      const existed = store.has(key);
      store.delete(key);
      return existed ? 1 : 0;
    }),
    incr: vi.fn().mockImplementation(async (key: string) => {
      const current = parseInt(store.get(key) || '0', 10);
      store.set(key, String(current + 1));
      return current + 1;
    }),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-1),
    keys: vi.fn().mockResolvedValue([]),
    _store: store, // Expose for testing
  };
}

/**
 * Create a mock Fastify request
 */
export function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    id: 'test-request-id',
    method: 'GET',
    url: '/test',
    headers: {},
    query: {},
    params: {},
    body: {},
    user: undefined,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
  };
}

/**
 * Create a mock Fastify reply
 */
export function createMockReply(): MockReply {
  const reply: MockReply = {
    statusCode: 200,
    _sentData: null,
    status: vi.fn().mockImplementation((code: number) => {
      reply.statusCode = code;
      return reply;
    }),
    code: vi.fn().mockImplementation((code: number) => {
      reply.statusCode = code;
      return reply;
    }),
    send: vi.fn().mockImplementation((data: any) => {
      reply._sentData = data;
      return reply;
    }),
    header: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
  };
  return reply;
}

/**
 * Create a mock user object
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    organizationId: 'test-org-id',
    is_admin: false,
    is_moderator: false,
    tier: 'pro',
    ...overrides,
  };
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MockFastify {
  log: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    trace: ReturnType<typeof vi.fn>;
    fatal: ReturnType<typeof vi.fn>;
    child: ReturnType<typeof vi.fn>;
  };
  pg: ReturnType<typeof createMockPg>;
  redis: ReturnType<typeof createMockRedis>;
  [key: string]: any;
}

export interface MockRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  params: Record<string, any>;
  body: any;
  user?: MockUser;
  log: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
}

export interface MockReply {
  statusCode: number;
  _sentData: any;
  status: ReturnType<typeof vi.fn>;
  code: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  header: ReturnType<typeof vi.fn>;
  type: ReturnType<typeof vi.fn>;
}

export interface MockUser {
  id: string;
  email: string;
  organizationId: string;
  is_admin: boolean;
  is_moderator: boolean;
  tier: string;
  [key: string]: any;
}

// ============================================
// ASSERTION HELPERS
// ============================================

/**
 * Assert that a reply was sent with specific status code
 */
export function assertStatusCode(reply: MockReply, expectedCode: number) {
  if (reply.status.mock.calls.length > 0) {
    const actualCode = reply.status.mock.calls[0][0];
    if (actualCode !== expectedCode) {
      throw new Error(`Expected status ${expectedCode}, got ${actualCode}`);
    }
  } else if (reply.statusCode !== expectedCode) {
    throw new Error(`Expected status ${expectedCode}, got ${reply.statusCode}`);
  }
}

/**
 * Assert that reply.send was called with data matching pattern
 */
export function assertSentData(reply: MockReply, matcher: (data: any) => boolean) {
  if (!reply.send.mock.calls.length) {
    throw new Error('Expected reply.send to be called');
  }
  const sentData = reply.send.mock.calls[0][0];
  if (!matcher(sentData)) {
    throw new Error(`Sent data did not match: ${JSON.stringify(sentData)}`);
  }
}

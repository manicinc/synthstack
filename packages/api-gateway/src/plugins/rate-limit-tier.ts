/**
 * @file plugins/rate-limit-tier.ts
 * @description Tiered rate limiting plugin based on subscription tier
 * @module @synthstack/api-gateway/plugins
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { SubscriptionTier, normalizeSubscriptionTier } from '../services/stripe.js';

// ============================================
// TYPES
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  prefix?: string;
  keyGenerator?: (request: FastifyRequest) => string;
  skipOnError?: boolean;
  allowList?: string[];
  enableHeaders?: boolean;
}

interface EndpointLimits {
  general: number;
  generation: number;
  upload: number;
  auth: number;
}

// ============================================
// RATE LIMIT CONFIGURATION PER TIER
// ============================================

export const TIER_RATE_LIMITS: Record<SubscriptionTier, EndpointLimits> = {
  free: {
    general: 10,      // 10 requests per minute
    generation: 3,    // 3 AI generations per minute
    upload: 5,        // 5 uploads per minute
    auth: 5,          // 5 auth attempts per minute
  },
  maker: {
    general: 30,
    generation: 15,
    upload: 10,
    auth: 10,
  },
  pro: {
    general: 60,
    generation: 30,
    upload: 20,
    auth: 15,
  },
  agency: {
    general: 100,
    generation: 60,
    upload: 40,
    auth: 20,
  },
};

// ============================================
// IN-MEMORY RATE LIMIT STORE
// ============================================

class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (entry && entry.resetAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    let entry = this.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 1, resetAt: now + windowMs };
    } else {
      entry.count++;
    }

    this.set(key, entry);
    return entry;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// ============================================
// REDIS RATE LIMIT STORE (for production)
// ============================================

class RedisRateLimitStore {
  private redis: any;
  private prefix: string;

  constructor(redis: any, prefix: string = 'ratelimit:') {
    this.redis = redis;
    this.prefix = prefix;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const fullKey = this.prefix + key;
    const windowSeconds = Math.ceil(windowMs / 1000);

    const multi = this.redis.multi();
    multi.incr(fullKey);
    multi.pttl(fullKey);
    const results = await multi.exec();

    const count = results[0][1] as number;
    let ttl = results[1][1] as number;

    if (ttl === -1) {
      await this.redis.pexpire(fullKey, windowMs);
      ttl = windowMs;
    }

    return {
      count,
      resetAt: Date.now() + ttl,
    };
  }
}

// ============================================
// RATE LIMIT PLUGIN
// ============================================

async function rateLimitTierPlugin(
  fastify: FastifyInstance,
  options: RateLimitOptions = {}
): Promise<void> {
  const {
    prefix = 'tier-ratelimit:',
    skipOnError = false,
    allowList = [],
    enableHeaders = true,
  } = options;

  // Use Redis if available, otherwise use in-memory store
  const useRedis = fastify.redis !== undefined;
  const memoryStore = useRedis ? null : new RateLimitStore();
  const redisStore = useRedis ? new RedisRateLimitStore(fastify.redis, prefix) : null;

  // Cleanup on shutdown
  fastify.addHook('onClose', async () => {
    if (memoryStore) {
      memoryStore.destroy();
    }
  });

  // Decorate fastify with rate limit helpers
  fastify.decorate('checkRateLimit', async (
    request: FastifyRequest,
    limitType: keyof EndpointLimits = 'general'
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number; limit: number }> => {
    const user = (request as any).user;
    const tier: SubscriptionTier = normalizeSubscriptionTier(user?.subscription_tier);
    const limits = TIER_RATE_LIMITS[tier];
    const limit = limits[limitType];

    // Allow list check
    const ip = request.ip;
    if (allowList.includes(ip)) {
      return { allowed: true, remaining: limit, resetAt: Date.now() + 60000, limit };
    }

    // Generate rate limit key
    const identifier = user?.id || ip;
    const key = `${limitType}:${identifier}`;
    const windowMs = 60000; // 1 minute window

    try {
      let entry: RateLimitEntry;

      if (redisStore) {
        entry = await redisStore.increment(key, windowMs);
      } else if (memoryStore) {
        entry = memoryStore.increment(key, windowMs);
      } else {
        return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs, limit };
      }

      const remaining = Math.max(0, limit - entry.count);
      const allowed = entry.count <= limit;

      return { allowed, remaining, resetAt: entry.resetAt, limit };
    } catch (error) {
      fastify.log.error({ error }, 'Rate limit check failed');
      if (skipOnError) {
        return { allowed: true, remaining: limit, resetAt: Date.now() + 60000, limit };
      }
      throw error;
    }
  });

  // Rate limit hook factory
  fastify.decorate('rateLimitHook', (limitType: keyof EndpointLimits = 'general') => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await (fastify as any).checkRateLimit(request, limitType);

      if (enableHeaders) {
        reply.header('X-RateLimit-Limit', result.limit);
        reply.header('X-RateLimit-Remaining', result.remaining);
        reply.header('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
        reply.header('X-RateLimit-Policy', `${result.limit};w=60`);
      }

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        reply.header('Retry-After', retryAfter);
        return reply.status(429).send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter,
            limit: result.limit,
            type: limitType,
          },
        });
      }
    };
  });

  // Convenience decorators for common limit types
  fastify.decorate('rateLimitGeneral', (fastify as any).rateLimitHook('general'));
  fastify.decorate('rateLimitGeneration', (fastify as any).rateLimitHook('generation'));
  fastify.decorate('rateLimitUpload', (fastify as any).rateLimitHook('upload'));
  fastify.decorate('rateLimitAuth', (fastify as any).rateLimitHook('auth'));
}

// ============================================
// EXTEND FASTIFY TYPES
// ============================================

declare module 'fastify' {
  interface FastifyInstance {
    checkRateLimit: (
      request: FastifyRequest,
      limitType?: keyof EndpointLimits
    ) => Promise<{ allowed: boolean; remaining: number; resetAt: number; limit: number }>;
    rateLimitHook: (limitType?: keyof EndpointLimits) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    rateLimitGeneral: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    rateLimitGeneration: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    rateLimitUpload: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    rateLimitAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(rateLimitTierPlugin, {
  name: 'rate-limit-tier',
  dependencies: [],
});

export { RateLimitStore, RedisRateLimitStore };

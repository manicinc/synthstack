import { FastifyRequest, FastifyReply } from 'fastify';
import { RateLimitError } from './error-handler';

/**
 * Simple in-memory rate limiter
 * For production, use Redis-backed rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(request: FastifyRequest): string {
  return request.ip || 'unknown';
}

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = config;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = keyGenerator(request);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetAt: now + windowMs
      };
      rateLimitStore.set(key, entry);
    }

    // Increment request count
    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil(entry.resetAt / 1000);

    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', resetTime);

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      reply.header('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds`
      );
    }

    // Handle successful/failed request skipping
    // Note: We store the entry reference and use onSend hook via reply.then pattern
    if (skipSuccessfulRequests || skipFailedRequests) {
      const entryRef = entry;
      reply.then(
        () => {
          const shouldSkip =
            (skipSuccessfulRequests && reply.statusCode < 400) ||
            (skipFailedRequests && reply.statusCode >= 400);

          if (shouldSkip && entryRef) {
            entryRef.count--;
          }
        },
        () => {
          // On error, decrement if we should skip failed requests
          if (skipFailedRequests && entryRef) {
            entryRef.count--;
          }
        }
      );
    }
  };
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitPresets = {
  // Strict limit for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },

  // Standard API limit
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60
  },

  // Generous limit for reading data
  read: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  },

  // Strict limit for writing data
  write: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30
  },

  // Very strict for sensitive operations
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10
  }
};

/**
 * Generate rate limit key by user ID
 */
export function byUserId(request: FastifyRequest): string {
  const user = (request as any).user;
  return user?.id || request.ip || 'unknown';
}

/**
 * Generate rate limit key by API key
 */
export function byApiKey(request: FastifyRequest): string {
  const apiKey = request.headers['x-api-key'] as string;
  return apiKey || request.ip || 'unknown';
}

export default rateLimit;

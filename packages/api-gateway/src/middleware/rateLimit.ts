/**
 * Rate Limiting Middleware
 *
 * Applies tier-based rate limits to API requests.
 * Limits are defined in the rate_limits table.
 *
 * BYOK Integration:
 * - When users are using their own API keys (BYOK mode), rate limits are bypassed
 * - Users rely on their own provider's quotas instead of platform tier limits
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { byokRouter } from '../services/llm-router/byok-router.js';

// ============================================
// Types
// ============================================

interface RateLimits {
  tier: string;
  requestsPerMinute: number | null;
  requestsPerHour: number | null;
  requestsPerDay: number | null;
  maxTokensPerRequest: number | null;
  tokensPerDay: number | null;
  maxDocuments: number | null;
  maxStorageMb: number | null;
  maxConcurrentRequests: number;
  maxAgents: number;
  agentMemoryEnabled: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  limitType?: string;
  limit?: number;
  current?: number;
  retryAfter?: number; // seconds
}

// ============================================
// Cache for rate limits config
// ============================================

let rateLimitsCache: Map<string, RateLimits> | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

async function getRateLimitsConfig(): Promise<Map<string, RateLimits>> {
  if (rateLimitsCache && Date.now() < cacheExpiry) {
    return rateLimitsCache;
  }

  interface RateLimitRow {
    tier: string;
    requests_per_minute: number | null;
    requests_per_hour: number | null;
    requests_per_day: number | null;
    max_tokens_per_request: number | null;
    tokens_per_day: number | null;
    max_documents: number | null;
    max_storage_mb: number | null;
    max_concurrent_requests: number | null;
    max_agents: number | null;
    agent_memory_enabled: boolean | null;
  }

  const result = await pool.query<RateLimitRow>(`SELECT * FROM rate_limits`);

  const cache = new Map<string, RateLimits>();
  for (const row of result.rows) {
    cache.set(row.tier, {
      tier: row.tier,
      requestsPerMinute: row.requests_per_minute,
      requestsPerHour: row.requests_per_hour,
      requestsPerDay: row.requests_per_day,
      maxTokensPerRequest: row.max_tokens_per_request,
      tokensPerDay: row.tokens_per_day,
      maxDocuments: row.max_documents,
      maxStorageMb: row.max_storage_mb,
      maxConcurrentRequests: row.max_concurrent_requests || 3,
      maxAgents: row.max_agents || 0,
      agentMemoryEnabled: row.agent_memory_enabled || false,
    });
  }

  rateLimitsCache = cache;
  cacheExpiry = Date.now() + CACHE_TTL;

  return cache;
}

// ============================================
// Get effective tier for user
// ============================================

async function getEffectiveTier(userId: string | null): Promise<string> {
  if (!userId) {
    return 'community';
  }

  const result = await pool.query<{ tier: string }>(
    `SELECT get_effective_tier($1::uuid) as tier`,
    [userId]
  );

  return result.rows[0]?.tier || 'community';
}

// ============================================
// Check and update rate limits
// ============================================

async function checkRateLimit(
  userId: string,
  tier: string,
  limits: RateLimits
): Promise<RateLimitResult> {
  const now = new Date();

  // Calculate window starts
  const minuteStart = new Date(now);
  minuteStart.setSeconds(0, 0);

  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  // Get current counts
  const result = await pool.query<{ window_type: string; request_count: number }>(
    `
    SELECT window_type, request_count
    FROM user_rate_tracking
    WHERE user_id = $1 AND (
      (window_type = 'minute' AND window_start = $2) OR
      (window_type = 'hour' AND window_start = $3) OR
      (window_type = 'day' AND window_start = $4)
    )
  `,
    [userId, minuteStart, hourStart, dayStart]
  );

  const counts: Record<string, number> = {
    minute: 0,
    hour: 0,
    day: 0,
  };

  for (const row of result.rows) {
    counts[row.window_type] = row.request_count;
  }

  // Check limits (null = unlimited)
  if (limits.requestsPerMinute !== null && counts.minute >= limits.requestsPerMinute) {
    return {
      allowed: false,
      limitType: 'requests_per_minute',
      limit: limits.requestsPerMinute,
      current: counts.minute,
      retryAfter: 60 - now.getSeconds(),
    };
  }

  if (limits.requestsPerHour !== null && counts.hour >= limits.requestsPerHour) {
    return {
      allowed: false,
      limitType: 'requests_per_hour',
      limit: limits.requestsPerHour,
      current: counts.hour,
      retryAfter: 3600 - (now.getMinutes() * 60 + now.getSeconds()),
    };
  }

  if (limits.requestsPerDay !== null && counts.day >= limits.requestsPerDay) {
    return {
      allowed: false,
      limitType: 'requests_per_day',
      limit: limits.requestsPerDay,
      current: counts.day,
      retryAfter: 86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()),
    };
  }

  return { allowed: true };
}

async function incrementRateLimit(userId: string): Promise<void> {
  const now = new Date();

  const minuteStart = new Date(now);
  minuteStart.setSeconds(0, 0);

  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  // Upsert all three windows
  await pool.query(
    `
    INSERT INTO user_rate_tracking (user_id, window_start, window_type, request_count)
    VALUES
      ($1, $2, 'minute', 1),
      ($1, $3, 'hour', 1),
      ($1, $4, 'day', 1)
    ON CONFLICT (user_id, window_start, window_type) DO UPDATE SET
      request_count = user_rate_tracking.request_count + 1
  `,
    [userId, minuteStart, hourStart, dayStart]
  );
}

async function logRateLimitExceeded(
  userId: string,
  tier: string,
  result: RateLimitResult,
  endpoint: string,
  ip: string
): Promise<void> {
  try {
    await pool.query(
      `
      INSERT INTO rate_limit_events (user_id, limit_type, limit_value, current_value, tier, endpoint, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7::inet)
    `,
      [userId, result.limitType, result.limit, result.current, tier, endpoint, ip]
    );
  } catch (err) {
    logger.error('Failed to log rate limit event', err);
  }
}

// ============================================
// Middleware Factory
// ============================================

export interface RateLimitOptions {
  /** Skip rate limiting for admins */
  skipAdmin?: boolean;
  /** Skip rate limiting for BYOK users */
  skipByok?: boolean;
  /** Custom limit multiplier (e.g., 0.5 for stricter limits) */
  multiplier?: number;
}

/**
 * Create rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const { skipAdmin = true, skipByok = true, multiplier = 1 } = options;

  return async function rateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Get user ID from request (set by auth middleware)
    const userId = (request as any).userId as string | undefined;

    if (!userId) {
      // Unauthenticated requests get community limits by IP
      // For now, we'll be lenient with anonymous requests
      return;
    }

    try {
      // ============================================
      // BYOK Integration: Skip rate limiting if using BYOK
      // ============================================
      if (skipByok) {
        const byokContext = await byokRouter.getByokContext(userId);
        const keySource = byokRouter.determineKeySource(byokContext);

        if (keySource.source === 'byok') {
          logger.info({
            userId,
            keySource: keySource.source,
            ...(keySource.reason && { reason: keySource.reason }),
          }, 'BYOK mode - skipping rate limits');

          // User is using their own API keys, skip platform rate limits
          return;
        }
      }

      // Get user's effective tier
      const tier = await getEffectiveTier(userId);

      // Skip for admin if configured
      if (skipAdmin && tier === 'admin') {
        return;
      }

      // Get rate limits for tier
      const limitsConfig = await getRateLimitsConfig();
      const limits = limitsConfig.get(tier) || limitsConfig.get('community');

      if (!limits) {
        logger.warn(`No rate limits found for tier: ${tier}`);
        return;
      }

      // Check rate limits
      const result = await checkRateLimit(userId, tier, limits);

      if (!result.allowed) {
        // Log the event
        const ip = request.ip || 'unknown';
        await logRateLimitExceeded(userId, tier, result, request.url, ip);

        // Set rate limit headers
        reply.header('X-RateLimit-Limit', result.limit || 0);
        reply.header('X-RateLimit-Remaining', 0);
        reply.header('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + (result.retryAfter || 60));
        reply.header('Retry-After', result.retryAfter || 60);

        reply.status(429).send({
          error: 'Too Many Requests',
          message: `Rate limit exceeded: ${result.limitType}`,
          limit: result.limit,
          current: result.current,
          retryAfter: result.retryAfter,
          upgradeUrl: '/pricing',
        });
        return;
      }

      // Increment counters
      await incrementRateLimit(userId);

      // Add tier info to request for downstream use
      (request as any).userTier = tier;
      (request as any).rateLimits = limits;
    } catch (err) {
      logger.error('Rate limit middleware error', err);
      // Don't block on rate limit errors
    }
  };
}

/**
 * Get rate limits for a specific tier (for UI display)
 */
export async function getRateLimitsForTier(tier: string): Promise<RateLimits | null> {
  const config = await getRateLimitsConfig();
  return config.get(tier) || null;
}

/**
 * Get all rate limits (for admin UI)
 */
export async function getAllRateLimits(): Promise<RateLimits[]> {
  const config = await getRateLimitsConfig();
  return Array.from(config.values());
}

/**
 * Check if user can use a specific feature based on tier limits
 */
export async function canUseFeature(
  userId: string,
  feature: 'agents' | 'documents' | 'memory'
): Promise<{ allowed: boolean; limit?: number; current?: number }> {
  const tier = await getEffectiveTier(userId);
  const config = await getRateLimitsConfig();
  const limits = config.get(tier);

  if (!limits) {
    return { allowed: false };
  }

  switch (feature) {
    case 'agents':
      return { allowed: limits.maxAgents > 0, limit: limits.maxAgents };

    case 'documents':
      if (limits.maxDocuments === null) {
        return { allowed: true };
      }
      // TODO: Get current document count
      return { allowed: true, limit: limits.maxDocuments };

    case 'memory':
      return { allowed: limits.agentMemoryEnabled };

    default:
      return { allowed: false };
  }
}

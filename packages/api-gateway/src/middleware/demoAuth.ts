/**
 * Demo Authentication Middleware
 *
 * Middleware for handling demo session authentication.
 * Validates X-Demo-Session header, checks rate limits, and attaches
 * demo context to the request for downstream route handlers.
 *
 * Usage:
 * - Add as preHandler to routes that support demo mode
 * - Checks for demo session header first, then falls back to regular auth
 */

import { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface DemoContext {
  isDemo: true;
  sessionId: string;
  credits: number;
  creditsUsed: number;
  referralCode: string | null;
  referralCreditsEarned: number;
  requestsToday: number;
  expiresAt: Date;
}

export interface RateLimitInfo {
  isLimited: boolean;
  limitType: string | null;
  currentCount: number;
  maxCount: number;
  resetsAt: Date | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    demo?: DemoContext;
    isDemo?: boolean;
  }

  interface FastifyInstance {
    demoAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalDemoAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    checkDemoRateLimit: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if demo session is rate limited
 */
async function checkRateLimit(
  server: FastifyInstance,
  sessionId: string
): Promise<RateLimitInfo> {
  try {
    const result = await server.pg.query(
      `SELECT * FROM check_demo_rate_limit($1)`,
      [sessionId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_limited) {
      return {
        isLimited: false,
        limitType: null,
        currentCount: 0,
        maxCount: 0,
        resetsAt: null,
      };
    }

    const row = result.rows[0];
    return {
      isLimited: row.is_limited,
      limitType: row.limit_type,
      currentCount: row.current_count,
      maxCount: row.max_count,
      resetsAt: row.resets_at,
    };
  } catch (error) {
    // If function doesn't exist yet (migration not run), allow request
    return {
      isLimited: false,
      limitType: null,
      currentCount: 0,
      maxCount: 0,
      resetsAt: null,
    };
  }
}

/**
 * Track a demo request for rate limiting
 */
async function trackRequest(
  server: FastifyInstance,
  sessionId: string
): Promise<void> {
  try {
    const now = new Date();
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Use a transaction for all updates
    await server.pg.query('BEGIN');

    // Track minute window
    await server.pg.query(
      `INSERT INTO demo_rate_tracking (session_id, window_start, window_type, request_count)
       VALUES ($1, $2, 'minute', 1)
       ON CONFLICT (session_id, window_start, window_type)
       DO UPDATE SET request_count = demo_rate_tracking.request_count + 1`,
      [sessionId, minuteStart]
    );

    // Track hour window
    await server.pg.query(
      `INSERT INTO demo_rate_tracking (session_id, window_start, window_type, request_count)
       VALUES ($1, $2, 'hour', 1)
       ON CONFLICT (session_id, window_start, window_type)
       DO UPDATE SET request_count = demo_rate_tracking.request_count + 1`,
      [sessionId, hourStart]
    );

    // Track day window
    await server.pg.query(
      `INSERT INTO demo_rate_tracking (session_id, window_start, window_type, request_count)
       VALUES ($1, $2, 'day', 1)
       ON CONFLICT (session_id, window_start, window_type)
       DO UPDATE SET request_count = demo_rate_tracking.request_count + 1`,
      [sessionId, dayStart]
    );

    // Update session's last activity
    await server.pg.query(
      `UPDATE demo_sessions SET
         requests_today = requests_today + 1,
         last_activity = NOW()
       WHERE session_id = $1`,
      [sessionId]
    );

    await server.pg.query('COMMIT');
  } catch (error) {
    await server.pg.query('ROLLBACK');
    // Log but don't fail the request
    server.log.warn({ error, sessionId }, 'Failed to track demo request');
  }
}

// =====================================================
// PLUGIN
// =====================================================

const demoAuthPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  /**
   * Demo authentication decorator
   *
   * Requires a valid demo session. Returns 401 if not provided or invalid.
   */
  server.decorate('demoAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.headers['x-demo-session'] as string | undefined;

    if (!sessionId) {
      return reply.status(401).send({
        success: false,
        error: 'Demo session required',
        message: 'Please provide X-Demo-Session header',
      });
    }

    try {
      // Validate session exists and hasn't expired
      const result = await server.pg.query(
        `SELECT
          session_id, credits_remaining, credits_used,
          referral_code, referral_credits_earned,
          requests_today, expires_at
         FROM demo_sessions
         WHERE session_id = $1 AND expires_at > NOW()`,
        [sessionId]
      );

      if (result.rows.length === 0) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid or expired demo session',
          message: 'Please initialize a new demo session',
        });
      }

      const session = result.rows[0];

      // Attach demo context to request
      request.demo = {
        isDemo: true,
        sessionId: session.session_id,
        credits: session.credits_remaining,
        creditsUsed: session.credits_used,
        referralCode: session.referral_code,
        referralCreditsEarned: session.referral_credits_earned,
        requestsToday: session.requests_today,
        expiresAt: session.expires_at,
      };
      request.isDemo = true;
    } catch (error) {
      request.log.error(error, 'Error validating demo session');
      return reply.status(500).send({
        success: false,
        error: 'Failed to validate demo session',
      });
    }
  });

  /**
   * Optional demo authentication decorator
   *
   * Checks for demo session but doesn't require it.
   * Sets request.isDemo = true if valid demo session found.
   * Useful for routes that support both authenticated and demo users.
   */
  server.decorate('optionalDemoAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.headers['x-demo-session'] as string | undefined;

    // No demo session header - that's fine, might be authenticated user
    if (!sessionId) {
      request.isDemo = false;
      return;
    }

    try {
      // Validate session
      const result = await server.pg.query(
        `SELECT
          session_id, credits_remaining, credits_used,
          referral_code, referral_credits_earned,
          requests_today, expires_at
         FROM demo_sessions
         WHERE session_id = $1 AND expires_at > NOW()`,
        [sessionId]
      );

      if (result.rows.length === 0) {
        // Invalid session, but don't fail - might be authenticated
        request.isDemo = false;
        return;
      }

      const session = result.rows[0];

      // Attach demo context
      request.demo = {
        isDemo: true,
        sessionId: session.session_id,
        credits: session.credits_remaining,
        creditsUsed: session.credits_used,
        referralCode: session.referral_code,
        referralCreditsEarned: session.referral_credits_earned,
        requestsToday: session.requests_today,
        expiresAt: session.expires_at,
      };
      request.isDemo = true;
    } catch (error) {
      // On error, assume not demo
      request.isDemo = false;
      request.log.warn(error, 'Error checking demo session');
    }
  });

  /**
   * Demo rate limit checker decorator
   *
   * Should be used after demoAuth. Checks if demo session is rate limited.
   * Returns 429 if rate limited with upgrade prompt.
   */
  server.decorate('checkDemoRateLimit', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip if not a demo request
    if (!request.isDemo || !request.demo) {
      return;
    }

    const rateLimit = await checkRateLimit(server, request.demo.sessionId);

    if (rateLimit.isLimited) {
      return reply.status(429).send({
        success: false,
        error: 'rate_limit_exceeded',
        message: 'Demo limit reached. Sign up for more!',
        upgrade_url: '/pricing',
        limits: {
          type: rateLimit.limitType,
          used: rateLimit.currentCount,
          max: rateLimit.maxCount,
          resets_at: rateLimit.resetsAt?.toISOString(),
        },
        bonus: 'Sign up now and get 50 free credits!',
      });
    }

    // Track this request
    await trackRequest(server, request.demo.sessionId);
  });
};

export default fp(demoAuthPlugin, {
  name: 'demo-auth',
  fastify: '4.x',
});

// =====================================================
// UTILITY EXPORTS
// =====================================================

/**
 * Helper to check if request has valid demo session with credits
 */
export function hasDemoCredits(request: FastifyRequest): boolean {
  return request.isDemo === true && request.demo !== undefined && request.demo.credits > 0;
}

/**
 * Helper to get demo credits remaining
 */
export function getDemoCredits(request: FastifyRequest): number {
  return request.demo?.credits ?? 0;
}

/**
 * Helper to check demo feature limit
 */
export async function checkDemoFeatureLimit(
  server: FastifyInstance,
  feature: string
): Promise<{ allowed: boolean; max: number; description: string }> {
  try {
    const result = await server.pg.query(
      `SELECT max_count, description FROM demo_limits WHERE feature = $1`,
      [feature]
    );

    if (result.rows.length === 0) {
      return { allowed: false, max: 0, description: 'Feature not available in demo mode' };
    }

    const { max_count, description } = result.rows[0];
    return { allowed: max_count > 0, max: max_count, description };
  } catch (error) {
    return { allowed: false, max: 0, description: 'Error checking feature limit' };
  }
}

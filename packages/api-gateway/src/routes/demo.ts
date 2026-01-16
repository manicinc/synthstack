/**
 * Demo Mode Routes
 *
 * Public endpoints for demo/trial users without authentication.
 * Handles session initialization, credits tracking, and demo referrals.
 *
 * Demo users get:
 * - 5 initial credits
 * - Severe rate limits (2/min, 10/hr, 20/day)
 * - Limited features (1 project, 5 todos, 5 chat messages)
 * - Referral code to earn additional credits
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { sendDemoCreditLowEmail } from '../services/email/helpers.js';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface DemoSession {
  session_id: string;
  credits_remaining: number;
  credits_used: number;
  referral_code: string | null;
  referral_credits_earned: number;
  requests_today: number;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

interface InitDemoBody {
  fingerprint?: string;
  referred_by?: string;
}

interface UseCreditBody {
  action: string;
  credits?: number;
}

interface TrackReferralBody {
  referral_code: string;
  fingerprint?: string;
}

interface DemoLimits {
  feature: string;
  max_count: number;
  description: string;
}

interface RateLimitStatus {
  is_limited: boolean;
  limit_type: string | null;
  current_count: number;
  max_count: number;
  resets_at: string | null;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate a short demo referral code
 */
function generateDemoReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'D'; // Prefix for demo codes
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get demo session from header or create new one
 */
async function getOrCreateDemoSession(
  server: FastifyInstance,
  sessionId: string | undefined,
  ip: string,
  userAgent: string | undefined,
  fingerprint?: string,
  referredBy?: string
): Promise<DemoSession | null> {
  // Try to get existing session
  if (sessionId) {
    const result = await server.pg.query(
      `SELECT * FROM demo_sessions WHERE session_id = $1 AND expires_at > NOW()`,
      [sessionId]
    );
    if (result.rows.length > 0) {
      // Update last activity
      await server.pg.query(
        `UPDATE demo_sessions SET last_activity = NOW() WHERE session_id = $1`,
        [sessionId]
      );
      return result.rows[0];
    }
  }

  // Create new session
  const newSessionId = randomUUID();
  const referralCode = generateDemoReferralCode();

  try {
    const result = await server.pg.query(
      `INSERT INTO demo_sessions (
        session_id, credits_remaining, credits_used, referral_code,
        referral_credits_earned, requests_today, ip_address, user_agent,
        fingerprint, referred_by, created_at, last_activity, expires_at
      ) VALUES ($1, 5, 0, $2, 0, 0, $3, $4, $5, $6, NOW(), NOW(), NOW() + INTERVAL '7 days')
      RETURNING *`,
      [newSessionId, referralCode, ip, userAgent || null, fingerprint || null, referredBy || null]
    );

    // If referred by someone, award them a credit
    if (referredBy) {
      await server.pg.query(
        `SELECT award_demo_referral_credits($1, 1)`,
        [referredBy]
      );

      // Track the referral
      await server.pg.query(
        `INSERT INTO demo_referrals (
          referrer_session_id, referral_code, clicked_ip, clicked_fingerprint
        ) SELECT session_id, $1, $2, $3 FROM demo_sessions WHERE referral_code = $1`,
        [referredBy, ip, fingerprint || null]
      );
    }

    return result.rows[0];
  } catch (error) {
    // If unique constraint violation on referral code, try again
    if ((error as any).code === '23505') {
      const newReferralCode = generateDemoReferralCode();
      const result = await server.pg.query(
        `INSERT INTO demo_sessions (
          session_id, credits_remaining, credits_used, referral_code,
          referral_credits_earned, requests_today, ip_address, user_agent,
          fingerprint, referred_by, created_at, last_activity, expires_at
        ) VALUES ($1, 5, 0, $2, 0, 0, $3, $4, $5, $6, NOW(), NOW(), NOW() + INTERVAL '7 days')
        RETURNING *`,
        [newSessionId, newReferralCode, ip, userAgent || null, fingerprint || null, referredBy || null]
      );
      return result.rows[0];
    }
    throw error;
  }
}

/**
 * Check demo rate limits
 */
async function checkDemoRateLimit(
  server: FastifyInstance,
  sessionId: string
): Promise<RateLimitStatus> {
  const result = await server.pg.query(
    `SELECT * FROM check_demo_rate_limit($1)`,
    [sessionId]
  );

  if (result.rows.length === 0) {
    return { is_limited: false, limit_type: null, current_count: 0, max_count: 0, resets_at: null };
  }

  const row = result.rows[0];
  return {
    is_limited: row.is_limited,
    limit_type: row.limit_type,
    current_count: row.current_count,
    max_count: row.max_count,
    resets_at: row.resets_at?.toISOString() || null,
  };
}

/**
 * Track demo request for rate limiting
 */
async function trackDemoRequest(
  server: FastifyInstance,
  sessionId: string
): Promise<void> {
  const now = new Date();
  const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Upsert rate tracking for each window
  await server.pg.query(
    `INSERT INTO demo_rate_tracking (session_id, window_start, window_type, request_count)
     VALUES ($1, $2, 'minute', 1)
     ON CONFLICT (session_id, window_start, window_type)
     DO UPDATE SET request_count = demo_rate_tracking.request_count + 1`,
    [sessionId, minuteStart]
  );

  await server.pg.query(
    `INSERT INTO demo_rate_tracking (session_id, window_start, window_type, request_count)
     VALUES ($1, $2, 'hour', 1)
     ON CONFLICT (session_id, window_start, window_type)
     DO UPDATE SET request_count = demo_rate_tracking.request_count + 1`,
    [sessionId, hourStart]
  );

  await server.pg.query(
    `INSERT INTO demo_rate_tracking (session_id, window_start, window_type, request_count)
     VALUES ($1, $2, 'day', 1)
     ON CONFLICT (session_id, window_start, window_type)
     DO UPDATE SET request_count = demo_rate_tracking.request_count + 1`,
    [sessionId, dayStart]
  );

  // Update session's requests_today counter
  await server.pg.query(
    `UPDATE demo_sessions
     SET requests_today = requests_today + 1, last_activity = NOW()
     WHERE session_id = $1`,
    [sessionId]
  );
}

// =====================================================
// ROUTES
// =====================================================

export default async function demoRoutes(server: FastifyInstance) {
  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  /**
   * Initialize or restore demo session
   * POST /demo/init
   *
   * Creates a new demo session or restores an existing one.
   * Returns session ID, credits, and referral code.
   */
  server.post(
    '/init',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            fingerprint: { type: 'string', description: 'Browser fingerprint for abuse prevention' },
            referred_by: { type: 'string', description: 'Referral code that brought this user' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  session_id: { type: 'string' },
                  credits: { type: 'number' },
                  credits_used: { type: 'number' },
                  referral_code: { type: 'string' },
                  referral_credits_earned: { type: 'number' },
                  expires_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: InitDemoBody }>, reply: FastifyReply) => {
      try {
        const existingSessionId = request.headers['x-demo-session'] as string | undefined;
        const { fingerprint, referred_by } = request.body || {};

        const session = await getOrCreateDemoSession(
          server,
          existingSessionId,
          request.ip,
          request.headers['user-agent'],
          fingerprint,
          referred_by
        );

        if (!session) {
          return reply.status(500).send({
            success: false,
            error: 'Failed to create demo session',
          });
        }

        return reply.send({
          success: true,
          data: {
            session_id: session.session_id,
            credits: session.credits_remaining,
            credits_used: session.credits_used,
            referral_code: session.referral_code,
            referral_credits_earned: session.referral_credits_earned,
            expires_at: session.expires_at,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error initializing demo session');
        return reply.status(500).send({
          success: false,
          error: 'Failed to initialize demo session',
        });
      }
    }
  );

  /**
   * Get demo session status
   * GET /demo/status
   *
   * Returns current session status including credits, limits, and referral stats.
   */
  server.get(
    '/status',
    {
      schema: {
        headers: {
          type: 'object',
          properties: {
            'x-demo-session': { type: 'string', description: 'Demo session ID' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  session_id: { type: 'string' },
                  credits: { type: 'number' },
                  credits_used: { type: 'number' },
                  referral_code: { type: 'string' },
                  referral_credits_earned: { type: 'number' },
                  requests_today: { type: 'number' },
                  rate_limit: { type: 'object' },
                  limits: { type: 'object' },
                  expires_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sessionId = request.headers['x-demo-session'] as string;

        if (!sessionId) {
          return reply.status(400).send({
            success: false,
            error: 'Missing X-Demo-Session header',
          });
        }

        // Get session
        const sessionResult = await server.pg.query(
          `SELECT * FROM demo_sessions WHERE session_id = $1 AND expires_at > NOW()`,
          [sessionId]
        );

        if (sessionResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Demo session not found or expired',
          });
        }

        const session = sessionResult.rows[0];

        // Check rate limits
        const rateLimit = await checkDemoRateLimit(server, sessionId);

        // Get demo feature limits
        const limitsResult = await server.pg.query(`SELECT * FROM demo_limits`);
        const limits = limitsResult.rows.reduce((acc: Record<string, number>, row: DemoLimits) => {
          acc[row.feature] = row.max_count;
          return acc;
        }, {});

        // Get rate limit tier info
        const tierResult = await server.pg.query(
          `SELECT * FROM rate_limits WHERE tier = 'demo'`
        );
        const tier = tierResult.rows[0] || {};

        return reply.send({
          success: true,
          data: {
            session_id: session.session_id,
            credits: session.credits_remaining,
            credits_used: session.credits_used,
            referral_code: session.referral_code,
            referral_credits_earned: session.referral_credits_earned,
            requests_today: session.requests_today,
            rate_limit: {
              is_limited: rateLimit.is_limited,
              limit_type: rateLimit.limit_type,
              current: rateLimit.current_count,
              max: rateLimit.max_count,
              resets_at: rateLimit.resets_at,
              limits: {
                per_minute: tier.requests_per_minute || 2,
                per_hour: tier.requests_per_hour || 10,
                per_day: tier.requests_per_day || 20,
              },
            },
            limits,
            expires_at: session.expires_at,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error getting demo status');
        return reply.status(500).send({
          success: false,
          error: 'Failed to get demo status',
        });
      }
    }
  );

  // =====================================================
  // CREDITS MANAGEMENT
  // =====================================================

  /**
   * Use a demo credit
   * POST /demo/use-credit
   *
   * Deducts a credit from the demo session.
   */
  server.post(
    '/use-credit',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['x-demo-session'],
          properties: {
            'x-demo-session': { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['action'],
          properties: {
            action: { type: 'string', description: 'Type of action using the credit' },
            credits: { type: 'number', default: 1, description: 'Number of credits to use' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  credits_remaining: { type: 'number' },
                  credits_used: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: UseCreditBody }>, reply: FastifyReply) => {
      try {
        const sessionId = request.headers['x-demo-session'] as string;
        const { action, credits = 1 } = request.body;

        if (!sessionId) {
          return reply.status(400).send({
            success: false,
            error: 'Missing X-Demo-Session header',
          });
        }

        // Check rate limits first
        const rateLimit = await checkDemoRateLimit(server, sessionId);
        if (rateLimit.is_limited) {
          return reply.status(429).send({
            success: false,
            error: 'rate_limit_exceeded',
            message: 'Demo limit reached. Sign up for more!',
            upgrade_url: '/pricing',
            limits: {
              type: rateLimit.limit_type,
              used: rateLimit.current_count,
              max: rateLimit.max_count,
              resets_at: rateLimit.resets_at,
            },
            bonus: 'Sign up now and get 50 free credits!',
          });
        }

        // Get current session
        const sessionResult = await server.pg.query(
          `SELECT * FROM demo_sessions WHERE session_id = $1 AND expires_at > NOW()`,
          [sessionId]
        );

        if (sessionResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Demo session not found or expired',
          });
        }

        const session = sessionResult.rows[0];

        // Check if enough credits
        if (session.credits_remaining < credits) {
          return reply.status(402).send({
            success: false,
            error: 'insufficient_credits',
            message: 'Not enough demo credits. Sign up or earn more through referrals!',
            upgrade_url: '/pricing',
            credits_remaining: session.credits_remaining,
            referral_code: session.referral_code,
          });
        }

        // Deduct credits
        const updateResult = await server.pg.query(
          `UPDATE demo_sessions
           SET credits_remaining = credits_remaining - $1,
               credits_used = credits_used + $1,
               last_activity = NOW()
           WHERE session_id = $2
           RETURNING credits_remaining, credits_used`,
          [credits, sessionId]
        );

        // Track request for rate limiting
        await trackDemoRequest(server, sessionId);

        request.log.info({ sessionId, action, credits }, 'Demo credit used');

        return reply.send({
          success: true,
          data: {
            credits_remaining: updateResult.rows[0].credits_remaining,
            credits_used: updateResult.rows[0].credits_used,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error using demo credit');
        return reply.status(500).send({
          success: false,
          error: 'Failed to use demo credit',
        });
      }
    }
  );

  /**
   * Check if demo has credits remaining
   * GET /demo/credits
   */
  server.get(
    '/credits',
    {
      schema: {
        headers: {
          type: 'object',
          properties: {
            'x-demo-session': { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sessionId = request.headers['x-demo-session'] as string;

        if (!sessionId) {
          return reply.status(400).send({
            success: false,
            error: 'Missing X-Demo-Session header',
          });
        }

        const result = await server.pg.query(
          `SELECT credits_remaining, credits_used, referral_credits_earned
           FROM demo_sessions WHERE session_id = $1 AND expires_at > NOW()`,
          [sessionId]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Demo session not found or expired',
          });
        }

        return reply.send({
          success: true,
          data: {
            credits: result.rows[0].credits_remaining,
            credits_used: result.rows[0].credits_used,
            referral_credits_earned: result.rows[0].referral_credits_earned,
            has_credits: result.rows[0].credits_remaining > 0,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error checking demo credits');
        return reply.status(500).send({
          success: false,
          error: 'Failed to check demo credits',
        });
      }
    }
  );

  // =====================================================
  // REFERRAL SYSTEM
  // =====================================================

  /**
   * Generate referral code for demo session
   * POST /demo/referral/generate
   *
   * Returns the referral code for the current session.
   * Code is automatically generated on session init.
   */
  server.post(
    '/referral/generate',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['x-demo-session'],
          properties: {
            'x-demo-session': { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sessionId = request.headers['x-demo-session'] as string;

        if (!sessionId) {
          return reply.status(400).send({
            success: false,
            error: 'Missing X-Demo-Session header',
          });
        }

        const result = await server.pg.query(
          `SELECT referral_code FROM demo_sessions WHERE session_id = $1 AND expires_at > NOW()`,
          [sessionId]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Demo session not found or expired',
          });
        }

        const referralCode = result.rows[0].referral_code;
        const shareUrl = `${process.env.PUBLIC_URL || 'https://synthstack.app'}?ref=${referralCode}`;

        return reply.send({
          success: true,
          data: {
            referral_code: referralCode,
            share_url: shareUrl,
            credits_per_click: 1,
            credits_per_signup: 5,
            credits_per_purchase: 10,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error generating referral code');
        return reply.status(500).send({
          success: false,
          error: 'Failed to generate referral code',
        });
      }
    }
  );

  /**
   * Track referral click
   * POST /demo/referral/track
   *
   * Called when someone clicks a demo referral link.
   * Awards credits to the referrer.
   */
  server.post(
    '/referral/track',
    {
      schema: {
        body: {
          type: 'object',
          required: ['referral_code'],
          properties: {
            referral_code: { type: 'string' },
            fingerprint: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: TrackReferralBody }>, reply: FastifyReply) => {
      try {
        const { referral_code, fingerprint } = request.body;

        // Check if this is a valid demo referral code (starts with 'D')
        if (!referral_code.startsWith('D')) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid demo referral code',
          });
        }

        // Find the referrer's session
        const referrerResult = await server.pg.query(
          `SELECT session_id FROM demo_sessions WHERE referral_code = $1 AND expires_at > NOW()`,
          [referral_code]
        );

        if (referrerResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Referral code not found or expired',
          });
        }

        const referrerSessionId = referrerResult.rows[0].session_id;

        // Check for duplicate clicks (same IP or fingerprint)
        const duplicateCheck = await server.pg.query(
          `SELECT id FROM demo_referrals
           WHERE referral_code = $1
           AND (clicked_ip = $2 OR clicked_fingerprint = $3)
           AND clicked_at > NOW() - INTERVAL '24 hours'`,
          [referral_code, request.ip, fingerprint || null]
        );

        if (duplicateCheck.rows.length > 0) {
          return reply.send({
            success: true,
            data: {
              tracked: false,
              reason: 'duplicate_click',
            },
          });
        }

        // Track the referral click
        await server.pg.query(
          `INSERT INTO demo_referrals (
            referrer_session_id, referral_code, clicked_ip, clicked_fingerprint, credits_awarded
          ) VALUES ($1, $2, $3, $4, 1)`,
          [referrerSessionId, referral_code, request.ip, fingerprint || null]
        );

        // Award credit to referrer
        await server.pg.query(
          `UPDATE demo_sessions
           SET credits_remaining = credits_remaining + 1,
               referral_credits_earned = referral_credits_earned + 1,
               last_activity = NOW()
           WHERE session_id = $1`,
          [referrerSessionId]
        );

        request.log.info({ referral_code, referrerSessionId }, 'Demo referral tracked');

        return reply.send({
          success: true,
          data: {
            tracked: true,
            credits_awarded: 1,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error tracking referral');
        return reply.status(500).send({
          success: false,
          error: 'Failed to track referral',
        });
      }
    }
  );

  /**
   * Get referral stats for demo session
   * GET /demo/referral/stats
   */
  server.get(
    '/referral/stats',
    {
      schema: {
        headers: {
          type: 'object',
          properties: {
            'x-demo-session': { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sessionId = request.headers['x-demo-session'] as string;

        if (!sessionId) {
          return reply.status(400).send({
            success: false,
            error: 'Missing X-Demo-Session header',
          });
        }

        // Get session data
        const sessionResult = await server.pg.query(
          `SELECT referral_code, referral_credits_earned
           FROM demo_sessions WHERE session_id = $1 AND expires_at > NOW()`,
          [sessionId]
        );

        if (sessionResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Demo session not found or expired',
          });
        }

        const { referral_code, referral_credits_earned } = sessionResult.rows[0];

        // Get referral click count
        const clicksResult = await server.pg.query(
          `SELECT COUNT(*) as click_count, COUNT(CASE WHEN converted_to_signup THEN 1 END) as conversions
           FROM demo_referrals WHERE referral_code = $1`,
          [referral_code]
        );

        const { click_count, conversions } = clicksResult.rows[0];

        return reply.send({
          success: true,
          data: {
            referral_code,
            credits_earned: referral_credits_earned,
            clicks: parseInt(click_count, 10),
            conversions: parseInt(conversions, 10),
          },
        });
      } catch (error) {
        request.log.error(error, 'Error getting referral stats');
        return reply.status(500).send({
          success: false,
          error: 'Failed to get referral stats',
        });
      }
    }
  );

  // =====================================================
  // FEATURE LIMITS
  // =====================================================

  /**
   * Get demo feature limits
   * GET /demo/limits
   */
  server.get(
    '/limits',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const limitsResult = await server.pg.query(`SELECT * FROM demo_limits`);
        const limits = limitsResult.rows.reduce((acc: Record<string, { max: number; description: string }>, row: DemoLimits) => {
          acc[row.feature] = {
            max: row.max_count,
            description: row.description,
          };
          return acc;
        }, {});

        // Get rate limits
        const tierResult = await server.pg.query(
          `SELECT * FROM rate_limits WHERE tier = 'demo'`
        );
        const tier = tierResult.rows[0] || {};

        return reply.send({
          success: true,
          data: {
            features: limits,
            rate_limits: {
              requests_per_minute: tier.requests_per_minute || 2,
              requests_per_hour: tier.requests_per_hour || 10,
              requests_per_day: tier.requests_per_day || 20,
              max_tokens_per_request: tier.max_tokens_per_request || 1000,
              tokens_per_day: tier.tokens_per_day || 5000,
            },
            initial_credits: 5,
            session_duration_days: 7,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error getting demo limits');
        return reply.status(500).send({
          success: false,
          error: 'Failed to get demo limits',
        });
      }
    }
  );

  /**
   * Check if feature is available in demo
   * GET /demo/feature/:feature
   */
  server.get(
    '/feature/:feature',
    async (request: FastifyRequest<{ Params: { feature: string } }>, reply: FastifyReply) => {
      try {
        const { feature } = request.params;

        const result = await server.pg.query(
          `SELECT * FROM demo_limits WHERE feature = $1`,
          [feature]
        );

        if (result.rows.length === 0) {
          return reply.send({
            success: true,
            data: {
              feature,
              available: false,
              reason: 'Feature not available in demo mode',
            },
          });
        }

        const limit = result.rows[0];

        return reply.send({
          success: true,
          data: {
            feature,
            available: limit.max_count > 0,
            max_count: limit.max_count,
            description: limit.description,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error checking feature availability');
        return reply.status(500).send({
          success: false,
          error: 'Failed to check feature availability',
        });
      }
    }
  );

  // =====================================================
  // COPILOT CREDIT SYSTEM
  // =====================================================

  /**
   * Create new demo session (for copilot credits)
   * POST /demo/session
   *
   * Creates a new demo session with 5 copilot credits.
   * Similar to /init but focused on copilot usage.
   */
  server.post(
    '/session',
    {
      schema: {
        tags: ['Demo', 'Copilot'],
        summary: 'Create or restore demo copilot session',
        description: 'Creates a new demo session with 5 copilot credits or restores an existing one. Sessions expire after 7 days.',
        headers: {
          type: 'object',
          properties: {
            'X-Demo-Session': {
              type: 'string',
              description: 'Existing session ID to restore (optional)'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              sessionId: { type: 'string', description: 'Unique session identifier' },
              session_id: { type: 'string', description: 'Duplicate for compatibility' },
              copilot_credits_remaining: { type: 'number', description: 'Number of AI messages left (0-5)' },
              copilot_credits_used: { type: 'number', description: 'Number of AI messages used' },
              copilot_last_used_at: { type: 'string', format: 'date-time', nullable: true },
              copilot_blocked_until: { type: 'string', format: 'date-time', nullable: true },
              expires_at: { type: 'string', format: 'date-time', description: 'When session expires (7 days from creation)' },
              expiresIn: { type: 'string', description: 'Human-readable expiration (e.g., "7 days")' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const existingSessionId = request.headers['x-demo-session'] as string | undefined;
        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'] || null;

        // Try to restore existing session
        if (existingSessionId) {
          const result = await server.pg.query(
            `SELECT session_id, copilot_credits_remaining, copilot_credits_used,
                    copilot_last_used_at, copilot_blocked_until, expires_at
             FROM demo_sessions
             WHERE session_id = $1 AND expires_at > NOW()`,
            [existingSessionId]
          );

          if (result.rows.length > 0) {
            const session = result.rows[0];
            return reply.send({
              success: true,
              sessionId: session.session_id,
              session_id: session.session_id,
              copilot_credits_remaining: session.copilot_credits_remaining || 5,
              copilot_credits_used: session.copilot_credits_used || 0,
              copilot_last_used_at: session.copilot_last_used_at,
              copilot_blocked_until: session.copilot_blocked_until,
              expires_at: session.expires_at,
            });
          }
        }

        // Create new session
        const sessionId = randomUUID().substring(0, 16);
        const result = await server.pg.query(
          `INSERT INTO demo_sessions (
            session_id, copilot_credits_remaining, copilot_credits_used,
            credits_remaining, credits_used,
            ip_address, user_agent, created_at, last_activity, expires_at
          ) VALUES ($1, 5, 0, 5, 0, $2, $3, NOW(), NOW(), NOW() + INTERVAL '7 days')
          RETURNING session_id, copilot_credits_remaining, copilot_credits_used, expires_at`,
          [sessionId, ipAddress, userAgent]
        );

        return reply.send({
          success: true,
          sessionId: result.rows[0].session_id,
          session_id: result.rows[0].session_id,
          copilot_credits_remaining: result.rows[0].copilot_credits_remaining,
          copilot_credits_used: result.rows[0].copilot_credits_used,
          expires_at: result.rows[0].expires_at,
          expiresIn: '7 days'
        });
      } catch (error) {
        request.log.error(error, 'Error creating demo session');
        return reply.status(500).send({
          success: false,
          error: 'Failed to create demo session',
        });
      }
    }
  );

  /**
   * Get demo session status (for copilot credits)
   * GET /demo/session/:sessionId
   *
   * Returns current copilot credit status for a session.
   */
  server.get(
    '/session/:sessionId',
    {
      schema: {
        tags: ['Demo', 'Copilot'],
        summary: 'Get demo session status',
        description: 'Returns current copilot credit status and session details.',
        params: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: {
              type: 'string',
              description: 'Demo session identifier'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              sessionId: { type: 'string' },
              session_id: { type: 'string' },
              copilot_credits_remaining: { type: 'number', description: 'Credits left (0-5)' },
              copilot_credits_used: { type: 'number', description: 'Credits used (0-5)' },
              copilot_last_used_at: { type: 'string', format: 'date-time', nullable: true },
              copilot_blocked_until: { type: 'string', format: 'date-time', nullable: true, description: 'When 24h block expires (null if not blocked)' },
              expires_at: { type: 'string', format: 'date-time', description: 'When session expires' }
            }
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      try {
        const { sessionId } = request.params;

        const result = await server.pg.query(
          `SELECT session_id, copilot_credits_remaining, copilot_credits_used,
                  copilot_last_used_at, copilot_blocked_until, expires_at
           FROM demo_sessions
           WHERE session_id = $1 AND expires_at > NOW()`,
          [sessionId]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Session not found or expired',
          });
        }

        const session = result.rows[0];
        return reply.send({
          success: true,
          sessionId: session.session_id,
          session_id: session.session_id,
          copilot_credits_remaining: session.copilot_credits_remaining || 5,
          copilot_credits_used: session.copilot_credits_used || 0,
          copilot_last_used_at: session.copilot_last_used_at,
          copilot_blocked_until: session.copilot_blocked_until,
          expires_at: session.expires_at,
        });
      } catch (error) {
        request.log.error(error, 'Error fetching demo session');
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch demo session',
        });
      }
    }
  );

  /**
   * Deduct copilot credit
   * POST /demo/deduct-credit
   *
   * Deducts a credit from the session's copilot allowance.
   * Returns 429 if credits are depleted or session is blocked.
   */
  server.post(
    '/deduct-credit',
    {
      schema: {
        tags: ['Demo', 'Copilot'],
        summary: 'Deduct copilot credit from demo session',
        description: 'Deducts one credit from the session. Returns 429 when credits are depleted or session is blocked for 24 hours.',
        body: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: {
              type: 'string',
              description: 'Demo session identifier'
            },
            feature: {
              type: 'string',
              description: 'Feature using the credit (e.g., "copilot_messages")',
              default: 'copilot_messages'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              creditsRemaining: { type: 'number', description: 'Credits left after deduction (0-4)' },
              creditsUsed: { type: 'number', description: 'Total credits used (1-5)' }
            }
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          },
          429: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string', description: '"No credits remaining" or "Rate limited"' },
              blockedUntil: { type: 'string', format: 'date-time', description: 'When user can try again' },
              message: { type: 'string', description: 'User-friendly message explaining the limit' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: { sessionId: string; feature: string } }>, reply: FastifyReply) => {
      try {
        const { sessionId, feature } = request.body;

        if (!sessionId) {
          return reply.status(400).send({
            success: false,
            error: 'Missing sessionId',
          });
        }

        // Get current session
        const session = await server.pg.query(
          `SELECT copilot_credits_remaining, copilot_blocked_until, expires_at
           FROM demo_sessions
           WHERE session_id = $1 AND expires_at > NOW()`,
          [sessionId]
        );

        if (session.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Session not found or expired',
          });
        }

        const { copilot_credits_remaining, copilot_blocked_until } = session.rows[0];

        // Check if blocked
        if (copilot_blocked_until && new Date(copilot_blocked_until) > new Date()) {
          return reply.status(429).send({
            success: false,
            error: 'Rate limited',
            blockedUntil: copilot_blocked_until,
            message: 'Demo credits depleted. Please upgrade for unlimited access.'
          });
        }

        // Check credits
        if (copilot_credits_remaining <= 0) {
          // Block for 24 hours
          await server.pg.query(
            `UPDATE demo_sessions
             SET copilot_blocked_until = NOW() + INTERVAL '24 hours'
             WHERE session_id = $1`,
            [sessionId]
          );

          const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          return reply.status(429).send({
            success: false,
            error: 'No credits remaining',
            blockedUntil: blockedUntil,
            message: 'All 5 demo messages used. Upgrade to continue.'
          });
        }

        // Deduct credit
        const result = await server.pg.query(
          `UPDATE demo_sessions
           SET copilot_credits_remaining = copilot_credits_remaining - 1,
               copilot_credits_used = copilot_credits_used + 1,
               copilot_last_used_at = NOW(),
               last_activity = NOW()
           WHERE session_id = $1
           RETURNING copilot_credits_remaining, copilot_credits_used`,
          [sessionId]
        );

        // Log usage
        await server.pg.query(
          `INSERT INTO copilot_usage_log (
            demo_session_id, message_type, credits_deducted, scope, success, created_at
          ) VALUES ($1, 'chat', 1, 'global', true, NOW())`,
          [sessionId]
        );

        // Queue low credits email for authenticated users when 1 credit remaining
        if (result.rows[0].copilot_credits_remaining === 1) {
          try {
            // Check if user has an authenticated account with email
            const userCheck = await server.pg.query(
              `SELECT u.id, u.email, u.display_name
               FROM app_users u
               WHERE u.id IN (
                 SELECT user_id FROM demo_sessions WHERE session_id = $1
               )
               AND u.email IS NOT NULL
               AND u.status = 'active'
               AND (u.email_preferences->>'demo_credits')::boolean IS DISTINCT FROM false`,
              [sessionId]
            );

            if (userCheck.rows.length > 0) {
              const user = userCheck.rows[0];

              // Check if we already sent/queued email for this session
              const emailSentCheck = await server.pg.query(
                `SELECT id FROM email_queue
                 WHERE template_id IN (SELECT id FROM email_templates WHERE slug = 'demo-credit-low')
                   AND to_email = $1
                   AND reference_type = 'demo_session'
                   AND reference_id = $2
                   AND created_at > NOW() - INTERVAL '7 days'`,
                [user.email, sessionId]
              );

              if (emailSentCheck.rows.length === 0) {
                // Queue email with automatic 1-hour delay
                await sendDemoCreditLowEmail(
                  server,
                  user.id,
                  user.email,
                  user.display_name,
                  sessionId
                );

                request.log.info({
                  userId: user.id,
                  sessionId,
                  creditsRemaining: 1
                }, 'Demo credit low email queued (1-hour delay)');
              } else {
                request.log.info({
                  userId: user.id,
                  sessionId
                }, 'Demo credit low email already sent/queued, skipping');
              }
            }
          } catch (emailError) {
            // Log error but don't fail the request
            request.log.error(emailError, 'Failed to queue demo credit low email');
          }
        }

        return reply.send({
          success: true,
          creditsRemaining: result.rows[0].copilot_credits_remaining,
          creditsUsed: result.rows[0].copilot_credits_used
        });
      } catch (error) {
        request.log.error(error, 'Error deducting credit');
        return reply.status(500).send({
          success: false,
          error: 'Failed to deduct credit',
        });
      }
    }
  );
}

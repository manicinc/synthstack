/**
 * @file routes/credits.ts
 * @description Enhanced user credits management routes with transactions and usage tracking
 * @module @synthstack/api-gateway/routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TIER_CONFIG, SubscriptionTier } from '../services/stripe.js';
import { config } from '../config/index.js';
// COMMUNITY: Workflow credit functions and NodeRed service removed - not available in Community Edition

interface DeductBody {
  user_id: string;
  amount: number;
  reason: string;
  reference_type?: string;
  reference_id?: string;
}

interface AdjustBody {
  amount: number;
  reason: string;
  notes?: string;
}

export default async function creditsRoutes(fastify: FastifyInstance) {

  /**
   * GET /api/v1/credits
   * Get user's current credits and limits
   */
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Credits'],
      summary: 'Get credits balance',
      description: 'Returns current credit balance, limits, and reset time',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;

      const result = await fastify.pg.query(`
        SELECT credits_remaining, lifetime_credits_used, credits_reset_at, subscription_tier
        FROM app_users WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const user = result.rows[0];
      const tier = user.subscription_tier as SubscriptionTier || 'free';
      const tierConfig = TIER_CONFIG[tier];
      const dailyLimit = tierConfig.creditsPerDay;

      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const usageResult = await fastify.pg.query(`
        SELECT COALESCE(SUM(ABS(amount)), 0) as used_today
        FROM credit_transactions
        WHERE user_id = $1 AND amount < 0 AND created_at >= $2
      `, [userId, todayStart.toISOString()]);

      const usedToday = parseInt(usageResult.rows[0]?.used_today || '0');

      return {
        success: true,
        data: {
          remaining: user.credits_remaining,
          usedToday,
          dailyLimit: dailyLimit === Infinity ? -1 : dailyLimit,
          lifetimeUsed: user.lifetime_credits_used,
          tier,
          resetsAt: user.credits_reset_at || getNextResetTime(),
          unlimited: dailyLimit === Infinity,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch credits' });
    }
  });

  /**
   * GET /api/v1/credits/history
   * Get credit usage history with filtering
   */
  fastify.get<{ Querystring: { limit?: number; offset?: number; type?: string } }>('/history', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Credits'],
      summary: 'Get credit history',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const { limit = 50, offset = 0, type } = request.query;

      let query = `SELECT id, type, amount, balance_before, balance_after, reference_type, reference_id, reason, created_at
        FROM credit_transactions WHERE user_id = $1`;
      const params: any[] = [userId];

      if (type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(type);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await fastify.pg.query(query, params);

      let countQuery = 'SELECT COUNT(*) FROM credit_transactions WHERE user_id = $1';
      const countParams: any[] = [userId];
      if (type) {
        countQuery += ' AND type = $2';
        countParams.push(type);
      }
      const countResult = await fastify.pg.query(countQuery, countParams);

      return {
        success: true,
        data: {
          transactions: result.rows,
          pagination: {
            total: parseInt(countResult.rows[0].count),
            limit,
            offset,
            hasMore: offset + result.rows.length < parseInt(countResult.rows[0].count),
          },
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch history' });
    }
  });

  /**
   * GET /api/v1/credits/usage
   * Get credit usage statistics
   */
  fastify.get<{ Querystring: { days?: number } }>('/usage', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Credits'],
      summary: 'Get usage statistics',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const { days = 30 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const dailyResult = await fastify.pg.query(`
        SELECT DATE(created_at) as date,
          SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as credits_used,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as credits_added,
          COUNT(*) FILTER (WHERE type = 'generation') as generation_count
        FROM credit_transactions
        WHERE user_id = $1 AND created_at >= $2
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, [userId, startDate.toISOString()]);

      const typeResult = await fastify.pg.query(`
        SELECT type, SUM(ABS(amount)) as total, COUNT(*) as count
        FROM credit_transactions
        WHERE user_id = $1 AND created_at >= $2 AND amount < 0
        GROUP BY type ORDER BY total DESC
      `, [userId, startDate.toISOString()]);

      const summaryResult = await fastify.pg.query(`
        SELECT SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_used,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_added,
          COUNT(*) FILTER (WHERE type = 'generation') as total_generations
        FROM credit_transactions
        WHERE user_id = $1 AND created_at >= $2
      `, [userId, startDate.toISOString()]);

      return {
        success: true,
        data: {
          period: { days, startDate: startDate.toISOString() },
          summary: {
            totalUsed: parseInt(summaryResult.rows[0]?.total_used || '0'),
            totalAdded: parseInt(summaryResult.rows[0]?.total_added || '0'),
            totalGenerations: parseInt(summaryResult.rows[0]?.total_generations || '0'),
          },
          daily: dailyResult.rows.map(row => ({
            date: row.date,
            credits_used: parseInt(row.credits_used || '0'),
            credits_added: parseInt(row.credits_added || '0'),
            generation_count: parseInt(row.generation_count || '0'),
          })),
          byType: typeResult.rows.map(row => ({
            type: row.type,
            total: parseInt(row.total || '0'),
            count: parseInt(row.count || '0'),
          })),
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch usage' });
    }
  });

  /**
   * POST /api/v1/credits/deduct - Internal: Deduct credits
   */
  fastify.post<{ Body: DeductBody }>('/deduct', {
    schema: { tags: ['Credits'], summary: 'Deduct credits (internal)' },
  }, async (request, reply) => {
    try {
      const { user_id, amount, reason, reference_type, reference_id } = request.body;

      const userResult = await fastify.pg.query(
        'SELECT credits_remaining, subscription_tier, lifetime_credits_used FROM app_users WHERE id = $1',
        [user_id]
      );

      if (userResult.rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const user = userResult.rows[0];
      const tier = user.subscription_tier as SubscriptionTier;
      const tierConfig = TIER_CONFIG[tier];

      // Agency tier (500/day) has high limit - always succeeds for backward compatibility
      if (tierConfig.creditsPerDay === Infinity || tierConfig.creditsPerDay >= 500) {
        await fastify.pg.query(`
          INSERT INTO credit_transactions (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, reason)
          VALUES ($1, 'generation', $2, $3, $3, $4, $5, $6)
        `, [user_id, -amount, user.credits_remaining, reference_type, reference_id, reason]);

        await fastify.pg.query(
          'UPDATE app_users SET lifetime_credits_used = lifetime_credits_used + $1 WHERE id = $2',
          [amount, user_id]
        );

        return { success: true, data: { remaining: user.credits_remaining, deducted: amount, unlimited: tierConfig.creditsPerDay === Infinity } };
      }

      if (user.credits_remaining < amount) {
        return reply.status(402).send({
          success: false,
          error: { code: 'INSUFFICIENT_CREDITS', message: 'Not enough credits', remaining: user.credits_remaining, required: amount },
        });
      }

      const newBalance = user.credits_remaining - amount;

      await fastify.pg.query(`
        UPDATE app_users SET credits_remaining = $1, lifetime_credits_used = lifetime_credits_used + $2, updated_at = NOW()
        WHERE id = $3
      `, [newBalance, amount, user_id]);

      await fastify.pg.query(`
        INSERT INTO credit_transactions (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, reason)
        VALUES ($1, 'generation', $2, $3, $4, $5, $6, $7)
      `, [user_id, -amount, user.credits_remaining, newBalance, reference_type, reference_id, reason]);

      return { success: true, data: { remaining: newBalance, deducted: amount } };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to deduct credits' });
    }
  });

  /**
   * POST /api/v1/credits/add - Internal: Add credits
   */
  fastify.post<{ Body: { user_id: string; amount: number; type: string; reason: string; reference_id?: string } }>('/add', {
    schema: { tags: ['Credits'], summary: 'Add credits (internal)' },
  }, async (request, reply) => {
    try {
      const { user_id, amount, type, reason, reference_id } = request.body;

      const userResult = await fastify.pg.query('SELECT credits_remaining FROM app_users WHERE id = $1', [user_id]);
      if (userResult.rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const currentBalance = userResult.rows[0].credits_remaining;
      const newBalance = currentBalance + amount;

      await fastify.pg.query(`
        UPDATE app_users SET credits_remaining = $1, credits_reset_at = CASE WHEN $2 = 'daily_reset' THEN NOW() ELSE credits_reset_at END, updated_at = NOW()
        WHERE id = $3
      `, [newBalance, type, user_id]);

      await fastify.pg.query(`
        INSERT INTO credit_transactions (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [user_id, type, amount, currentBalance, newBalance, type, reference_id, reason]);

      return { success: true, data: { previousBalance: currentBalance, added: amount, newBalance } };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to add credits' });
    }
  });

  /**
   * POST /api/v1/credits/:userId/adjust - Admin: Adjust credits
   */
  fastify.post<{ Params: { userId: string }; Body: AdjustBody }>('/:userId/adjust', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Credits', 'Admin'], summary: 'Adjust user credits (admin)', security: [{ bearerAuth: [] }] },
  }, async (request: any, reply) => {
    try {
      const { userId } = request.params;
      const { amount, reason, notes } = request.body;
      const adminId = request.user.id;

      const userResult = await fastify.pg.query('SELECT credits_remaining, email FROM app_users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const currentBalance = userResult.rows[0].credits_remaining;
      const newBalance = currentBalance + amount;

      if (newBalance < 0) {
        return reply.status(400).send({ success: false, error: 'Adjustment would result in negative balance' });
      }

      await fastify.pg.query('UPDATE app_users SET credits_remaining = $1, updated_at = NOW() WHERE id = $2', [newBalance, userId]);

      await fastify.pg.query(`
        INSERT INTO credit_transactions (user_id, type, amount, balance_before, balance_after, reason, metadata)
        VALUES ($1, 'admin_adjustment', $2, $3, $4, $5, $6)
      `, [userId, amount, currentBalance, newBalance, reason, JSON.stringify({ admin_id: adminId, notes })]);

      await fastify.pg.query(`
        INSERT INTO credit_adjustments (user_id, adjustment, reason, notes, adjusted_by, balance_before, balance_after)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, amount, reason, notes, adminId, currentBalance, newBalance]);

      return { success: true, data: { userId, adjustment: amount, previousBalance: currentBalance, newBalance, reason } };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to adjust credits' });
    }
  });

  /**
   * GET /api/v1/credits/check - Check credits availability
   */
  fastify.get<{ Querystring: { amount: number } }>('/check', {
    preHandler: [fastify.authenticate],
    schema: { tags: ['Credits'], summary: 'Check credit availability', security: [{ bearerAuth: [] }] },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const { amount } = request.query;

      const result = await fastify.pg.query('SELECT credits_remaining, subscription_tier FROM app_users WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const user = result.rows[0];
      const tier = user.subscription_tier as SubscriptionTier;
      const tierConfig = TIER_CONFIG[tier];

      if (tierConfig.creditsPerDay === Infinity) {
        return { success: true, data: { available: true, remaining: user.credits_remaining, required: amount, unlimited: true } };
      }

      const available = user.credits_remaining >= amount;
      return { success: true, data: { available, remaining: user.credits_remaining, required: amount, deficit: available ? 0 : amount - user.credits_remaining } };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to check credits' });
    }
  });

  // ============================================
  // WORKFLOW CREDIT ENDPOINTS - COMMUNITY: Removed (not available in Community Edition)
  // ============================================

  /**
   * GET /api/v1/credits/unified - Get unified credit summary (AI + ML only in Community Edition)
   */
  fastify.get('/unified', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Credits'],
      summary: 'Get unified credit summary',
      description: 'Returns combined credit usage for AI generations and ML service requests',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;

      // Get user info
      const userResult = await fastify.pg.query(
        'SELECT credits_remaining, lifetime_credits_used, subscription_tier, credits_reset_at FROM app_users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const user = userResult.rows[0];
      const tier = user.subscription_tier as SubscriptionTier || 'free';
      const tierConfig = TIER_CONFIG[tier];

      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      // Get AI generation usage today (excluding ML service requests)
      const aiUsageResult = await fastify.pg.query(
        `SELECT COALESCE(SUM(ABS(amount)), 0) as used
         FROM credit_transactions
         WHERE user_id = $1 AND amount < 0
         AND reference_type != 'ml_service_request'
         AND created_at >= $2`,
        [userId, todayStart.toISOString()]
      );
      const aiCreditsUsedToday = parseInt(aiUsageResult.rows[0]?.used || '0', 10);

      // Get ML service usage today
      const mlUsageResult = await fastify.pg.query(
        `SELECT COALESCE(SUM(ABS(amount)), 0) as used, COUNT(*) as count
         FROM credit_transactions
         WHERE user_id = $1 AND amount < 0 AND reference_type = 'ml_service_request' AND created_at >= $2`,
        [userId, todayStart.toISOString()]
      );
      const mlCreditsUsedToday = parseInt(mlUsageResult.rows[0]?.used || '0', 10);
      const mlRequestsToday = parseInt(mlUsageResult.rows[0]?.count || '0', 10);

      return {
        success: true,
        data: {
          // Overall
          creditsRemaining: user.credits_remaining,
          lifetimeCreditsUsed: user.lifetime_credits_used,
          tier,
          resetsAt: user.credits_reset_at || getNextResetTime(),

          // AI generations
          ai: {
            creditsUsedToday: aiCreditsUsedToday,
            dailyLimit: tierConfig.creditsPerDay === Infinity ? -1 : tierConfig.creditsPerDay,
            unlimited: tierConfig.creditsPerDay === Infinity,
          },

          // ML Service Requests (embeddings, RAG, analysis, transcription, etc.)
          mlService: {
            creditsUsedToday: mlCreditsUsedToday,
            requestsToday: mlRequestsToday,
            enabled: true, // ML services are always enabled
          },

          // COMMUNITY: Workflows not available
          workflows: {
            enabled: false,
            creditsUsedToday: 0,
            executionsToday: 0,
            freeExecutionsPerDay: 0,
            freeExecutionsRemaining: 0,
            creditMultiplier: 0,
          },

          // Combined
          totalCreditsUsedToday: aiCreditsUsedToday + mlCreditsUsedToday,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to get unified credits' });
    }
  });
}

function getNextResetTime(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString();
}

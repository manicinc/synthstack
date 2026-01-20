import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { TIER_CONFIG, type SubscriptionTier } from '../services/stripe.js';

interface UserCheckQuerystring {
  email: string;
}

interface UpdateMeBody {
  name?: string;
  username?: string;
  avatarUrl?: string;
  // Accept snake_case too (some callers may send raw DB keys)
  avatar_url?: string;
  display_name?: string;
}

function mapTierToPlan(tier: unknown): 'free' | 'maker' | 'pro' {
  if (tier === 'maker') return 'maker';
  if (tier === 'pro') return 'pro';
  if (tier === 'agency' || tier === 'unlimited') return 'pro';
  return 'free';
}

export default async function usersRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/users/check?email=...
   * Check if a user exists by email (used for project member invites)
   */
  fastify.get(
    '/check',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Check if user exists by email',
        querystring: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              exists: { type: 'boolean' },
              userId: { type: 'string', nullable: true },
              name: { type: 'string', nullable: true },
            },
            required: ['exists'],
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: UserCheckQuerystring }>,
      reply: FastifyReply
    ) => {
      const email = (request.query.email || '').trim().toLowerCase();

      if (!email || !email.includes('@')) {
        return reply.status(400).send({ exists: false, userId: null, name: null });
      }

      const result = await fastify.pg.query<{ id: string; display_name: string | null }>(
        `SELECT id, display_name FROM app_users WHERE email = $1 LIMIT 1`,
        [email]
      );

      const row = result.rows[0];
      if (!row) {
        return { exists: false, userId: null, name: null };
      }

      return { exists: true, userId: row.id, name: row.display_name };
    }
  );

  /**
   * GET /api/v1/users/me
   * Get the current authenticated user's profile in the shape expected by the web app.
   */
  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: any, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

      const result = await fastify.pg.query<{
        id: string;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
        subscription_tier: string | null;
        credits_remaining: number | null;
        created_at: string;
        is_admin: boolean | null;
        email_verified: boolean | null;
      }>(
        `
        SELECT id, email, display_name, avatar_url, subscription_tier, credits_remaining, created_at, is_admin, email_verified
        FROM app_users
        WHERE id = $1
        LIMIT 1
      `,
        [userId]
      );

      const row = result.rows[0];
      if (!row) return reply.status(404).send({ success: false, error: 'User not found' });

      const username = row.display_name || row.email.split('@')[0];
      const plan = mapTierToPlan(row.subscription_tier);

      return reply.send({
        success: true,
        data: {
          id: row.id,
          email: row.email,
          username,
          name: row.display_name || undefined,
          avatarUrl: row.avatar_url || undefined,
          plan,
          subscription_tier: row.subscription_tier || undefined,
          credits: row.credits_remaining ?? 0,
          createdAt: row.created_at,
          emailVerified: row.email_verified === true,
          isAdmin: request.user?.is_admin === true || row.is_admin === true,
        },
      });
    }
  );

  /**
   * PATCH /api/v1/users/me
   * Update basic profile fields (display name, avatar).
   */
  fastify.patch(
    '/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Update current user',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            username: { type: 'string' },
            avatarUrl: { type: 'string' },
            avatar_url: { type: 'string' },
            display_name: { type: 'string' },
          },
        },
      },
    },
    async (request: any, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

      const body = (request.body || {}) as UpdateMeBody;
      const displayName = (body.display_name ?? body.name ?? body.username)?.trim();
      const avatarUrl = (body.avatar_url ?? body.avatarUrl)?.trim();

      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        params.push(displayName.length ? displayName : null);
      }
      if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        params.push(avatarUrl.length ? avatarUrl : null);
      }

      if (updates.length === 0) {
        const injected = await fastify.inject({
          method: 'GET',
          url: '/api/v1/users/me',
          headers: {
            authorization: request.headers?.authorization as string,
          },
        });
        return reply.status(injected.statusCode).send(injected.json());
      }

      params.push(userId);
      await fastify.pg.query(
        `UPDATE app_users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        params
      );

      const injected = await fastify.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: {
          authorization: request.headers?.authorization as string,
        },
      });
      return reply.status(injected.statusCode).send(injected.json());
    }
  );

  /**
   * GET /api/v1/users/me/stats
   * Lightweight user stats for UI widgets.
   */
  fastify.get(
    '/me/stats',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Get current user stats',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: any, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);

      const usage = await fastify.pg.query<{ count: string }>(
        `
        SELECT COUNT(*)::text as count
        FROM credit_transactions
        WHERE user_id = $1
          AND created_at >= $2
          AND (
            type = 'generation'
            OR (
              (type IS NULL OR type = '')
              AND amount < 0
              AND reference_type IN ('text_generation', 'image_generation', 'chat_completion', 'ml_service_request')
            )
          )
      `,
        [userId, monthStart.toISOString()]
      );

      const tier: SubscriptionTier = (request.user?.subscription_tier || 'free') as SubscriptionTier;
      const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.free;

      return reply.send({
        success: true,
        data: {
          generationsThisMonth: parseInt(usage.rows[0]?.count || '0', 10),
          generationsLimit: tierConfig.creditsPerDay,
          profilesCreated: 0,
          profilesDownloaded: 0,
        },
      });
    }
  );

  /**
   * GET /api/v1/users/me/history
   * Generation history (not yet implemented in Community UI; return empty list for now).
   */
  fastify.get(
    '/me/history',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Get generation history',
        security: [{ bearerAuth: [] }],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ success: true, data: [] });
    }
  );
}

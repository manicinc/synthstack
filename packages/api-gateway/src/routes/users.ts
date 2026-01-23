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

  // ==========================================
  // AI Settings Endpoints
  // ==========================================

  /**
   * GET /api/v1/users/me/ai-settings
   * Get user's AI model preferences and settings.
   */
  fastify.get(
    '/me/ai-settings',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Get AI settings',
        description: 'Get user AI model preferences and settings',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  globalModel: { type: 'string', nullable: true },
                  globalModelTier: { type: 'string' },
                  agentModelOverrides: { type: 'object' },
                  defaultTemperature: { type: 'number' },
                  maxContextTokens: { type: 'number' },
                  includeProjectContext: { type: 'boolean' },
                  streamResponses: { type: 'boolean' },
                  showReasoning: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request: any, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

      const result = await fastify.pg.query<{
        global_model: string | null;
        global_model_tier: string;
        agent_model_overrides: Record<string, string>;
        default_temperature: number;
        max_context_tokens: number;
        include_project_context: boolean;
        stream_responses: boolean;
        show_reasoning: boolean;
      }>(
        `SELECT global_model, global_model_tier, agent_model_overrides,
                default_temperature, max_context_tokens, include_project_context,
                stream_responses, show_reasoning
         FROM user_ai_settings
         WHERE user_id = $1`,
        [userId]
      );

      // Return defaults if no settings exist
      const settings = result.rows[0] || {
        global_model: null,
        global_model_tier: 'standard',
        agent_model_overrides: {},
        default_temperature: 0.7,
        max_context_tokens: 8000,
        include_project_context: true,
        stream_responses: true,
        show_reasoning: false,
      };

      return reply.send({
        success: true,
        data: {
          globalModel: settings.global_model,
          globalModelTier: settings.global_model_tier,
          agentModelOverrides: settings.agent_model_overrides,
          defaultTemperature: Number(settings.default_temperature),
          maxContextTokens: settings.max_context_tokens,
          includeProjectContext: settings.include_project_context,
          streamResponses: settings.stream_responses,
          showReasoning: settings.show_reasoning,
        },
      });
    }
  );

  /**
   * PATCH /api/v1/users/me/ai-settings
   * Update user's AI model preferences and settings.
   */
  fastify.patch(
    '/me/ai-settings',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Update AI settings',
        description: 'Update user AI model preferences and settings',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            globalModel: { type: 'string', nullable: true },
            globalModelTier: { type: 'string', enum: ['cheap', 'standard', 'premium'] },
            agentModelOverrides: {
              type: 'object',
              additionalProperties: { type: 'string' },
            },
            defaultTemperature: { type: 'number', minimum: 0, maximum: 1 },
            maxContextTokens: { type: 'number', minimum: 1000, maximum: 128000 },
            includeProjectContext: { type: 'boolean' },
            streamResponses: { type: 'boolean' },
            showReasoning: { type: 'boolean' },
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
                  globalModel: { type: 'string', nullable: true },
                  globalModelTier: { type: 'string' },
                  agentModelOverrides: { type: 'object' },
                  defaultTemperature: { type: 'number' },
                  maxContextTokens: { type: 'number' },
                  includeProjectContext: { type: 'boolean' },
                  streamResponses: { type: 'boolean' },
                  showReasoning: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request: any, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

      const body = (request.body || {}) as {
        globalModel?: string | null;
        globalModelTier?: string;
        agentModelOverrides?: Record<string, string>;
        defaultTemperature?: number;
        maxContextTokens?: number;
        includeProjectContext?: boolean;
        streamResponses?: boolean;
        showReasoning?: boolean;
      };

      // Validate agentModelOverrides to reduce accidental misuse and avoid storing junk keys
      if (body.agentModelOverrides !== undefined) {
        const overrides = body.agentModelOverrides as unknown;
        if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
          return reply.status(400).send({
            success: false,
            error: 'agentModelOverrides must be an object mapping agentId -> model string',
          });
        }

        const entries = Object.entries(overrides as Record<string, unknown>);
        if (entries.length > 50) {
          return reply.status(400).send({
            success: false,
            error: 'agentModelOverrides has too many entries (max 50)',
          });
        }

        for (const [agentId, model] of entries) {
          if (!/^[a-z0-9_-]{1,64}$/i.test(agentId)) {
            return reply.status(400).send({
              success: false,
              error: `Invalid agentModelOverrides key: "${agentId}"`,
            });
          }
          if (model !== null && model !== undefined && typeof model !== 'string') {
            return reply.status(400).send({
              success: false,
              error: `Invalid model override for "${agentId}" (must be string)`,
            });
          }
          if (typeof model === 'string' && model.length > 128) {
            return reply.status(400).send({
              success: false,
              error: `Model override for "${agentId}" is too long (max 128 chars)`,
            });
          }
        }

        // Optional: validate against known agent slugs (best-effort; don't fail if table missing)
        try {
          const slugs = entries.map(([agentId]) => agentId);
          const result = await fastify.pg.query<{ slug: string }>(
            `SELECT slug FROM ai_agents WHERE slug = ANY($1::text[])`,
            [slugs]
          );
          const known = new Set(result.rows.map((r) => r.slug));
          const unknown = slugs.filter((s) => !known.has(s));
          if (unknown.length > 0) {
            return reply.status(400).send({
              success: false,
              error: `Unknown agent ID(s): ${unknown.join(', ')}`,
            });
          }
        } catch {
          // Ignore validation failures (e.g., table missing)
        }
      }

      // Build upsert query dynamically
      const updates: string[] = [];
      const values: unknown[] = [userId];
      let paramIndex = 2;

      const fieldMappings: Record<string, string> = {
        globalModel: 'global_model',
        globalModelTier: 'global_model_tier',
        agentModelOverrides: 'agent_model_overrides',
        defaultTemperature: 'default_temperature',
        maxContextTokens: 'max_context_tokens',
        includeProjectContext: 'include_project_context',
        streamResponses: 'stream_responses',
        showReasoning: 'show_reasoning',
      };

      for (const [camelKey, snakeKey] of Object.entries(fieldMappings)) {
        const value = body[camelKey as keyof typeof body];
        if (value !== undefined) {
          // Special handling for JSON field
          if (camelKey === 'agentModelOverrides') {
            updates.push(`${snakeKey} = $${paramIndex++}::jsonb`);
            values.push(JSON.stringify(value));
          } else {
            updates.push(`${snakeKey} = $${paramIndex++}`);
            values.push(value);
          }
        }
      }

      if (updates.length === 0) {
        // No updates, return current settings
        const settingsResult = await fastify.pg.query<{
          global_model: string | null;
          global_model_tier: string;
          agent_model_overrides: Record<string, string>;
          default_temperature: number;
          max_context_tokens: number;
          include_project_context: boolean;
          stream_responses: boolean;
          show_reasoning: boolean;
        }>(
          `SELECT global_model, global_model_tier, agent_model_overrides,
                  default_temperature, max_context_tokens, include_project_context,
                  stream_responses, show_reasoning
           FROM user_ai_settings WHERE user_id = $1`,
          [userId]
        );

        const row = settingsResult.rows[0];
        return reply.send({
          success: true,
          data: row
            ? {
                globalModel: row.global_model,
                globalModelTier: row.global_model_tier,
                agentModelOverrides: row.agent_model_overrides || {},
                defaultTemperature: row.default_temperature,
                maxContextTokens: row.max_context_tokens,
                includeProjectContext: row.include_project_context,
                streamResponses: row.stream_responses,
                showReasoning: row.show_reasoning,
              }
            : {
                globalModel: null,
                globalModelTier: 'standard',
                agentModelOverrides: {},
                defaultTemperature: 0.7,
                maxContextTokens: 8000,
                includeProjectContext: true,
                streamResponses: true,
                showReasoning: false,
              },
        });
      }

      // Upsert: Insert if not exists, update if exists
      await fastify.pg.query(
        `INSERT INTO user_ai_settings (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      await fastify.pg.query(
        `UPDATE user_ai_settings
         SET ${updates.join(', ')}
         WHERE user_id = $1`,
        values
      );

      // Return updated settings by querying directly
      const settingsResult = await fastify.pg.query<{
        global_model: string | null;
        global_model_tier: string;
        agent_model_overrides: Record<string, string>;
        default_temperature: number;
        max_context_tokens: number;
        include_project_context: boolean;
        stream_responses: boolean;
        show_reasoning: boolean;
      }>(
        `SELECT global_model, global_model_tier, agent_model_overrides,
                default_temperature, max_context_tokens, include_project_context,
                stream_responses, show_reasoning
         FROM user_ai_settings WHERE user_id = $1`,
        [userId]
      );

      const row = settingsResult.rows[0];
      return reply.send({
        success: true,
        data: row
          ? {
              globalModel: row.global_model,
              globalModelTier: row.global_model_tier,
              agentModelOverrides: row.agent_model_overrides || {},
              defaultTemperature: row.default_temperature,
              maxContextTokens: row.max_context_tokens,
              includeProjectContext: row.include_project_context,
              streamResponses: row.stream_responses,
              showReasoning: row.show_reasoning,
            }
          : {
              globalModel: null,
              globalModelTier: 'standard',
              agentModelOverrides: {},
              defaultTemperature: 0.7,
              maxContextTokens: 8000,
              includeProjectContext: true,
              streamResponses: true,
              showReasoning: false,
            },
      });
    }
  );
}

/**
 * @file routes/generation.ts
 * @description AI generation routes for text and image generation
 * Proxies requests to ML service and handles credit deduction
 * @module @synthstack/api-gateway/routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/index.js';

// Credit costs for different operations
const CREDIT_COSTS = {
  text: {
    'gpt-3.5-turbo': 1,
    'gpt-4-turbo': 3,
    'gpt-4': 5,
  },
  image: {
    'standard-1024x1024': 5,
    'standard-1792x1024': 7,
    'standard-1024x1792': 7,
    'hd-1024x1024': 10,
    'hd-1792x1024': 15,
    'hd-1024x1792': 15,
  },
  chat: {
    'gpt-3.5-turbo': 1,
    'gpt-4-turbo': 3,
    'gpt-4': 5,
  },
};

interface TextGenerationBody {
  prompt: string;
  presetId?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: 'gpt-3.5-turbo' | 'gpt-4-turbo' | 'gpt-4';
}

interface ImageGenerationBody {
  prompt: string;
  presetId?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

interface ChatCompletionBody {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export default async function generationRoutes(fastify: FastifyInstance) {
  const mlServiceUrl = config.mlServiceUrl || process.env.ML_SERVICE_URL || 'http://localhost:8001';

  /**
   * Helper to deduct credits from user
   */
  async function deductCredits(userId: string, amount: number, reason: string, referenceType: string, referenceId: string) {
    const client = await fastify.pg.pool.connect();
    try {
      await client.query('BEGIN');

      const balanceResult = await client.query<{ credits_remaining: number | null }>(
        'SELECT credits_remaining FROM app_users WHERE id = $1 FOR UPDATE',
        [userId]
      );

      if (balanceResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const balanceBefore = balanceResult.rows[0].credits_remaining ?? 0;
      const balanceAfter = Math.max(0, balanceBefore - amount);

      await client.query(
        `
        UPDATE app_users
        SET credits_remaining = $1,
            lifetime_credits_used = lifetime_credits_used + $2
        WHERE id = $3
      `,
        [balanceAfter, amount, userId]
      );

      await client.query(
        `
        INSERT INTO credit_transactions (
          user_id,
          type,
          transaction_type,
          amount,
          balance_before,
          balance_after,
          reference_type,
          reference_id,
          reason
        ) VALUES ($1, 'generation', 'deduction', $2, $3, $4, $5, $6, $7)
      `,
        [userId, -amount, balanceBefore, balanceAfter, referenceType, referenceId, reason]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Helper to check if user has enough credits
   */
  async function checkCredits(userId: string, requiredAmount: number): Promise<{ hasCredits: boolean; remaining: number }> {
    const result = await fastify.pg.query(`
      SELECT credits_remaining FROM app_users WHERE id = $1
    `, [userId]);

    const remaining = result.rows[0]?.credits_remaining || 0;
    return {
      hasCredits: remaining >= requiredAmount,
      remaining,
    };
  }

  /**
   * POST /api/v1/generation/text
   * Generate text using AI
   */
  fastify.post<{ Body: TextGenerationBody }>('/text', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Generation'],
      summary: 'Generate text',
      description: 'Generate text using OpenAI GPT models',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1 },
          presetId: { type: 'string' },
          systemPrompt: { type: 'string' },
          maxTokens: { type: 'number', minimum: 100, maximum: 4000 },
          temperature: { type: 'number', minimum: 0, maximum: 2 },
          model: { type: 'string', enum: ['gpt-3.5-turbo', 'gpt-4-turbo', 'gpt-4'] },
        },
      },
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const { prompt, presetId, systemPrompt, maxTokens, temperature, model = 'gpt-3.5-turbo' } = request.body;

      // Check credits
      const creditCost = CREDIT_COSTS.text[model as keyof typeof CREDIT_COSTS.text] || 1;
      const { hasCredits, remaining } = await checkCredits(userId, creditCost);

      if (!hasCredits) {
        return reply.status(402).send({
          success: false,
          error: 'Insufficient credits',
          required: creditCost,
          remaining,
        });
      }

      // Call ML service
      const mlResponse = await fetch(`${mlServiceUrl}/generation/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          system_prompt: systemPrompt,
          max_tokens: maxTokens || 1000,
          temperature: temperature ?? 0.7,
          model,
        }),
      });

      if (!mlResponse.ok) {
        const error = await mlResponse.json();
        return reply.status(mlResponse.status).send({
          success: false,
          error: error.error || 'Text generation failed',
        });
      }

      const result = await mlResponse.json();

      // Save to database
      const saveResult = await fastify.pg.query(`
        INSERT INTO text_generations (user_id, prompt, preset_id, system_prompt, result, model, tokens_used, credits_used, temperature, max_tokens)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at
      `, [userId, prompt, presetId, systemPrompt, result.content, model, result.tokens_used || 0, creditCost, temperature, maxTokens]);

      // Deduct credits
      await deductCredits(userId, creditCost, 'Text generation', 'text_generation', saveResult.rows[0].id);

      return {
        success: true,
        id: saveResult.rows[0].id,
        content: result.content,
        model: result.model || model,
        tokensUsed: result.tokens_used || 0,
        creditsUsed: creditCost,
        createdAt: saveResult.rows[0].created_at,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Text generation failed' });
    }
  });

  /**
   * POST /api/v1/generation/image
   * Generate image using AI
   */
  fastify.post<{ Body: ImageGenerationBody }>('/image', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Generation'],
      summary: 'Generate image',
      description: 'Generate image using OpenAI DALL-E',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1 },
          presetId: { type: 'string' },
          size: { type: 'string', enum: ['1024x1024', '1792x1024', '1024x1792'] },
          quality: { type: 'string', enum: ['standard', 'hd'] },
          style: { type: 'string', enum: ['vivid', 'natural'] },
        },
      },
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const { prompt, presetId, size = '1024x1024', quality = 'standard', style = 'vivid' } = request.body;

      // Calculate credit cost
      const costKey = `${quality}-${size}` as keyof typeof CREDIT_COSTS.image;
      const creditCost = CREDIT_COSTS.image[costKey] || 5;

      const { hasCredits, remaining } = await checkCredits(userId, creditCost);

      if (!hasCredits) {
        return reply.status(402).send({
          success: false,
          error: 'Insufficient credits',
          required: creditCost,
          remaining,
        });
      }

      // Call ML service
      const mlResponse = await fetch(`${mlServiceUrl}/generation/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size, quality, style }),
      });

      if (!mlResponse.ok) {
        const error = await mlResponse.json();
        return reply.status(mlResponse.status).send({
          success: false,
          error: error.error || 'Image generation failed',
        });
      }

      const result = await mlResponse.json();

      // Save to database
      const saveResult = await fastify.pg.query(`
        INSERT INTO image_generations (user_id, prompt, full_prompt, preset_id, image_url, revised_prompt, size, quality, style, credits_used)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at
      `, [userId, prompt, prompt, presetId, result.image_url, result.revised_prompt, size, quality, style, creditCost]);

      // Deduct credits
      await deductCredits(userId, creditCost, 'Image generation', 'image_generation', saveResult.rows[0].id);

      return {
        success: true,
        id: saveResult.rows[0].id,
        imageUrl: result.image_url,
        revisedPrompt: result.revised_prompt,
        size,
        quality,
        creditsUsed: creditCost,
        createdAt: saveResult.rows[0].created_at,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Image generation failed' });
    }
  });

  /**
   * GET /api/v1/generation/presets
   * Get available generation presets
   */
  fastify.get('/presets', {
    schema: {
      tags: ['Generation'],
      summary: 'Get generation presets',
      description: 'Get list of available text and image generation presets',
    },
  }, async (request, reply) => {
    try {
      const result = await fastify.pg.query(`
        SELECT id, type, name, description, icon, category, sort_order
        FROM generation_presets
        WHERE is_active = true
        ORDER BY type, sort_order
      `);

      const presets = {
        text: result.rows.filter(p => p.type === 'text'),
        image: result.rows.filter(p => p.type === 'image'),
      };

      return { success: true, presets };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch presets' });
    }
  });

  /**
   * GET /api/v1/generation/history
   * Get user's generation history
   */
  fastify.get<{ Querystring: { type?: 'text' | 'image'; limit?: number; offset?: number } }>('/history', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Generation'],
      summary: 'Get generation history',
      description: 'Get user\'s text and image generation history',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['text', 'image'] },
          limit: { type: 'number', default: 20 },
          offset: { type: 'number', default: 0 },
        },
      },
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const { type, limit = 20, offset = 0 } = request.query;

      const history: any[] = [];

      if (!type || type === 'text') {
        const textResult = await fastify.pg.query(`
          SELECT id, prompt, preset_id, result as content, model, tokens_used, credits_used, created_at, 'text' as type
          FROM text_generations
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);
        history.push(...textResult.rows);
      }

      if (!type || type === 'image') {
        const imageResult = await fastify.pg.query(`
          SELECT id, prompt, preset_id, image_url, revised_prompt, size, quality, style, credits_used, created_at, 'image' as type
          FROM image_generations
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);
        history.push(...imageResult.rows);
      }

      // Sort combined results by date
      history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { success: true, history: history.slice(0, limit) };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch history' });
    }
  });

  /**
   * GET /api/v1/generation/:id
   * Get a specific generation by ID
   */
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Generation'],
      summary: 'Get generation by ID',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const { id } = request.params;

      // Try text generations first
      let result = await fastify.pg.query(`
        SELECT id, prompt, preset_id, result as content, model, tokens_used, credits_used, created_at, 'text' as type
        FROM text_generations
        WHERE id = $1 AND user_id = $2
      `, [id, userId]);

      if (result.rows.length === 0) {
        // Try image generations
        result = await fastify.pg.query(`
          SELECT id, prompt, preset_id, image_url, revised_prompt, size, quality, style, credits_used, created_at, 'image' as type
          FROM image_generations
          WHERE id = $1 AND user_id = $2
        `, [id, userId]);
      }

      if (result.rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'Generation not found' });
      }

      return { success: true, generation: result.rows[0] };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch generation' });
    }
  });
}

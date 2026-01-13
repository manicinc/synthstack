/**
 * @file routes/chat.ts
 * @description Simple chat completions for the basic copilot (no RAG)
 * This route provides basic chat functionality without RAG or project context
 * @module @synthstack/api-gateway/routes
 */

import type { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';
import { llmRouter, modelRegistry, type ModelTier } from '../services/llm-router/index.js';

// Credit costs per tier (keeps Community flexible as models evolve)
const CHAT_TIER_CREDIT_COSTS: Record<ModelTier, number> = {
  cheap: 1,
  standard: 3,
  premium: 5,
};

// Models supported by the Community ML service fallback (OpenAI-only)
const ML_SERVICE_MODELS = new Set([
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-5.2',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
]);

// Legacy mapping for models not present in the router registry
const LEGACY_MODEL_TIERS: Record<string, ModelTier> = {
  'gpt-3.5-turbo': 'cheap',
  'gpt-4o-mini': 'cheap',
  'gpt-4-turbo': 'standard',
  'gpt-4o': 'standard',
  'gpt-4': 'premium',
  'gpt-5.2': 'premium',
  'o1-mini': 'premium',
  'o1': 'premium',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionBody {
  messages: ChatMessage[];
  model?: string;
  modelTier?: ModelTier;
  maxTokens?: number;
  temperature?: number;
}

export default async function chatRoutes(fastify: FastifyInstance) {
  const mlServiceUrl = config.mlServiceUrl || process.env.ML_SERVICE_URL || 'http://localhost:3050';

  function resolveModelTier(model?: string, modelTier?: ModelTier): ModelTier {
    if (model) {
      const registryModel = modelRegistry.getModel(model);
      if (registryModel) return registryModel.tier;
      if (LEGACY_MODEL_TIERS[model]) return LEGACY_MODEL_TIERS[model];
    }
    if (modelTier) return modelTier;
    return 'cheap';
  }

  function resolveCreditCost(model?: string, modelTier?: ModelTier): number {
    const tier = resolveModelTier(model, modelTier);
    return CHAT_TIER_CREDIT_COSTS[tier] ?? 1;
  }

  function isSupportedModel(model: string): boolean {
    return Boolean(modelRegistry.getModel(model) || LEGACY_MODEL_TIERS[model]);
  }

  function mapToMlServiceModel(model: string | undefined, tier: ModelTier): string {
    if (model && ML_SERVICE_MODELS.has(model)) return model;
    switch (tier) {
      case 'premium':
        return 'gpt-5.2';
      case 'standard':
        return 'gpt-4o';
      default:
        return 'gpt-4o-mini';
    }
  }

  /**
   * Helper to deduct credits from user
   */
  async function deductCredits(userId: string, amount: number, reason: string) {
    await fastify.pg.query(`
      UPDATE app_users
      SET credits_remaining = GREATEST(0, credits_remaining - $1),
          lifetime_credits_used = lifetime_credits_used + $1
      WHERE id = $2
    `, [amount, userId]);

    await fastify.pg.query(`
      INSERT INTO credit_transactions (user_id, amount, reason, reference_type)
      VALUES ($1, $2, $3, $4)
    `, [userId, -amount, reason, 'chat_completion']);
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
   * POST /api/v1/chat/completions
   * Basic chat completions (no RAG, no project context)
   */
  fastify.post<{ Body: ChatCompletionBody }>('/completions', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Chat'],
      summary: 'Chat completions',
      description: 'Generate chat completions using OpenAI GPT models (basic copilot without RAG)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['messages'],
        properties: {
          messages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['role', 'content'],
              properties: {
                role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                content: { type: 'string' },
              },
          },
          minItems: 1,
        },
          model: { type: 'string', default: 'gpt-4o-mini' },
          modelTier: { type: 'string', enum: ['cheap', 'standard', 'premium'], default: 'cheap' },
          maxTokens: { type: 'number', minimum: 100, maximum: 4000, default: 500 },
          temperature: { type: 'number', minimum: 0, maximum: 2, default: 0.7 },
        },
      },
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const { messages, model = 'gpt-4o-mini', modelTier, maxTokens = 500, temperature = 0.7 } = request.body;

      if (model && !isSupportedModel(model)) {
        return reply.status(400).send({
          success: false,
          error: 'Unsupported model',
          model,
        });
      }

      const resolvedTier = resolveModelTier(model, modelTier);
      const mlModel = mapToMlServiceModel(model, resolvedTier);

      // Check credits
      const creditCost = resolveCreditCost(model, modelTier);
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
      const mlResponse = await fetch(`${mlServiceUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: mlModel,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!mlResponse.ok) {
        const error = await mlResponse.json();
        return reply.status(mlResponse.status).send({
          success: false,
          error: error.error || 'Chat completion failed',
        });
      }

      const result = await mlResponse.json();

      // Deduct credits
      await deductCredits(userId, creditCost, 'Chat completion');

      return {
        success: true,
        id: result.id,
        content: result.content,
        choices: result.choices,
        usage: result.usage,
        model: result.model || mlModel,
        creditsUsed: creditCost,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Chat completion failed' });
    }
  });

  /**
   * POST /api/v1/chat/completions/stream
   * Streaming chat completions (SSE)
   *
   * This endpoint is Community-safe (no RAG, no agents). It prefers the built-in
   * LLM router for true streaming, but falls back to ML service + chunked output
   * if no provider keys are configured in the gateway.
   */
  fastify.post<{ Body: ChatCompletionBody }>('/completions/stream', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Chat'],
      summary: 'Chat completions (stream)',
      description: 'Stream chat completions via Server-Sent Events (basic copilot without RAG)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['messages'],
        properties: {
          messages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['role', 'content'],
              properties: {
                role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                content: { type: 'string' },
              },
            },
            minItems: 1,
          },
          model: { type: 'string' },
          modelTier: { type: 'string', enum: ['cheap', 'standard', 'premium'] },
          maxTokens: { type: 'number', minimum: 100, maximum: 4000, default: 800 },
          temperature: { type: 'number', minimum: 0, maximum: 2, default: 0.7 },
        },
      },
    },
  }, async (request: any, reply) => {
    const userId = request.user.id;
    const { messages, model, modelTier, maxTokens = 800, temperature = 0.7 } = request.body;

    if (model && !isSupportedModel(model)) {
      return reply.status(400).send({
        success: false,
        error: 'Unsupported model',
        model,
      });
    }

    const resolvedTier = resolveModelTier(model, modelTier);
    const creditCost = resolveCreditCost(model, modelTier);
    const { hasCredits, remaining } = await checkCredits(userId, creditCost);

    if (!hasCredits) {
      return reply.status(402).send({
        success: false,
        error: 'Insufficient credits',
        required: creditCost,
        remaining,
      });
    }

    // Set headers for SSE
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    // Prefer true streaming via LLM Router, but fall back if unavailable
    try {
      await llmRouter.initialize();
      const canStream = llmRouter.isAvailable();

      if (canStream) {
        let hasSentContent = false;
        let hasCharged = false;

        const chargeOnce = async () => {
          if (hasCharged) return;
          hasCharged = true;
          try {
            await deductCredits(userId, creditCost, 'Chat completion (stream)');
          } catch (chargeError) {
            fastify.log.error(chargeError);
          }
        };

        // If the client disconnects mid-stream, charge if we already delivered content.
        reply.raw.on('close', () => {
          if (!hasCharged && hasSentContent) {
            void chargeOnce();
          }
        });

        const stream = llmRouter.streamChat(
          {
            messages,
            model,
            tier: resolvedTier,
            maxTokens,
            temperature,
            userId,
            requestType: 'chat',
          },
          { taskType: 'conversation' }
        );

        for await (const event of stream) {
          if (event.type === 'content' && event.content) {
            if (!hasSentContent) {
              hasSentContent = true;
              await chargeOnce();
            }
            reply.raw.write(`data: ${JSON.stringify({ chunk: event.content })}\n\n`);
          }

          if (event.type === 'error') {
            reply.raw.write(
              `data: ${JSON.stringify({ error: true, message: event.error || 'Streaming error' })}\n\n`
            );
            reply.raw.end();
            return;
          }

          if (event.type === 'done') {
            reply.raw.write(`data: ${JSON.stringify({ done: true, usage: event.usage, creditsUsed: hasCharged ? creditCost : 0 })}\n\n`);
            reply.raw.end();
            return;
          }
        }

        // In case the adapter ends without a done event, close cleanly.
        reply.raw.write(`data: ${JSON.stringify({ done: true, creditsUsed: hasCharged ? creditCost : 0 })}\n\n`);
        reply.raw.end();
        return;
      }

      // Fallback: ML service non-streaming + chunked output (still SSE on the wire)
      const mlModel = mapToMlServiceModel(model, resolvedTier);
      const mlResponse = await fetch(`${mlServiceUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: mlModel,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!mlResponse.ok) {
        const error = await mlResponse.json().catch(() => ({}));
        reply.raw.write(
          `data: ${JSON.stringify({ error: true, message: error.error || 'Chat completion failed' })}\n\n`
        );
        reply.raw.end();
        return;
      }

      const result = await mlResponse.json();
      const text =
        result?.content ||
        result?.choices?.[0]?.message?.content ||
        '';

      // Charge only after we have a successful response from ML service
      await deductCredits(userId, creditCost, 'Chat completion (stream)');

      const chunkSize = text.length > 1200 ? 80 : 24;
      for (let idx = 0; idx < text.length; idx += chunkSize) {
        reply.raw.write(`data: ${JSON.stringify({ chunk: text.slice(idx, idx + chunkSize) })}\n\n`);
      }

      reply.raw.write(`data: ${JSON.stringify({ done: true, creditsUsed: creditCost })}\n\n`);
      reply.raw.end();
    } catch (error) {
      fastify.log.error(error);
      reply.raw.write(
        `data: ${JSON.stringify({ error: true, message: error instanceof Error ? error.message : 'Chat completion failed' })}\n\n`
      );
      reply.raw.end();
    }
  });
}

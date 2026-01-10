/**
 * ML Credits Middleware
 *
 * Automatically checks credit balance and deducts credits for ML service requests.
 * Integrates with unified credit system and BYOK (Bring Your Own Keys).
 *
 * Flow:
 * 1. Pre-request: Check BYOK routing decision
 * 2. If BYOK: Skip credit check, set byokMode flag
 * 3. If Internal: Check if user has sufficient credits
 * 4. Estimate cost based on endpoint
 * 5. Block request if insufficient (402 Payment Required)
 * 6. Post-request: Calculate actual cost based on duration
 * 7. If BYOK: Log to api_key_usage table (no credit deduction)
 * 8. If Internal: Deduct credits from user balance
 * 9. Log transaction to credit_transactions table
 * 10. Log ML request to ml_service_requests table
 * 11. Update daily usage analytics
 * 12. Add response headers (x-credits-remaining, x-credits-charged)
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import {
  estimateMLRequestCost,
  calculateMLRequestCost,
  canAffordMLRequest,
} from '../services/credits/ml-request-cost.js';
import { byokRouter } from '../services/llm-router/byok-router.js';

// ============================================
// Types
// ============================================

interface MLCreditsContext {
  estimatedCost: number;
  startTime: number;
  endpoint: string;
  method: string;
  payload: any;
  tier: string;
  byokMode?: boolean; // NEW: Flag to indicate BYOK is being used
  byokKeyId?: string; // NEW: BYOK key ID for usage logging
  byokProvider?: string; // NEW: Provider being used for BYOK
}

// Extend FastifyRequest to include ML credits context
declare module 'fastify' {
  interface FastifyRequest {
    mlCreditsContext?: MLCreditsContext;
  }
}

// ============================================
// ML Credits Middleware
// ============================================

/**
 * Pre-request hook: Check credit balance and estimate cost
 */
export async function mlCreditsPreRequestHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip if no user context (public endpoints)
  if (!request.user?.id) {
    return;
  }

  // Skip for non-ML endpoints
  if (!isMLServiceEndpoint(request.url)) {
    return;
  }

  // Skip for unlimited/admin tiers
  const tier = request.user.subscription_tier || 'free';
  if (['unlimited', 'admin', 'enterprise', 'agency'].includes(tier)) {
    // Still track context for logging, but no credit check
    request.mlCreditsContext = {
      estimatedCost: 0,
      startTime: Date.now(),
      endpoint: request.url,
      method: request.method,
      payload: request.body,
      tier,
    };
    return;
  }

  try {
    // ============================================
    // BYOK Integration: Check routing decision
    // ============================================
    const byokContext = await byokRouter.getByokContext(request.user.id);
    const keySourceDecision = byokRouter.determineKeySource(byokContext);

    request.log.info({
      userId: request.user.id,
      keySource: keySourceDecision.source,
      reason: keySourceDecision.reason,
      byokFlags: byokContext.flags,
    }, 'BYOK routing decision for ML request');

    // If using BYOK, skip credit check entirely
    if (keySourceDecision.source === 'byok') {
      request.mlCreditsContext = {
        estimatedCost: 0,
        startTime: Date.now(),
        endpoint: request.url,
        method: request.method,
        payload: request.body,
        tier,
        byokMode: true,
        // Note: byokKeyId and byokProvider will be set by the service that makes the actual API call
      };
      return;
    }

    // If error (no credits + no BYOK), return 402
    if (keySourceDecision.source === 'error') {
      const isByokOnly = byokContext.flags.byokOnlyMode;

      return reply.code(402).send({
        success: false,
        error: isByokOnly ? 'BYOK Required' : 'Insufficient Credits',
        message: keySourceDecision.reason,
        data: {
          byokOnlyMode: isByokOnly,
          hasCredits: byokContext.hasCredits,
          hasByok: byokContext.byokProviders.length > 0,
          byokProviders: byokContext.byokProviders,
          suggestion: isByokOnly
            ? 'Please configure your own API keys in Settings > API Keys'
            : 'Please upgrade your plan, purchase more credits, or configure your own API keys (BYOK)',
        },
      });
    }

    // ============================================
    // Continue with normal credit check for internal keys
    // ============================================
    // Get user's current credit balance
    const balanceResult = await request.server.pg.query(
      'SELECT credits_remaining, subscription_tier FROM app_users WHERE id = $1',
      [request.user.id]
    );

    if (balanceResult.rows.length === 0) {
      request.log.warn({ userId: request.user.id }, 'User not found for ML credits check');
      return;
    }

    const creditsRemaining = balanceResult.rows[0].credits_remaining || 0;
    const userTier = balanceResult.rows[0].subscription_tier || tier;

    // Estimate cost for this endpoint
    const estimate = estimateMLRequestCost(
      request.url,
      userTier,
      request.body,
      creditsRemaining
    );

    request.log.info({
      userId: request.user.id,
      endpoint: request.url,
      estimatedCost: estimate.estimatedCost,
      creditsRemaining,
      canAfford: estimate.canAfford,
    }, 'ML request cost estimated');

    // Check if user can afford this request
    if (!estimate.canAfford) {
      return reply.code(402).send({
        success: false,
        error: 'Insufficient credits',
        message: `This operation requires ${estimate.estimatedCost} credits, but you only have ${creditsRemaining} remaining. Please upgrade your plan or purchase more credits.`,
        data: {
          required: estimate.estimatedCost,
          available: creditsRemaining,
          deficit: estimate.estimatedCost - creditsRemaining,
          breakdown: estimate.breakdown,
          tier: userTier,
        },
      });
    }

    // Attach context for post-request processing
    request.mlCreditsContext = {
      estimatedCost: estimate.estimatedCost,
      startTime: Date.now(),
      endpoint: request.url,
      method: request.method,
      payload: request.body,
      tier: userTier,
    };
  } catch (error: any) {
    request.log.error({ error, userId: request.user.id }, 'Error in ML credits pre-request hook');
    // Don't block request on error, just log it
  }
}

/**
 * Post-request hook: Deduct credits and log transaction
 */
export async function mlCreditsPostRequestHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip if no ML credits context
  if (!request.mlCreditsContext || !request.user?.id) {
    return;
  }

  const context = request.mlCreditsContext;
  const durationMs = Date.now() - context.startTime;

  try {
    // ============================================
    // BYOK Mode: Skip credit deduction, log to api_key_usage instead
    // ============================================
    if (context.byokMode) {
      request.log.info({
        userId: request.user.id,
        endpoint: context.endpoint,
        byokMode: true,
        byokKeyId: context.byokKeyId,
        byokProvider: context.byokProvider,
      }, 'BYOK mode - no credits deducted');

      // Note: Usage logging is handled by byokRouter.chat() or byokRouter.streamChat()
      // which calls logByokUsage() with token counts and costs
      return;
    }

    // ============================================
    // Internal Keys Mode: Normal credit deduction
    // ============================================
    // Calculate actual cost based on duration and response
    const calculation = calculateMLRequestCost(
      context.endpoint,
      context.tier,
      durationMs,
      reply.statusCode,
      context.payload
    );

    // Skip deduction for failed requests or zero cost
    if (calculation.actualCost === 0) {
      request.log.info({
        userId: request.user.id,
        endpoint: context.endpoint,
        statusCode: reply.statusCode,
      }, 'ML request failed or free - no credits charged');
      return;
    }

    // Deduct credits and log transaction (atomic operation)
    const client = await request.server.pg.pool.connect();
    try {
      await client.query('BEGIN');

      // Deduct credits from user balance
      const updateResult = await client.query(`
        UPDATE app_users
        SET credits_remaining = GREATEST(credits_remaining - $1, 0)
        WHERE id = $2
        RETURNING credits_remaining
      `, [calculation.actualCost, request.user.id]);

      if (updateResult.rows.length === 0) {
        throw new Error('Failed to update user credits');
      }

      const newBalance = updateResult.rows[0].credits_remaining;

      // Log credit transaction
      await client.query(`
        INSERT INTO credit_transactions (
          id,
          user_id,
          organization_id,
          amount,
          balance_before,
          balance_after,
          transaction_type,
          reference_type,
          reference_id,
          reason,
          metadata,
          created_at
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          'deduction',
          'ml_service_request',
          $6,
          $7,
          $8,
          NOW()
        )
      `, [
        request.user.id,
        request.user.organization_id || null,
        -calculation.actualCost,
        newBalance + calculation.actualCost, // balance_before
        newBalance, // balance_after
        request.id, // reference_id (Fastify request ID)
        `ML service request: ${context.method} ${context.endpoint}`,
        JSON.stringify({
          endpoint: context.endpoint,
          method: context.method,
          durationMs,
          statusCode: reply.statusCode,
          estimatedCost: context.estimatedCost,
          actualCost: calculation.actualCost,
          breakdown: calculation.breakdown,
          tier: context.tier,
        }),
      ]);

      // Log ML service request
      await client.query(`
        INSERT INTO ml_service_requests (
          id,
          user_id,
          organization_id,
          service_name,
          endpoint,
          method,
          request_payload,
          response_payload,
          status_code,
          duration_ms,
          credits_charged,
          error_message,
          ip_address,
          user_agent,
          request_id,
          created_at
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          NULL,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          NOW()
        )
      `, [
        request.user.id,
        request.user.organization_id || null,
        process.env.ML_SERVICE_BACKEND || 'fastapi',
        context.endpoint,
        context.method,
        JSON.stringify(context.payload),
        reply.statusCode,
        durationMs,
        calculation.actualCost,
        reply.statusCode >= 400 ? 'Request failed' : null,
        request.ip,
        request.headers['user-agent'] || null,
        request.id,
      ]);

      // Update daily usage analytics (upsert)
      const today = new Date().toISOString().split('T')[0];
      const endpointCategory = getEndpointCategory(context.endpoint);

      await client.query(`
        INSERT INTO ml_service_usage (
          id,
          user_id,
          organization_id,
          date,
          service_name,
          endpoint_category,
          total_requests,
          total_credits,
          total_duration_ms,
          avg_duration_ms,
          success_count,
          error_count,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          1,
          $6,
          $7,
          $7,
          $8,
          $9,
          NOW(),
          NOW()
        )
        ON CONFLICT (user_id, organization_id, date, service_name, endpoint_category)
        DO UPDATE SET
          total_requests = ml_service_usage.total_requests + 1,
          total_credits = ml_service_usage.total_credits + $6,
          total_duration_ms = ml_service_usage.total_duration_ms + $7,
          avg_duration_ms = (ml_service_usage.total_duration_ms + $7) / (ml_service_usage.total_requests + 1),
          success_count = ml_service_usage.success_count + $8,
          error_count = ml_service_usage.error_count + $9,
          updated_at = NOW()
      `, [
        request.user.id,
        request.user.organization_id || null,
        today,
        process.env.ML_SERVICE_BACKEND || 'fastapi',
        endpointCategory,
        calculation.actualCost,
        durationMs,
        reply.statusCode < 400 ? 1 : 0,
        reply.statusCode >= 400 ? 1 : 0,
      ]);

      await client.query('COMMIT');

      // Add response headers
      reply.header('x-credits-remaining', newBalance.toString());
      reply.header('x-credits-charged', calculation.actualCost.toString());
      reply.header('x-request-id', request.id);

      request.log.info({
        userId: request.user.id,
        endpoint: context.endpoint,
        creditsCharged: calculation.actualCost,
        creditsRemaining: newBalance,
        durationMs,
      }, 'ML credits deducted successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    request.log.error({
      error,
      userId: request.user.id,
      endpoint: context.endpoint,
    }, 'Error in ML credits post-request hook');
    // Don't fail the response, just log the error
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if endpoint is an ML service endpoint
 */
function isMLServiceEndpoint(url: string): boolean {
  const mlPrefixes = [
    '/api/v1/copilot/',
    '/api/v1/embeddings/',
    '/api/v1/rag/',
    '/api/v1/analysis/',
    '/api/v1/complexity/',
    '/api/v1/transcription/',
    '/api/v1/agents/',
    '/api/v1/langgraph/',
  ];

  return mlPrefixes.some(prefix => url.startsWith(prefix));
}

/**
 * Extract endpoint category from path
 */
function getEndpointCategory(endpoint: string): string {
  if (endpoint.includes('/embeddings')) return 'embeddings';
  if (endpoint.includes('/rag')) return 'rag';
  if (endpoint.includes('/analysis')) return 'analysis';
  if (endpoint.includes('/complexity')) return 'complexity';
  if (endpoint.includes('/transcription')) return 'transcription';
  if (endpoint.includes('/copilot')) return 'copilot';
  if (endpoint.includes('/agents')) return 'agents';
  if (endpoint.includes('/langgraph')) return 'langgraph';
  return 'other';
}

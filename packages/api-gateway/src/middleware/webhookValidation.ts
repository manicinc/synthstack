/**
 * Webhook Validation Middleware
 * 
 * Validates incoming webhook signatures and logs events
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { validateWebhookSignature, extractWebhookMetadata } from '../services/webhooks/signature.js';

export interface WebhookValidationOptions {
  provider?: string;
  secretEnvVar?: string;
  secretFromDb?: boolean;
  logEvents?: boolean;
  requireSignature?: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    webhookMeta?: {
      provider?: string;
      eventType?: string;
      deliveryId?: string;
      signatureValid: boolean;
      validationError?: string;
      organizationId?: string;
    };
  }
}

/**
 * Create webhook validation middleware
 */
export function createWebhookValidationMiddleware(
  fastify: FastifyInstance,
  options: WebhookValidationOptions = {}
) {
  const {
    provider: defaultProvider,
    secretEnvVar,
    secretFromDb = false,
    logEvents = true,
    requireSignature = true
  } = options;

  return async function webhookValidationMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const rawBody = request.rawBody || JSON.stringify(request.body);
    const headers = request.headers as Record<string, string | string[] | undefined>;

    // Extract webhook metadata from headers
    const metadata = extractWebhookMetadata(headers);
    const provider = defaultProvider || metadata.provider;

    // Initialize webhook meta on request
    request.webhookMeta = {
      provider,
      eventType: metadata.eventType,
      deliveryId: metadata.deliveryId,
      signatureValid: false
    };

    // If no signature provided
    if (!metadata.signature) {
      if (requireSignature) {
        request.webhookMeta.validationError = 'Missing webhook signature';
        fastify.log.warn({ provider, path: request.url }, 'Webhook rejected: missing signature');
        return reply.status(401).send({
          success: false,
          error: { code: 'MISSING_SIGNATURE', message: 'Webhook signature is required' }
        });
      }
      // Allow through without signature validation
      request.webhookMeta.signatureValid = true;
      return;
    }

    // Get the signing secret
    let secret: string | undefined;

    if (secretEnvVar) {
      secret = process.env[secretEnvVar];
    } else if (secretFromDb && provider) {
      // Look up secret from database based on organization
      // This requires determining the organization from the request
      const orgId = await extractOrganizationId(request, provider, fastify);
      if (orgId) {
        request.webhookMeta.organizationId = orgId;
        secret = await getWebhookSecret(fastify, orgId, provider);
      }
    } else if (provider) {
      // Default: use environment variable based on provider
      const envKey = `${provider.toUpperCase()}_WEBHOOK_SECRET`;
      secret = process.env[envKey];
    }

    if (!secret) {
      request.webhookMeta.validationError = 'Webhook secret not configured';
      fastify.log.warn({ provider, path: request.url }, 'Webhook rejected: secret not configured');
      return reply.status(500).send({
        success: false,
        error: { code: 'SECRET_NOT_CONFIGURED', message: 'Webhook secret not configured' }
      });
    }

    // Validate the signature
    const validationResult = validateWebhookSignature({
      provider: provider || 'generic',
      payload: rawBody as string,
      signature: metadata.signature,
      secret,
      timestamp: metadata.timestamp
    });

    request.webhookMeta.signatureValid = validationResult.valid;

    if (!validationResult.valid) {
      request.webhookMeta.validationError = validationResult.error;
      fastify.log.warn(
        { provider, error: validationResult.error, path: request.url },
        'Webhook signature validation failed'
      );

      // Log the failed validation attempt
      if (logEvents && request.webhookMeta.organizationId) {
        await logWebhookEvent(fastify, {
          organizationId: request.webhookMeta.organizationId,
          integrationType: provider || 'unknown',
          eventType: metadata.eventType,
          eventId: metadata.deliveryId,
          payload: request.body,
          sourceIp: request.ip,
          headers: sanitizeHeaders(headers),
          signatureValid: false,
          validationError: validationResult.error
        });
      }

      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: validationResult.error || 'Invalid webhook signature' }
      });
    }

    // Log successful webhook receipt
    if (logEvents && request.webhookMeta.organizationId) {
      await logWebhookEvent(fastify, {
        organizationId: request.webhookMeta.organizationId,
        integrationType: provider || 'unknown',
        eventType: metadata.eventType,
        eventId: metadata.deliveryId,
        payload: request.body,
        sourceIp: request.ip,
        headers: sanitizeHeaders(headers),
        signatureValid: true
      });
    }

    fastify.log.info(
      { provider, eventType: metadata.eventType, deliveryId: metadata.deliveryId },
      'Webhook signature validated successfully'
    );
  };
}

/**
 * Extract organization ID from webhook request
 */
async function extractOrganizationId(
  request: FastifyRequest,
  provider: string,
  fastify: FastifyInstance
): Promise<string | undefined> {
  // Try to get org ID from URL path (e.g., /webhooks/:orgId/slack)
  const params = request.params as Record<string, string>;
  if (params.orgId || params.organizationId) {
    return params.orgId || params.organizationId;
  }

  // Try to get from query string
  const query = request.query as Record<string, string>;
  if (query.org || query.organization_id) {
    return query.org || query.organization_id;
  }

  // For some providers, we can look up by external account ID
  const body = request.body as Record<string, any>;
  
  switch (provider) {
    case 'stripe':
      // Stripe includes account ID in connected account webhooks
      if (body.account) {
        const result = await fastify.pg.query(
          'SELECT organization_id FROM integration_credentials WHERE config->>\'stripe_account_id\' = $1',
          [body.account]
        );
        if (result.rows.length > 0) {
          return result.rows[0].organization_id;
        }
      }
      break;

    case 'slack':
      // Slack includes team_id
      if (body.team_id) {
        const result = await fastify.pg.query(
          'SELECT organization_id FROM integration_credentials WHERE config->>\'slack_team_id\' = $1',
          [body.team_id]
        );
        if (result.rows.length > 0) {
          return result.rows[0].organization_id;
        }
      }
      break;

    case 'github':
      // GitHub includes installation_id
      if (body.installation?.id) {
        const result = await fastify.pg.query(
          'SELECT organization_id FROM integration_credentials WHERE config->>\'github_installation_id\' = $1',
          [body.installation.id.toString()]
        );
        if (result.rows.length > 0) {
          return result.rows[0].organization_id;
        }
      }
      break;
  }

  return undefined;
}

/**
 * Get webhook signing secret from database
 */
async function getWebhookSecret(
  fastify: FastifyInstance,
  organizationId: string,
  provider: string
): Promise<string | undefined> {
  const result = await fastify.pg.query(
    'SELECT signing_secret FROM integration_webhooks WHERE organization_id = $1 AND integration_type = $2 AND is_active = true',
    [organizationId, provider]
  );

  if (result.rows.length > 0) {
    return result.rows[0].signing_secret;
  }

  return undefined;
}

/**
 * Log a webhook event to the database
 */
async function logWebhookEvent(
  fastify: FastifyInstance,
  event: {
    organizationId: string;
    integrationType: string;
    eventType?: string;
    eventId?: string;
    payload: any;
    sourceIp?: string;
    headers?: Record<string, any>;
    signatureValid: boolean;
    validationError?: string;
  }
): Promise<void> {
  try {
    await fastify.pg.query(`
      INSERT INTO webhook_events 
        (organization_id, integration_type, event_type, event_id, payload, source_ip, headers, signature_valid, validation_error)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (organization_id, integration_type, event_id) DO NOTHING
    `, [
      event.organizationId,
      event.integrationType,
      event.eventType,
      event.eventId,
      JSON.stringify(event.payload),
      event.sourceIp,
      event.headers ? JSON.stringify(event.headers) : null,
      event.signatureValid,
      event.validationError
    ]);
  } catch (error) {
    fastify.log.error({ error }, 'Failed to log webhook event');
  }
}

/**
 * Sanitize headers for logging (remove sensitive values)
 */
function sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, any> {
  const sensitiveHeaders = [
    'authorization',
    'x-api-key',
    'cookie',
    'x-webhook-secret'
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Pre-built middleware for common providers
 */
export const stripeWebhookValidation = (fastify: FastifyInstance) =>
  createWebhookValidationMiddleware(fastify, {
    provider: 'stripe',
    secretEnvVar: 'STRIPE_WEBHOOK_SECRET',
    logEvents: true
  });

export const slackWebhookValidation = (fastify: FastifyInstance) =>
  createWebhookValidationMiddleware(fastify, {
    provider: 'slack',
    secretEnvVar: 'SLACK_SIGNING_SECRET',
    logEvents: true
  });

export const githubWebhookValidation = (fastify: FastifyInstance) =>
  createWebhookValidationMiddleware(fastify, {
    provider: 'github',
    secretEnvVar: 'GITHUB_WEBHOOK_SECRET',
    logEvents: true
  });

export const genericWebhookValidation = (fastify: FastifyInstance) =>
  createWebhookValidationMiddleware(fastify, {
    secretFromDb: true,
    logEvents: true
  });



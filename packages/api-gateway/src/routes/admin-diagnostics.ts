import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { config } from '../config/index.js';
import { getEmailQueueService, getEmailService } from '../services/email/index.js';

function maskUrlCredentials(url: string): string {
  return url.replace(/:[^:]*@/, ':***@');
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

export default async function adminDiagnosticsRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: { live?: string };
  }>(
    '/diagnostics',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: { tags: ['Admin'], security: [{ bearerAuth: [] }] },
    },
    async (request, reply) => {
      const live = String(request.query?.live || '').toLowerCase() === 'true';

      const emailService = getEmailService();
      const emailQueueService = getEmailQueueService();

      const result: any = {
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          env: {
            nodeEnv: config.nodeEnv,
            edition: process.env.SYNTHSTACK_EDITION || 'unknown',
            enableCopilot: process.env.ENABLE_COPILOT === 'true',
            enableReferrals: process.env.ENABLE_REFERRALS === 'true',
          },
          urls: {
            frontendUrl: config.frontendUrl,
            directusUrl: maskUrlCredentials(config.directusUrl),
            mlServiceUrl: maskUrlCredentials(config.mlServiceUrl),
          },
          services: {
            postgres: { ok: false },
            redis: { configured: Boolean(fastify.redis), ok: false },
            directus: { ok: false, tokenConfigured: Boolean(config.directusToken) },
            mlService: { ok: false },
            stripe: {
              configured: Boolean(config.stripe.secretKey),
              webhookConfigured: Boolean(config.stripe.webhookSecret),
              prices: {
                maker: Boolean(config.stripe.prices.maker),
                pro: Boolean(config.stripe.prices.pro),
                agency: Boolean(config.stripe.prices.agency),
                lifetimePro: Boolean(config.stripe.prices.lifetimePro),
              },
            },
            email: {
              configured: emailService.isConfigured(),
              resendConfigured: Boolean(process.env.RESEND_API_KEY),
              smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
              queueConfigured: emailQueueService.isConfigured(),
              queueStats: null as any,
            },
          },
        },
      };

      // DB check (always local)
      try {
        await fastify.pg.query('SELECT 1');
        result.data.services.postgres.ok = true;
      } catch (error: any) {
        result.data.services.postgres = { ok: false, error: error.message };
      }

      // Redis ping (local; only if configured)
      if (fastify.redis) {
        try {
          await withTimeout(fastify.redis.ping(), 1500, 'Redis ping');
          result.data.services.redis.ok = true;
        } catch (error: any) {
          result.data.services.redis = {
            configured: true,
            ok: false,
            error: error.message,
          };
        }
      }

      // Queue stats (local; safe even if Redis disabled)
      try {
        result.data.services.email.queueStats = await emailQueueService.getStats();
      } catch (error: any) {
        result.data.services.email.queueStats = { error: error.message };
      }

      if (!live) return result;

      // Directus health (network)
      try {
        const res = await fetch(`${config.directusUrl}/server/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(4000),
        });
        result.data.services.directus.ok = res.ok;
      } catch (error: any) {
        result.data.services.directus = {
          ok: false,
          tokenConfigured: Boolean(config.directusToken),
          error: error.message,
        };
      }

      // ML service readiness (network)
      try {
        const res = await fetch(`${config.mlServiceUrl}/health/ready`, {
          method: 'GET',
          signal: AbortSignal.timeout(4000),
        });
        result.data.services.mlService.ok = res.ok;
      } catch (error: any) {
        result.data.services.mlService = { ok: false, error: error.message };
      }

      // Stripe API check (network)
      if (config.stripe.secretKey) {
        try {
          const stripe = new Stripe(config.stripe.secretKey, {
            apiVersion: '2025-02-24.acacia',
            typescript: true,
          });
          const account = await withTimeout(stripe.accounts.retrieve(), 4000, 'Stripe account retrieve');
          result.data.services.stripe = {
            ...result.data.services.stripe,
            apiOk: true,
            accountId: account.id,
            livemode: Boolean((account as any).livemode),
          };
        } catch (error: any) {
          result.data.services.stripe = {
            ...result.data.services.stripe,
            apiOk: false,
            error: error.message,
          };
        }
      }

      return result;
    }
  );
}

/**
 * SynthStack API Gateway - App Factory
 *
 * Provides a buildApp() factory function for creating configured Fastify instances.
 * Used by both production (index.ts) and tests (test-server.ts).
 */

import Fastify from 'fastify';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyPostgres from '@fastify/postgres';
import fastifyRedis from '@fastify/redis';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

// Services
import { initStripeService } from './services/stripe.js';
import { initNewsletterService } from './services/newsletter/index.js';
import { initAnalyticsService } from './services/analytics/index.js';
// docs-ingestion removed - Community Edition (requires Qdrant)
import { initOrchestrationService } from './services/orchestration/index.js';
import { initOrchestrationQueueService } from './services/orchestration/queue.js';
import { initAuthService, getAuthService } from './services/auth/index.js';
import { initEmailService } from './services/email/index.js';

// Plugins
import rateLimitTierPlugin from './plugins/rate-limit-tier.js';
import conditionalFeaturesPlugin from './plugins/conditional-features.js';
import rawBodyPlugin from './plugins/raw-body.js';
import demoAuthPlugin from './middleware/demoAuth.js';

// Routes
import authRoutes from './routes/auth.js';
import projectsRoutes from './routes/projects.js';
import creditsRoutes from './routes/credits.js';
import generationRoutes from './routes/generation.js';
import chatRoutes from './routes/chat.js';
import webhooksRoutes from './routes/webhooks.js';
import subscriptionRoutes from './routes/subscriptions.js';
import communityRoutes from './routes/community.js';
import usersRoutes from './routes/users.js';
import adminSyncRoutes from './routes/admin-sync.js';
import billingRoutes from './routes/billing.js';
import workerRoutes from './routes/workers.js';
import newsletterRoutes from './routes/newsletter.js';
import analyticsRoutes from './routes/analytics.js';
// COMMUNITY: Copilot and Agents routes removed
import themesRoutes from './routes/themes.js';
import docsRoutes from './routes/docs.js';
import blogRoutes from './routes/blog.js';
import { onboardingRoutes } from './routes/onboarding.js';
// COMMUNITY: Referral routes removed
import featuresRoutes from './routes/features.js';
import apiKeysRoutes from './routes/api-keys.js';
import seoRoutes from './routes/seo.js';
import demoRoutes from './routes/demo.js';
import projectMembersRoutes from './routes/project-members.js';
import gamificationRoutes from './routes/gamification.js';
import auditRoutes from './routes/audit.js';
import orchestrationRoutes from './routes/orchestration.js';
import orchestrationWorkerRoutes from './routes/orchestration-workers.js';
import integrationsRoutes from './routes/integrations.js';
import pricingRoutes from './routes/pricing.js';
import i18nRoutes from './routes/i18n.js';
import serpRoutes from './routes/serp.js';
import clientPortalRoutes from './routes/client-portal.js';
// COMMUNITY: Portal Copilot routes removed
import proposalsRoutes from './routes/proposals.js';
import activitiesRoutes from './routes/activities.js';
import helpRoutes from './routes/help.js';
import directusRoutes from './routes/directus.js';
// COMMUNITY: Node-RED routes removed
import gdprRoutes from './routes/gdpr.js';
// COMMUNITY: LangGraph routes removed
import dashboardAnalyticsRoutes from './routes/dashboard-analytics.js';
import dashboardEventsRoutes from './routes/dashboard-events.js';
import adminLLMCostsRoutes from './routes/admin-llm-costs.js';
import licenseAccessRoutes from './routes/license-access.js';

// Sentry
import { captureException } from './services/sentry.js';

// Config (for defaults)
import { config as defaultConfig } from './config/index.js';

/**
 * Options for building the app
 */
export interface AppOptions {
  // Fastify options
  logger?: FastifyServerOptions['logger'];
  trustProxy?: boolean;

  // Database
  databaseUrl?: string;

  // Redis (optional)
  redisUrl?: string;

  // Feature flags
  enableCopilot?: boolean;
  enableReferrals?: boolean;

  // CORS
  corsOrigins?: string | string[] | boolean;

  // Rate limiting
  rateLimit?: number;

  // Test mode options
  skipServices?: boolean;        // Skip external service initialization (Stripe, etc.)
  skipBackgroundJobs?: boolean;  // Skip background job scheduling
}

// Fastify instance augmentation
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    requireModerator: (request: any, reply: any) => Promise<void>;
    requireAdmin: (request: any, reply: any) => Promise<void>;
    features: {
      copilot: boolean;
      aiAgents: boolean;
      copilotRag: boolean;
      referrals: boolean;
    };
  }
}

/**
 * Build a configured Fastify app instance
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    trustProxy: options.trustProxy ?? true,
  });

  // Register plugins
  await registerPlugins(app, options);

  // Register auth decorators
  registerAuthDecorators(app, options);

  // Register routes
  await registerRoutes(app, options);

  // Setup error handler
  setupErrorHandler(app);

  return app;
}

/**
 * Register all plugins
 */
async function registerPlugins(app: FastifyInstance, options: AppOptions): Promise<void> {
  // Raw body capture (Stripe/webhook signature verification)
  await app.register(rawBodyPlugin);

  // Swagger/OpenAPI
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: { title: 'SynthStack API', version: '1.0.0' },
      tags: [
        { name: 'Health' }, { name: 'Auth' }, { name: 'Projects' },
        { name: 'Profiles' }, { name: 'Credits' },
        { name: 'Billing' }, { name: 'Community' }, { name: 'Newsletter' }, { name: 'Analytics' },
        { name: 'Workers' }, { name: 'Admin' }, { name: 'Copilot' }, { name: 'Agents' },
        { name: 'Suggestions' }, { name: 'GitHub' }, { name: 'Themes' }, { name: 'Docs' }, { name: 'Referral' }, { name: 'SEO' },
        { name: 'Gamification' }, { name: 'Sprints' }, { name: 'Retrospectives' }, { name: 'Audit' },
        { name: 'Orchestration' }, { name: 'Integrations' }, { name: 'Pricing' }, { name: 'i18n' }, { name: 'SERP' },
        { name: 'Portal' }, { name: 'Proposals' }, { name: 'Activities' }, { name: 'Help' }, { name: 'Directus' },
        { name: 'LangGraph' },
        { name: 'Dashboard' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          adminAuth: { type: 'http', scheme: 'bearer' },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, { routePrefix: '/docs' });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: options.corsOrigins ?? defaultConfig.corsOrigins,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-demo-session',
      'x-requested-with',
    ],
  });
  await app.register(rateLimit, {
    max: options.rateLimit ?? (defaultConfig.isProd ? 100 : 10000),
    timeWindow: '1 minute',
  });
  await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } });

  // Database
  const databaseUrl = options.databaseUrl ?? defaultConfig.databaseUrl;
  await app.register(fastifyPostgres, { connectionString: databaseUrl });

  // Redis (optional)
  const redisUrl = options.redisUrl ?? defaultConfig.redisUrl;
  if (redisUrl) {
    try {
      await app.register(fastifyRedis, { url: redisUrl });
    } catch (error) {
      app.log.warn({ error }, 'Redis unavailable');
    }
  }

  // Rate limit tier plugin
  await app.register(rateLimitTierPlugin, { enableHeaders: true });

  // Demo auth plugin
  await app.register(demoAuthPlugin);

  // Initialize auth service (required for routes, always initialize)
  try {
    await initAuthService(app);
    app.log.info('🔐 Auth service initialized');
  } catch (error) {
    app.log.warn({ error }, '⚠️ Auth service initialization failed, using fallback');
  }

  // Initialize external services (skip in test mode)
  if (!options.skipServices) {
    initStripeService(app);
    initEmailService(app);
    initNewsletterService(app);
    initAnalyticsService(app);
    // initDocsIngestionService removed - Community Edition
    initOrchestrationService(app);
    initOrchestrationQueueService(app);
  }

  // Initialize conditional features plugin
  // Override feature flags if provided in options
  if (options.enableCopilot !== undefined || options.enableReferrals !== undefined) {
    // Set environment variables before plugin runs (plugin reads from env)
    if (options.enableCopilot !== undefined) {
      process.env.ENABLE_COPILOT = options.enableCopilot ? 'true' : 'false';
    }
    if (options.enableReferrals !== undefined) {
      process.env.ENABLE_REFERRALS = options.enableReferrals ? 'true' : 'false';
    }
  }
  await app.register(conditionalFeaturesPlugin);
}

/**
 * Register authentication decorators
 */
function registerAuthDecorators(app: FastifyInstance, options: AppOptions): void {
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const token = authHeader.substring(7);

      // Try using auth service first
      if (!options.skipServices) {
        try {
          const authService = getAuthService();
          const verification = await authService.verifyToken(token);

          if (verification.valid && verification.user) {
            const result = await app.pg.query(
              'SELECT id, email, display_name, subscription_tier, is_banned, is_moderator, is_admin FROM app_users WHERE id = $1',
              [verification.user.id]
            );
            if (result.rows.length === 0) {
              return reply.status(401).send({ error: 'User not found' });
            }
            if (result.rows[0].is_banned) {
              return reply.status(403).send({ error: 'Account suspended' });
            }
            request.user = result.rows[0];
            return;
          }
        } catch {
          // Auth service not available, fallback to direct JWT verification
        }
      }

      // Fallback: Direct JWT verification
      let decoded: { sub: string };
      if (defaultConfig.isDev) {
        try {
          decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        } catch {
          return reply.status(401).send({ error: 'Invalid token' });
        }
      } else {
        const jwt = await import('jsonwebtoken');
        decoded = jwt.default.verify(token, defaultConfig.jwtSecret) as { sub: string };
      }

      const result = await app.pg.query(
        'SELECT id, email, display_name, subscription_tier, is_banned, is_moderator, is_admin FROM app_users WHERE id = $1',
        [decoded.sub]
      );
      if (result.rows.length === 0) {
        return reply.status(401).send({ error: 'User not found' });
      }
      if (result.rows[0].is_banned) {
        return reply.status(403).send({ error: 'Account suspended' });
      }
      request.user = result.rows[0];
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  app.decorate('requireModerator', async (request: any, reply: any) => {
    if (!request.user?.is_moderator && !request.user?.is_admin) {
      return reply.status(403).send({ error: 'Moderator required' });
    }
  });

  app.decorate('requireAdmin', async (request: any, reply: any) => {
    if (!request.user?.is_admin) {
      return reply.status(403).send({ error: 'Admin required' });
    }
  });
}

/**
 * Register all routes
 */
async function registerRoutes(app: FastifyInstance, options: AppOptions): Promise<void> {
  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    service: 'synthstack-api-gateway',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // OpenAPI spec
  app.get('/openapi.json', async () => app.swagger());

  // Core routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(projectsRoutes, { prefix: '/api/v1/projects' });
  await app.register(creditsRoutes, { prefix: '/api/v1/credits' });
  await app.register(generationRoutes, { prefix: '/api/v1/generation' });
  await app.register(chatRoutes, { prefix: '/api/v1/chat' });
  await app.register(communityRoutes, { prefix: '/api/v1' });
  await app.register(usersRoutes, { prefix: '/api/v1/users' });

  // Billing routes require Stripe (skip in test mode when skipServices is true)
  if (!options.skipServices) {
    await app.register(billingRoutes, { prefix: '/api/v1/billing' });
    await app.register(subscriptionRoutes, { prefix: '/api/v1' });
    await app.register(licenseAccessRoutes, { prefix: '/api/v1/license-access' });
  }

  await app.register(webhooksRoutes, { prefix: '/api/v1/webhooks' });

  // Newsletter and analytics routes require their services (skip in test mode)
  if (!options.skipServices) {
    await app.register(newsletterRoutes, { prefix: '/api/v1/newsletter' });
    await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
  }
  await app.register(workerRoutes, { prefix: '/api/v1/workers' });
  await app.register(adminSyncRoutes, { prefix: '/api/v1/admin' });

  // COMMUNITY: Copilot/Agents routes removed - not available in Community Edition

  await app.register(themesRoutes, { prefix: '/api/v1' });
  await app.register(docsRoutes, { prefix: '/api/v1/docs' });
  await app.register(blogRoutes, { prefix: '/api/v1/blog' });
  await app.register(onboardingRoutes);

  // COMMUNITY: Referral routes removed - not available in Community Edition

  await app.register(featuresRoutes, { prefix: '/api/v1' });
  await app.register(apiKeysRoutes, { prefix: '/api/v1/api-keys' });
  await app.register(seoRoutes, { prefix: '/api/v1/seo' });
  await app.register(demoRoutes, { prefix: '/api/v1/demo' });
  await app.register(projectMembersRoutes, { prefix: '/api/v1' });
  await app.register(gamificationRoutes, { prefix: '/api/v1/gamification' });
  await app.register(auditRoutes, { prefix: '/api/v1/audit' });
  await app.register(orchestrationRoutes, { prefix: '/api/v1/orchestration' });
  await app.register(orchestrationWorkerRoutes, { prefix: '/api/v1/workers/orchestration' });
  await app.register(integrationsRoutes, { prefix: '/api/v1/integrations' });
  await app.register(pricingRoutes, { prefix: '/api/v1/pricing' });
  await app.register(i18nRoutes, { prefix: '/api/v1' });
  await app.register(serpRoutes, { prefix: '/api/v1' });

  // AgencyOS Consolidation Routes
  await app.register(clientPortalRoutes, { prefix: '/api/portal' });

  // COMMUNITY: Portal Copilot routes removed - not available in Community Edition

  await app.register(proposalsRoutes, { prefix: '/api/v1/proposals' });
  await app.register(activitiesRoutes, { prefix: '/api/v1/activities' });
  await app.register(helpRoutes, { prefix: '/api/v1/help' });

  // Directus CMS Proxy
  await app.register(directusRoutes, { prefix: '/directus' });

  // COMMUNITY: Node-RED Workflow Engine removed - not available in Community Edition

  // GDPR Compliance
  await app.register(gdprRoutes, { prefix: '/api/v1/gdpr' });

  // COMMUNITY: LangGraph AI Orchestration removed - not available in Community Edition

  // Dashboard Analytics
  await app.register(dashboardAnalyticsRoutes, { prefix: '/api/v1/dashboard/analytics' });
  await app.register(dashboardEventsRoutes, { prefix: '/api/v1/dashboard/events' });

  // Admin LLM Cost Dashboard
  await app.register(adminLLMCostsRoutes, { prefix: '/api/v1/admin/llm-costs' });
}

/**
 * Setup error handler
 */
function setupErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    // Log error
    app.log.error(error);

    // Capture in Sentry with context
    captureException(error, {
      request: {
        id: request.id,
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query,
      },
      user: (request as any).user ? {
        id: (request as any).user.id,
        email: (request as any).user.email,
        tier: (request as any).user.subscription_tier,
      } : undefined,
    });

    // Send response
    if (error.statusCode) {
      reply.status(error.statusCode).send({
        success: false,
        error: { code: error.code || 'ERROR', message: error.message },
      });
      return;
    }
    reply.status(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });
}

/**
 * SynthStack - Your Agency in a Box
 *
 * Copyright (c) 2025 Manic Inc.
 *
 * This source code is licensed under:
 * - MIT License (Community Edition) - for non-commercial use
 * - Commercial License - for commercial production use
 *
 * See LICENSE and COMMERCIAL-LICENSE.md in the repository root for full terms.
 * Commercial licenses: https://synthstack.app/pricing
 */

// MUST be first import for Sentry auto-instrumentation
import './instrument.js';

import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { config } from './config/index.js';

// Sentry
import {
  setupFastifyErrorHandler as setupSentryErrorHandler,
  sentryUserMiddleware,
  closeSentry,
  isSentryEnabled,
} from './services/sentry.js';

// ML Credits Middleware
import { mlCreditsPreRequestHook, mlCreditsPostRequestHook } from './middleware/ml-credits.js';

// Qdrant Vector Database
import { initializePortalContextCollection, checkQdrantHealth } from './services/qdrant/collections.js';

// Background Jobs
import { startPortalContextIndexingJob } from './jobs/indexPortalContext.js';
import { startLLMCostAggregationJobs } from './jobs/llmCostAggregation.js';

let server: FastifyInstance;

async function start() {
  try {
    // Build the app using factory
    server = await buildApp({
      logger: {
        level: config.logLevel,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      },
      trustProxy: true,
      databaseUrl: config.databaseUrl,
      redisUrl: config.redisUrl,
      corsOrigins: config.corsOrigins,
      rateLimit: config.isProd ? 100 : 10000,
      // Feature flags from environment
      enableCopilot: process.env.ENABLE_COPILOT === 'true',
      enableReferrals: process.env.ENABLE_REFERRALS === 'true',
    });

    // Setup Sentry error handler (optional - only if DSN configured)
    setupSentryErrorHandler(server);

    // Add Sentry user context middleware (optional)
    if (isSentryEnabled()) {
      server.addHook('preHandler', sentryUserMiddleware);
    }

    // Add ML Credits Middleware hooks
    server.addHook('preHandler', mlCreditsPreRequestHook);
    server.addHook('onResponse', mlCreditsPostRequestHook);
    server.log.info('💳 ML credits middleware enabled');

    // Initialize Qdrant vector database
    server.log.info('🔍 Initializing Qdrant vector database...');
    try {
      const qdrantHealthy = await checkQdrantHealth();
      if (qdrantHealthy) {
        await initializePortalContextCollection();
        server.log.info('✅ Qdrant initialized successfully');

        // Start background indexing job
        startPortalContextIndexingJob(server);
        server.log.info('✅ Portal context indexing job scheduled');

        // Start LLM cost aggregation jobs
        startLLMCostAggregationJobs(server);
        server.log.info('✅ LLM cost aggregation jobs scheduled');
      } else {
        server.log.warn('⚠️  Qdrant health check failed - vector search will be unavailable');
        server.log.warn('⚠️  Portal copilot will fall back to keyword matching');
      }
    } catch (qdrantError) {
      server.log.error({ error: qdrantError }, '❌ Failed to initialize Qdrant');
      server.log.warn('⚠️  Portal copilot will fall back to keyword matching');
    }

    // Start listening
    await server.listen({ port: config.port, host: config.host });
    server.log.info('🚀 SynthStack API Gateway running at http://' + config.host + ':' + config.port);
    server.log.info('📚 API Documentation at http://' + config.host + ':' + config.port + '/docs');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

const gracefulShutdown = async () => {
  if (server) {
    server.log.info('Shutting down...');
    await closeSentry(); // Flush pending Sentry events
    await server.close();
  }
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

start();

export { server };

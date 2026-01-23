/**
 * SynthStack - Your Agency in a Box
 *
 * Copyright (c) 2025 Manic Inc.
 *
 * This source code is licensed under the MIT License.
 *
 * See LICENSE in the repository root for full terms.
 * Pro edition: https://synthstack.app/pricing
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

// Background Jobs (Community Edition - no Qdrant/vector search)
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

    // Start LLM cost aggregation jobs
    startLLMCostAggregationJobs(server);
    server.log.info('✅ LLM cost aggregation jobs scheduled');

    // Community Edition: Qdrant/vector search disabled
    // Upgrade to Pro for AI-powered semantic search

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

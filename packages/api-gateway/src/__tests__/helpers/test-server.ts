/**
 * Test Server Helpers
 *
 * Utilities for starting/stopping test server and making API requests.
 * Uses the buildApp() factory to create properly configured Fastify instances.
 */

import { FastifyInstance } from 'fastify';
import axios, { AxiosInstance } from 'axios';
import { buildApp, AppOptions } from '../../app.js';
import { closeTestPool } from '../../test/db-helpers.js';

let testServer: FastifyInstance | null = null;
let testServerUrl: string = '';

/**
 * Options for starting the test server
 */
export interface TestServerOptions extends Partial<AppOptions> {
  port?: number;
}

/**
 * Start the test server on a specified or random port
 */
export async function startTestServer(options: TestServerOptions = {}): Promise<void> {
  if (testServer) {
    throw new Error('Test server already running. Call stopTestServer() first.');
  }

  // Build app with test configuration
  testServer = await buildApp({
    // Disable logging in tests unless explicitly enabled
    logger: options.logger ?? false,

    // Use test database URL from environment or default
    databaseUrl: options.databaseUrl ?? process.env.DATABASE_URL ?? 'postgresql://test_user:test_pass@localhost:5451/synthstack_test',

    // Skip Redis for E2E tests unless explicitly enabled (it's optional and can cause timeouts)
    // Using empty string to explicitly disable - undefined would fall through to defaultConfig
    redisUrl: options.redisUrl !== undefined ? options.redisUrl : '',

    // Feature flags from environment or options
    enableCopilot: options.enableCopilot ?? process.env.ENABLE_COPILOT === 'true',
    enableReferrals: options.enableReferrals ?? process.env.ENABLE_REFERRALS === 'true',

    // Skip external services in test mode (Stripe, etc.)
    skipServices: options.skipServices ?? true,

    // Skip background jobs in test mode
    skipBackgroundJobs: options.skipBackgroundJobs ?? true,

    // Allow all origins in tests
    corsOrigins: options.corsOrigins ?? true,

    // High rate limit for tests
    rateLimit: options.rateLimit ?? 10000,

    // Pass through any other options
    ...options,
  });

  // Start server on specified port or random available port
  const port = options.port ?? 0;
  await testServer.listen({ port, host: '127.0.0.1' });

  // Get the actual port assigned
  const address = testServer.server.address();
  const actualPort = typeof address === 'object' && address ? address.port : 0;
  testServerUrl = `http://127.0.0.1:${actualPort}`;
}

/**
 * Stop the test server and clean up resources
 */
export async function stopTestServer(): Promise<void> {
  if (testServer) {
    await testServer.close();
    testServer = null;
    testServerUrl = '';
  }

  // Close database pool
  await closeTestPool();
}

/**
 * Get axios client configured for the test server
 */
export function getTestClient(): AxiosInstance {
  if (!testServerUrl) {
    throw new Error('Test server not started. Call startTestServer() first.');
  }

  return axios.create({
    baseURL: testServerUrl,
    validateStatus: () => true, // Don't throw on any status code
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Get the test server URL
 */
export function getTestServerUrl(): string {
  if (!testServerUrl) {
    throw new Error('Test server not started. Call startTestServer() first.');
  }
  return testServerUrl;
}

/**
 * Get the raw Fastify app instance (for direct inject() calls)
 */
export function getTestApp(): FastifyInstance {
  if (!testServer) {
    throw new Error('Test server not started. Call startTestServer() first.');
  }
  return testServer;
}

/**
 * Check if the test server is running
 */
export function isTestServerRunning(): boolean {
  return testServer !== null;
}

/**
 * Sentry Error Tracking Service
 *
 * Optional Sentry integration for error tracking and performance monitoring.
 * Sentry is only initialized if SENTRY_DSN is configured.
 *
 * @module services/sentry
 */

import * as Sentry from '@sentry/node';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { config } from '../config/index.js';

let sentryInitialized = false;

/**
 * User context for Sentry
 */
interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  subscription_tier?: string;
}

/**
 * Initialize Sentry SDK
 * Should be called as early as possible in the application lifecycle
 */
export function initSentry(): boolean {
  if (!config.sentry.dsn) {
    console.log('[Sentry] No DSN configured - error tracking disabled');
    return false;
  }

  if (sentryInitialized) {
    return true;
  }

  try {
    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.sentry.environment,
      release: process.env.npm_package_version || '1.0.0',

      // Performance monitoring
      tracesSampleRate: config.sentry.tracesSampleRate,
      profilesSampleRate: config.sentry.profilesSampleRate,

      // Capture request data
      sendDefaultPii: true,

      // Filter sensitive data
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }
        return event;
      },

      // Ignore common non-actionable errors
      ignoreErrors: [
        'ECONNRESET',
        'EPIPE',
        'ETIMEDOUT',
        'RATE_LIMIT_EXCEEDED',
      ],
    });

    sentryInitialized = true;
    console.log('[Sentry] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
    return false;
  }
}

/**
 * Check if Sentry is enabled and initialized
 */
export function isSentryEnabled(): boolean {
  return sentryInitialized;
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: SentryUser | null): void {
  if (!sentryInitialized) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      subscription_tier: user.subscription_tier,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add custom context/tags to Sentry scope
 */
export function setSentryContext(
  name: string,
  context: Record<string, unknown>
): void {
  if (!sentryInitialized) return;
  Sentry.setContext(name, context);
}

/**
 * Add a breadcrumb for debugging
 */
export function addSentryBreadcrumb(
  message: string,
  category: string = 'info',
  data?: Record<string, unknown>
): void {
  if (!sentryInitialized) return;
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Capture an exception manually
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): string | undefined {
  if (!sentryInitialized) return undefined;

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): string | undefined {
  if (!sentryInitialized) return undefined;
  return Sentry.captureMessage(message, level);
}

/**
 * Setup Fastify error handler integration
 * Call this AFTER creating the Fastify instance
 */
export function setupFastifyErrorHandler(fastify: FastifyInstance): void {
  if (!sentryInitialized) {
    console.log('[Sentry] Skipping Fastify integration - not initialized');
    return;
  }

  Sentry.setupFastifyErrorHandler(fastify);
  console.log('[Sentry] Fastify error handler registered');
}

/**
 * Extract user context from Fastify request
 */
export function extractUserFromRequest(request: FastifyRequest): SentryUser | null {
  const user = (request as any).user;
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    username: user.display_name,
    subscription_tier: user.subscription_tier,
  };
}

/**
 * Middleware to set Sentry user context per request
 * Use as a preHandler hook
 */
export function sentryUserMiddleware(
  request: FastifyRequest,
  _reply: unknown,
  done: () => void
): void {
  if (!sentryInitialized) {
    done();
    return;
  }

  const user = extractUserFromRequest(request);
  setSentryUser(user);

  // Add request context
  Sentry.setContext('request', {
    id: request.id,
    method: request.method,
    url: request.url,
    ip: request.ip,
  });

  done();
}

/**
 * Graceful shutdown - flush pending events
 */
export async function closeSentry(): Promise<void> {
  if (!sentryInitialized) return;
  await Sentry.close(2000);
}

export { Sentry };

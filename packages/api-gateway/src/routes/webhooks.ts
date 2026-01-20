/**
 * @file routes/webhooks.ts
 * @description Webhook handlers for external services
 *
 * Stripe webhooks are handled via the Postgres-backed implementation in `stripe-webhooks.ts`.
 */

export { default } from './stripe-webhooks.js';


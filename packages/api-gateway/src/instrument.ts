/**
 * Sentry Early Initialization
 *
 * This file must be imported FIRST before any other modules
 * to enable Sentry's automatic instrumentation.
 *
 * @module instrument
 */

import { initSentry } from './services/sentry.js';

// Initialize Sentry as early as possible
initSentry();

export {};

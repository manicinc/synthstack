/**
 * Sentry Error Tracking Boot File
 *
 * Initializes Sentry for error tracking and performance monitoring.
 * Sentry is OPTIONAL - the app works without it if VITE_SENTRY_DSN is not configured.
 *
 * Features:
 * - Vue component error tracking
 * - Vue Router navigation tracking
 * - Performance monitoring (configurable sample rate)
 * - User context integration with auth store
 *
 * @module boot/sentry
 */
import { boot } from 'quasar/wrappers'
import * as Sentry from '@sentry/vue'
import { devLog, devWarn, devError } from '@/utils/devLogger'
import type { Router } from 'vue-router'
import type { App } from 'vue'

// Environment configuration
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT ||
  (import.meta.env.PROD ? 'production' : 'development')
const SENTRY_TRACES_SAMPLE_RATE = parseFloat(
  import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'
)

/**
 * Check if Sentry should be initialized
 */
function shouldInitializeSentry(): boolean {
  // Only initialize if DSN is provided
  if (!SENTRY_DSN) {
    return false
  }

  // Skip in SSR context
  if (typeof window === 'undefined') {
    return false
  }

  return true
}

/**
 * Set user context in Sentry
 * Call this after user authentication
 */
export function setSentryUser(user: {
  id: string
  email?: string
  username?: string
} | null): void {
  if (!SENTRY_DSN) return

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username
    })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Set additional context tags
 */
export function setSentryTag(key: string, value: string): void {
  if (!SENTRY_DSN) return
  Sentry.setTag(key, value)
}

/**
 * Set extra context data
 */
export function setSentryExtra(key: string, value: unknown): void {
  if (!SENTRY_DSN) return
  Sentry.setExtra(key, value)
}

/**
 * Capture a custom exception
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) {
    devError('[Sentry] Would capture exception:', error, context)
    return
  }

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
      Sentry.captureException(error)
    })
  } else {
    Sentry.captureException(error)
  }
}

/**
 * Capture a custom message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!SENTRY_DSN) {
    devLog(`[Sentry] Would capture message (${level}):`, message)
    return
  }

  Sentry.captureMessage(message, level)
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  if (!SENTRY_DSN) return
  Sentry.addBreadcrumb(breadcrumb)
}

export default boot(({ app, router }: { app: App; router: Router }): void => {
  // Check if Sentry should be initialized
  if (!shouldInitializeSentry()) {
    devLog('[Sentry] Sentry not initialized - DSN not configured')
    return
  }

  // Initialize Sentry
  Sentry.init({
    app,
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,

    // Vue Router integration for navigation tracking
    integrations: [
      Sentry.browserTracingIntegration({ router }),
    ],

    // Release tracking
    release: `synthstack-web@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['authorization']
      }

      return event
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      /extensions\//i,
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,

      // Network errors that are expected
      'Network Error',
      'Failed to fetch',
      'NetworkError',

      // User-initiated actions
      'AbortError',

      // ResizeObserver errors (benign)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],

    // Don't send certain URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],
  })

  // Add custom tags for context
  Sentry.setTag('platform', 'web')
  Sentry.setTag('quasar', 'true')

  // Detect and tag platform type
  const isCapacitor = !!(window as unknown as { Capacitor?: unknown }).Capacitor
  const isElectron = !!(window as unknown as { electron?: unknown }).electron
  const isPWA = window.matchMedia('(display-mode: standalone)').matches

  if (isCapacitor) Sentry.setTag('runtime', 'capacitor')
  else if (isElectron) Sentry.setTag('runtime', 'electron')
  else if (isPWA) Sentry.setTag('runtime', 'pwa')
  else Sentry.setTag('runtime', 'browser')

  devLog('[Sentry] Initialized successfully')
  devLog(`[Sentry] Environment: ${SENTRY_ENVIRONMENT}`)
  devLog(`[Sentry] Traces sample rate: ${SENTRY_TRACES_SAMPLE_RATE}`)
})

// Export Sentry for direct usage if needed
export { Sentry }

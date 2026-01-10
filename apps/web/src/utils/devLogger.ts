/* eslint-disable no-console */
/**
 * @file utils/devLogger.ts
 * @description Development-only logging utilities
 *
 * Provides console logging that only runs in development mode.
 * In production, logging is either disabled or routed to error tracking (Sentry).
 *
 * Note: Console usage is intentional in this file - it's a logging utility.
 */

const isDev = import.meta.env.DEV;

/**
 * Development-only console.log
 * Logs are stripped in production builds
 */
export const devLog = (...args: unknown[]): void => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Development-only console.warn
 * Warnings are stripped in production builds
 */
export const devWarn = (...args: unknown[]): void => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * Development-only console.error
 * Use logError() instead for production error tracking
 */
export const devError = (...args: unknown[]): void => {
  if (isDev) {
    console.error(...args);
  }
};

/**
 * Development-only console.info
 */
export const devInfo = (...args: unknown[]): void => {
  if (isDev) {
    console.info(...args);
  }
};

/**
 * Development-only console.debug
 */
export const devDebug = (...args: unknown[]): void => {
  if (isDev) {
    console.debug(...args);
  }
};

/**
 * Development-only console.table
 */
export const devTable = (data: unknown, columns?: string[]): void => {
  if (isDev) {
    console.table(data, columns);
  }
};

/**
 * Development-only console.group
 */
export const devGroup = (label?: string): void => {
  if (isDev) {
    console.group(label);
  }
};

/**
 * Development-only console.groupEnd
 */
export const devGroupEnd = (): void => {
  if (isDev) {
    console.groupEnd();
  }
};

/**
 * Production-safe error logging
 * Logs to console in development, sends to Sentry in production
 *
 * @param messageOrError - Error message string or error object
 * @param errorOrContext - Error object (if first arg is message) or additional context
 */
export const logError = (
  messageOrError: string | unknown,
  errorOrContext?: unknown
): void => {
  // Normalize the arguments
  let message: string;
  let error: unknown;
  let context: Record<string, unknown> | undefined;

  if (typeof messageOrError === 'string') {
    message = messageOrError;
    if (errorOrContext instanceof Error) {
      error = errorOrContext;
    } else if (errorOrContext && typeof errorOrContext === 'object') {
      context = errorOrContext as Record<string, unknown>;
    } else if (errorOrContext !== undefined) {
      error = errorOrContext;
    }
  } else {
    error = messageOrError;
    message = error instanceof Error ? error.message : String(error);
    if (errorOrContext && typeof errorOrContext === 'object') {
      context = errorOrContext as Record<string, unknown>;
    }
  }

  if (isDev) {
    if (error) {
      console.error('[Error]', message, error);
    } else {
      console.error('[Error]', message);
    }
    if (context) {
      console.error('[Context]', context);
    }
  } else {
    // In production, errors are sent to Sentry
    // Uses the captureException from boot/sentry.ts
    import('../boot/sentry').then(({ captureException }) => {
      const errorObj = error instanceof Error ? error : new Error(message);
      captureException(errorObj, context);
    }).catch(() => {
      // Sentry module not available, fail silently
    });
  }
};

/**
 * Production-safe warning logging
 * Logs to console in development, optionally sends to Sentry in production
 *
 * @param message - Warning message
 * @param context - Additional context
 */
export const logWarn = (
  message: string,
  context?: Record<string, unknown>
): void => {
  if (isDev) {
    console.warn('[Warning]', message, context);
  }
  // Warnings typically don't need to go to Sentry
  // but you can add that here if needed
};

/**
 * Prefix a log message with a component/module name
 *
 * @param prefix - The prefix to add (e.g., component name)
 * @returns Prefixed logging functions
 *
 * @example
 * ```typescript
 * const log = createPrefixedLogger('MyComponent');
 * log.info('Mounted');  // [MyComponent] Mounted
 * log.error(error);     // [MyComponent] Error: ...
 * ```
 */
export const createPrefixedLogger = (prefix: string) => ({
  log: (...args: unknown[]) => devLog(`[${prefix}]`, ...args),
  warn: (...args: unknown[]) => devWarn(`[${prefix}]`, ...args),
  error: (...args: unknown[]) => devError(`[${prefix}]`, ...args),
  info: (...args: unknown[]) => devInfo(`[${prefix}]`, ...args),
  debug: (...args: unknown[]) => devDebug(`[${prefix}]`, ...args),
});

export default {
  devLog,
  devWarn,
  devError,
  devInfo,
  devDebug,
  devTable,
  devGroup,
  devGroupEnd,
  logError,
  logWarn,
  createPrefixedLogger,
};

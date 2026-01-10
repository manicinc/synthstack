import type { Logger } from '../types/index.js';

/**
 * Create a default console-based logger
 */
export function createDefaultLogger(): Logger {
  return {
    info(message: string, ...args: any[]) {
      console.log(`[INFO] ${message}`, ...args);
    },
    warn(message: string, ...args: any[]) {
      console.warn(`[WARN] ${message}`, ...args);
    },
    error(message: string, ...args: any[]) {
      console.error(`[ERROR] ${message}`, ...args);
    },
    debug(message: string, ...args: any[]) {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.debug(`[DEBUG] ${message}`, ...args);
      }
    },
  };
}

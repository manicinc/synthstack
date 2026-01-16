/**
 * @file logger.ts
 * @description Simple logger utility with pino-compatible API
 */

type LogFunction = {
  (message: string, ...args: any[]): void;
  (obj: object, message: string, ...args: any[]): void;
};

function createLogFn(level: string, consoleFn: typeof console.log): LogFunction {
  return ((first: string | object, ...rest: any[]) => {
    if (typeof first === 'string') {
      // Simple message: logger.info('message', args...)
      consoleFn(`[${level}] ${first}`, ...rest);
    } else {
      // Pino-style: logger.info({ key: value }, 'message', args...)
      const [message, ...args] = rest;
      consoleFn(`[${level}] ${message}`, first, ...args);
    }
  }) as LogFunction;
}

export const logger = {
  info: createLogFn('INFO', console.log),
  error: createLogFn('ERROR', console.error),
  warn: createLogFn('WARN', console.warn),
  debug: createLogFn('DEBUG', console.debug),
}

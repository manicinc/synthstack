import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Custom error classes
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      404,
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      'NOT_FOUND'
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: any) {
    super(400, message, 'VALIDATION_ERROR', errors);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, message, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
  timestamp: string;
  path: string;
  requestId?: string;
}

/**
 * Format error response
 */
function formatErrorResponse(
  error: Error | FastifyError | AppError,
  request: FastifyRequest
): ErrorResponse {
  const baseResponse: ErrorResponse = {
    error: error.name || 'Error',
    message: error.message || 'An error occurred',
    statusCode: 500,
    timestamp: new Date().toISOString(),
    path: request.url,
    requestId: request.id
  };

  // Handle custom AppError
  if (error instanceof AppError) {
    return {
      ...baseResponse,
      error: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    };
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      ...baseResponse,
      error: 'ValidationError',
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    };
  }

  // Handle Fastify errors
  if ('statusCode' in error) {
    return {
      ...baseResponse,
      statusCode: error.statusCode || 500,
      code: (error as any).code
    };
  }

  // Handle PostgreSQL errors
  if ('code' in error) {
    const pgError = error as any;

    // Unique constraint violation
    if (pgError.code === '23505') {
      return {
        ...baseResponse,
        error: 'ConflictError',
        message: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
        statusCode: 409,
        details: pgError.detail
      };
    }

    // Foreign key constraint violation
    if (pgError.code === '23503') {
      return {
        ...baseResponse,
        error: 'ValidationError',
        message: 'Referenced resource does not exist',
        code: 'FOREIGN_KEY_VIOLATION',
        statusCode: 400,
        details: pgError.detail
      };
    }

    // Not null constraint violation
    if (pgError.code === '23502') {
      return {
        ...baseResponse,
        error: 'ValidationError',
        message: 'Required field is missing',
        code: 'NOT_NULL_VIOLATION',
        statusCode: 400,
        details: pgError.column
      };
    }
  }

  // Default server error
  return {
    ...baseResponse,
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : error.message,
    code: 'INTERNAL_ERROR',
    statusCode: 500
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error | FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const errorResponse = formatErrorResponse(error, request);

  // Log error for debugging
  const logLevel = errorResponse.statusCode >= 500 ? 'error' : 'warn';
  request.log[logLevel]({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    request: {
      id: request.id,
      method: request.method,
      url: request.url,
      params: request.params,
      query: request.query
    },
    response: errorResponse
  }, 'Request error');

  // Send error response
  reply.status(errorResponse.statusCode).send(errorResponse);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T>(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<T>
) {
  // Return handler directly - Fastify's global error handler will catch any errors
  return handler;
}

/**
 * Assert condition or throw error
 */
export function assert(
  condition: any,
  error: AppError | Error
): asserts condition {
  if (!condition) {
    throw error;
  }
}

/**
 * Not found handler
 */
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  reply.status(404).send({
    error: 'NotFound',
    message: `Route ${request.method} ${request.url} not found`,
    code: 'ROUTE_NOT_FOUND',
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: request.url
  });
}

export default errorHandler;

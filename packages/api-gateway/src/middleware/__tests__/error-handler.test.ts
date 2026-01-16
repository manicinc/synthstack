/**
 * @file middleware/__tests__/error-handler.test.ts
 * @description Tests for error handler middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZodError, z } from 'zod';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  assert,
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  RateLimitError,
} from '../error-handler.js';
import { createMockRequest, createMockReply } from '../../test/helpers.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with status code and message', () => {
      const error = new AppError(400, 'Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.name).toBe('AppError');
    });

    it('should include optional code and details', () => {
      const error = new AppError(400, 'Bad request', 'BAD_REQUEST', { field: 'email' });
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error for resource', () => {
      const error = new NotFoundError('User');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should include id in message when provided', () => {
      const error = new NotFoundError('User', '123');
      expect(error.message).toBe('User with id 123 not found');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Invalid token');
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('ForbiddenError', () => {
    it('should create 403 error', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should accept custom message', () => {
      const error = new ForbiddenError('Admin access required');
      expect(error.message).toBe('Admin access required');
    });
  });

  describe('ValidationError', () => {
    it('should create 400 error with validation details', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const error = new ValidationError('Invalid input', errors);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(errors);
    });
  });

  describe('ConflictError', () => {
    it('should create 409 error', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('RateLimitError', () => {
    it('should create 429 error', () => {
      const error = new RateLimitError();
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should accept custom message', () => {
      const error = new RateLimitError('Slow down please');
      expect(error.message).toBe('Slow down please');
    });
  });
});

describe('errorHandler', () => {
  let request: any;
  let reply: any;

  beforeEach(() => {
    request = createMockRequest({ url: '/api/test' });
    reply = createMockReply();
  });

  describe('AppError handling', () => {
    it('should format AppError correctly', () => {
      const error = new NotFoundError('User', '123');

      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      expect(reply.status).toHaveBeenCalledWith(404);
      const sentData = reply.send.mock.calls[0][0];
      expect(sentData.error).toBe('NotFoundError');
      expect(sentData.message).toBe('User with id 123 not found');
      expect(sentData.code).toBe('NOT_FOUND');
      expect(sentData.statusCode).toBe(404);
      expect(sentData.path).toBe('/api/test');
      expect(sentData.requestId).toBe('test-request-id');
      expect(sentData.timestamp).toBeDefined();
    });

    it('should include details from AppError', () => {
      const error = new ValidationError('Invalid input', { field: 'email', reason: 'format' });

      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      const sentData = reply.send.mock.calls[0][0];
      expect(sentData.details).toEqual({ field: 'email', reason: 'format' });
    });
  });

  describe('ZodError handling', () => {
    it('should format ZodError as 400 validation error', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().positive(),
      });

      let zodError: ZodError;
      try {
        schema.parse({ email: 'invalid', age: -5 });
      } catch (e) {
        zodError = e as ZodError;
      }

      errorHandler(zodError!, request as FastifyRequest, reply as FastifyReply);

      expect(reply.status).toHaveBeenCalledWith(400);
      const sentData = reply.send.mock.calls[0][0];
      expect(sentData.error).toBe('ValidationError');
      expect(sentData.message).toBe('Validation failed');
      expect(sentData.code).toBe('VALIDATION_ERROR');
      expect(sentData.details).toBeInstanceOf(Array);
      expect(sentData.details.length).toBe(2);
    });

    it('should include field paths in ZodError details', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      });

      let zodError: ZodError;
      try {
        schema.parse({ user: { profile: { name: '' } } });
      } catch (e) {
        zodError = e as ZodError;
      }

      errorHandler(zodError!, request as FastifyRequest, reply as FastifyReply);

      const sentData = reply.send.mock.calls[0][0];
      const nameError = sentData.details.find((d: any) => d.field === 'user.profile.name');
      expect(nameError).toBeDefined();
    });
  });

  describe('Fastify error handling', () => {
    it('should handle Fastify errors with statusCode', () => {
      const error = { name: 'FastifyError', message: 'Not allowed', statusCode: 405 } as any;

      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      expect(reply.status).toHaveBeenCalledWith(405);
      const sentData = reply.send.mock.calls[0][0];
      expect(sentData.statusCode).toBe(405);
    });
  });

  describe('PostgreSQL error handling', () => {
    it('should handle unique constraint violation (23505)', () => {
      const error = {
        name: 'error',
        message: 'duplicate key',
        code: '23505',
        detail: 'Key (email)=(test@example.com) already exists',
      } as any;

      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      expect(reply.status).toHaveBeenCalledWith(409);
      const sentData = reply.send.mock.calls[0][0];
      expect(sentData.error).toBe('ConflictError');
      expect(sentData.code).toBe('DUPLICATE_RESOURCE');
    });

    it('should handle foreign key violation (23503)', () => {
      const error = {
        name: 'error',
        message: 'foreign key violation',
        code: '23503',
        detail: 'Key (project_id)=(123) is not present in table projects',
      } as any;

      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      expect(reply.status).toHaveBeenCalledWith(400);
      const sentData = reply.send.mock.calls[0][0];
      expect(sentData.error).toBe('ValidationError');
      expect(sentData.code).toBe('FOREIGN_KEY_VIOLATION');
    });

    it('should handle not null violation (23502)', () => {
      const error = {
        name: 'error',
        message: 'null value',
        code: '23502',
        column: 'email',
      } as any;

      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      expect(reply.status).toHaveBeenCalledWith(400);
      const sentData = reply.send.mock.calls[0][0];
      expect(sentData.error).toBe('ValidationError');
      expect(sentData.code).toBe('NOT_NULL_VIOLATION');
      expect(sentData.details).toBe('email');
    });
  });

  describe('Generic error handling', () => {
    it('should handle unknown errors as 500', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      expect(reply.status).toHaveBeenCalledWith(500);
      const sentData = reply.send.mock.calls[0][0];
      expect(sentData.error).toBe('InternalServerError');
      expect(sentData.code).toBe('INTERNAL_ERROR');
    });

    it('should hide error message in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Sensitive database error');
      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      const sentData = reply.send.mock.calls[0][0];
      expect(sentData.message).toBe('An internal server error occurred');

      process.env.NODE_ENV = originalEnv;
    });

    it('should show error message in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Detailed error message');
      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      const sentData = reply.send.mock.calls[0][0];
      expect(sentData.message).toBe('Detailed error message');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Logging', () => {
    it('should log 5xx errors as error level', () => {
      const error = new Error('Internal error');
      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      expect(request.log.error).toHaveBeenCalled();
    });

    it('should log 4xx errors as warn level', () => {
      const error = new NotFoundError('Resource');
      errorHandler(error, request as FastifyRequest, reply as FastifyReply);

      expect(request.log.warn).toHaveBeenCalled();
    });
  });
});

describe('notFoundHandler', () => {
  it('should return 404 with route info', () => {
    const request = createMockRequest({ method: 'GET', url: '/api/unknown' });
    const reply = createMockReply();

    notFoundHandler(request as unknown as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(404);
    const sentData = reply.send.mock.calls[0][0];
    expect(sentData.error).toBe('NotFound');
    expect(sentData.message).toBe('Route GET /api/unknown not found');
    expect(sentData.code).toBe('ROUTE_NOT_FOUND');
  });
});

describe('asyncHandler', () => {
  it('should return the handler directly', () => {
    const handler = async () => ({ data: 'test' });
    const wrapped = asyncHandler(handler);

    // asyncHandler is a pass-through since Fastify handles errors
    expect(wrapped).toBe(handler);
  });
});

describe('assert', () => {
  it('should not throw when condition is truthy', () => {
    expect(() => assert(true, new Error('Should not throw'))).not.toThrow();
    expect(() => assert(1, new Error('Should not throw'))).not.toThrow();
    expect(() => assert('string', new Error('Should not throw'))).not.toThrow();
    expect(() => assert({}, new Error('Should not throw'))).not.toThrow();
  });

  it('should throw provided error when condition is falsy', () => {
    const error = new NotFoundError('Resource');
    expect(() => assert(false, error)).toThrow(error);
    expect(() => assert(null, error)).toThrow(error);
    expect(() => assert(undefined, error)).toThrow(error);
    expect(() => assert(0, error)).toThrow(error);
    expect(() => assert('', error)).toThrow(error);
  });

  it('should work as type guard', () => {
    const maybeUser: { name: string } | null = { name: 'John' };
    assert(maybeUser, new Error('No user'));
    // TypeScript should now know maybeUser is not null
    expect(maybeUser.name).toBe('John');
  });
});

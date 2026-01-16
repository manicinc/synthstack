/**
 * @file middleware/__tests__/validation.test.ts
 * @description Tests for validation middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  validateParams,
  ValidationError,
  commonSchemas,
  authSchemas,
  portalSchemas,
  proposalSchemas,
  activitySchemas,
} from '../validation.js';
import { createMockRequest, createMockReply } from '../../test/helpers.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

describe('Validation Middleware', () => {
  describe('ValidationError class', () => {
    it('should create error with field errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];
      const error = new ValidationError(errors);

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
    });

    it('should accept custom message', () => {
      const error = new ValidationError([], 'Custom validation error');
      expect(error.message).toBe('Custom validation error');
    });
  });

  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().positive().optional(),
    });

    it('should pass valid body through', async () => {
      const request = createMockRequest({
        body: { name: 'John', email: 'john@example.com' },
      }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateBody(testSchema);
      await middleware(request, reply);

      expect(reply.send).not.toHaveBeenCalled();
      expect(request.body).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should parse and transform body values', async () => {
      const schemaWithDefaults = z.object({
        name: z.string(),
        count: z.number().default(0),
      });

      const request = createMockRequest({
        body: { name: 'Test' },
      }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateBody(schemaWithDefaults);
      await middleware(request, reply);

      expect(request.body).toEqual({ name: 'Test', count: 0 });
    });

    it('should return 400 for invalid body', async () => {
      const request = createMockRequest({
        body: { name: '', email: 'invalid-email' },
      }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateBody(testSchema);
      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalled();

      const sentData = (reply.send as any).mock.calls[0][0];
      expect(sentData.error).toBe('Validation Error');
      expect(sentData.message).toBe('Request body validation failed');
      expect(sentData.errors).toBeInstanceOf(Array);
      expect(sentData.errors.length).toBeGreaterThan(0);
    });

    it('should include field paths in errors', async () => {
      const request = createMockRequest({
        body: { email: 'not-an-email' },
      }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateBody(testSchema);
      await middleware(request, reply);

      const sentData = (reply.send as any).mock.calls[0][0];
      const emailError = sentData.errors.find((e: any) => e.field === 'email');
      expect(emailError).toBeDefined();
    });

    it('should handle nested objects', async () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
          }),
        }),
      });

      const request = createMockRequest({
        body: { user: { profile: { name: 123 } } },
      }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateBody(nestedSchema);
      await middleware(request, reply);

      const sentData = (reply.send as any).mock.calls[0][0];
      const nameError = sentData.errors.find((e: any) => e.field === 'user.profile.name');
      expect(nameError).toBeDefined();
    });

    it('should re-throw non-Zod errors', async () => {
      const errorSchema = {
        parse: () => {
          throw new Error('Unexpected error');
        },
      } as any;

      const request = createMockRequest({ body: {} }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateBody(errorSchema);
      await expect(middleware(request, reply)).rejects.toThrow('Unexpected error');
    });
  });

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.coerce.number().positive().default(1),
      limit: z.coerce.number().positive().max(100).default(20),
      search: z.string().optional(),
    });

    it('should pass valid query through', async () => {
      const request = createMockRequest({
        query: { page: '2', limit: '50', search: 'test' },
      }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateQuery(querySchema);
      await middleware(request, reply);

      expect(reply.send).not.toHaveBeenCalled();
      expect(request.query).toEqual({ page: 2, limit: 50, search: 'test' });
    });

    it('should apply defaults for missing query params', async () => {
      const request = createMockRequest({
        query: {},
      }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateQuery(querySchema);
      await middleware(request, reply);

      expect(request.query).toEqual({ page: 1, limit: 20 });
    });

    it('should return 400 for invalid query', async () => {
      const request = createMockRequest({
        query: { page: '-5', limit: '200' },
      }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateQuery(querySchema);
      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      const sentData = (reply.send as any).mock.calls[0][0];
      expect(sentData.message).toBe('Query parameter validation failed');
    });
  });

  describe('validateParams', () => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    it('should pass valid params through', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const request = createMockRequest({
        params: { id: validUuid },
      }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateParams(paramsSchema);
      await middleware(request, reply);

      expect(reply.send).not.toHaveBeenCalled();
      expect(request.params).toEqual({ id: validUuid });
    });

    it('should return 400 for invalid params', async () => {
      const request = createMockRequest({
        params: { id: 'not-a-uuid' },
      }) as unknown as FastifyRequest;
      const reply = createMockReply() as unknown as FastifyReply;

      const middleware = validateParams(paramsSchema);
      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      const sentData = (reply.send as any).mock.calls[0][0];
      expect(sentData.message).toBe('Route parameter validation failed');
    });
  });
});

describe('Common Schemas', () => {
  describe('commonSchemas.uuid', () => {
    it('should accept valid UUIDs', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(commonSchemas.uuid.parse(validUuid)).toBe(validUuid);
    });

    it('should reject invalid UUIDs', () => {
      expect(() => commonSchemas.uuid.parse('not-a-uuid')).toThrow();
    });
  });

  describe('commonSchemas.email', () => {
    it('should accept valid emails', () => {
      expect(commonSchemas.email.parse('test@example.com')).toBe('test@example.com');
    });

    it('should reject invalid emails', () => {
      expect(() => commonSchemas.email.parse('invalid-email')).toThrow();
    });
  });

  describe('commonSchemas.pagination', () => {
    it('should provide defaults', () => {
      const result = commonSchemas.pagination.parse({});
      expect(result).toEqual({
        page: 1,
        limit: 20,
        order: 'desc',
      });
    });

    it('should coerce string numbers', () => {
      const result = commonSchemas.pagination.parse({ page: '5', limit: '50' });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });

    it('should reject limit over 100', () => {
      expect(() => commonSchemas.pagination.parse({ limit: 200 })).toThrow();
    });

    it('should reject invalid order', () => {
      expect(() => commonSchemas.pagination.parse({ order: 'random' })).toThrow();
    });
  });

  describe('commonSchemas.id', () => {
    it('should validate id param', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = commonSchemas.id.parse({ id: validUuid });
      expect(result.id).toBe(validUuid);
    });
  });

  describe('commonSchemas.dateRange', () => {
    it('should accept valid ISO dates', () => {
      const result = commonSchemas.dateRange.parse({
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-12-31T23:59:59.999Z',
      });
      expect(result.start_date).toBeDefined();
      expect(result.end_date).toBeDefined();
    });

    it('should allow optional dates', () => {
      const result = commonSchemas.dateRange.parse({});
      expect(result.start_date).toBeUndefined();
      expect(result.end_date).toBeUndefined();
    });
  });
});

describe('Auth Schemas', () => {
  describe('authSchemas.login', () => {
    it('should accept valid login data', () => {
      const result = authSchemas.login.parse({
        email: 'test@example.com',
        password: 'securepassword123',
      });
      expect(result.email).toBe('test@example.com');
    });

    it('should reject short passwords', () => {
      expect(() => authSchemas.login.parse({
        email: 'test@example.com',
        password: 'short',
      })).toThrow();
    });
  });

  describe('authSchemas.register', () => {
    it('should accept valid registration data', () => {
      const result = authSchemas.register.parse({
        email: 'new@example.com',
        password: 'securepassword123',
        first_name: 'John',
        last_name: 'Doe',
      });
      expect(result.first_name).toBe('John');
    });

    it('should allow optional company', () => {
      const result = authSchemas.register.parse({
        email: 'new@example.com',
        password: 'securepassword123',
        first_name: 'John',
        last_name: 'Doe',
        company: 'Acme Inc',
      });
      expect(result.company).toBe('Acme Inc');
    });
  });

  describe('authSchemas.changePassword', () => {
    it('should validate password change', () => {
      const result = authSchemas.changePassword.parse({
        current_password: 'oldpassword123',
        new_password: 'newpassword456',
      });
      expect(result.new_password).toBe('newpassword456');
    });
  });
});

describe('Portal Schemas', () => {
  describe('portalSchemas.sendMessage', () => {
    it('should accept valid message', () => {
      const result = portalSchemas.sendMessage.parse({
        message: 'Hello, this is a test message',
      });
      expect(result.is_client).toBe(true); // default
    });

    it('should reject empty message', () => {
      expect(() => portalSchemas.sendMessage.parse({ message: '' })).toThrow();
    });

    it('should reject message over 5000 chars', () => {
      expect(() => portalSchemas.sendMessage.parse({
        message: 'a'.repeat(5001),
      })).toThrow();
    });
  });
});

describe('Proposal Schemas', () => {
  describe('proposalSchemas.create', () => {
    it('should accept valid proposal', () => {
      const result = proposalSchemas.create.parse({
        title: 'Project Proposal',
        client_id: '550e8400-e29b-41d4-a716-446655440000',
        proposal_date: '2024-01-15T00:00:00.000Z',
        valid_until: '2024-02-15T00:00:00.000Z',
        total_value: 10000,
      });
      expect(result.requires_signature).toBe(false); // default
    });
  });

  describe('proposalSchemas.sign', () => {
    it('should validate signature data', () => {
      const result = proposalSchemas.sign.parse({
        signature: 'base64encodedSignature==',
        signed_by_name: 'John Doe',
      });
      expect(result.signed_by_name).toBe('John Doe');
    });
  });
});

describe('Activity Schemas', () => {
  describe('activitySchemas.create', () => {
    it('should accept valid activity', () => {
      const result = activitySchemas.create.parse({
        activity_type: 'meeting',
        title: 'Project kickoff',
      });
      expect(result.priority).toBe('medium'); // default
      expect(result.completed).toBe(false); // default
    });

    it('should reject invalid activity type', () => {
      expect(() => activitySchemas.create.parse({
        activity_type: 'invalid',
        title: 'Test',
      })).toThrow();
    });
  });
});

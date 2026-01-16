import { FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Validation middleware for request body, query params, and route params
 */
export class ValidationError extends Error {
  constructor(
    public errors: Array<{ field: string; message: string }>,
    message = 'Validation failed'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Request body validation failed',
          errors
        });
      }
      throw error;
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Query parameter validation failed',
          errors
        });
      }
      throw error;
    }
  };
}

/**
 * Validate route parameters against a Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Route parameter validation failed',
          errors
        });
      }
      throw error;
    }
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email(),
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc')
  }),
  id: z.object({
    id: z.string().uuid()
  }),
  dateRange: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional()
  })
};

/**
 * Validation schemas for auth
 */
export const authSchemas = {
  login: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  }),
  register: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    company: z.string().optional()
  }),
  resetPassword: z.object({
    token: z.string(),
    password: z.string().min(8)
  }),
  changePassword: z.object({
    current_password: z.string(),
    new_password: z.string().min(8)
  })
};

/**
 * Validation schemas for portal
 */
export const portalSchemas = {
  sendMessage: z.object({
    message: z.string().min(1).max(5000),
    is_client: z.boolean().default(true),
    attachments: z.array(z.string().uuid()).optional()
  }),
  updateProfile: z.object({
    first_name: z.string().min(1).optional(),
    last_name: z.string().min(1).optional(),
    phone: z.string().optional(),
    notification_preferences: z.object({
      email_enabled: z.boolean(),
      project_updates: z.boolean(),
      new_messages: z.boolean(),
      invoice_reminders: z.boolean()
    }).optional()
  })
};

/**
 * Validation schemas for proposals
 */
export const proposalSchemas = {
  create: z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    project_id: z.string().uuid().optional(),
    client_id: z.string().uuid(),
    proposal_date: z.string().datetime(),
    valid_until: z.string().datetime(),
    total_value: z.number().positive(),
    payment_terms: z.string().optional(),
    requires_signature: z.boolean().default(false)
  }),
  update: z.object({
    title: z.string().min(1).optional(),
    subtitle: z.string().optional(),
    status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']).optional(),
    total_value: z.number().positive().optional(),
    payment_terms: z.string().optional()
  }),
  sign: z.object({
    signature: z.string(), // Base64 encoded signature
    signed_by_name: z.string().min(1)
  }),
  addBlock: z.object({
    block_type: z.enum(['text', 'image', 'pricing_table', 'timeline', 'team', 'testimonial']),
    sort_order: z.number().int().nonnegative(),
    data: z.record(z.any())
  })
};

/**
 * Validation schemas for activities
 */
export const activitySchemas = {
  create: z.object({
    activity_type: z.enum(['call', 'meeting', 'email', 'task', 'note']),
    title: z.string().min(1),
    description: z.string().optional(),
    contact_id: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
    due_date: z.string().datetime().optional(),
    completed: z.boolean().default(false),
    priority: z.enum(['low', 'medium', 'high']).default('medium')
  }),
  update: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    due_date: z.string().datetime().optional(),
    completed: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional()
  })
};

export default {
  validateBody,
  validateQuery,
  validateParams,
  commonSchemas,
  authSchemas,
  portalSchemas,
  proposalSchemas,
  activitySchemas
};

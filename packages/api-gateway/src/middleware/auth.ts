/**
 * @file middleware/auth.ts
 * @description Authentication middleware and types
 *
 * Provides authentication utilities for routes.
 * Types are re-exported from the centralized types/request.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify'

// Re-export types from centralized location for backwards compatibility
export type {
  AuthenticatedRequest,
  ContactAuthenticatedRequest,
  AuthUser,
  PortalContact,
} from '../types/request.js'

// Import for use in middleware
import type { AuthenticatedRequest } from '../types/request.js'

/**
 * Authentication middleware function
 * Note: This is a placeholder. The actual authentication logic is in server.decorate('authenticate')
 * This export allows it to be imported in route files
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // This function is replaced by Fastify's decorated authenticate method
  // See index.ts -> registerAuthDecorators()
  throw new Error('authenticate middleware not initialized - use fastify.authenticate decorator instead')
}

/**
 * Admin role check middleware
 */
export async function requireAdmin(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user?.is_admin) {
    return reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Admin access required' }
    })
  }
}

/**
 * Moderator role check middleware
 */
export async function requireModerator(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user?.is_moderator && !request.user?.is_admin) {
    return reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Moderator access required' }
    })
  }
}

export default {
  authenticate,
  requireAdmin,
  requireModerator
}

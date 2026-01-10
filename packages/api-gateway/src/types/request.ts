/**
 * @file types/request.ts
 * @description Unified request type definitions for Fastify routes
 *
 * This file provides a single source of truth for authentication-related
 * request types, resolving conflicts between different type declarations.
 */

import type { FastifyRequest } from 'fastify';

/**
 * Authenticated user type
 * Used across all authenticated routes
 */
export interface AuthUser {
  id: string;
  email: string;
  display_name?: string;
  subscription_tier: string;
  is_banned?: boolean;
  is_moderator?: boolean;
  is_admin?: boolean;
  organizationId?: string;
  organization_id?: string;
}

/**
 * Portal contact type
 * Used for client portal routes where contacts (not app users) are authenticated
 */
export interface PortalContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  organization_id: string;
}

/**
 * Augment FastifyRequest with optional user property
 * This is the base type - user may or may not be present
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    contact?: PortalContact;
    rawBody?: Buffer;
  }
}

/**
 * Authenticated request interface
 * Use this type for route handlers that require authentication.
 * The preHandler middleware guarantees user is present.
 *
 * @example
 * ```typescript
 * fastify.get('/profile', {
 *   preHandler: [fastify.authenticate]
 * }, async (request, reply) => {
 *   // Use non-null assertion after auth middleware
 *   const user = request.user!;
 *   // OR cast to AuthenticatedRequest
 *   const authReq = request as AuthenticatedRequest;
 * });
 * ```
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthUser;
}

/**
 * Contact-authenticated request interface
 * For client portal routes where contacts are authenticated
 */
export interface ContactAuthenticatedRequest extends FastifyRequest {
  contact: PortalContact;
}

/**
 * Type guard to check if request has authenticated user
 */
export function isAuthenticated(request: FastifyRequest): request is AuthenticatedRequest {
  return request.user != null && request.user.id !== undefined;
}

/**
 * Type guard to check if request has authenticated contact
 */
export function isContactAuthenticated(request: FastifyRequest): request is ContactAuthenticatedRequest {
  return request.contact != null && request.contact.id !== undefined;
}

/**
 * Helper to safely get authenticated user from request
 * Throws if user is not authenticated
 */
export function getAuthUser(request: FastifyRequest): AuthUser {
  if (!request.user) {
    throw new Error('User not authenticated');
  }
  return request.user;
}

/**
 * Helper to safely get authenticated contact from request
 * Throws if contact is not authenticated
 */
export function getAuthContact(request: FastifyRequest): PortalContact {
  if (!request.contact) {
    throw new Error('Contact not authenticated');
  }
  return request.contact;
}

export default {
  isAuthenticated,
  isContactAuthenticated,
  getAuthUser,
  getAuthContact,
};

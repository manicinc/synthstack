/**
 * @file middleware/__tests__/auth.test.ts
 * @description Tests for authentication middleware and type guards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate, requireAdmin, requireModerator } from '../auth.js';
import {
  isAuthenticated,
  isContactAuthenticated,
  getAuthUser,
  getAuthContact,
} from '../../types/request.js';
import {
  createMockRequest,
  createMockReply,
  createMockUser,
} from '../../test/helpers.js';
import type { MockRequest, MockReply } from '../../test/helpers.js';
import type { FastifyRequest } from 'fastify';

describe('Authentication Middleware', () => {
  let mockRequest: MockRequest;
  let mockReply: MockReply;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockReply = createMockReply();
  });

  describe('authenticate', () => {
    it('should throw error as it is a placeholder', async () => {
      await expect(
        authenticate(mockRequest as any, mockReply as any)
      ).rejects.toThrow('authenticate middleware not initialized');
    });

    it('should include instruction to use decorator', async () => {
      await expect(
        authenticate(mockRequest as any, mockReply as any)
      ).rejects.toThrow('use fastify.authenticate decorator instead');
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users to proceed', async () => {
      mockRequest.user = createMockUser({ is_admin: true });

      const result = await requireAdmin(mockRequest as any, mockReply as any);

      expect(result).toBeUndefined();
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should reject non-admin users with 403', async () => {
      mockRequest.user = createMockUser({ is_admin: false });

      await requireAdmin(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      });
    });

    it('should reject when user is undefined', async () => {
      mockRequest.user = undefined;

      await requireAdmin(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });

    it('should reject moderators who are not admins', async () => {
      mockRequest.user = createMockUser({ is_admin: false, is_moderator: true });

      await requireAdmin(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireModerator', () => {
    it('should allow moderator users to proceed', async () => {
      mockRequest.user = createMockUser({ is_moderator: true, is_admin: false });

      const result = await requireModerator(mockRequest as any, mockReply as any);

      expect(result).toBeUndefined();
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it('should allow admin users to proceed', async () => {
      mockRequest.user = createMockUser({ is_admin: true, is_moderator: false });

      const result = await requireModerator(mockRequest as any, mockReply as any);

      expect(result).toBeUndefined();
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should allow users who are both admin and moderator', async () => {
      mockRequest.user = createMockUser({ is_admin: true, is_moderator: true });

      const result = await requireModerator(mockRequest as any, mockReply as any);

      expect(result).toBeUndefined();
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should reject regular users with 403', async () => {
      mockRequest.user = createMockUser({ is_admin: false, is_moderator: false });

      await requireModerator(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: { code: 'FORBIDDEN', message: 'Moderator access required' }
      });
    });

    it('should reject when user is undefined', async () => {
      mockRequest.user = undefined;

      await requireModerator(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });
  });
});

describe('Authentication Type Guards', () => {
  describe('isAuthenticated', () => {
    it('should return true when user is present with id', () => {
      const request = {
        user: { id: 'user-123', email: 'test@example.com' }
      } as FastifyRequest;

      expect(isAuthenticated(request)).toBe(true);
    });

    it('should return false when user is undefined', () => {
      const request = {
        user: undefined
      } as FastifyRequest;

      expect(isAuthenticated(request)).toBe(false);
    });

    it('should return false when user exists but id is undefined', () => {
      const request = {
        user: { email: 'test@example.com' }
      } as any;

      expect(isAuthenticated(request)).toBe(false);
    });

    it('should return false when user is null', () => {
      const request = {
        user: null
      } as any;

      expect(isAuthenticated(request)).toBe(false);
    });
  });

  describe('isContactAuthenticated', () => {
    it('should return true when contact is present with id', () => {
      const request = {
        contact: { id: 'contact-123', email: 'contact@example.com', organization_id: 'org-1' }
      } as FastifyRequest;

      expect(isContactAuthenticated(request)).toBe(true);
    });

    it('should return false when contact is undefined', () => {
      const request = {
        contact: undefined
      } as FastifyRequest;

      expect(isContactAuthenticated(request)).toBe(false);
    });

    it('should return false when contact exists but id is undefined', () => {
      const request = {
        contact: { email: 'contact@example.com' }
      } as any;

      expect(isContactAuthenticated(request)).toBe(false);
    });
  });
});

describe('Authentication Helpers', () => {
  describe('getAuthUser', () => {
    it('should return user when authenticated', () => {
      const user = { id: 'user-123', email: 'test@example.com', subscription_tier: 'pro' };
      const request = { user } as FastifyRequest;

      const result = getAuthUser(request);

      expect(result).toBe(user);
      expect(result.id).toBe('user-123');
    });

    it('should throw error when user is undefined', () => {
      const request = { user: undefined } as FastifyRequest;

      expect(() => getAuthUser(request)).toThrow('User not authenticated');
    });

    it('should throw error when user is null', () => {
      const request = { user: null } as any;

      expect(() => getAuthUser(request)).toThrow('User not authenticated');
    });
  });

  describe('getAuthContact', () => {
    it('should return contact when authenticated', () => {
      const contact = {
        id: 'contact-123',
        email: 'contact@example.com',
        organization_id: 'org-1'
      };
      const request = { contact } as FastifyRequest;

      const result = getAuthContact(request);

      expect(result).toBe(contact);
      expect(result.id).toBe('contact-123');
    });

    it('should throw error when contact is undefined', () => {
      const request = { contact: undefined } as FastifyRequest;

      expect(() => getAuthContact(request)).toThrow('Contact not authenticated');
    });

    it('should throw error when contact is null', () => {
      const request = { contact: null } as any;

      expect(() => getAuthContact(request)).toThrow('Contact not authenticated');
    });
  });
});

describe('Role-Based Access Control Scenarios', () => {
  let mockReply: MockReply;

  beforeEach(() => {
    mockReply = createMockReply();
  });

  describe('Admin hierarchy', () => {
    it('admin should have access to admin-only routes', async () => {
      const request = createMockRequest({
        user: createMockUser({ is_admin: true, is_moderator: false })
      });

      await requireAdmin(request as any, mockReply as any);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('admin should have access to moderator routes', async () => {
      const request = createMockRequest({
        user: createMockUser({ is_admin: true, is_moderator: false })
      });

      await requireModerator(request as any, mockReply as any);

      expect(mockReply.status).not.toHaveBeenCalled();
    });
  });

  describe('Moderator permissions', () => {
    it('moderator should NOT have access to admin-only routes', async () => {
      const request = createMockRequest({
        user: createMockUser({ is_admin: false, is_moderator: true })
      });

      await requireAdmin(request as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });

    it('moderator should have access to moderator routes', async () => {
      const request = createMockRequest({
        user: createMockUser({ is_admin: false, is_moderator: true })
      });

      await requireModerator(request as any, mockReply as any);

      expect(mockReply.status).not.toHaveBeenCalled();
    });
  });

  describe('Regular user permissions', () => {
    it('regular user should NOT have access to admin-only routes', async () => {
      const request = createMockRequest({
        user: createMockUser({ is_admin: false, is_moderator: false })
      });

      await requireAdmin(request as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });

    it('regular user should NOT have access to moderator routes', async () => {
      const request = createMockRequest({
        user: createMockUser({ is_admin: false, is_moderator: false })
      });

      await requireModerator(request as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Unauthenticated access', () => {
    it('unauthenticated request should be rejected from admin routes', async () => {
      const request = createMockRequest({ user: undefined });

      await requireAdmin(request as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });

    it('unauthenticated request should be rejected from moderator routes', async () => {
      const request = createMockRequest({ user: undefined });

      await requireModerator(request as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });
  });
});

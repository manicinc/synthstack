/**
 * @file services/__tests__/github-org.test.ts
 * @description Unit tests for GitHub organization management service
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Mock Octokit
const mockOctokit = {
  users: {
    getByUsername: vi.fn(),
  },
  orgs: {
    createInvitation: vi.fn(),
    checkMembershipForUser: vi.fn(),
    listPendingInvitations: vi.fn(),
    removeMembershipForUser: vi.fn(),
  },
  teams: {
    getByName: vi.fn(),
  },
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => mockOctokit),
}));

// Import after mocking
import { GitHubOrgService } from '../github-org.js';

describe('GitHubOrgService', () => {
  let service: GitHubOrgService;
  let mockFastify: FastifyInstance;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save original env
    originalEnv = { ...process.env };

    // Mock environment variables
    process.env.GH_PAT = 'ghp_test_token';
    process.env.GITHUB_ORG_NAME = 'test-org';
    process.env.GITHUB_TEAM_SLUG = 'test-team';

    mockFastify = {
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    } as any;

    service = new GitHubOrgService(mockFastify);
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('validateUsername', () => {
    it('should validate existing GitHub username', async () => {
      mockOctokit.users.getByUsername.mockResolvedValue({
        data: { id: 12345, login: 'testuser' },
      });

      const result = await service.validateUsername('testuser');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockOctokit.users.getByUsername).toHaveBeenCalledWith({
        username: 'testuser',
      });
    });

    it('should return error for non-existent username', async () => {
      mockOctokit.users.getByUsername.mockRejectedValue({
        status: 404,
        message: 'Not Found',
      });

      const result = await service.validateUsername('nonexistent');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('GitHub username not found');
    });

    it('should handle API errors gracefully', async () => {
      mockOctokit.users.getByUsername.mockRejectedValue({
        status: 500,
        message: 'Server Error',
      });

      const result = await service.validateUsername('testuser');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Failed to validate username');
      expect(mockFastify.log.error).toHaveBeenCalled();
    });

    it('should handle network timeouts', async () => {
      mockOctokit.users.getByUsername.mockRejectedValue(
        new Error('ETIMEDOUT')
      );

      const result = await service.validateUsername('testuser');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Failed to validate username');
    });
  });

  describe('inviteToOrganization', () => {
    beforeEach(() => {
      mockOctokit.users.getByUsername.mockResolvedValue({
        data: { id: 12345, login: 'testuser' },
      });
      mockOctokit.teams.getByName.mockResolvedValue({
        data: { id: 67890, name: 'test-team' },
      });
    });

    it('should send org invitation with team membership', async () => {
      mockOctokit.orgs.createInvitation.mockResolvedValue({
        data: { id: 999, email: 'test@example.com' },
      });

      const result = await service.inviteToOrganization(
        'testuser',
        'test@example.com'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockOctokit.orgs.createInvitation).toHaveBeenCalledWith({
        org: 'test-org',
        invitee_id: 12345,
        role: 'direct_member',
        team_ids: [67890],
      });
      expect(mockFastify.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          org: 'test-org',
        }),
        'Invited user to organization'
      );
    });

    it('should handle already invited users', async () => {
      mockOctokit.orgs.createInvitation.mockRejectedValue({
        status: 422,
        message: 'Invitation already exists',
      });

      const result = await service.inviteToOrganization(
        'testuser',
        'test@example.com'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invitation already exists');
    });

    it('should log invitation details', async () => {
      mockOctokit.orgs.createInvitation.mockResolvedValue({
        data: { id: 999 },
      });

      await service.inviteToOrganization('testuser', 'test@example.com');

      expect(mockFastify.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          org: 'test-org',
        }),
        'Invited user to organization'
      );
    });

    it('should handle team not found errors', async () => {
      mockOctokit.teams.getByName.mockRejectedValue({
        status: 404,
        message: 'Team not found',
      });

      const result = await service.inviteToOrganization(
        'testuser',
        'test@example.com'
      );

      expect(result.success).toBe(false);
      expect(mockFastify.log.error).toHaveBeenCalled();
    });
  });

  describe('checkMembershipStatus', () => {
    it('should return "active" for accepted invitations', async () => {
      mockOctokit.orgs.checkMembershipForUser.mockResolvedValue({
        data: {},
      });

      const status = await service.checkMembershipStatus('testuser');

      expect(status).toBe('active');
      expect(mockOctokit.orgs.checkMembershipForUser).toHaveBeenCalledWith({
        org: 'test-org',
        username: 'testuser',
      });
    });

    it('should return "pending" for pending invitations', async () => {
      mockOctokit.orgs.checkMembershipForUser.mockRejectedValue({
        status: 404,
      });
      mockOctokit.orgs.listPendingInvitations.mockResolvedValue({
        data: [
          { id: 1, login: 'testuser', email: 'test@example.com' },
          { id: 2, login: 'otheruser', email: 'other@example.com' },
        ],
      });

      const status = await service.checkMembershipStatus('testuser');

      expect(status).toBe('pending');
    });

    it('should return "none" for no invitation', async () => {
      mockOctokit.orgs.checkMembershipForUser.mockRejectedValue({
        status: 404,
      });
      mockOctokit.orgs.listPendingInvitations.mockResolvedValue({
        data: [{ id: 2, login: 'otheruser', email: 'other@example.com' }],
      });

      const status = await service.checkMembershipStatus('testuser');

      expect(status).toBe('none');
    });

    it('should handle case-insensitive username matching', async () => {
      mockOctokit.orgs.checkMembershipForUser.mockRejectedValue({
        status: 404,
      });
      mockOctokit.orgs.listPendingInvitations.mockResolvedValue({
        data: [{ id: 1, login: 'TestUser', email: 'test@example.com' }],
      });

      const status = await service.checkMembershipStatus('testuser');

      expect(status).toBe('pending');
    });
  });

  describe('revokeAccess', () => {
    it('should remove user from organization', async () => {
      mockOctokit.orgs.removeMembershipForUser.mockResolvedValue({
        data: {},
      });

      const result = await service.revokeAccess('testuser');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockOctokit.orgs.removeMembershipForUser).toHaveBeenCalledWith({
        org: 'test-org',
        username: 'testuser',
      });
      expect(mockFastify.log.info).toHaveBeenCalledWith(
        { username: 'testuser' },
        'Revoked organization access'
      );
    });

    it('should handle non-member revocation gracefully', async () => {
      mockOctokit.orgs.removeMembershipForUser.mockRejectedValue({
        status: 404,
        message: 'User is not a member',
      });

      const result = await service.revokeAccess('testuser');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User is not a member');
      expect(mockFastify.log.error).toHaveBeenCalled();
    });

    it('should handle API errors during revocation', async () => {
      mockOctokit.orgs.removeMembershipForUser.mockRejectedValue({
        status: 500,
        message: 'Internal Server Error',
      });

      const result = await service.revokeAccess('testuser');

      expect(result.success).toBe(false);
      expect(mockFastify.log.error).toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('should throw error if GH_PAT is missing', () => {
      delete process.env.GH_PAT;

      expect(() => new GitHubOrgService(mockFastify)).toThrow(
        'GH_PAT environment variable is required'
      );
    });

    it('should use default org name if not provided', () => {
      delete process.env.GITHUB_ORG_NAME;
      const service = new GitHubOrgService(mockFastify);

      expect(service).toBeDefined();
      // Default org name should be 'manicinc'
    });

    it('should use default team slug if not provided', () => {
      delete process.env.GITHUB_TEAM_SLUG;
      const service = new GitHubOrgService(mockFastify);

      expect(service).toBeDefined();
      // Default team slug should be 'lifetime-buyers'
    });
  });
});

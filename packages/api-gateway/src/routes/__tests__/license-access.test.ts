/**
 * @file routes/__tests__/license-access.test.ts
 * @description Unit tests for lifetime license access routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import licenseAccessRoutes from '../license-access.js';

// Mock GitHub org service
const mockGitHubService = {
  validateUsername: vi.fn(),
  inviteToOrganization: vi.fn(),
  checkMembershipStatus: vi.fn(),
  revokeAccess: vi.fn(),
};

vi.mock('../../services/github-org.js', () => ({
  GitHubOrgService: vi.fn(() => mockGitHubService),
}));

// Mock email service
const mockEmailService = {
  sendLifetimeInvitationSentEmail: vi.fn().mockResolvedValue({ success: true }),
  sendLifetimeAccessGrantedEmail: vi.fn().mockResolvedValue({ success: true }),
};

vi.mock('../../services/email/index.js', () => ({
  getEmailService: vi.fn(() => mockEmailService),
}));

describe('License Access Routes', () => {
  let server: FastifyInstance;
  let mockPgQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    server = Fastify();
    mockPgQuery = vi.fn();

    // Mock pg plugin
    server.decorate('pg', { query: mockPgQuery } as any);

    await server.register(licenseAccessRoutes, { prefix: '/api/v1/license-access' });
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
    vi.clearAllMocks();
  });

  describe('GET /status', () => {
    it('should return license status for valid session', async () => {
      const mockLicense = {
        email: 'test@example.com',
        github_username: 'testuser',
        github_access_status: 'invited',
        github_username_submitted_at: '2024-01-10T10:00:00Z',
        github_invitation_sent_at: '2024-01-10T10:05:00Z',
        github_invitation_accepted_at: null,
      };

      mockPgQuery.mockResolvedValue({
        rows: [mockLicense],
        rowCount: 1,
      });

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/license-access/status?session=cs_test_123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockLicense);
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['cs_test_123']
      );
    });

    it('should return 404 for non-existent license', async () => {
      mockPgQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/license-access/status?session=cs_test_invalid',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('License not found');
    });

    it('should require session query parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/license-access/status',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      mockPgQuery.mockRejectedValue(new Error('Database connection failed'));

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/license-access/status?session=cs_test_123',
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('POST /submit-username', () => {
    it('should successfully submit GitHub username and send invitation', async () => {
      // Mock license query
      mockPgQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'license-123',
              email: 'test@example.com',
              github_access_status: 'pending',
            },
          ],
          rowCount: 1,
        })
        // Mock update username
        .mockResolvedValueOnce({ rowCount: 1 })
        // Mock update status to invited
        .mockResolvedValueOnce({ rowCount: 1 });

      mockGitHubService.validateUsername.mockResolvedValue({ valid: true });
      mockGitHubService.inviteToOrganization.mockResolvedValue({
        success: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/submit-username',
        payload: {
          sessionId: 'cs_test_123',
          githubUsername: 'testuser',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('GitHub invitation sent');
      expect(mockGitHubService.validateUsername).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockGitHubService.inviteToOrganization).toHaveBeenCalledWith(
        'testuser',
        'test@example.com'
      );
      expect(mockEmailService.sendLifetimeInvitationSentEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        githubUsername: 'testuser',
      });
    });

    it('should return 404 for non-existent license', async () => {
      mockPgQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/submit-username',
        payload: {
          sessionId: 'cs_test_invalid',
          githubUsername: 'testuser',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('License not found');
    });

    it('should reject already active licenses', async () => {
      mockPgQuery.mockResolvedValue({
        rows: [
          {
            id: 'license-123',
            email: 'test@example.com',
            github_access_status: 'active',
          },
        ],
        rowCount: 1,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/submit-username',
        payload: {
          sessionId: 'cs_test_123',
          githubUsername: 'testuser',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('GitHub access already granted');
    });

    it('should validate GitHub username format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/submit-username',
        payload: {
          sessionId: 'cs_test_123',
          githubUsername: 'invalid username!',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid GitHub usernames', async () => {
      mockPgQuery.mockResolvedValue({
        rows: [
          {
            id: 'license-123',
            email: 'test@example.com',
            github_access_status: 'pending',
          },
        ],
        rowCount: 1,
      });

      mockGitHubService.validateUsername.mockResolvedValue({
        valid: false,
        error: 'GitHub username not found',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/submit-username',
        payload: {
          sessionId: 'cs_test_123',
          githubUsername: 'nonexistentuser123456',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('GitHub username not found');
    });

    it('should handle GitHub invitation failures', async () => {
      mockPgQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'license-123',
              email: 'test@example.com',
              github_access_status: 'pending',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rowCount: 1 });

      mockGitHubService.validateUsername.mockResolvedValue({ valid: true });
      mockGitHubService.inviteToOrganization.mockResolvedValue({
        success: false,
        error: 'GitHub API rate limit exceeded',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/submit-username',
        payload: {
          sessionId: 'cs_test_123',
          githubUsername: 'testuser',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Failed to send GitHub invitation');
    });

    it('should require both sessionId and githubUsername', async () => {
      const response1 = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/submit-username',
        payload: {
          githubUsername: 'testuser',
        },
      });

      expect(response1.statusCode).toBe(400);

      const response2 = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/submit-username',
        payload: {
          sessionId: 'cs_test_123',
        },
      });

      expect(response2.statusCode).toBe(400);
    });
  });

  describe('POST /check-acceptance', () => {
    it('should detect accepted invitation and update status', async () => {
      mockPgQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'license-123',
              email: 'test@example.com',
              github_username: 'testuser',
              github_access_status: 'invited',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rowCount: 1 });

      mockGitHubService.checkMembershipStatus.mockResolvedValue('active');

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/check-acceptance',
        payload: {
          sessionId: 'cs_test_123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe('active');
      expect(mockGitHubService.checkMembershipStatus).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockEmailService.sendLifetimeAccessGrantedEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        githubUsername: 'testuser',
      });
    });

    it('should return pending status if not yet accepted', async () => {
      mockPgQuery.mockResolvedValue({
        rows: [
          {
            id: 'license-123',
            email: 'test@example.com',
            github_username: 'testuser',
            github_access_status: 'invited',
          },
        ],
        rowCount: 1,
      });

      mockGitHubService.checkMembershipStatus.mockResolvedValue('pending');

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/check-acceptance',
        payload: {
          sessionId: 'cs_test_123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe('pending');
      expect(mockEmailService.sendLifetimeAccessGrantedEmail).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent license', async () => {
      mockPgQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/check-acceptance',
        payload: {
          sessionId: 'cs_test_invalid',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should require GitHub username to be submitted first', async () => {
      mockPgQuery.mockResolvedValue({
        rows: [
          {
            id: 'license-123',
            email: 'test@example.com',
            github_username: null,
            github_access_status: 'pending',
          },
        ],
        rowCount: 1,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/license-access/check-acceptance',
        payload: {
          sessionId: 'cs_test_123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('GitHub username not submitted');
    });
  });
});

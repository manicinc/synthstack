/**
 * Unit tests for project-members routes (Postgres-backed)
 *
 * Covers:
 * - Team member profile updates (own + invite-permission users)
 * - Team context visibility + shape
 * - Assignee suggestions scoring basics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import projectMembersRoutes from '../project-members.js';
import { TEST_PROJECT, TEST_USERS, TEST_TEAM_MEMBERS } from '../../__tests__/fixtures/team-members.js';

describe('Project Members Routes', () => {
  let server: FastifyInstance;
  let mockPgQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    server = Fastify();
    mockPgQuery = vi.fn();

    server.decorate('pg', { query: mockPgQuery } as any);

    server.decorate('authenticate', async (request: any, reply: any) => {
      if (!request.headers.authorization) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const userId = request.headers['x-test-user-id'] || TEST_USERS.owner.id;
      const email = request.headers['x-test-user-email'] || TEST_USERS.owner.email;
      const isAdmin = request.headers['x-test-is-admin'] === 'true';

      request.user = { id: userId, email, is_admin: isAdmin };
    });

    await server.register(projectMembersRoutes);
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
    vi.clearAllMocks();
  });

  // ============================================
  // Profile Update Tests
  // ============================================

  describe('PATCH /projects/:projectId/members/:memberId/profile', () => {
    it('should update own profile successfully', async () => {
      mockPgQuery
        .mockResolvedValueOnce({
          rows: [{
            id: TEST_TEAM_MEMBERS.editor.id,
            project_id: TEST_PROJECT.id,
            user_id: TEST_USERS.member.id,
            profile: {},
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.editor.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.member.id,
        },
        payload: {
          roleTitle: 'Engineer',
          skills: ['TypeScript', 'Node.js'],
          availability: 'available',
          capacityPercent: 40,
          preferredTaskTypes: ['development'],
          bio: 'Hello',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Profile updated successfully');
      expect(body.data).toHaveProperty('memberId', TEST_TEAM_MEMBERS.editor.id);
      expect(body.data.profile).toHaveProperty('skills');

      const updateCall = mockPgQuery.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE project_members SET profile');
      const jsonArg = updateCall[1][0] as string;
      const saved = JSON.parse(jsonArg);
      expect(saved.role_title).toBe('Engineer');
      expect(saved.skills).toEqual(['TypeScript', 'Node.js']);
      expect(saved.capacity_percent).toBe(40);
    });

    it('should allow inviter (admin/owner) to update another member profile', async () => {
      mockPgQuery
        // Member lookup
        .mockResolvedValueOnce({
          rows: [{
            id: TEST_TEAM_MEMBERS.viewer.id,
            project_id: TEST_PROJECT.id,
            user_id: TEST_USERS.viewer.id,
            profile: {},
          }],
        })
        // requireProjectPermission('invite')
        .mockResolvedValueOnce({
          rows: [{
            id: TEST_PROJECT.id,
            owner_id: TEST_USERS.owner.id,
            is_system: false,
            member_role: 'admin',
            member_permissions: { can_invite: true },
          }],
        })
        // Update
        .mockResolvedValueOnce({ rows: [] });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.viewer.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.admin.id,
        },
        payload: { roleTitle: 'Updated by Admin' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });

    it('should reject non-inviter updating others profile', async () => {
      mockPgQuery
        .mockResolvedValueOnce({
          rows: [{
            id: TEST_TEAM_MEMBERS.owner.id,
            project_id: TEST_PROJECT.id,
            user_id: TEST_USERS.owner.id,
            profile: {},
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: TEST_PROJECT.id,
            owner_id: TEST_USERS.owner.id,
            is_system: false,
            member_role: 'member',
            member_permissions: {},
          }],
        });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.owner.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.member.id,
        },
        payload: { roleTitle: 'Hacked Title' },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('FORBIDDEN');
    });

    it('should clamp capacity to 0..100', async () => {
      mockPgQuery
        .mockResolvedValueOnce({
          rows: [{
            id: TEST_TEAM_MEMBERS.editor.id,
            project_id: TEST_PROJECT.id,
            user_id: TEST_USERS.member.id,
            profile: {},
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.editor.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.member.id,
        },
        payload: { capacityPercent: 150 },
      });

      expect(response.statusCode).toBe(200);
      const jsonArg = mockPgQuery.mock.calls[1][1][0] as string;
      expect(JSON.parse(jsonArg).capacity_percent).toBe(100);
    });

    it('should return 404 when member not found', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [] });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/nonexistent/profile`,
        headers: { authorization: 'Bearer test-token' },
        payload: { roleTitle: 'Test' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ============================================
  // Team Context Tests
  // ============================================

  describe('GET /projects/:projectId/team-context', () => {
    it('should return team context for authorized users', async () => {
      mockPgQuery
        // requireProjectPermission('view')
        .mockResolvedValueOnce({
          rows: [{
            id: TEST_PROJECT.id,
            owner_id: TEST_USERS.owner.id,
            is_system: false,
            member_role: 'owner',
            member_permissions: {},
          }],
        })
        // members query
        .mockResolvedValueOnce({
          rows: [
            { id: TEST_TEAM_MEMBERS.owner.id, user_id: TEST_USERS.owner.id, role: 'owner', profile: {}, email: TEST_USERS.owner.email, display_name: 'Project Owner' },
            { id: TEST_TEAM_MEMBERS.admin.id, user_id: TEST_USERS.admin.id, role: 'admin', profile: {}, email: TEST_USERS.admin.email, display_name: 'Team Admin' },
          ],
        });

      const response = await server.inject({
        method: 'GET',
        url: `/projects/${TEST_PROJECT.id}/team-context`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.projectId).toBe(TEST_PROJECT.id);
      expect(Array.isArray(body.data.members)).toBe(true);
      expect(body.data.members[0]).toHaveProperty('profile');
    });

    it('should return 404 for unauthorized users (no membership)', async () => {
      mockPgQuery.mockResolvedValueOnce({
        rows: [{
          id: TEST_PROJECT.id,
          owner_id: TEST_USERS.owner.id,
          is_system: false,
          member_role: null,
          member_permissions: null,
        }],
      });

      const response = await server.inject({
        method: 'GET',
        url: `/projects/${TEST_PROJECT.id}/team-context`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.outsider.id,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ============================================
  // Suggest Assignee Tests
  // ============================================

  describe('POST /projects/:projectId/suggest-assignee', () => {
    it('should return up to 3 suggestions sorted by score', async () => {
      mockPgQuery
        // requireProjectPermission('view')
        .mockResolvedValueOnce({
          rows: [{
            id: TEST_PROJECT.id,
            owner_id: TEST_USERS.owner.id,
            is_system: false,
            member_role: 'owner',
            member_permissions: {},
          }],
        })
        // members query
        .mockResolvedValueOnce({
          rows: [
            {
              id: TEST_TEAM_MEMBERS.owner.id,
              user_id: TEST_USERS.owner.id,
              role: 'owner',
              email: TEST_USERS.owner.email,
              display_name: 'Owner',
              profile: { skills: ['Vue', 'TypeScript'], availability: 'available', capacity_percent: 40, preferred_task_types: ['Development'] },
            },
            {
              id: TEST_TEAM_MEMBERS.admin.id,
              user_id: TEST_USERS.admin.id,
              role: 'admin',
              email: TEST_USERS.admin.email,
              display_name: 'Admin',
              profile: { skills: ['React'], availability: 'busy', capacity_percent: 80, preferred_task_types: [] },
            },
            {
              id: TEST_TEAM_MEMBERS.viewer.id,
              user_id: TEST_USERS.viewer.id,
              role: 'viewer',
              email: TEST_USERS.viewer.email,
              display_name: 'Viewer',
              profile: { skills: [], availability: 'away', capacity_percent: 100, preferred_task_types: [] },
            },
            {
              id: TEST_TEAM_MEMBERS.editor.id,
              user_id: TEST_USERS.member.id,
              role: 'member',
              email: TEST_USERS.member.email,
              display_name: 'Member',
              profile: { skills: ['TypeScript'], availability: 'available', capacity_percent: 20, preferred_task_types: ['Development'] },
            },
          ],
        });

      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: { requiredSkills: ['TypeScript'], taskType: 'Development' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.suggestions)).toBe(true);
      expect(body.data.suggestions.length).toBeLessThanOrEqual(3);

      const scores = body.data.suggestions.map((s: any) => s.matchScore);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });

    it('should include skill match reasons when skills match', async () => {
      mockPgQuery
        .mockResolvedValueOnce({
          rows: [{
            id: TEST_PROJECT.id,
            owner_id: TEST_USERS.owner.id,
            is_system: false,
            member_role: 'owner',
            member_permissions: {},
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: TEST_TEAM_MEMBERS.owner.id,
            user_id: TEST_USERS.owner.id,
            role: 'owner',
            email: TEST_USERS.owner.email,
            display_name: 'Owner',
            profile: { skills: ['Vue', 'TypeScript'], availability: 'available', capacity_percent: 40 },
          }],
        });

      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: { requiredSkills: ['Vue'] },
      });

      expect(response.statusCode).toBe(200);
      const ownerSuggestion = response.json().data.suggestions[0];
      expect(ownerSuggestion.matchReasons.some((r: string) => r.includes('Vue'))).toBe(true);
    });

    it('should return 404 for unauthorized users (no membership)', async () => {
      mockPgQuery.mockResolvedValueOnce({
        rows: [{
          id: TEST_PROJECT.id,
          owner_id: TEST_USERS.owner.id,
          is_system: false,
          member_role: null,
          member_permissions: null,
        }],
      });

      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.outsider.id,
        },
        payload: { requiredSkills: ['TypeScript'] },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});


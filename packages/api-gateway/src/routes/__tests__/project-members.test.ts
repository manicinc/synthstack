/**
 * Unit tests for project-members routes
 * Tests team profile management, team context, and assignee suggestions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import {
  TEST_PROJECT,
  TEST_USERS,
  TEST_TEAM_MEMBERS,
  MOCK_PROFILE_UPDATE,
  MOCK_SUGGEST_ASSIGNEE_REQUEST,
} from '../../__tests__/fixtures/team-members.js';

// Use vi.hoisted to define mocks before they're used in vi.mock
const { mockItems, mockUsers } = vi.hoisted(() => ({
  mockItems: {
    readOne: vi.fn(),
    readByQuery: vi.fn(),
    updateOne: vi.fn(),
    createOne: vi.fn(),
    deleteOne: vi.fn(),
  },
  mockUsers: {
    readOne: vi.fn(),
  },
}));

vi.mock('../../services/directus.js', () => ({
  directus: {
    items: vi.fn(() => mockItems),
    users: mockUsers,
  },
}));

// Import routes after mocking
import projectMembersRoutes from '../project-members.js';

describe('Project Members Routes', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify();

    // Decorate with authenticate middleware
    server.decorate('authenticate', async (request: any, reply: any) => {
      if (!request.headers.authorization) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const userId = request.headers['x-test-user-id'] || TEST_USERS.owner.id;
      request.user = {
        id: userId,
        email: request.headers['x-test-user-email'] || TEST_USERS.owner.email,
      };
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
      // Setup: member updating their own profile
      mockItems.readOne.mockResolvedValueOnce({
        ...TEST_TEAM_MEMBERS.member,
        user_id: TEST_USERS.member.id,
      });
      mockItems.updateOne.mockResolvedValueOnce({ success: true });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.member.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.member.id,
        },
        payload: MOCK_PROFILE_UPDATE,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Profile updated successfully');
      expect(mockItems.updateOne).toHaveBeenCalledWith(
        TEST_TEAM_MEMBERS.member.id,
        expect.objectContaining({
          profile: expect.objectContaining({
            role_title: MOCK_PROFILE_UPDATE.roleTitle,
            skills: MOCK_PROFILE_UPDATE.skills,
          }),
        })
      );
    });

    it('should allow admin to update any member profile', async () => {
      // Setup: admin updating another member's profile
      mockItems.readOne.mockResolvedValueOnce({
        ...TEST_TEAM_MEMBERS.member,
        user_id: TEST_USERS.member.id,
      });
      // Admin check query
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [TEST_TEAM_MEMBERS.admin],
      });
      mockItems.updateOne.mockResolvedValueOnce({ success: true });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.member.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.admin.id,
        },
        payload: { roleTitle: 'Updated by Admin' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });

    it('should allow owner to update any member profile', async () => {
      // Setup: owner updating member's profile
      mockItems.readOne.mockResolvedValueOnce({
        ...TEST_TEAM_MEMBERS.member,
        user_id: TEST_USERS.member.id,
      });
      // Owner check query
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [TEST_TEAM_MEMBERS.owner],
      });
      mockItems.updateOne.mockResolvedValueOnce({ success: true });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.member.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: { roleTitle: 'Updated by Owner' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject non-admin updating others profile', async () => {
      // Setup: regular member trying to update another member's profile
      mockItems.readOne.mockResolvedValueOnce({
        ...TEST_TEAM_MEMBERS.owner,
        user_id: TEST_USERS.owner.id,
      });
      // Permission check - not admin/owner
      mockItems.readByQuery.mockResolvedValueOnce({
        data: [],
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
      expect(response.json().error).toBe('You can only update your own profile');
    });

    it('should validate capacity range 0-100', async () => {
      mockItems.readOne.mockResolvedValueOnce({
        ...TEST_TEAM_MEMBERS.member,
        user_id: TEST_USERS.member.id,
      });
      mockItems.updateOne.mockResolvedValueOnce({ success: true });

      // Test with capacity > 100
      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.member.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.member.id,
        },
        payload: { capacityPercent: 150 },
      });

      expect(response.statusCode).toBe(200);
      // Should be clamped to 100
      expect(mockItems.updateOne).toHaveBeenCalledWith(
        TEST_TEAM_MEMBERS.member.id,
        expect.objectContaining({
          profile: expect.objectContaining({
            capacity_percent: 100,
          }),
        })
      );
    });

    it('should clamp negative capacity to 0', async () => {
      mockItems.readOne.mockResolvedValueOnce({
        ...TEST_TEAM_MEMBERS.member,
        user_id: TEST_USERS.member.id,
      });
      mockItems.updateOne.mockResolvedValueOnce({ success: true });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.member.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.member.id,
        },
        payload: { capacityPercent: -50 },
      });

      expect(response.statusCode).toBe(200);
      expect(mockItems.updateOne).toHaveBeenCalledWith(
        TEST_TEAM_MEMBERS.member.id,
        expect.objectContaining({
          profile: expect.objectContaining({
            capacity_percent: 0,
          }),
        })
      );
    });

    it('should handle missing member gracefully', async () => {
      mockItems.readOne.mockResolvedValueOnce(null);

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/nonexistent-member/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: { roleTitle: 'Test' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe('Member not found');
    });

    it('should handle member from different project', async () => {
      mockItems.readOne.mockResolvedValueOnce({
        ...TEST_TEAM_MEMBERS.member,
        project_id: 'different-project', // Different project
      });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.member.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: { roleTitle: 'Test' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe('Member not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.member.id}/profile`,
        payload: { roleTitle: 'Test' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should merge profile updates with existing profile', async () => {
      const existingProfile = {
        role_title: 'Existing Title',
        skills: ['OldSkill'],
        bio: 'Existing bio',
      };

      mockItems.readOne.mockResolvedValueOnce({
        ...TEST_TEAM_MEMBERS.member,
        user_id: TEST_USERS.member.id,
        profile: existingProfile,
      });
      mockItems.updateOne.mockResolvedValueOnce({ success: true });

      const response = await server.inject({
        method: 'PATCH',
        url: `/projects/${TEST_PROJECT.id}/members/${TEST_TEAM_MEMBERS.member.id}/profile`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.member.id,
        },
        payload: { skills: ['NewSkill1', 'NewSkill2'] },
      });

      expect(response.statusCode).toBe(200);
      // Should keep existing fields and update skills
      expect(mockItems.updateOne).toHaveBeenCalledWith(
        TEST_TEAM_MEMBERS.member.id,
        expect.objectContaining({
          profile: expect.objectContaining({
            role_title: 'Existing Title', // Preserved
            bio: 'Existing bio', // Preserved
            skills: ['NewSkill1', 'NewSkill2'], // Updated
          }),
        })
      );
    });
  });

  // ============================================
  // Team Context Tests
  // ============================================

  describe('GET /projects/:projectId/team-context', () => {
    it('should return team context for project members', async () => {
      mockItems.readOne.mockResolvedValueOnce(TEST_PROJECT);
      mockItems.readByQuery
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] }) // Member check
        .mockResolvedValueOnce({
          data: Object.values(TEST_TEAM_MEMBERS).filter((m) => m.status === 'active'),
        }); // Team members

      // Mock user lookups
      mockUsers.readOne
        .mockResolvedValueOnce(TEST_USERS.owner)
        .mockResolvedValueOnce(TEST_USERS.admin)
        .mockResolvedValueOnce(TEST_USERS.member)
        .mockResolvedValueOnce(TEST_USERS.viewer);

      const response = await server.inject({
        method: 'GET',
        url: `/projects/${TEST_PROJECT.id}/team-context`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.projectId).toBe(TEST_PROJECT.id);
      expect(Array.isArray(result.data.members)).toBe(true);
    });

    it('should include profile data in response', async () => {
      mockItems.readOne.mockResolvedValueOnce(TEST_PROJECT);
      mockItems.readByQuery
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] })
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] });

      mockUsers.readOne.mockResolvedValueOnce(TEST_USERS.owner);

      const response = await server.inject({
        method: 'GET',
        url: `/projects/${TEST_PROJECT.id}/team-context`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      const member = result.data.members[0];

      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('userId');
      expect(member).toHaveProperty('displayName');
      expect(member).toHaveProperty('role');
      expect(member).toHaveProperty('profile');
      expect(member.profile).toHaveProperty('skills');
      expect(member.profile).toHaveProperty('availability');
      expect(member.profile).toHaveProperty('capacityPercent');
    });

    it('should reject unauthorized users', async () => {
      mockItems.readOne.mockResolvedValueOnce(TEST_PROJECT);
      mockItems.readByQuery.mockResolvedValueOnce({ data: [] }); // Not a member

      const response = await server.inject({
        method: 'GET',
        url: `/projects/${TEST_PROJECT.id}/team-context`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.outsider.id,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error).toBe('Access denied');
    });

    it('should return 404 for non-existent project', async () => {
      mockItems.readOne.mockResolvedValueOnce(null);

      const response = await server.inject({
        method: 'GET',
        url: '/projects/nonexistent-project/team-context',
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe('Project not found');
    });

    it('should allow project owner access even if not in members table', async () => {
      mockItems.readOne.mockResolvedValueOnce({
        ...TEST_PROJECT,
        owner_id: TEST_USERS.owner.id,
      });
      mockItems.readByQuery
        .mockResolvedValueOnce({ data: [] }) // Not in members
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] });

      mockUsers.readOne.mockResolvedValueOnce(TEST_USERS.owner);

      const response = await server.inject({
        method: 'GET',
        url: `/projects/${TEST_PROJECT.id}/team-context`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should format display name from first and last name', async () => {
      mockItems.readOne.mockResolvedValueOnce(TEST_PROJECT);
      mockItems.readByQuery
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] })
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] });

      mockUsers.readOne.mockResolvedValueOnce({
        ...TEST_USERS.owner,
        first_name: 'John',
        last_name: 'Doe',
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
      const member = response.json().data.members[0];
      expect(member.displayName).toBe('John Doe');
    });

    it('should fallback to email username for display name', async () => {
      mockItems.readOne.mockResolvedValueOnce(TEST_PROJECT);
      mockItems.readByQuery
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] })
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] });

      mockUsers.readOne.mockResolvedValueOnce({
        id: 'user-001',
        email: 'john.doe@example.com',
        // No first_name or last_name
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
      const member = response.json().data.members[0];
      expect(member.displayName).toBe('john.doe');
    });
  });

  // ============================================
  // Suggest Assignee Tests
  // ============================================

  describe('POST /projects/:projectId/suggest-assignee', () => {
    beforeEach(() => {
      // Default setup for assignee tests
      mockItems.readOne.mockResolvedValue(TEST_PROJECT);
      mockItems.readByQuery
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] }) // Member check
        .mockResolvedValueOnce({
          data: [TEST_TEAM_MEMBERS.owner, TEST_TEAM_MEMBERS.admin, TEST_TEAM_MEMBERS.member],
        }); // Team members

      mockUsers.readOne
        .mockResolvedValueOnce(TEST_USERS.owner)
        .mockResolvedValueOnce(TEST_USERS.admin)
        .mockResolvedValueOnce(TEST_USERS.member);
    });

    it('should return top 3 suggestions sorted by score', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: MOCK_SUGGEST_ASSIGNEE_REQUEST,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.suggestions)).toBe(true);
      expect(result.data.suggestions.length).toBeLessThanOrEqual(3);

      // Should be sorted by matchScore descending
      const scores = result.data.suggestions.map((s: any) => s.matchScore);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });

    it('should match skills correctly', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: {
          requiredSkills: ['Vue', 'TypeScript'],
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();

      // Owner has Vue and TypeScript, should be ranked higher
      const ownerSuggestion = result.data.suggestions.find(
        (s: any) => s.userId === TEST_USERS.owner.id
      );
      expect(ownerSuggestion).toBeDefined();
      // Check that at least one reason mentions the skills
      expect(ownerSuggestion.matchReasons.some((r: string) => r.includes('Vue'))).toBe(true);
    });

    it('should factor in availability', async () => {
      // Reset mocks for this specific test
      vi.clearAllMocks();

      mockItems.readOne.mockResolvedValue(TEST_PROJECT);
      mockItems.readByQuery
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] })
        .mockResolvedValueOnce({
          data: [
            TEST_TEAM_MEMBERS.owner, // available
            TEST_TEAM_MEMBERS.admin, // busy
            TEST_TEAM_MEMBERS.awayMember, // away
          ],
        });

      mockUsers.readOne
        .mockResolvedValueOnce(TEST_USERS.owner)
        .mockResolvedValueOnce(TEST_USERS.admin)
        .mockResolvedValueOnce({ id: 'user-006', email: 'away@test.com' });

      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: { taskDescription: 'Any task' },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();

      // Available member should have "Currently available" in reasons
      const availableSuggestion = result.data.suggestions.find((s: any) =>
        s.matchReasons.includes('Currently available')
      );
      expect(availableSuggestion).toBeDefined();
    });

    it('should factor in capacity', async () => {
      // Reset mocks for this specific test
      vi.clearAllMocks();

      mockItems.readOne.mockResolvedValue(TEST_PROJECT);
      mockItems.readByQuery
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] })
        .mockResolvedValueOnce({
          data: [
            TEST_TEAM_MEMBERS.member, // 40% capacity - has room
            TEST_TEAM_MEMBERS.admin, // 80% capacity - busy
          ],
        });

      mockUsers.readOne
        .mockResolvedValueOnce(TEST_USERS.member)
        .mockResolvedValueOnce(TEST_USERS.admin);

      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: { taskDescription: 'Any task' },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();

      // Member with 40% capacity should have capacity reason
      const lowCapacitySuggestion = result.data.suggestions.find((s: any) =>
        s.matchReasons.some((r: string) => r.includes('capacity'))
      );
      expect(lowCapacitySuggestion).toBeDefined();
    });

    it('should match task type preferences', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: {
          taskType: 'Development',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();

      // Owner and Member prefer Development
      const devSuggestion = result.data.suggestions.find((s: any) =>
        s.matchReasons.includes('Prefers this task type')
      );
      expect(devSuggestion).toBeDefined();
    });

    it('should include query in response', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: MOCK_SUGGEST_ASSIGNEE_REQUEST,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.data.query).toEqual(MOCK_SUGGEST_ASSIGNEE_REQUEST);
    });

    it('should reject unauthorized users', async () => {
      // This test needs its own beforeEach setup since it uses a different user
      mockItems.readOne.mockReset();
      mockItems.readByQuery.mockReset();
      mockUsers.readOne.mockReset();

      mockItems.readOne.mockResolvedValue(TEST_PROJECT);
      mockItems.readByQuery.mockResolvedValueOnce({ data: [] }); // Not a member

      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.outsider.id,
        },
        payload: MOCK_SUGGEST_ASSIGNEE_REQUEST,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return empty suggestions for project with no members', async () => {
      mockItems.readOne.mockReset();
      mockItems.readByQuery.mockReset();
      mockUsers.readOne.mockReset();

      mockItems.readOne.mockResolvedValue(TEST_PROJECT);
      mockItems.readByQuery
        .mockResolvedValueOnce({ data: [TEST_TEAM_MEMBERS.owner] }) // Member check passes
        .mockResolvedValueOnce({ data: [] }); // No team members

      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: MOCK_SUGGEST_ASSIGNEE_REQUEST,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.data.suggestions).toEqual([]);
    });

    it('should handle empty request body', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/projects/${TEST_PROJECT.id}/suggest-assignee`,
        headers: {
          authorization: 'Bearer test-token',
          'x-test-user-id': TEST_USERS.owner.id,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      // Should still return suggestions based on availability/capacity
      const result = response.json();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.suggestions)).toBe(true);
    });
  });
});

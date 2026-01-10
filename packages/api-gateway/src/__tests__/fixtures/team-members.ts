/**
 * Test fixtures for team member profile testing
 */

export interface TestTeamMember {
  id: string;
  user_id: string;
  project_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  profile: {
    role_title?: string;
    skills?: string[];
    expertise_areas?: string[];
    availability?: 'available' | 'busy' | 'away';
    capacity_percent?: number;
    preferred_task_types?: string[];
    bio?: string;
  };
}

export interface TestUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export const TEST_PROJECT = {
  id: 'project-001',
  name: 'Test Project',
  owner_id: 'user-001',
  status: 'active',
};

export const TEST_USERS: Record<string, TestUser> = {
  owner: {
    id: 'user-001',
    email: 'owner@test.com',
    first_name: 'John',
    last_name: 'Owner',
  },
  admin: {
    id: 'user-002',
    email: 'admin@test.com',
    first_name: 'Jane',
    last_name: 'Admin',
  },
  member: {
    id: 'user-003',
    email: 'member@test.com',
    first_name: 'Bob',
    last_name: 'Member',
  },
  viewer: {
    id: 'user-004',
    email: 'viewer@test.com',
    first_name: 'Alice',
    last_name: 'Viewer',
  },
  outsider: {
    id: 'user-005',
    email: 'outsider@test.com',
    first_name: 'Eve',
    last_name: 'Outsider',
  },
};

export const TEST_TEAM_MEMBERS: Record<string, TestTeamMember> = {
  owner: {
    id: 'member-001',
    user_id: 'user-001',
    project_id: 'project-001',
    role: 'owner',
    status: 'active',
    profile: {
      role_title: 'Lead Developer',
      skills: ['Vue', 'TypeScript', 'Node.js', 'PostgreSQL'],
      expertise_areas: ['Frontend', 'Backend', 'DevOps'],
      availability: 'available',
      capacity_percent: 60,
      preferred_task_types: ['Development', 'Code Review', 'Architecture'],
      bio: 'Full-stack developer with 10 years of experience',
    },
  },
  admin: {
    id: 'member-002',
    user_id: 'user-002',
    project_id: 'project-001',
    role: 'admin',
    status: 'active',
    profile: {
      role_title: 'Marketing Manager',
      skills: ['SEO', 'Content Writing', 'Analytics', 'Social Media'],
      expertise_areas: ['Marketing', 'Content', 'SEO'],
      availability: 'busy',
      capacity_percent: 80,
      preferred_task_types: ['Marketing', 'Content Writing', 'Research'],
      bio: 'Digital marketing specialist',
    },
  },
  member: {
    id: 'member-003',
    user_id: 'user-003',
    project_id: 'project-001',
    role: 'member',
    status: 'active',
    profile: {
      role_title: 'Junior Developer',
      skills: ['JavaScript', 'React'],
      expertise_areas: ['Frontend'],
      availability: 'available',
      capacity_percent: 40,
      preferred_task_types: ['Development', 'Testing'],
    },
  },
  viewer: {
    id: 'member-004',
    user_id: 'user-004',
    project_id: 'project-001',
    role: 'viewer',
    status: 'active',
    profile: {}, // Empty profile
  },
  awayMember: {
    id: 'member-005',
    user_id: 'user-006',
    project_id: 'project-001',
    role: 'member',
    status: 'active',
    profile: {
      role_title: 'Designer',
      skills: ['Figma', 'CSS', 'UI/UX'],
      expertise_areas: ['Design'],
      availability: 'away',
      capacity_percent: 0,
      preferred_task_types: ['Design'],
    },
  },
};

/**
 * Create a mock team member with optional overrides
 */
export function createMockTeamMember(overrides: Partial<TestTeamMember> = {}): TestTeamMember {
  return {
    ...TEST_TEAM_MEMBERS.member,
    id: `member-${Date.now()}`,
    ...overrides,
  };
}

/**
 * Create a mock user with optional overrides
 */
export function createMockUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: `user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    first_name: 'Test',
    last_name: 'User',
    ...overrides,
  };
}

/**
 * Get all active team members for a project
 */
export function getActiveTeamMembers(): TestTeamMember[] {
  return Object.values(TEST_TEAM_MEMBERS).filter((m) => m.status === 'active');
}

/**
 * Get team members by role
 */
export function getTeamMembersByRole(role: TestTeamMember['role']): TestTeamMember[] {
  return Object.values(TEST_TEAM_MEMBERS).filter((m) => m.role === role);
}

/**
 * Get team members with specific skill
 */
export function getTeamMembersWithSkill(skill: string): TestTeamMember[] {
  return Object.values(TEST_TEAM_MEMBERS).filter((m) =>
    m.profile.skills?.some((s) => s.toLowerCase() === skill.toLowerCase())
  );
}

/**
 * Get available team members (not away, capacity > 0)
 */
export function getAvailableTeamMembers(): TestTeamMember[] {
  return Object.values(TEST_TEAM_MEMBERS).filter(
    (m) =>
      m.status === 'active' &&
      m.profile.availability !== 'away' &&
      (m.profile.capacity_percent ?? 100) > 0
  );
}

/**
 * Mock profile update request body
 */
export const MOCK_PROFILE_UPDATE = {
  roleTitle: 'Senior Developer',
  skills: ['Vue', 'TypeScript', 'Node.js', 'Python'],
  expertiseAreas: ['Frontend', 'Backend'],
  availability: 'available' as const,
  capacityPercent: 75,
  preferredTaskTypes: ['Development', 'Code Review'],
  bio: 'Updated bio for testing',
};

/**
 * Mock suggest assignee request body
 */
export const MOCK_SUGGEST_ASSIGNEE_REQUEST = {
  taskDescription: 'Implement new login form with OAuth integration',
  requiredSkills: ['Vue', 'TypeScript'],
  taskType: 'Development',
};

/**
 * Expected assignment suggestion scores based on TEST_TEAM_MEMBERS
 * Owner: Vue + TypeScript = 20, available = 25, 60% capacity = 15, Development = 10 = 70
 * Member: JavaScript only = 0, available = 25, 40% capacity = 25, Development = 10 = 60
 * Admin: no match = 0, busy = 10, 80% capacity = 5, no match = 5 = 20
 */
export const EXPECTED_ASSIGNMENT_SCORES = {
  owner: 70,
  member: 60,
  admin: 20,
};

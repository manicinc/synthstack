/**
 * Team member fixtures for testing
 */

export interface TestTeamMember {
  id: string;
  projectId: string;
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  displayName: string;
  invitedAt: Date;
  acceptedAt?: Date;
}

export interface TestUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
}

export interface TestProject {
  id: string;
  name: string;
  description: string;
  user_created: string;
}

export const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000100';

export const TEST_PROJECT: TestProject = {
  id: TEST_PROJECT_ID,
  name: 'Test Project',
  description: 'A test project',
  user_created: '00000000-0000-0000-0000-000000000001'
};

export const TEST_USERS: Record<string, TestUser> = {
  owner: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'owner@test.com',
    first_name: 'Project',
    last_name: 'Owner'
  },
  admin: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'admin@test.com',
    first_name: 'Team',
    last_name: 'Admin'
  },
  member: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'member@test.com',
    first_name: 'Team',
    last_name: 'Member'
  },
  viewer: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'viewer@test.com',
    first_name: 'Team',
    last_name: 'Viewer'
  },
  outsider: {
    id: '00000000-0000-0000-0000-000000000099',
    email: 'outsider@test.com',
    first_name: 'Outside',
    last_name: 'User'
  }
};

export const TEST_TEAM_MEMBERS: Record<string, TestTeamMember> = {
  owner: {
    id: '00000000-0000-0000-0000-000000000201',
    projectId: TEST_PROJECT_ID,
    userId: TEST_USERS.owner.id,
    email: TEST_USERS.owner.email,
    role: 'owner',
    displayName: 'Project Owner',
    invitedAt: new Date('2024-01-01'),
    acceptedAt: new Date('2024-01-01')
  },
  admin: {
    id: '00000000-0000-0000-0000-000000000202',
    projectId: TEST_PROJECT_ID,
    userId: TEST_USERS.admin.id,
    email: TEST_USERS.admin.email,
    role: 'admin',
    displayName: 'Team Admin',
    invitedAt: new Date('2024-01-02'),
    acceptedAt: new Date('2024-01-02')
  },
  editor: {
    id: '00000000-0000-0000-0000-000000000203',
    projectId: TEST_PROJECT_ID,
    userId: TEST_USERS.member.id,
    email: TEST_USERS.member.email,
    role: 'editor',
    displayName: 'Team Editor',
    invitedAt: new Date('2024-01-03'),
    acceptedAt: new Date('2024-01-03')
  },
  viewer: {
    id: '00000000-0000-0000-0000-000000000204',
    projectId: TEST_PROJECT_ID,
    userId: TEST_USERS.viewer.id,
    email: TEST_USERS.viewer.email,
    role: 'viewer',
    displayName: 'Team Viewer',
    invitedAt: new Date('2024-01-04'),
    acceptedAt: new Date('2024-01-04')
  },
  pending: {
    id: '00000000-0000-0000-0000-000000000205',
    projectId: TEST_PROJECT_ID,
    userId: '00000000-0000-0000-0000-000000000005',
    email: 'pending@test.com',
    role: 'viewer',
    displayName: 'Pending Member',
    invitedAt: new Date('2024-01-05')
  }
};

export const MOCK_PROFILE_UPDATE = {
  skills: ['TypeScript', 'React', 'Node.js'],
  availability: 'full-time',
  capacity: 40,
  task_preferences: ['development', 'review'],
  bio: 'Experienced developer'
};

export const MOCK_SUGGEST_ASSIGNEE_REQUEST = {
  query: {
    skills: ['TypeScript', 'React'],
    task_type: 'development',
    priority: 'high'
  }
};

export function createTestTeamMember(overrides: Partial<TestTeamMember> = {}): TestTeamMember {
  return {
    id: `00000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, '0')}`,
    projectId: TEST_PROJECT_ID,
    userId: `00000000-0000-0000-0000-${(Date.now() + 1).toString().slice(-12).padStart(12, '0')}`,
    email: `member-${Date.now()}@test.com`,
    role: 'viewer',
    displayName: 'Test Member',
    invitedAt: new Date(),
    ...overrides
  };
}

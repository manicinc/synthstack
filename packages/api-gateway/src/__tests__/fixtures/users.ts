/**
 * Test user fixtures for Community Edition
 */

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
  subscriptionTier: 'free' | 'maker' | 'pro' | 'agency';
  creditsRemaining: number;
  isAdmin: boolean;
  isModerator: boolean;
  isBanned: boolean;
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@test.com',
    displayName: 'Test Admin',
    subscriptionTier: 'pro',
    creditsRemaining: 1000,
    isAdmin: true,
    isModerator: false,
    isBanned: false
  },
  user: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'user@test.com',
    displayName: 'Test User',
    subscriptionTier: 'free',
    creditsRemaining: 100,
    isAdmin: false,
    isModerator: false,
    isBanned: false
  },
  pro: {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'pro@test.com',
    displayName: 'Pro User',
    subscriptionTier: 'pro',
    creditsRemaining: 500,
    isAdmin: false,
    isModerator: false,
    isBanned: false
  },
  moderator: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'mod@test.com',
    displayName: 'Test Moderator',
    subscriptionTier: 'maker',
    creditsRemaining: 500,
    isAdmin: false,
    isModerator: true,
    isBanned: false
  },
  banned: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'banned@test.com',
    displayName: 'Banned User',
    subscriptionTier: 'free',
    creditsRemaining: 0,
    isAdmin: false,
    isModerator: false,
    isBanned: false
  },
  owner: {
    id: '00000000-0000-0000-0000-000000000006',
    email: 'owner@test.com',
    displayName: 'Project Owner',
    subscriptionTier: 'pro',
    creditsRemaining: 1000,
    isAdmin: false,
    isModerator: false,
    isBanned: false
  },
  member: {
    id: '00000000-0000-0000-0000-000000000007',
    email: 'member@test.com',
    displayName: 'Team Member',
    subscriptionTier: 'free',
    creditsRemaining: 100,
    isAdmin: false,
    isModerator: false,
    isBanned: false
  }
};

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: `00000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, '0')}`,
    email: `test-${Date.now()}@test.com`,
    displayName: 'Test User',
    subscriptionTier: 'free',
    creditsRemaining: 100,
    isAdmin: false,
    isModerator: false,
    isBanned: false,
    ...overrides
  };
}

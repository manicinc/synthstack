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
  /** Mock JWT token for test authentication */
  token?: string;
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
  // Alias used by route tests
  free: {
    id: '00000000-0000-0000-0000-000000000008',
    email: 'free@test.com',
    displayName: 'Free User',
    subscriptionTier: 'free',
    creditsRemaining: 100,
    isAdmin: false,
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
  agency: {
    id: '00000000-0000-0000-0000-000000000009',
    email: 'agency@test.com',
    displayName: 'Agency User',
    subscriptionTier: 'agency',
    creditsRemaining: 2000,
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
  },
  viewer: {
    id: '00000000-0000-0000-0000-000000000010',
    email: 'viewer@test.com',
    displayName: 'View Only User',
    subscriptionTier: 'free',
    creditsRemaining: 100,
    isAdmin: false,
    isModerator: false,
    isBanned: false
  },
  outsider: {
    id: '00000000-0000-0000-0000-000000000011',
    email: 'outsider@test.com',
    displayName: 'Outsider User',
    subscriptionTier: 'free',
    creditsRemaining: 100,
    isAdmin: false,
    isModerator: false,
    isBanned: false
  },
  // Referral-specific fixtures
  referrer: {
    id: '00000000-0000-0000-0000-000000000012',
    email: 'referrer@test.com',
    displayName: 'Referral Referrer',
    subscriptionTier: 'free',
    creditsRemaining: 100,
    isAdmin: false,
    isModerator: false,
    isBanned: false
  },
  referred: {
    id: '00000000-0000-0000-0000-000000000013',
    email: 'referred@test.com',
    displayName: 'Referral Referred',
    subscriptionTier: 'free',
    creditsRemaining: 100,
    isAdmin: false,
    isModerator: false,
    isBanned: false
  }
};

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const id = overrides.id ?? `00000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, '0')}`;
  // Generate a mock JWT token for test authentication (base64 encoded JSON)
  const mockPayload = Buffer.from(JSON.stringify({ sub: id, email: overrides.email ?? 'test@test.com' })).toString('base64');
  const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${mockPayload}.mock-signature`;

  return {
    id,
    email: `test-${Date.now()}@test.com`,
    displayName: 'Test User',
    subscriptionTier: 'free',
    creditsRemaining: 100,
    isAdmin: false,
    isModerator: false,
    isBanned: false,
    token: mockToken,
    ...overrides
  };
}

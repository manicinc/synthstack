/**
 * Test User Fixtures
 *
 * Pre-defined test users with different subscription tiers and roles.
 * These users are seeded in the database by setup-test-db.ts
 */

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
  subscriptionTier: 'free' | 'maker' | 'pro' | 'agency' | 'enterprise' | 'admin';
  creditsRemaining: number;
  isAdmin: boolean;
  isModerator: boolean;
  isBanned: boolean;
}

export const TEST_USERS = {
  admin: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@test.com',
    displayName: 'Admin User',
    subscriptionTier: 'admin' as const,
    creditsRemaining: 1000,
    isAdmin: true,
    isModerator: true,
    isBanned: false,
  },

  free: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'free@test.com',
    displayName: 'Free User',
    subscriptionTier: 'free' as const,
    creditsRemaining: 100,
    isAdmin: false,
    isModerator: false,
    isBanned: false,
  },

  maker: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'maker@test.com',
    displayName: 'Maker User',
    subscriptionTier: 'maker' as const,
    creditsRemaining: 250,
    isAdmin: false,
    isModerator: false,
    isBanned: false,
  },

  pro: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'pro@test.com',
    displayName: 'Pro User',
    subscriptionTier: 'pro' as const,
    creditsRemaining: 500,
    isAdmin: false,
    isModerator: false,
    isBanned: false,
  },

  agency: {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'agency@test.com',
    displayName: 'Agency User',
    subscriptionTier: 'agency' as const,
    creditsRemaining: 999999,
    isAdmin: false,
    isModerator: false,
    isBanned: false,
  },

  referrer: {
    id: '00000000-0000-0000-0000-000000000006',
    email: 'referrer@test.com',
    displayName: 'Referrer User',
    subscriptionTier: 'pro' as const,
    creditsRemaining: 500,
    isAdmin: false,
    isModerator: false,
    isBanned: false,
  },

  referred: {
    id: '00000000-0000-0000-0000-000000000007',
    email: 'referred@test.com',
    displayName: 'Referred User',
    subscriptionTier: 'free' as const,
    creditsRemaining: 100,
    isAdmin: false,
    isModerator: false,
    isBanned: false,
  },

  banned: {
    id: '00000000-0000-0000-0000-000000000008',
    email: 'banned@test.com',
    displayName: 'Banned User',
    subscriptionTier: 'free' as const,
    creditsRemaining: 0,
    isAdmin: false,
    isModerator: false,
    isBanned: true,
  },
} as const;

export const ALL_TEST_USERS = Object.values(TEST_USERS);

/**
 * Generate a JWT token payload for a test user
 */
export function getUserTokenPayload(user: TestUser) {
  return {
    sub: user.id,
    email: user.email,
    display_name: user.displayName,
    subscription_tier: user.subscriptionTier,
    is_admin: user.isAdmin,
    is_moderator: user.isModerator,
    is_banned: user.isBanned,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): TestUser | undefined {
  return ALL_TEST_USERS.find(u => u.email === email);
}

/**
 * Get users by tier
 */
export function getUsersByTier(tier: string): TestUser[] {
  return ALL_TEST_USERS.filter(u => u.subscriptionTier === tier);
}

/**
 * Create a test user dynamically in the database
 * Returns user object with JWT token
 */
export async function createTestUser(params: {
  email: string;
  displayName?: string;
  subscription_tier?: string;
  credits_remaining?: number;
  is_admin?: boolean;
  is_moderator?: boolean;
  is_banned?: boolean;
}): Promise<TestUser & { token: string; id: string }> {
  const { getTestPool } = await import('../../test/db-helpers.js');
  const { sign } = await import('jsonwebtoken');

  const pool = getTestPool();

  // Generate random UUID for the user
  const id = crypto.randomUUID();

  // Insert user into database
  await pool.query(`
    INSERT INTO app_users (
      id, email, display_name, subscription_tier, credits_remaining,
      is_admin, is_moderator, is_banned
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (email) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      subscription_tier = EXCLUDED.subscription_tier,
      credits_remaining = EXCLUDED.credits_remaining,
      is_admin = EXCLUDED.is_admin,
      is_moderator = EXCLUDED.is_moderator,
      is_banned = EXCLUDED.is_banned
    RETURNING id
  `, [
    id,
    params.email,
    params.displayName || params.email.split('@')[0],
    params.subscription_tier || 'free',
    params.credits_remaining !== undefined ? params.credits_remaining : 100,
    params.is_admin || false,
    params.is_moderator || false,
    params.is_banned || false,
  ]);

  // Generate JWT token (simplified - in reality you'd use the actual JWT secret)
  const token = sign(
    {
      sub: id,
      email: params.email,
      subscription_tier: params.subscription_tier || 'free',
      is_admin: params.is_admin || false,
    },
    process.env.JWT_SECRET || 'dev-secret-change-in-production',
    { expiresIn: '1h' }
  );

  return {
    id,
    email: params.email,
    displayName: params.displayName || params.email.split('@')[0],
    subscriptionTier: (params.subscription_tier || 'free') as any,
    creditsRemaining: params.credits_remaining || 100,
    isAdmin: params.is_admin || false,
    isModerator: params.is_moderator || false,
    isBanned: params.is_banned || false,
    token,
  };
}

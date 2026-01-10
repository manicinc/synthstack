/**
 * Database Test Helpers
 *
 * Utilities for setting up, seeding, and cleaning test databases
 */

import { Pool, PoolClient } from 'pg';
import { TEST_USERS, TestUser } from '../__tests__/fixtures/users';
import { TEST_REFERRAL_SEASON, TEST_REFERRAL_TIERS, TEST_REFERRAL_CODE, TEST_DISCOUNT_CODE } from '../__tests__/fixtures/referrals';

const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5451/synthstack_test';

let testPool: Pool | null = null;

/**
 * Get or create the test database pool
 */
export function getTestPool(): Pool {
  if (!testPool) {
    testPool = new Pool({
      connectionString: TEST_DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return testPool;
}

/**
 * Close the test database pool
 */
export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Execute a query against the test database
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const pool = getTestPool();
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Execute a transaction
 */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getTestPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Clean all test data from tables
 */
export async function cleanupTestData(): Promise<void> {
  const pool = getTestPool();

  await pool.query('BEGIN');

  try {
    // Delete in reverse dependency order (children before parents)
    await pool.query('DELETE FROM discount_code_usage');
    await pool.query('DELETE FROM discount_codes');
    await pool.query('DELETE FROM referral_rewards');
    await pool.query('DELETE FROM referrals');
    await pool.query('DELETE FROM referral_codes');
    await pool.query('DELETE FROM referral_tiers');
    await pool.query('DELETE FROM referral_seasons');
    await pool.query('DELETE FROM ml_service_usage');
    await pool.query('DELETE FROM ml_service_requests');
    await pool.query('DELETE FROM nodered_execution_logs');
    await pool.query('DELETE FROM credit_adjustments');
    await pool.query('DELETE FROM credit_transactions');
    await pool.query('DELETE FROM organization_members');
    await pool.query('DELETE FROM organizations');
    await pool.query('DELETE FROM app_users');

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

/**
 * Seed test users
 */
export async function seedTestUsers(): Promise<void> {
  const pool = getTestPool();

  const values = Object.values(TEST_USERS).map(user =>
    `('${user.id}'::uuid, '${user.email}', '${user.displayName}', '${user.subscriptionTier}', ${user.creditsRemaining}, ${user.isAdmin}, ${user.isModerator}, ${user.isBanned})`
  ).join(',\n      ');

  await pool.query(`
    INSERT INTO app_users (id, email, display_name, subscription_tier, credits_remaining, is_admin, is_moderator, is_banned)
    VALUES ${values}
    ON CONFLICT (email) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      subscription_tier = EXCLUDED.subscription_tier,
      credits_remaining = EXCLUDED.credits_remaining,
      is_admin = EXCLUDED.is_admin,
      is_moderator = EXCLUDED.is_moderator,
      is_banned = EXCLUDED.is_banned;
  `);
}

/**
 * Seed test organization
 */
export async function seedTestOrganization(): Promise<void> {
  const pool = getTestPool();

  await pool.query(`
    INSERT INTO organizations (id, name, user_created)
    VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Test Organization', '${TEST_USERS.admin.id}'::uuid)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      user_created = EXCLUDED.user_created;
  `);
}

/**
 * Seed referral system test data
 */
export async function seedReferralTestData(): Promise<void> {
  const pool = getTestPool();

  // Seed season
  await pool.query(`
    INSERT INTO referral_seasons (id, name, slug, description, is_active, is_default, start_date, end_date, config)
    VALUES (
      '${TEST_REFERRAL_SEASON.id}'::uuid,
      '${TEST_REFERRAL_SEASON.name}',
      '${TEST_REFERRAL_SEASON.slug}',
      '${TEST_REFERRAL_SEASON.description}',
      ${TEST_REFERRAL_SEASON.isActive},
      ${TEST_REFERRAL_SEASON.isDefault},
      '${TEST_REFERRAL_SEASON.startDate.toISOString()}',
      '${TEST_REFERRAL_SEASON.endDate.toISOString()}',
      '${JSON.stringify(TEST_REFERRAL_SEASON.config)}'::jsonb
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_active = EXCLUDED.is_active,
      is_default = EXCLUDED.is_default;
  `);

  // Seed tiers
  for (const tier of TEST_REFERRAL_TIERS) {
    await pool.query(`
      INSERT INTO referral_tiers (id, season_id, name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, is_stackable, is_active, sort_order)
      VALUES (
        '${tier.id}'::uuid,
        '${tier.seasonId}'::uuid,
        '${tier.name}',
        '${tier.description}',
        ${tier.referralsRequired},
        '${tier.rewardType}',
        '${JSON.stringify(tier.rewardValue)}'::jsonb,
        '${tier.badgeIcon}',
        '${tier.badgeColor}',
        ${tier.isStackable},
        ${tier.isActive},
        ${tier.sortOrder}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        referrals_required = EXCLUDED.referrals_required,
        reward_type = EXCLUDED.reward_type,
        reward_value = EXCLUDED.reward_value;
    `);
  }

  // Seed referral code
  await pool.query(`
    INSERT INTO referral_codes (id, user_id, code, season_id, clicks, is_active)
    VALUES (
      '${TEST_REFERRAL_CODE.id}'::uuid,
      '${TEST_REFERRAL_CODE.userId}'::uuid,
      '${TEST_REFERRAL_CODE.code}',
      '${TEST_REFERRAL_CODE.seasonId}'::uuid,
      ${TEST_REFERRAL_CODE.clicks},
      ${TEST_REFERRAL_CODE.isActive}
    )
    ON CONFLICT (code) DO UPDATE SET
      clicks = EXCLUDED.clicks,
      is_active = EXCLUDED.is_active;
  `);

  // Seed discount code
  await pool.query(`
    INSERT INTO discount_codes (id, code, name, description, type, value, applies_to, max_uses, max_uses_per_user, current_uses, source, is_active, is_public, starts_at, expires_at, created_by)
    VALUES (
      '${TEST_DISCOUNT_CODE.id}'::uuid,
      '${TEST_DISCOUNT_CODE.code}',
      '${TEST_DISCOUNT_CODE.name}',
      '${TEST_DISCOUNT_CODE.description}',
      '${TEST_DISCOUNT_CODE.type}',
      ${TEST_DISCOUNT_CODE.value},
      '${TEST_DISCOUNT_CODE.appliesTo}',
      ${TEST_DISCOUNT_CODE.maxUses},
      ${TEST_DISCOUNT_CODE.maxUsesPerUser},
      ${TEST_DISCOUNT_CODE.currentUses},
      '${TEST_DISCOUNT_CODE.source}',
      ${TEST_DISCOUNT_CODE.isActive},
      ${TEST_DISCOUNT_CODE.isPublic},
      '${TEST_DISCOUNT_CODE.startsAt.toISOString()}',
      '${TEST_DISCOUNT_CODE.expiresAt.toISOString()}',
      '${TEST_DISCOUNT_CODE.createdBy}'::uuid
    )
    ON CONFLICT (code) DO UPDATE SET
      current_uses = EXCLUDED.current_uses,
      is_active = EXCLUDED.is_active;
  `);
}

/**
 * Seed all test data
 */
export async function seedAllTestData(): Promise<void> {
  await seedTestUsers();
  await seedTestOrganization();
  await seedReferralTestData();
}

/**
 * Reset database to clean state with fresh seed data
 */
export async function resetTestDatabase(): Promise<void> {
  await cleanupTestData();
  await seedAllTestData();
}

/**
 * Create a test user in the database
 */
export async function createTestUser(user: Partial<TestUser> & { email: string }): Promise<TestUser> {
  const pool = getTestPool();

  const id = user.id || crypto.randomUUID();
  const displayName = user.displayName || user.email.split('@')[0];
  const subscriptionTier = user.subscriptionTier || 'free';
  const creditsRemaining = user.creditsRemaining ?? 100;
  const isAdmin = user.isAdmin ?? false;
  const isModerator = user.isModerator ?? false;
  const isBanned = user.isBanned ?? false;

  await pool.query(`
    INSERT INTO app_users (id, email, display_name, subscription_tier, credits_remaining, is_admin, is_moderator, is_banned)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (email) DO UPDATE SET
      subscription_tier = EXCLUDED.subscription_tier,
      credits_remaining = EXCLUDED.credits_remaining;
  `, [id, user.email, displayName, subscriptionTier, creditsRemaining, isAdmin, isModerator, isBanned]);

  return {
    id,
    email: user.email,
    displayName,
    subscriptionTier: subscriptionTier as any,
    creditsRemaining,
    isAdmin,
    isModerator,
    isBanned,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<TestUser | null> {
  const pool = getTestPool();
  const result = await pool.query(
    'SELECT id, email, display_name, subscription_tier, credits_remaining, is_admin, is_moderator, is_banned FROM app_users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    subscriptionTier: row.subscription_tier,
    creditsRemaining: row.credits_remaining,
    isAdmin: row.is_admin,
    isModerator: row.is_moderator,
    isBanned: row.is_banned,
  };
}

/**
 * Update user credits
 */
export async function updateUserCredits(userId: string, credits: number): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    'UPDATE app_users SET credits_remaining = $1 WHERE id = $2',
    [credits, userId]
  );
}

/**
 * Create a credit transaction
 */
export async function createCreditTransaction(params: {
  userId: string;
  amount: number;
  transactionType: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}): Promise<string> {
  const pool = getTestPool();
  // Note: API reads 'type' and 'reason' columns, so we insert into both the legacy names and current names
  const result = await pool.query(`
    INSERT INTO credit_transactions (user_id, amount, type, transaction_type, reference_type, reference_id, reason, description)
    VALUES ($1, $2, $3, $3, $4, $5, $6, $6)
    RETURNING id
  `, [
    params.userId,
    params.amount,
    params.transactionType,
    params.referenceType,
    params.referenceId,
    params.description,
  ]);

  return result.rows[0].id;
}

/**
 * Wait for database to be ready
 */
export async function waitForDatabase(maxRetries = 30, delayMs = 1000): Promise<void> {
  const pool = getTestPool();

  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database is ready');
      return;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(`Database not ready after ${maxRetries} attempts`);
      }
      console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Check if a table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const pool = getTestPool();
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0].exists;
}

/**
 * Get table row count
 */
export async function getTableCount(tableName: string): Promise<number> {
  const pool = getTestPool();
  const result = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
  return parseInt(result.rows[0].count);
}

/**
 * Alias for cleanupTestData (used in E2E tests)
 */
export async function cleanDatabase(): Promise<void> {
  return cleanupTestData();
}

/**
 * Seed a referral season with custom tiers
 * Returns the season ID
 */
export async function seedReferralSeason(params: {
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  startDate?: Date;
  endDate?: Date;
  tiers: Array<{
    name: string;
    referrals_required: number;
    reward_type: 'discount_code' | 'credits' | 'custom';
    reward_value: any;
    description?: string;
  }>;
}): Promise<string> {
  const pool = getTestPool();

  // Create season
  const seasonResult = await pool.query(`
    INSERT INTO referral_seasons (
      name, slug, description, is_active, is_default, start_date, end_date, config
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [
    params.name,
    params.slug || params.name.toLowerCase().replace(/\s+/g, '-'),
    params.description || `Test season: ${params.name}`,
    params.isActive !== undefined ? params.isActive : true,
    params.isDefault !== undefined ? params.isDefault : false,
    params.startDate || new Date(),
    params.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    JSON.stringify({}),
  ]);

  const seasonId = seasonResult.rows[0].id;

  // Create tiers
  for (const tier of params.tiers) {
    await pool.query(`
      INSERT INTO referral_tiers (
        season_id, name, slug, description, referrals_required,
        reward_type, reward_value, is_active, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      seasonId,
      tier.name,
      tier.name.toLowerCase().replace(/\s+/g, '-'),
      tier.description || `${tier.name} tier`,
      tier.referrals_required,
      tier.reward_type,
      JSON.stringify(tier.reward_value),
      true,
      tier.referrals_required, // Use referrals_required as display order
    ]);
  }

  return seasonId;
}

// ============================================
// BYOK Test Helpers
// ============================================

/**
 * Add a BYOK API key for a user
 */
export async function addByokKey(
  userId: string,
  provider: string,
  apiKey: string,
  options: {
    id?: string;
    isActive?: boolean;
    isValid?: boolean;
    lastError?: string | null;
  } = {}
): Promise<string> {
  const pool = getTestPool();
  const { encrypt } = await import('../services/encryption');

  const {
    id = `key-${provider}-${Date.now()}`,
    isActive = true,
    isValid = true,
    lastError = null,
  } = options;

  // Encrypt the API key
  const encryptedKey = encrypt(apiKey);
  const keyHint = `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;

  await pool.query(
    `
    INSERT INTO user_api_keys (
      id, user_id, provider, encrypted_key, key_hint,
      is_active, is_valid, last_error, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET encrypted_key = $4, is_active = $6, is_valid = $7, last_error = $8, updated_at = NOW()
    `,
    [id, userId, provider, encryptedKey, keyHint, isActive, isValid, lastError]
  );

  return id;
}

/**
 * Remove a BYOK API key
 */
export async function removeByokKey(keyId: string): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM user_api_keys WHERE id = $1', [keyId]);
}

/**
 * Mark a BYOK key as invalid
 */
export async function markKeyInvalid(keyId: string, error: string): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `
    UPDATE user_api_keys
    SET is_valid = false, last_error = $2, updated_at = NOW()
    WHERE id = $1
    `,
    [keyId, error]
  );
}

/**
 * Get all BYOK keys for a user
 */
export async function getUserByokKeys(userId: string): Promise<any[]> {
  const pool = getTestPool();
  const result = await pool.query(
    `
    SELECT id, provider, key_hint, is_active, is_valid, last_error
    FROM user_api_keys
    WHERE user_id = $1 AND is_active = true
    ORDER BY created_at DESC
    `,
    [userId]
  );
  return result.rows;
}

/**
 * Set feature flag values for BYOK testing
 */
export async function setByokFeatureFlags(
  flags: {
    byokEnabled?: boolean;
    byokUsesInternalCredits?: boolean;
    byokOnlyMode?: boolean;
  }
): Promise<void> {
  const pool = getTestPool();
  const updates = [];

  if (flags.byokEnabled !== undefined) {
    updates.push(
      pool.query("UPDATE feature_flags SET enabled = $1 WHERE name = 'byok_enabled'", [
        flags.byokEnabled,
      ])
    );
  }

  if (flags.byokUsesInternalCredits !== undefined) {
    updates.push(
      pool.query(
        "UPDATE feature_flags SET enabled = $1 WHERE name = 'byok_uses_internal_credits'",
        [flags.byokUsesInternalCredits]
      )
    );
  }

  if (flags.byokOnlyMode !== undefined) {
    updates.push(
      pool.query("UPDATE feature_flags SET enabled = $1 WHERE name = 'byok_only_mode'", [
        flags.byokOnlyMode,
      ])
    );
  }

  await Promise.all(updates);
}

/**
 * Get current BYOK feature flag values
 */
export async function getByokFeatureFlags(): Promise<{
  byokEnabled: boolean;
  byokUsesInternalCredits: boolean;
  byokOnlyMode: boolean;
}> {
  const pool = getTestPool();
  const result = await pool.query(`
    SELECT name, enabled
    FROM feature_flags
    WHERE name IN ('byok_enabled', 'byok_uses_internal_credits', 'byok_only_mode')
  `);

  const flags = {
    byokEnabled: false,
    byokUsesInternalCredits: false,
    byokOnlyMode: false,
  };

  result.rows.forEach((row) => {
    if (row.name === 'byok_enabled') flags.byokEnabled = row.enabled;
    if (row.name === 'byok_uses_internal_credits')
      flags.byokUsesInternalCredits = row.enabled;
    if (row.name === 'byok_only_mode') flags.byokOnlyMode = row.enabled;
  });

  return flags;
}

/**
 * Get latest BYOK usage log for a user
 */
export async function getLatestApiKeyUsage(userId: string): Promise<any | null> {
  // TODO: api_key_usage table doesn't exist in test schema yet
  return null;
  // const pool = getTestPool();
  // const result = await pool.query(
  //   `
  //   SELECT *
  //   FROM api_key_usage
  //   WHERE user_id = $1
  //   ORDER BY created_at DESC
  //   LIMIT 1
  //   `,
  //   [userId]
  // );
  // return result.rows[0] || null;
}

/**
 * Get all BYOK usage logs for a user in a time period
 */
export async function getApiKeyUsageByPeriod(
  userId: string,
  days: number = 30
): Promise<any[]> {
  // TODO: api_key_usage table doesn't exist in test schema yet
  return [];
  // const pool = getTestPool();
  // const result = await pool.query(
  //   `
  //   SELECT *
  //   FROM api_key_usage
  //   WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
  //   ORDER BY created_at DESC
  //   `,
  //   [userId]
  // );
  // return result.rows;
}

/**
 * Get latest credit transaction for a user
 */
export async function getLatestCreditTransaction(userId: string): Promise<any | null> {
  const pool = getTestPool();
  const result = await pool.query(
    `
    SELECT *
    FROM credit_transactions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Count BYOK usage records for a user
 */
export async function countByokUsage(userId: string): Promise<number> {
  const pool = getTestPool();
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM api_key_usage WHERE user_id = $1',
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Count credit transactions for a user
 */
export async function countCreditTransactions(userId: string): Promise<number> {
  const pool = getTestPool();
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM credit_transactions WHERE user_id = $1',
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Verify that BYOK was used (check api_key_usage table)
 */
export async function verifyByokUsed(userId: string): Promise<boolean> {
  const usage = await getLatestApiKeyUsage(userId);
  return usage !== null;
}

/**
 * Verify that internal credits were used (check credit_transactions table)
 */
export async function verifyInternalUsed(userId: string): Promise<boolean> {
  const transaction = await getLatestCreditTransaction(userId);
  return transaction !== null && transaction.transaction_type === 'deduction';
}

/**
 * Verify that credits were NOT deducted
 */
export async function verifyCreditsNotDeducted(
  userId: string,
  expectedCredits: number
): Promise<boolean> {
  const currentCredits = await getUserCredits(userId);
  return currentCredits === expectedCredits;
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<number> {
  const pool = getTestPool();
  const result = await pool.query('SELECT credits_remaining FROM app_users WHERE id = $1', [
    userId,
  ]);
  return result.rows[0]?.credits_remaining || 0;
}

/**
 * Reset BYOK feature flags to default (BYOK-first mode)
 */
export async function resetByokFeatureFlags(): Promise<void> {
  await setByokFeatureFlags({
    byokEnabled: true,
    byokUsesInternalCredits: false,
    byokOnlyMode: false,
  });
}

/**
 * Cleanup BYOK test data
 */
export async function cleanupByokTestData(): Promise<void> {
  // TODO: Add BYOK tables to test schema (user_api_keys, api_key_usage)
  // These tables don't exist in test-schema.sql yet
  // const pool = getTestPool();
  // await pool.query('DELETE FROM api_key_usage WHERE user_id LIKE \'user-%\'');
  // await pool.query('DELETE FROM user_api_keys WHERE user_id LIKE \'user-%\'');
  await resetByokFeatureFlags();
}

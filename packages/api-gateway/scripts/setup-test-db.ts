#!/usr/bin/env tsx
/**
 * Test Database Setup Script
 *
 * This script initializes the test database with:
 * - Schema from main migrations
 * - Seed data for testing
 * - Indexes and constraints
 *
 * Usage:
 *   pnpm exec tsx scripts/setup-test-db.ts
 */

import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5451/synthstack_test';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function runMigration(filePath: string): Promise<void> {
  console.log(`Running migration: ${filePath}`);
  const sql = readFileSync(filePath, 'utf-8');

  try {
    await pool.query(sql);
    console.log(`✅ Migration completed: ${filePath}`);
  } catch (error: any) {
    console.error(`❌ Migration failed: ${filePath}`);
    console.error(error.message);
    throw error;
  }
}

async function setupDatabase(): Promise<void> {
  console.log('🚀 Starting test database setup...\n');

  try {
    // Check connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Get migration directory path (relative to services/directus/migrations)
    const migrationsDir = join(process.cwd(), '../../services/directus/migrations');

    console.log(`📂 Migrations directory: ${migrationsDir}\n`);

    // Check if migrations directory exists
    try {
      const migrationFiles = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort(); // Sort to run in order

      if (migrationFiles.length === 0) {
        console.warn('⚠️  No migration files found. Creating minimal schema...\n');
        await createMinimalSchema();
        return;
      }

      console.log(`Found ${migrationFiles.length} migration files\n`);

      // Run each migration
      for (const file of migrationFiles) {
        const filePath = join(migrationsDir, file);
        await runMigration(filePath);
      }

    } catch (dirError: any) {
      if (dirError.code === 'ENOENT') {
        console.warn('⚠️  Migrations directory not found. Creating minimal schema...\n');
        await createMinimalSchema();
      } else {
        throw dirError;
      }
    }

    // Seed test data
    await seedTestData();

    console.log('\n✨ Test database setup complete!');

  } catch (error: any) {
    console.error('\n❌ Database setup failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function createMinimalSchema(): Promise<void> {
  console.log('Creating minimal schema for testing...');

  const schema = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- App users table
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      display_name VARCHAR(255),
      subscription_tier VARCHAR(50) DEFAULT 'free',
      credits_remaining INTEGER DEFAULT 100,
      is_banned BOOLEAN DEFAULT FALSE,
      is_moderator BOOLEAN DEFAULT FALSE,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Organizations table
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      owner_id UUID REFERENCES app_users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Credit transactions table
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES app_users(id),
      amount INTEGER NOT NULL,
      transaction_type VARCHAR(50) NOT NULL,
      reference_type VARCHAR(50),
      reference_id UUID,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Referral seasons table
    CREATE TABLE IF NOT EXISTS referral_seasons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT TRUE,
      is_default BOOLEAN DEFAULT FALSE,
      config JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Referral tiers table
    CREATE TABLE IF NOT EXISTS referral_tiers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      season_id UUID REFERENCES referral_seasons(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      referrals_required INTEGER NOT NULL,
      reward_type VARCHAR(50) NOT NULL,
      reward_value JSONB DEFAULT '{}',
      badge_icon VARCHAR(100),
      badge_color VARCHAR(50),
      is_stackable BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Referral codes table
    CREATE TABLE IF NOT EXISTS referral_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES app_users(id),
      code VARCHAR(50) UNIQUE NOT NULL,
      season_id UUID REFERENCES referral_seasons(id),
      clicks INTEGER DEFAULT 0,
      last_click_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT TRUE,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Referrals table
    CREATE TABLE IF NOT EXISTS referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_id UUID REFERENCES app_users(id),
      referred_user_id UUID REFERENCES app_users(id),
      referred_email VARCHAR(255),
      referral_code_id UUID REFERENCES referral_codes(id),
      season_id UUID REFERENCES referral_seasons(id),
      status VARCHAR(50) DEFAULT 'clicked',
      click_date TIMESTAMPTZ,
      signup_date TIMESTAMPTZ,
      conversion_date TIMESTAMPTZ,
      conversion_type VARCHAR(50),
      conversion_value DECIMAL(10, 2),
      ip_address INET,
      user_agent TEXT,
      utm_source VARCHAR(255),
      utm_medium VARCHAR(255),
      utm_campaign VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Referral rewards table
    CREATE TABLE IF NOT EXISTS referral_rewards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES app_users(id),
      tier_id UUID REFERENCES referral_tiers(id),
      season_id UUID REFERENCES referral_seasons(id),
      reward_type VARCHAR(50) NOT NULL,
      reward_data JSONB DEFAULT '{}',
      discount_code_id UUID,
      is_unlocked BOOLEAN DEFAULT FALSE,
      is_claimed BOOLEAN DEFAULT FALSE,
      claimed_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Discount codes table
    CREATE TABLE IF NOT EXISTS discount_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255),
      description TEXT,
      type VARCHAR(50) NOT NULL,
      value DECIMAL(10, 2) NOT NULL,
      applies_to VARCHAR(50) DEFAULT 'all',
      max_uses INTEGER,
      max_uses_per_user INTEGER DEFAULT 1,
      current_uses INTEGER DEFAULT 0,
      min_purchase DECIMAL(10, 2),
      max_discount DECIMAL(10, 2),
      source VARCHAR(50) DEFAULT 'admin',
      is_active BOOLEAN DEFAULT TRUE,
      is_public BOOLEAN DEFAULT FALSE,
      starts_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_by UUID REFERENCES app_users(id),
      referral_reward_id UUID REFERENCES referral_rewards(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ML service requests table
    CREATE TABLE IF NOT EXISTS ml_service_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES app_users(id),
      organization_id UUID REFERENCES organizations(id),
      service_name VARCHAR(50),
      endpoint VARCHAR(255),
      method VARCHAR(10),
      request_payload JSONB,
      response_payload JSONB,
      status_code INTEGER,
      duration_ms INTEGER,
      credits_charged INTEGER DEFAULT 0,
      error_message TEXT,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_referred_user ON referrals(referred_user_id);
    CREATE INDEX IF NOT EXISTS idx_ml_requests_user ON ml_service_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_ml_requests_org ON ml_service_requests(organization_id);
    CREATE INDEX IF NOT EXISTS idx_ml_requests_created ON ml_service_requests(created_at);

    COMMENT ON TABLE app_users IS 'Application users with subscription tiers';
    COMMENT ON TABLE credit_transactions IS 'Credit balance transactions';
    COMMENT ON TABLE ml_service_requests IS 'ML service API request logs';
  `;

  await pool.query(schema);
  console.log('✅ Minimal schema created');
}

async function seedTestData(): Promise<void> {
  console.log('\n📝 Seeding test data...');

  // Create test users
  await pool.query(`
    INSERT INTO app_users (id, email, display_name, subscription_tier, credits_remaining, is_admin)
    VALUES
      ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@test.com', 'Admin User', 'admin', 1000, true),
      ('00000000-0000-0000-0000-000000000002'::uuid, 'free@test.com', 'Free User', 'free', 100, false),
      ('00000000-0000-0000-0000-000000000003'::uuid, 'maker@test.com', 'Maker User', 'maker', 250, false),
      ('00000000-0000-0000-0000-000000000004'::uuid, 'pro@test.com', 'Pro User', 'pro', 500, false),
      ('00000000-0000-0000-0000-000000000005'::uuid, 'agency@test.com', 'Agency User', 'agency', 999999, false),
      ('00000000-0000-0000-0000-000000000006'::uuid, 'referrer@test.com', 'Referrer User', 'pro', 500, false),
      ('00000000-0000-0000-0000-000000000007'::uuid, 'referred@test.com', 'Referred User', 'free', 100, false)
    ON CONFLICT (email) DO NOTHING;
  `);
  console.log('✅ Test users created');

  // Create test organization
  await pool.query(`
    INSERT INTO organizations (id, name, owner_id)
    VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Test Organization', '00000000-0000-0000-0000-000000000001'::uuid)
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Test organization created');

  // Create default referral season
  await pool.query(`
    INSERT INTO referral_seasons (id, name, slug, description, is_active, is_default, start_date, end_date)
    VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'Test Season 2024',
      'test-2024',
      'Test referral season for automated testing',
      true,
      true,
      NOW(),
      NOW() + INTERVAL '1 year'
    )
    ON CONFLICT (slug) DO NOTHING;
  `);
  console.log('✅ Default referral season created');

  // Create referral tiers
  await pool.query(`
    INSERT INTO referral_tiers (season_id, name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, sort_order)
    VALUES
      ('00000000-0000-0000-0000-000000000001'::uuid, 'Starter', 'First referral', 1, 'credits', '{"amount": 50}'::jsonb, 'star', 'bronze', 1),
      ('00000000-0000-0000-0000-000000000001'::uuid, 'Bronze', 'Three referrals', 3, 'discount_code', '{"percent": 10}'::jsonb, 'award', 'bronze', 2),
      ('00000000-0000-0000-0000-000000000001'::uuid, 'Silver', 'Five referrals', 5, 'credits', '{"amount": 100}'::jsonb, 'medal', 'silver', 3),
      ('00000000-0000-0000-0000-000000000001'::uuid, 'Gold', 'Ten referrals', 10, 'discount_code', '{"percent": 25}'::jsonb, 'trophy', 'gold', 4)
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Referral tiers created');

  // Create test referral code
  await pool.query(`
    INSERT INTO referral_codes (id, user_id, code, season_id, is_active)
    VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000006'::uuid,
      'TESTREF123',
      '00000000-0000-0000-0000-000000000001'::uuid,
      true
    )
    ON CONFLICT (code) DO NOTHING;
  `);
  console.log('✅ Test referral code created');

  console.log('\n✨ Test data seeding complete!');
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

export { setupDatabase, createMinimalSchema, seedTestData };

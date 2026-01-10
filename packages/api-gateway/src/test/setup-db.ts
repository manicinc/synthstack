/**
 * Test Database Setup
 * Applies migrations for test environment
 */
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://synthstack:synthstack_test@localhost:5432/synthstack_test';

export async function setupTestDatabase(): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('Setting up test database schema...');

    // Apply referral system migration
    const migrationPath = resolve(__dirname, '../../../../services/directus/migrations/016_referral_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    await pool.query(migrationSQL);
    console.log('✅ Referral system tables created');

    // Add other required tables for tests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        avatar_url VARCHAR(500),
        subscription_tier VARCHAR(20) DEFAULT 'free',
        subscription_status VARCHAR(20) DEFAULT 'active',
        stripe_customer_id VARCHAR(255),
        subscription_id VARCHAR(255),
        subscription_started_at TIMESTAMP WITH TIME ZONE,
        subscription_ends_at TIMESTAMP WITH TIME ZONE,
        credits_remaining INT DEFAULT 10,
        lifetime_credits_used INT DEFAULT 0,
        credits_reset_at TIMESTAMP WITH TIME ZONE,
        is_banned BOOLEAN DEFAULT FALSE,
        ban_reason TEXT,
        banned_at TIMESTAMP WITH TIME ZONE,
        banned_by UUID,
        warning_count INT DEFAULT 0,
        admin_notes TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        is_moderator BOOLEAN DEFAULT FALSE,
        last_login_at TIMESTAMP WITH TIME ZONE,
        last_generation_at TIMESTAMP WITH TIME ZONE,
        total_generations INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        auth_provider VARCHAR(50) DEFAULT 'supabase',
        local_user_id UUID,
        email_verified BOOLEAN DEFAULT FALSE,
        email_verified_at TIMESTAMP WITH TIME ZONE,
        email_preferences JSONB DEFAULT '{"demo_credits": true}'::jsonb
      );

      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        user_created UUID,
        date_created TIMESTAMPTZ DEFAULT NOW(),
        date_updated TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS credit_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES app_users(id),
        amount INT NOT NULL,
        transaction_type VARCHAR(50),
        balance_before INT,
        balance_after INT,
        reference_type VARCHAR(50),
        reference_id VARCHAR(255),
        reason TEXT,
        type VARCHAR(50),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ml_service_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES app_users(id),
        endpoint VARCHAR(255),
        duration_ms INT,
        credits_used INT DEFAULT 0,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS feature_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS credit_adjustments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES app_users(id),
        admin_id UUID REFERENCES app_users(id),
        adjustment INT,
        amount INT,
        reason TEXT,
        notes TEXT,
        adjusted_by UUID,
        balance_before INT,
        balance_after INT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS nodered_execution_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES app_users(id),
        organization_id UUID,
        flow_id VARCHAR(255),
        execution_time_ms INT,
        node_count INT,
        credits_used INT DEFAULT 0,
        status VARCHAR(50),
        started_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ml_service_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES app_users(id),
        date DATE NOT NULL,
        endpoint VARCHAR(255),
        request_count INT DEFAULT 0,
        total_credits INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date, endpoint)
      );

      CREATE TABLE IF NOT EXISTS organization_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES app_users(id),
        role VARCHAR(50) DEFAULT 'member',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Additional test tables created');

  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly (ESM compatible)
const isMainModule = process.argv[1] === __filename;
if (isMainModule) {
  setupTestDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

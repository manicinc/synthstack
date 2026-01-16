-- E2E Test Database Schema
-- Simplified tables for testing (no Directus dependencies)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- APP USERS
-- ============================================
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  subscription_tier VARCHAR(20) DEFAULT 'free',
  subscription_status VARCHAR(20) DEFAULT 'active',
  credits_remaining INT DEFAULT 10,
  lifetime_credits_used INT DEFAULT 0,
  credits_reset_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT FALSE,
  is_moderator BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  user_created UUID,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REFERRAL SEASONS
-- ============================================
CREATE TABLE IF NOT EXISTS referral_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- REFERRAL TIERS
-- ============================================
CREATE TABLE IF NOT EXISTS referral_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES referral_seasons(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50),
  description TEXT,
  referrals_required INT NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  reward_value JSONB NOT NULL,
  badge_icon VARCHAR(50),
  badge_color VARCHAR(20),
  is_stackable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- REFERRAL CODES
-- ============================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  season_id UUID REFERENCES referral_seasons(id) ON DELETE SET NULL,
  custom_code VARCHAR(50),
  clicks INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_click_at TIMESTAMP
);

-- ============================================
-- REFERRALS
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_user_id UUID,
  referred_email VARCHAR(255),
  referral_code_id UUID REFERENCES referral_codes(id) ON DELETE SET NULL,
  season_id UUID REFERENCES referral_seasons(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'clicked',
  click_date TIMESTAMP DEFAULT NOW(),
  signup_date TIMESTAMP,
  conversion_date TIMESTAMP,
  conversion_type VARCHAR(50),
  conversion_value DECIMAL(10,2),
  conversion_product VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- REFERRAL REWARDS
-- ============================================
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier_id UUID REFERENCES referral_tiers(id) ON DELETE SET NULL,
  season_id UUID REFERENCES referral_seasons(id) ON DELETE SET NULL,
  reward_type VARCHAR(50) NOT NULL,
  reward_data JSONB NOT NULL,
  discount_code_id UUID,
  is_unlocked BOOLEAN DEFAULT true,
  is_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  expires_at TIMESTAMP,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DISCOUNT CODES
-- ============================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100),
  description TEXT,
  type VARCHAR(50) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  applies_to VARCHAR(50) DEFAULT 'all',
  applies_to_products JSONB,
  max_uses INT,
  max_uses_per_user INT DEFAULT 1,
  current_uses INT DEFAULT 0,
  min_purchase DECIMAL(10,2),
  max_discount DECIMAL(10,2),
  referral_reward_id UUID REFERENCES referral_rewards(id) ON DELETE SET NULL,
  created_by UUID,
  source VARCHAR(50) DEFAULT 'referral',
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  starts_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DISCOUNT CODE USAGE
-- ============================================
CREATE TABLE IF NOT EXISTS discount_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id VARCHAR(100),
  original_amount DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  final_amount DECIMAL(10,2),
  product_type VARCHAR(50),
  product_id VARCHAR(100),
  used_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CREDIT TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INT NOT NULL,
  transaction_type VARCHAR(50),
  type VARCHAR(50),
  balance_before INT,
  balance_after INT,
  reference_type VARCHAR(50),
  reference_id VARCHAR(255),
  reason TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ML SERVICE REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS ml_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  organization_id UUID,
  service_name VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  status_code INTEGER NOT NULL,
  error_message TEXT,
  duration_ms INTEGER NOT NULL,
  credits_charged INTEGER DEFAULT 0,
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- FEATURE FLAGS
-- ============================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREDIT ADJUSTMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS credit_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  admin_id UUID,
  adjustment INT,
  amount INT,
  reason TEXT,
  notes TEXT,
  adjusted_by UUID,
  balance_before INT,
  balance_after INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NODERED EXECUTION LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS nodered_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  organization_id UUID,
  flow_id VARCHAR(255),
  execution_time_ms INT,
  node_count INT,
  credits_used INT DEFAULT 0,
  status VARCHAR(50),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ML SERVICE USAGE
-- ============================================
CREATE TABLE IF NOT EXISTS ml_service_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  date DATE NOT NULL,
  endpoint VARCHAR(255),
  request_count INT DEFAULT 0,
  total_credits INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, endpoint)
);

-- ============================================
-- ORGANIZATION MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BYOK: API PROVIDERS
-- ============================================
CREATE TABLE IF NOT EXISTS api_providers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  validation_endpoint TEXT,
  validation_method VARCHAR(10) DEFAULT 'GET',
  docs_url TEXT,
  key_format_hint TEXT,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BYOK: USER API KEYS
-- ============================================
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_name VARCHAR(100),
  encrypted_key TEXT NOT NULL,
  key_hint VARCHAR(8),
  is_active BOOLEAN DEFAULT true,
  is_valid BOOLEAN DEFAULT true,
  last_error TEXT,
  total_requests INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ============================================
-- BYOK: API KEY USAGE
-- ============================================
CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES user_api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  endpoint VARCHAR(200),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_cents INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_requests_user ON ml_service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_nodered_logs_org ON nodered_execution_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_user ON api_key_usage(user_id);

-- ============================================
-- SEED DATA: API PROVIDERS
-- ============================================
INSERT INTO api_providers (id, name, description, docs_url, key_format_hint, sort_order)
VALUES
  ('openai', 'OpenAI', 'GPT-4, GPT-3.5, DALL-E, Whisper', 'https://platform.openai.com/api-keys', 'sk-...', 1),
  ('anthropic', 'Anthropic', 'Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku', 'https://console.anthropic.com/settings/keys', 'sk-ant-...', 2)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DATA: BYOK FEATURE FLAGS
-- ============================================
INSERT INTO feature_flags (name, enabled) VALUES
  ('byok_enabled', true),
  ('byok_uses_internal_credits', false),
  ('byok_only_mode', false)
ON CONFLICT (name) DO NOTHING;

-- SynthStack Default Admin & Demo Users
-- Migration 019: Create default owner and demo accounts
--
-- Credentials:
--   Admin: admin@synthstack.app / synthstack123
--   Demo:  demo@synthstack.app / synthstack123
--
-- IMPORTANT: Change these passwords in production!

-- ============================================
-- Default Admin User
-- ============================================
INSERT INTO app_users (
  id,
  email,
  display_name,
  is_admin,
  is_moderator,
  subscription_tier,
  subscription_status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@synthstack.app',
  'SynthStack Admin',
  true,
  true,
  'lifetime',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  is_admin = true,
  is_moderator = true,
  subscription_tier = 'lifetime',
  subscription_status = 'active',
  updated_at = NOW();

-- ============================================
-- Demo User (Premium Access for Testing)
-- ============================================
INSERT INTO app_users (
  id,
  email,
  display_name,
  is_admin,
  is_moderator,
  subscription_tier,
  subscription_status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'demo@synthstack.app',
  'Demo User',
  false,
  false,
  'pro',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  subscription_tier = 'pro',
  subscription_status = 'active',
  updated_at = NOW();

-- ============================================
-- Set edition to premium for this instance
-- ============================================
UPDATE edition_config SET
  edition = 'premium',
  updated_at = NOW()
WHERE id = (SELECT id FROM edition_config LIMIT 1);

-- If no edition_config exists, create one
INSERT INTO edition_config (edition, max_docs_indexed, max_credits_per_month)
SELECT 'premium', 1000, 10000
WHERE NOT EXISTS (SELECT 1 FROM edition_config);

-- ============================================
-- Grant admin user all premium feature overrides
-- ============================================
INSERT INTO user_feature_overrides (user_id, feature_key, is_enabled, reason)
SELECT
  u.id,
  f.key,
  true,
  'admin_default'
FROM app_users u
CROSS JOIN feature_flags f
WHERE u.email = 'admin@synthstack.app'
  AND f.is_premium = true
ON CONFLICT (user_id, feature_key) DO UPDATE SET
  is_enabled = true,
  reason = 'admin_default';

-- ============================================
-- Grant demo user premium feature overrides
-- ============================================
INSERT INTO user_feature_overrides (user_id, feature_key, is_enabled, reason)
SELECT
  u.id,
  f.key,
  true,
  'demo_account'
FROM app_users u
CROSS JOIN feature_flags f
WHERE u.email = 'demo@synthstack.app'
  AND f.is_premium = true
ON CONFLICT (user_id, feature_key) DO UPDATE SET
  is_enabled = true,
  reason = 'demo_account';

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE app_users IS 'Application users with subscription and role information';

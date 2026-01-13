-- SynthStack Community: Default Admin & Demo Users
-- Migration 019: Create default admin + demo accounts (Community-safe)
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
  'community',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  is_admin = true,
  is_moderator = true,
  subscription_tier = 'community',
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
  'community',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  subscription_tier = 'community',
  subscription_status = 'active',
  updated_at = NOW();

-- ============================================
-- COMMUNITY EDITION: Set edition to community
-- ============================================
UPDATE edition_config SET
  edition = 'community',
  updated_at = NOW()
WHERE id = (SELECT id FROM edition_config LIMIT 1);

-- If no edition_config exists, create one
INSERT INTO edition_config (edition, max_docs_indexed, max_credits_per_month)
SELECT 'community', 10, 50
WHERE NOT EXISTS (SELECT 1 FROM edition_config);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE app_users IS 'Application users with subscription and role information';

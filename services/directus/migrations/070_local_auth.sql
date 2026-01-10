-- Migration: 070_local_auth.sql
-- Description: Flexible authentication with Supabase + Local PostgreSQL support via feature flags
-- Dependencies: app_users table, feature_flags table

-- =============================================================================
-- LOCAL AUTH CREDENTIALS
-- =============================================================================
-- Stores password hashes and auth metadata for local PostgreSQL authentication

CREATE TABLE IF NOT EXISTS local_auth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,

  -- Password (Argon2id hashed)
  password_hash VARCHAR(255) NOT NULL,
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Password reset
  reset_token VARCHAR(255),
  reset_token_expires_at TIMESTAMPTZ,

  -- Email verification
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  email_verification_sent_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,

  -- Security
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,

  -- MFA (future enhancement)
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  mfa_backup_codes TEXT[],
  mfa_enabled_at TIMESTAMPTZ,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_local_auth_user ON local_auth_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_local_auth_reset_token ON local_auth_credentials(reset_token) WHERE reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_local_auth_verification_token ON local_auth_credentials(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_local_auth_locked ON local_auth_credentials(locked_until) WHERE locked_until IS NOT NULL;

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_local_auth_timestamp ON local_auth_credentials;
CREATE TRIGGER update_local_auth_timestamp
  BEFORE UPDATE ON local_auth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- LOCAL AUTH SESSIONS
-- =============================================================================
-- Tracks active sessions for local auth (refresh token management)

CREATE TABLE IF NOT EXISTS local_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Token info (hashed for security)
  token_hash VARCHAR(255) NOT NULL,
  token_family UUID NOT NULL, -- For refresh token rotation detection

  -- Session metadata
  ip_address INET,
  user_agent TEXT,
  device_name VARCHAR(255),
  location VARCHAR(255), -- Geo-location from IP

  -- Lifecycle
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  -- Revocation
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_reason VARCHAR(100), -- 'logout', 'password_change', 'admin', 'token_rotation', 'suspicious'

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON local_auth_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON local_auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON local_auth_sessions(expires_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_family ON local_auth_sessions(token_family);

-- =============================================================================
-- OAUTH CONNECTIONS
-- =============================================================================
-- Social login connections for local auth (Google, GitHub, etc.)

CREATE TABLE IF NOT EXISTS oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Provider info
  provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'discord', 'microsoft'
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  provider_username VARCHAR(255),

  -- Tokens (encrypted in production)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Profile data cache
  profile_data JSONB,
  avatar_url VARCHAR(500),

  -- Scopes granted
  scopes TEXT[],

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,

  UNIQUE(provider, provider_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_connections(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_email ON oauth_connections(provider_email);

-- =============================================================================
-- AUTH PROVIDER CONFIGURATION
-- =============================================================================
-- Global auth provider settings

CREATE TABLE IF NOT EXISTS auth_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Active provider setting
  active_provider VARCHAR(50) NOT NULL DEFAULT 'supabase'
    CHECK (active_provider IN ('supabase', 'local', 'directus')),

  -- Provider enablement
  supabase_enabled BOOLEAN DEFAULT true,
  local_enabled BOOLEAN DEFAULT false,
  directus_enabled BOOLEAN DEFAULT false,

  -- Local auth settings
  local_password_min_length INTEGER DEFAULT 8,
  local_password_require_uppercase BOOLEAN DEFAULT true,
  local_password_require_lowercase BOOLEAN DEFAULT true,
  local_password_require_number BOOLEAN DEFAULT true,
  local_password_require_special BOOLEAN DEFAULT false,
  local_session_duration_hours INTEGER DEFAULT 168, -- 7 days
  local_max_sessions_per_user INTEGER DEFAULT 5,
  local_require_email_verification BOOLEAN DEFAULT true,
  local_max_failed_login_attempts INTEGER DEFAULT 5,
  local_lockout_duration_minutes INTEGER DEFAULT 30,

  -- OAuth settings (for local provider)
  oauth_google_enabled BOOLEAN DEFAULT false,
  oauth_google_client_id VARCHAR(255),
  -- Note: client_secret should be in env vars, not DB

  oauth_github_enabled BOOLEAN DEFAULT false,
  oauth_github_client_id VARCHAR(255),

  oauth_discord_enabled BOOLEAN DEFAULT false,
  oauth_discord_client_id VARCHAR(255),

  oauth_microsoft_enabled BOOLEAN DEFAULT false,
  oauth_microsoft_client_id VARCHAR(255),

  -- Security settings
  jwt_access_token_expires_minutes INTEGER DEFAULT 60, -- 1 hour
  jwt_refresh_token_expires_days INTEGER DEFAULT 7,

  -- Audit
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES directus_users(id)
);

-- Ensure only one config row
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_config_singleton ON auth_provider_config ((true));

-- =============================================================================
-- ENHANCE APP_USERS TABLE
-- =============================================================================

-- Add auth provider tracking
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'supabase'
  CHECK (auth_provider IN ('supabase', 'local', 'directus'));

-- Add local user ID (for self-hosted where Supabase ID doesn't exist)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS local_user_id UUID UNIQUE;

-- Add email verification status
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_users_auth_provider ON app_users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_app_users_local_id ON app_users(local_user_id) WHERE local_user_id IS NOT NULL;

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, hidden, sort)
VALUES
  ('local_auth_credentials', 'lock', 'Local auth password credentials', NULL, true, 95),
  ('local_auth_sessions', 'key', 'Active auth sessions', '{{user_id.email}}', true, 96),
  ('oauth_connections', 'link', 'OAuth social login connections', '{{provider}} - {{provider_email}}', true, 97),
  ('auth_provider_config', 'settings', 'Authentication provider configuration', NULL, false, 98)
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Auth Provider Config Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('auth_provider_config', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('auth_provider_config', 'active_provider', NULL, 'select-dropdown', '{"choices": [{"text": "Supabase", "value": "supabase"}, {"text": "Local PostgreSQL", "value": "local"}, {"text": "Directus", "value": "directus"}]}', 'labels', '{"choices": [{"text": "Supabase", "value": "supabase", "foreground": "#FFFFFF", "background": "#3ECF8E"}, {"text": "Local", "value": "local", "foreground": "#FFFFFF", "background": "#336791"}, {"text": "Directus", "value": "directus", "foreground": "#FFFFFF", "background": "#6644FF"}]}', FALSE, FALSE, 2, 'half', 'Primary auth provider', TRUE),
  ('auth_provider_config', 'supabase_enabled', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 3, 'half', NULL, FALSE),
  ('auth_provider_config', 'local_enabled', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 4, 'half', NULL, FALSE),
  ('auth_provider_config', 'directus_enabled', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 5, 'half', NULL, FALSE),
  ('auth_provider_config', 'local_password_min_length', NULL, 'input', '{"min": 6, "max": 128}', NULL, NULL, FALSE, FALSE, 6, 'half', 'Min password length', FALSE),
  ('auth_provider_config', 'local_password_require_uppercase', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 7, 'half', NULL, FALSE),
  ('auth_provider_config', 'local_password_require_number', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 8, 'half', NULL, FALSE),
  ('auth_provider_config', 'local_password_require_special', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 9, 'half', NULL, FALSE),
  ('auth_provider_config', 'local_session_duration_hours', NULL, 'input', '{"min": 1, "max": 720}', NULL, NULL, FALSE, FALSE, 10, 'half', 'Session duration (hours)', FALSE),
  ('auth_provider_config', 'local_max_sessions_per_user', NULL, 'input', '{"min": 1, "max": 100}', NULL, NULL, FALSE, FALSE, 11, 'half', 'Max concurrent sessions', FALSE),
  ('auth_provider_config', 'local_require_email_verification', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 12, 'half', NULL, FALSE),
  ('auth_provider_config', 'local_max_failed_login_attempts', NULL, 'input', '{"min": 1, "max": 20}', NULL, NULL, FALSE, FALSE, 13, 'half', 'Max failed logins', FALSE),
  ('auth_provider_config', 'local_lockout_duration_minutes', NULL, 'input', '{"min": 1, "max": 1440}', NULL, NULL, FALSE, FALSE, 14, 'half', 'Lockout duration (min)', FALSE),
  ('auth_provider_config', 'oauth_google_enabled', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 15, 'half', NULL, FALSE),
  ('auth_provider_config', 'oauth_google_client_id', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 16, 'half', NULL, FALSE),
  ('auth_provider_config', 'oauth_github_enabled', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 17, 'half', NULL, FALSE),
  ('auth_provider_config', 'oauth_github_client_id', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 18, 'half', NULL, FALSE),
  ('auth_provider_config', 'jwt_access_token_expires_minutes', NULL, 'input', '{"min": 5, "max": 1440}', NULL, NULL, FALSE, FALSE, 19, 'half', 'Access token expiry (min)', FALSE),
  ('auth_provider_config', 'jwt_refresh_token_expires_days', NULL, 'input', '{"min": 1, "max": 365}', NULL, NULL, FALSE, FALSE, 20, 'half', 'Refresh token expiry (days)', FALSE),
  ('auth_provider_config', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 21, 'half', NULL, FALSE),
  ('auth_provider_config', 'updated_by', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 22, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Add auth fields to app_users in Directus
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('app_users', 'auth_provider', NULL, 'select-dropdown', '{"choices": [{"text": "Supabase", "value": "supabase"}, {"text": "Local", "value": "local"}, {"text": "Directus", "value": "directus"}]}', 'labels', '{"choices": [{"text": "Supabase", "value": "supabase", "foreground": "#FFFFFF", "background": "#3ECF8E"}, {"text": "Local", "value": "local", "foreground": "#FFFFFF", "background": "#336791"}, {"text": "Directus", "value": "directus", "foreground": "#FFFFFF", "background": "#6644FF"}]}', TRUE, FALSE, 50, 'half', 'Authentication provider', FALSE),
  ('app_users', 'email_verified', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, TRUE, FALSE, 51, 'half', NULL, FALSE),
  ('app_users', 'email_verified_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 52, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- =============================================================================
-- FEATURE FLAGS FOR AUTH
-- =============================================================================

INSERT INTO feature_flags (key, name, description, category, is_enabled, is_premium, min_tier, sort_order)
VALUES
  ('auth_supabase', 'Supabase Authentication', 'Use Supabase for user authentication', 'auth', true, false, 'community', 200),
  ('auth_local_postgres', 'Local PostgreSQL Auth', 'Use local PostgreSQL for user authentication', 'auth', false, false, 'community', 201),
  ('auth_directus', 'Directus Authentication', 'Use Directus users for authentication', 'auth', false, false, 'community', 202),
  ('auth_oauth_google', 'Google OAuth', 'Allow Google sign-in', 'auth', true, false, 'community', 210),
  ('auth_oauth_github', 'GitHub OAuth', 'Allow GitHub sign-in', 'auth', true, false, 'community', 211),
  ('auth_oauth_discord', 'Discord OAuth', 'Allow Discord sign-in', 'auth', false, false, 'subscriber', 212),
  ('auth_mfa', 'Multi-Factor Authentication', 'Enable MFA for users', 'auth', false, true, 'premium', 220)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- =============================================================================
-- SEED DEFAULT AUTH CONFIG
-- =============================================================================

INSERT INTO auth_provider_config (
  active_provider,
  supabase_enabled,
  local_enabled,
  directus_enabled,
  local_password_min_length,
  local_password_require_uppercase,
  local_password_require_number,
  local_require_email_verification,
  local_max_failed_login_attempts,
  local_lockout_duration_minutes,
  local_session_duration_hours,
  local_max_sessions_per_user
)
VALUES (
  'supabase', -- Default to Supabase
  true,
  false,
  false,
  8,
  true,
  true,
  true,
  5,
  30,
  168, -- 7 days
  5
)
ON CONFLICT ((true)) DO NOTHING;

-- =============================================================================
-- CLEANUP OLD SESSIONS (scheduled job helper)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM local_auth_sessions
  WHERE expires_at < NOW() - INTERVAL '7 days'
     OR (is_active = FALSE AND revoked_at < NOW() - INTERVAL '30 days');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- REVOKE ALL USER SESSIONS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION revoke_all_user_sessions(p_user_id UUID, p_reason VARCHAR DEFAULT 'admin')
RETURNS INTEGER AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  UPDATE local_auth_sessions
  SET
    is_active = FALSE,
    revoked_at = NOW(),
    revoked_reason = p_reason
  WHERE user_id = p_user_id AND is_active = TRUE;
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  RETURN revoked_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE local_auth_credentials IS 'Stores password hashes and auth metadata for local PostgreSQL authentication';
COMMENT ON TABLE local_auth_sessions IS 'Tracks active sessions with refresh tokens for local auth';
COMMENT ON TABLE oauth_connections IS 'Social login connections for local auth (Google, GitHub, etc.)';
COMMENT ON TABLE auth_provider_config IS 'Global authentication provider configuration';
COMMENT ON COLUMN local_auth_credentials.password_hash IS 'Argon2id hashed password';
COMMENT ON COLUMN local_auth_sessions.token_hash IS 'SHA-256 hashed refresh token';
COMMENT ON COLUMN local_auth_sessions.token_family IS 'Family ID for refresh token rotation - detects token reuse attacks';
COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Deletes expired and old revoked sessions - call from cron job';
COMMENT ON FUNCTION revoke_all_user_sessions(UUID, VARCHAR) IS 'Revokes all active sessions for a user - use for password change or security events';

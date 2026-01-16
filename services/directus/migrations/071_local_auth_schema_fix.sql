-- Migration: 071_local_auth_schema_fix.sql
-- Description: Add columns required by the LocalAuthProvider implementation.
--
-- Notes:
-- - `070_local_auth.sql` created baseline tables for local auth, but the API code expects
--   `password_reset_*`, `email_verification_expires`, `refresh_token_hash`, and `created_at/updated_at`.
-- - This migration is additive and idempotent (safe to re-run).

-- =============================================================================
-- LOCAL AUTH CREDENTIALS
-- =============================================================================

ALTER TABLE IF EXISTS local_auth_credentials
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill best-effort from legacy columns (if present)
UPDATE local_auth_credentials
SET
  password_reset_token = COALESCE(password_reset_token, reset_token),
  password_reset_expires = COALESCE(password_reset_expires, reset_token_expires_at),
  email_verification_expires = COALESCE(
    email_verification_expires,
    CASE
      WHEN email_verification_token IS NOT NULL AND email_verification_sent_at IS NOT NULL
        THEN email_verification_sent_at + INTERVAL '24 hours'
      ELSE NULL
    END
  ),
  created_at = COALESCE(created_at, date_created, NOW()),
  updated_at = COALESCE(updated_at, date_updated, NOW())
WHERE
  created_at IS NULL
  OR updated_at IS NULL
  OR (password_reset_token IS NULL AND reset_token IS NOT NULL)
  OR (password_reset_expires IS NULL AND reset_token_expires_at IS NOT NULL)
  OR (email_verification_expires IS NULL AND email_verification_token IS NOT NULL AND email_verification_sent_at IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_local_auth_password_reset_token
  ON local_auth_credentials(password_reset_token)
  WHERE password_reset_token IS NOT NULL;

-- =============================================================================
-- LOCAL AUTH SESSIONS
-- =============================================================================

ALTER TABLE IF EXISTS local_auth_sessions
  ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill best-effort timestamps for existing rows
UPDATE local_auth_sessions
SET
  created_at = COALESCE(created_at, issued_at, date_created, NOW()),
  updated_at = COALESCE(updated_at, last_used_at, issued_at, date_created, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_local_auth_sessions_refresh_token_hash
  ON local_auth_sessions(refresh_token_hash)
  WHERE refresh_token_hash IS NOT NULL;


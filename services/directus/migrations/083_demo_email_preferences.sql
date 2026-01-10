-- Migration: 083_demo_email_preferences.sql
-- Description: Add email preferences for demo credit notifications
-- Dependencies: 002_admin_extensions.sql (app_users table), 082_demo_copilot_credits.sql
-- Date: 2026-01-06
-- Author: Claude Code
-- Documentation: See docs/DEMO_CREDIT_SYSTEM.md

-- =================================================================
-- ADD EMAIL PREFERENCES COLUMN
-- =================================================================

-- Add email_preferences JSONB column to app_users if not exists
-- Default enables demo_credits notifications for all users
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{"demo_credits": true}'::jsonb;

-- =================================================================
-- CREATE INDEX FOR PERFORMANCE
-- =================================================================

-- Create GIN index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_app_users_email_preferences
ON app_users USING GIN (email_preferences);

-- =================================================================
-- UPDATE EXISTING USERS
-- =================================================================

-- Update existing users to have demo_credits enabled by default
UPDATE app_users
SET email_preferences = jsonb_set(
  COALESCE(email_preferences, '{}'::jsonb),
  '{demo_credits}',
  'true'::jsonb
)
WHERE email_preferences IS NULL
   OR email_preferences->>'demo_credits' IS NULL;

-- =================================================================
-- ADD COLUMN COMMENT FOR DOCUMENTATION
-- =================================================================

COMMENT ON COLUMN app_users.email_preferences IS
'User email notification preferences stored as JSONB.
Keys:
  - demo_credits (boolean): Send notification when demo copilot credits are low
  - marketing (boolean): Send marketing and promotional emails
  - product_updates (boolean): Send product updates and feature announcements
  - weekly_summary (boolean): Send weekly activity summary

Example:
{
  "demo_credits": true,
  "marketing": false,
  "product_updates": true,
  "weekly_summary": false
}';

-- =================================================================
-- VERIFICATION QUERIES
-- =================================================================

-- Verify column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'app_users'
      AND column_name = 'email_preferences'
  ) THEN
    RAISE NOTICE '✅ email_preferences column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add email_preferences column';
  END IF;
END $$;

-- Verify index was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'app_users'
      AND indexname = 'idx_app_users_email_preferences'
  ) THEN
    RAISE NOTICE '✅ idx_app_users_email_preferences index created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create email preferences index';
  END IF;
END $$;

-- Show sample of updated records
SELECT
  id,
  email,
  email_preferences,
  date_created
FROM app_users
LIMIT 5;

RAISE NOTICE '✅ Migration 083_demo_email_preferences completed successfully';

-- Migration: 082_demo_copilot_credits.sql
-- Description: Add credit-based demo copilot with 5 messages per session and usage tracking
-- Dependencies: 057_demo_sessions.sql

-- =============================================================================
-- EXTEND DEMO_SESSIONS FOR COPILOT CREDITS
-- =============================================================================

-- Add copilot-specific tracking to demo_sessions
ALTER TABLE demo_sessions
  ADD COLUMN IF NOT EXISTS copilot_credits_remaining INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS copilot_credits_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS copilot_last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS copilot_blocked_until TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN demo_sessions.copilot_credits_remaining IS 'Remaining AI copilot messages for this session (default 5)';
COMMENT ON COLUMN demo_sessions.copilot_credits_used IS 'Total AI copilot messages used in this session';
COMMENT ON COLUMN demo_sessions.copilot_last_used_at IS 'Timestamp of last copilot message';
COMMENT ON COLUMN demo_sessions.copilot_blocked_until IS 'If credits depleted, blocks copilot usage until this time';

-- Update existing demo_sessions to have 5 credits
UPDATE demo_sessions
SET copilot_credits_remaining = 5,
    copilot_credits_used = 0
WHERE copilot_credits_remaining IS NULL;

-- Update demo_limits for copilot feature
INSERT INTO demo_limits (feature, max_count)
VALUES ('copilot_messages', 5)
ON CONFLICT (feature) DO UPDATE
SET max_count = 5;

-- =============================================================================
-- CREATE COPILOT_USAGE_LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS copilot_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification (one of these will be set)
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  demo_session_id VARCHAR(64) REFERENCES demo_sessions(session_id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Usage details
  message_type VARCHAR(50) DEFAULT 'chat' CHECK (message_type IN ('chat', 'search', 'generation', 'code', 'analysis')),
  tokens_used INTEGER,
  credits_deducted INTEGER DEFAULT 1,
  model_used VARCHAR(100),

  -- Context metadata
  scope VARCHAR(50) DEFAULT 'global' CHECK (scope IN ('global', 'project', 'portal', 'admin')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Additional context
  chat_id UUID,
  message_id UUID,

  -- Result
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  response_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE copilot_usage_log IS 'Tracks all AI copilot usage across demo sessions, authenticated users, and portal clients';
COMMENT ON COLUMN copilot_usage_log.user_id IS 'Authenticated app user (for premium users)';
COMMENT ON COLUMN copilot_usage_log.demo_session_id IS 'Demo/guest session (for free users with 5 message limit)';
COMMENT ON COLUMN copilot_usage_log.contact_id IS 'Client portal user (for client-facing copilot)';
COMMENT ON COLUMN copilot_usage_log.scope IS 'Context scope: global (full access), project (single project), portal (client data only), admin (internal)';
COMMENT ON COLUMN copilot_usage_log.credits_deducted IS 'Number of credits deducted (default 1, may be 0 for premium users)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_copilot_usage_demo_session ON copilot_usage_log(demo_session_id) WHERE demo_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_copilot_usage_user ON copilot_usage_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_copilot_usage_contact ON copilot_usage_log(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_copilot_usage_created ON copilot_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_usage_scope ON copilot_usage_log(scope);
CREATE INDEX IF NOT EXISTS idx_copilot_usage_success ON copilot_usage_log(success) WHERE success = false;

-- =============================================================================
-- GRANT GUEST USER PERMISSIONS FOR COPILOT COLLECTIONS
-- =============================================================================

DO $$
DECLARE
  guest_policy_id UUID;
BEGIN
  -- Get Guest User Policy ID
  SELECT id INTO guest_policy_id
  FROM directus_policies
  WHERE name = 'Guest User Policy'
  LIMIT 1;

  IF guest_policy_id IS NULL THEN
    RAISE NOTICE '⚠️  Guest User Policy not found. Skipping copilot permissions.';
    RETURN;
  END IF;

  -- =============================================================================
  -- COPILOT_CHATS (Read Own, Create Own, Update Own)
  -- =============================================================================

  -- READ own copilot chats
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'copilot_chats',
    'read',
    '{"user_id":{"_eq":"$CURRENT_USER"}}',
    '*',
    guest_policy_id
  )
  ON CONFLICT DO NOTHING;

  -- CREATE copilot chats (validate user_id matches current user)
  INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
  VALUES (
    'copilot_chats',
    'create',
    '{}',
    '{"user_id":{"_eq":"$CURRENT_USER"}}',
    '*',
    guest_policy_id
  )
  ON CONFLICT DO NOTHING;

  -- UPDATE own copilot chats (title, metadata only)
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'copilot_chats',
    'update',
    '{"user_id":{"_eq":"$CURRENT_USER"}}',
    'title,metadata',
    guest_policy_id
  )
  ON CONFLICT DO NOTHING;

  -- DELETE own copilot chats
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'copilot_chats',
    'delete',
    '{"user_id":{"_eq":"$CURRENT_USER"}}',
    '*',
    guest_policy_id
  )
  ON CONFLICT DO NOTHING;

  -- =============================================================================
  -- COPILOT_MESSAGES (Read Own Chat, Create in Own Chat)
  -- =============================================================================

  -- READ messages in own chats
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'copilot_messages',
    'read',
    '{"chat_id":{"user_id":{"_eq":"$CURRENT_USER"}}}',
    '*',
    guest_policy_id
  )
  ON CONFLICT DO NOTHING;

  -- CREATE messages in own chats
  INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
  VALUES (
    'copilot_messages',
    'create',
    '{"chat_id":{"user_id":{"_eq":"$CURRENT_USER"}}}',
    '{}',
    '*',
    guest_policy_id
  )
  ON CONFLICT DO NOTHING;

  -- =============================================================================
  -- COPILOT_INDEXED_DOCUMENTS (Read-Only for Context)
  -- =============================================================================

  -- READ copilot indexed documents (for RAG context display)
  INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
  VALUES (
    'copilot_indexed_documents',
    'read',
    '{}',
    'id,title,document_type,source_url,chunk_count,status',
    guest_policy_id
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Guest User copilot permissions granted successfully';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error granting Guest User copilot permissions: %', SQLERRM;
END $$;

-- =============================================================================
-- UPDATE COLLECTION METADATA
-- =============================================================================

-- Ensure copilot collections are visible to guest users
UPDATE directus_collections
SET hidden = false
WHERE collection IN ('copilot_chats', 'copilot_messages', 'copilot_indexed_documents');

-- =============================================================================
-- CREATE VIEW FOR DEMO CREDIT ANALYTICS
-- =============================================================================

CREATE OR REPLACE VIEW demo_copilot_analytics AS
SELECT
  ds.session_id,
  ds.copilot_credits_remaining,
  ds.copilot_credits_used,
  ds.copilot_last_used_at,
  ds.copilot_blocked_until,
  ds.created_at as session_created_at,
  ds.expires_at as session_expires_at,
  COUNT(cul.id) as total_messages,
  SUM(cul.tokens_used) as total_tokens_used,
  AVG(cul.response_time_ms) as avg_response_time_ms,
  COUNT(CASE WHEN cul.success = false THEN 1 END) as error_count,
  MAX(cul.created_at) as last_message_at
FROM demo_sessions ds
LEFT JOIN copilot_usage_log cul ON cul.demo_session_id = ds.session_id
GROUP BY ds.session_id, ds.copilot_credits_remaining, ds.copilot_credits_used,
         ds.copilot_last_used_at, ds.copilot_blocked_until, ds.created_at, ds.expires_at;

COMMENT ON VIEW demo_copilot_analytics IS 'Analytics view for demo copilot usage per session';

-- =============================================================================
-- TRIGGER: Auto-expire blocked sessions after 24 hours
-- =============================================================================

CREATE OR REPLACE FUNCTION unblock_demo_copilot_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE demo_sessions
  SET copilot_blocked_until = NULL
  WHERE copilot_blocked_until IS NOT NULL
    AND copilot_blocked_until < NOW();
END;
$$;

COMMENT ON FUNCTION unblock_demo_copilot_sessions IS 'Unblocks demo copilot sessions after block period expires (run via cron)';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 082 completed successfully';
  RAISE NOTICE '   - Demo sessions extended with copilot credit tracking';
  RAISE NOTICE '   - copilot_usage_log table created with indexes';
  RAISE NOTICE '   - Guest User permissions granted for copilot collections';
  RAISE NOTICE '   - Demo copilot analytics view created';
  RAISE NOTICE '   - Default limit: 5 messages per demo session';
END $$;

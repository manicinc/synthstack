-- SynthStack AI Agent Updates
-- Migration 057: Agent-Initiated Messages and Notifications
--
-- This migration creates a lightweight table for agent-initiated messages
-- that appear as notifications and can be displayed when switching to an agent

-- ============================================
-- AI Agent Updates (Lightweight notifications/messages)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agent_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Update content
  type VARCHAR(50) NOT NULL CHECK (type IN ('greeting', 'insight', 'reminder', 'suggestion', 'tip', 'alert')),
  title VARCHAR(255),
  content TEXT NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- Additional context (e.g., related project, trigger reason)
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),

  -- Read status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Display control
  display_once BOOLEAN DEFAULT FALSE,  -- If true, auto-dismiss after showing
  expires_at TIMESTAMP WITH TIME ZONE,  -- Optional expiration

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Primary lookup: unread updates for a user/agent
CREATE INDEX IF NOT EXISTS idx_ai_agent_updates_user_agent
  ON ai_agent_updates(user_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_updates_unread
  ON ai_agent_updates(user_id, is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_ai_agent_updates_user_unread_agent
  ON ai_agent_updates(user_id, agent_id, is_read) WHERE is_read = FALSE;

-- Type filtering
CREATE INDEX IF NOT EXISTS idx_ai_agent_updates_type
  ON ai_agent_updates(type);

-- Cleanup expired updates
CREATE INDEX IF NOT EXISTS idx_ai_agent_updates_expires
  ON ai_agent_updates(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agent_updates TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE ai_agent_updates IS 'Lightweight agent-initiated messages and notifications for users';
COMMENT ON COLUMN ai_agent_updates.type IS 'Type of update: greeting (welcome), insight (discovered info), reminder, suggestion (quick tip), tip (helpful hint), alert (attention needed)';
COMMENT ON COLUMN ai_agent_updates.display_once IS 'If true, the update should be marked read immediately after displaying';
COMMENT ON COLUMN ai_agent_updates.expires_at IS 'Optional expiration date after which update should not be shown';

-- ============================================
-- Register with Directus Collections
-- ============================================
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, translations, accountability, sort_field, archive_field, unarchive_value, archive_app_filter, archive_value, sort, "group", collapse, preview_url)
VALUES (
  'ai_agent_updates',
  'notifications',
  'Agent-initiated messages and notifications for users',
  '{{title}}',
  false,
  false,
  NULL,
  'all',
  NULL,
  NULL,
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  'open',
  NULL
)
ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- ============================================
-- Directus Fields
-- ============================================

-- ID field
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'id', 'uuid', 'input', NULL, 'raw', NULL, true, true, 1, 'full', NULL, 'Primary key')
ON CONFLICT (collection, field) DO NOTHING;

-- User ID
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'user_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{email}}"}', 'related-values', '{"template":"{{email}}"}', false, false, 2, 'half', NULL, 'User receiving the update')
ON CONFLICT (collection, field) DO NOTHING;

-- Agent ID
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'agent_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', false, false, 3, 'half', NULL, 'Agent sending the update')
ON CONFLICT (collection, field) DO NOTHING;

-- Type
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'type', NULL, 'select-dropdown', '{"choices":[{"text":"Greeting","value":"greeting"},{"text":"Insight","value":"insight"},{"text":"Reminder","value":"reminder"},{"text":"Suggestion","value":"suggestion"},{"text":"Tip","value":"tip"},{"text":"Alert","value":"alert"}]}', 'labels', '{"choices":[{"text":"Greeting","value":"greeting","foreground":"#ffffff","background":"#6366f1"},{"text":"Insight","value":"insight","foreground":"#ffffff","background":"#10b981"},{"text":"Reminder","value":"reminder","foreground":"#ffffff","background":"#f59e0b"},{"text":"Suggestion","value":"suggestion","foreground":"#ffffff","background":"#3b82f6"},{"text":"Tip","value":"tip","foreground":"#ffffff","background":"#8b5cf6"},{"text":"Alert","value":"alert","foreground":"#ffffff","background":"#ef4444"}]}', false, false, 4, 'half', NULL, 'Type of update')
ON CONFLICT (collection, field) DO NOTHING;

-- Title
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'title', NULL, 'input', NULL, 'raw', NULL, false, false, 5, 'half', NULL, 'Optional title for the update')
ON CONFLICT (collection, field) DO NOTHING;

-- Content
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'content', NULL, 'input-multiline', NULL, 'raw', NULL, false, false, 6, 'full', NULL, 'Update message content')
ON CONFLICT (collection, field) DO NOTHING;

-- Priority
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'priority', NULL, 'select-dropdown', '{"choices":[{"text":"Low","value":"low"},{"text":"Normal","value":"normal"},{"text":"High","value":"high"}]}', 'labels', '{"choices":[{"text":"Low","value":"low","foreground":"#9ca3af","background":"#f3f4f6"},{"text":"Normal","value":"normal","foreground":"#ffffff","background":"#3b82f6"},{"text":"High","value":"high","foreground":"#ffffff","background":"#ef4444"}]}', false, false, 7, 'half', NULL, 'Priority level')
ON CONFLICT (collection, field) DO NOTHING;

-- Is Read
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'is_read', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, false, false, 8, 'half', NULL, 'Whether the user has seen this update')
ON CONFLICT (collection, field) DO NOTHING;

-- Read At
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'read_at', 'date-created', 'datetime', NULL, 'datetime', NULL, true, true, 9, 'half', NULL, 'When the update was read')
ON CONFLICT (collection, field) DO NOTHING;

-- Display Once
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'display_once', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, false, false, 10, 'half', NULL, 'Auto-dismiss after showing')
ON CONFLICT (collection, field) DO NOTHING;

-- Expires At
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'expires_at', NULL, 'datetime', NULL, 'datetime', NULL, false, false, 11, 'half', NULL, 'Optional expiration date')
ON CONFLICT (collection, field) DO NOTHING;

-- Metadata
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'metadata', 'cast-json', 'input-code', '{"language":"json"}', 'raw', NULL, false, true, 12, 'full', NULL, 'Additional context (JSON)')
ON CONFLICT (collection, field) DO NOTHING;

-- Created At
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES ('ai_agent_updates', 'created_at', 'date-created', 'datetime', NULL, 'datetime', NULL, true, false, 13, 'half', NULL, 'When the update was created')
ON CONFLICT (collection, field) DO NOTHING;

-- ============================================
-- Directus Relations
-- ============================================

-- User relation
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('ai_agent_updates', 'user_id', 'app_users', NULL, NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT (many_collection, many_field) DO NOTHING;

-- Agent relation
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('ai_agent_updates', 'agent_id', 'ai_agents', NULL, NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT (many_collection, many_field) DO NOTHING;

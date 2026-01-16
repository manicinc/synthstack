-- Migration: 062_conversations.sql
-- Description: Client portal messaging with conversations and messages
-- Dependencies: 028_organizations_contacts.sql, 060_project_client_portal.sql

-- =============================================================================
-- CONVERSATIONS TABLE
-- =============================================================================
-- Threaded conversations that can be attached to various collections

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),

  -- Polymorphic relation - can be linked to any collection
  collection VARCHAR(100), -- 'projects', 'proposals', 'invoices', 'general'
  item UUID, -- ID of the related item

  -- For general/support conversations without a linked item
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Visitor tracking (for unauthenticated users/forms)
  visitor_id VARCHAR(255),
  visitor_email VARCHAR(255),
  visitor_name VARCHAR(255),

  -- Unread tracking
  has_unread_internal BOOLEAN DEFAULT false, -- Team has unread messages
  has_unread_client BOOLEAN DEFAULT false, -- Client has unread messages

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Last activity for sorting
  last_message_at TIMESTAMPTZ,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_collection_item ON conversations(collection, item);
CREATE INDEX IF NOT EXISTS idx_conversations_organization ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_visitor ON conversations(visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_unread_internal ON conversations(has_unread_internal) WHERE has_unread_internal = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversations_unread_client ON conversations(has_unread_client) WHERE has_unread_client = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_conversations_timestamp ON conversations;
CREATE TRIGGER update_conversations_timestamp
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- MESSAGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Message content
  text TEXT NOT NULL,

  -- Sender - one of these should be set
  user_created UUID REFERENCES directus_users(id), -- Internal team member
  contact_id UUID REFERENCES contacts(id), -- Client contact
  visitor_id VARCHAR(255), -- Unauthenticated visitor

  -- Sender info (denormalized for display)
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),

  -- Message type
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'note')),

  -- For system messages
  system_action VARCHAR(100), -- 'status_changed', 'assigned', 'resolved', etc.
  system_metadata JSONB,

  -- Internal note (only visible to team)
  is_internal_note BOOLEAN DEFAULT false,

  -- Read tracking
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES directus_users(id),

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_created) WHERE user_created IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date_created DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_internal ON messages(is_internal_note) WHERE is_internal_note = TRUE;

-- =============================================================================
-- MESSAGE ATTACHMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES directus_files(id) ON DELETE CASCADE,

  -- Sort order
  sort INTEGER DEFAULT 0,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, file_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);

-- =============================================================================
-- CONVERSATION PARTICIPANTS TABLE
-- =============================================================================
-- Track who has access to a conversation (beyond the linked item)

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Participant - one of these should be set
  user_id UUID REFERENCES directus_users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,

  -- Role
  role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('owner', 'participant', 'cc')),

  -- Notifications
  notify_on_new_message BOOLEAN DEFAULT true,

  -- Last read tracking
  last_read_at TIMESTAMPTZ,
  last_read_message_id UUID REFERENCES messages(id),

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(conversation_id, user_id),
  UNIQUE(conversation_id, contact_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_contact ON conversation_participants(contact_id);

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, archive_field, archive_value, unarchive_value, sort)
VALUES
  ('conversations', 'chat', 'Client portal conversations', '{{title}}', NULL, 'status', 'archived', 'open', 100),
  ('messages', 'message', 'Messages within conversations', NULL, NULL, NULL, NULL, NULL, 101),
  ('message_attachments', 'attach_file', 'File attachments for messages', NULL, 'sort', NULL, NULL, NULL, 102),
  ('conversation_participants', 'group', 'Participants in conversations', NULL, NULL, NULL, NULL, NULL, 103)
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Conversations Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT
  v.collection,
  v.field,
  v.special,
  v.interface,
  v.options::json,
  v.display,
  v.display_options::json,
  v.readonly,
  v.hidden,
  v.sort,
  v.width,
  v.note,
  v.required
FROM (
  VALUES
  ('conversations', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('conversations', 'title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 2, 'full', 'Conversation subject', FALSE),
  ('conversations', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Open", "value": "open"}, {"text": "Closed", "value": "closed"}, {"text": "Archived", "value": "archived"}]}', 'labels', '{"choices": [{"text": "Open", "value": "open", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Closed", "value": "closed", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Archived", "value": "archived", "foreground": "#FFFFFF", "background": "#EF4444"}]}', FALSE, FALSE, 3, 'half', NULL, FALSE),
  ('conversations', 'priority', NULL, 'select-dropdown', '{"choices": [{"text": "Low", "value": "low"}, {"text": "Normal", "value": "normal"}, {"text": "High", "value": "high"}, {"text": "Urgent", "value": "urgent"}]}', 'labels', '{"choices": [{"text": "Low", "value": "low", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Normal", "value": "normal", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "High", "value": "high", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Urgent", "value": "urgent", "foreground": "#FFFFFF", "background": "#EF4444"}]}', FALSE, FALSE, 4, 'half', NULL, FALSE),
  ('conversations', 'collection', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 5, 'half', 'Related collection type', FALSE),
  ('conversations', 'item', 'uuid', 'input', NULL, NULL, NULL, FALSE, FALSE, 6, 'half', 'Related item ID', FALSE),
  ('conversations', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 7, 'full', NULL, FALSE),
  ('conversations', 'visitor_id', NULL, 'input', NULL, NULL, NULL, FALSE, TRUE, 8, 'full', NULL, FALSE),
  ('conversations', 'visitor_email', NULL, 'input', NULL, NULL, NULL, FALSE, TRUE, 9, 'half', NULL, FALSE),
  ('conversations', 'visitor_name', NULL, 'input', NULL, NULL, NULL, FALSE, TRUE, 10, 'half', NULL, FALSE),
  ('conversations', 'has_unread_internal', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 11, 'half', 'Team has unread', FALSE),
  ('conversations', 'has_unread_client', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 12, 'half', 'Client has unread', FALSE),
  ('conversations', 'last_message_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 13, 'half', NULL, FALSE),
  ('conversations', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 14, 'half', NULL, FALSE),
  ('conversations', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 15, 'half', NULL, FALSE),
  ('conversations', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 16, 'half', NULL, FALSE),
  ('conversations', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 17, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Messages Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT
  v.collection,
  v.field,
  v.special,
  v.interface,
  v.options::json,
  v.display,
  v.display_options::json,
  v.readonly,
  v.hidden,
  v.sort,
  v.width,
  v.note,
  v.required
FROM (
  VALUES
  ('messages', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('messages', 'conversation_id', 'm2o', 'select-dropdown-m2o', NULL, 'related-values', NULL, FALSE, FALSE, 2, 'full', NULL, TRUE),
  ('messages', 'text', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 3, 'full', 'Message content', TRUE),
  ('messages', 'message_type', NULL, 'select-dropdown', '{"choices": [{"text": "Text", "value": "text"}, {"text": "File", "value": "file"}, {"text": "System", "value": "system"}, {"text": "Note", "value": "note"}]}', NULL, NULL, FALSE, FALSE, 4, 'half', NULL, FALSE),
  ('messages', 'is_internal_note', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 5, 'half', 'Only visible to team', FALSE),
  ('messages', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, FALSE, 6, 'half', 'Team member sender', FALSE),
  ('messages', 'contact_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'related-values', NULL, FALSE, FALSE, 7, 'half', 'Client contact sender', FALSE),
  ('messages', 'sender_name', NULL, 'input', NULL, NULL, NULL, FALSE, TRUE, 8, 'half', NULL, FALSE),
  ('messages', 'sender_email', NULL, 'input', NULL, NULL, NULL, FALSE, TRUE, 9, 'half', NULL, FALSE),
  ('messages', 'is_read', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 10, 'half', NULL, FALSE),
  ('messages', 'read_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 11, 'half', NULL, FALSE),
  ('messages', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 12, 'half', NULL, FALSE),
  ('messages', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 13, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Conversations -> Organization
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('conversations', 'organization_id', 'organizations', 'conversations', 'nullify')
ON CONFLICT DO NOTHING;

-- Messages -> Conversation
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('messages', 'conversation_id', 'conversations', 'messages', 'nullify')
ON CONFLICT DO NOTHING;

-- Messages -> Contact
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('messages', 'contact_id', 'contacts', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Message Attachments -> Message
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('message_attachments', 'message_id', 'messages', 'attachments', 'nullify')
ON CONFLICT DO NOTHING;

-- Message Attachments -> Files
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('message_attachments', 'file_id', 'directus_files', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Conversation Participants -> Conversation
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('conversation_participants', 'conversation_id', 'conversations', 'participants', 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- UPDATE CONVERSATION ON NEW MESSAGE TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_message_at
  UPDATE conversations
  SET
    last_message_at = NEW.date_created,
    date_updated = NOW(),
    -- If message from team member, set unread for client
    has_unread_client = CASE WHEN NEW.user_created IS NOT NULL AND NOT NEW.is_internal_note THEN true ELSE has_unread_client END,
    -- If message from client/contact, set unread for internal
    has_unread_internal = CASE WHEN NEW.contact_id IS NOT NULL OR NEW.visitor_id IS NOT NULL THEN true ELSE has_unread_internal END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- =============================================================================
-- FEATURE FLAGS
-- =============================================================================

INSERT INTO feature_flags (key, name, description, category, is_enabled, is_premium, min_tier, sort_order)
VALUES
  ('client_messaging', 'Client Messaging', 'Allow clients to send messages in portal', 'portal', true, false, 'subscriber', 302),
  ('client_file_sharing', 'Client File Sharing', 'Allow clients to share files via messages', 'portal', true, false, 'subscriber', 303)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE conversations IS 'Threaded conversations for client portal messaging';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE message_attachments IS 'File attachments for messages';
COMMENT ON TABLE conversation_participants IS 'Participants with access to conversations';
COMMENT ON COLUMN conversations.collection IS 'Polymorphic: projects, proposals, invoices, general';
COMMENT ON COLUMN messages.is_internal_note IS 'Internal notes are only visible to team members';

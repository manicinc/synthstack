-- =============================================
-- Migration: Add Agent ID and Scope to Conversations
-- =============================================
-- Adds agent_id and scope fields to ai_copilot_conversations
-- to support per-agent chat context isolation and
-- project vs global query scoping.
-- =============================================

-- Add agent_id column to conversations
ALTER TABLE ai_copilot_conversations
ADD COLUMN IF NOT EXISTS agent_id VARCHAR(50) DEFAULT 'general';

-- Add scope column (project-specific or global across all projects)
ALTER TABLE ai_copilot_conversations
ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'project';

-- Add constraint for valid scope values
ALTER TABLE ai_copilot_conversations
DROP CONSTRAINT IF EXISTS chk_conversation_scope;

ALTER TABLE ai_copilot_conversations
ADD CONSTRAINT chk_conversation_scope
CHECK (scope IN ('project', 'global'));

-- Create index for agent-based queries
CREATE INDEX IF NOT EXISTS idx_copilot_conversations_agent
ON ai_copilot_conversations(agent_id);

-- Create index for scope-based queries
CREATE INDEX IF NOT EXISTS idx_copilot_conversations_scope
ON ai_copilot_conversations(scope);

-- Composite index for user + agent queries (common access pattern)
CREATE INDEX IF NOT EXISTS idx_copilot_conversations_user_agent
ON ai_copilot_conversations(user_id, agent_id);

-- Update existing conversations to have 'general' agent
UPDATE ai_copilot_conversations
SET agent_id = 'general'
WHERE agent_id IS NULL;

-- Update existing conversations to have 'project' scope
UPDATE ai_copilot_conversations
SET scope = 'project'
WHERE scope IS NULL;

-- Register new fields in Directus
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note)
VALUES
  ('ai_copilot_conversations', 'agent_id', NULL, 'select-dropdown',
   '{"choices": [
     {"text": "General Assistant", "value": "general"},
     {"text": "Research Agent", "value": "researcher"},
     {"text": "Marketing Agent", "value": "marketer"},
     {"text": "Developer Agent", "value": "developer"},
     {"text": "SEO Writer", "value": "seo_writer"},
     {"text": "Design Agent", "value": "designer"}
   ]}',
   'labels',
   '{"showAsDot": true, "choices": [
     {"text": "General", "value": "general", "foreground": "#FFFFFF", "background": "#6366F1"},
     {"text": "Research", "value": "researcher", "foreground": "#FFFFFF", "background": "#10B981"},
     {"text": "Marketing", "value": "marketer", "foreground": "#18222F", "background": "#F59E0B"},
     {"text": "Developer", "value": "developer", "foreground": "#FFFFFF", "background": "#3B82F6"},
     {"text": "SEO", "value": "seo_writer", "foreground": "#FFFFFF", "background": "#8B5CF6"},
     {"text": "Design", "value": "designer", "foreground": "#FFFFFF", "background": "#EC4899"}
   ]}',
   false, false, 15, 'half', NULL, 'AI Agent that owns this conversation'),

  ('ai_copilot_conversations', 'scope', NULL, 'select-dropdown',
   '{"choices": [
     {"text": "Project", "value": "project"},
     {"text": "Global", "value": "global"}
   ]}',
   'labels',
   '{"showAsDot": true, "choices": [
     {"text": "Project", "value": "project", "foreground": "#FFFFFF", "background": "#3B82F6"},
     {"text": "Global", "value": "global", "foreground": "#FFFFFF", "background": "#10B981"}
   ]}',
   false, false, 16, 'half', NULL, 'Conversation scope: project-specific or global')
ON CONFLICT (collection, field) DO UPDATE SET
  special = EXCLUDED.special,
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  note = EXCLUDED.note;

COMMENT ON COLUMN ai_copilot_conversations.agent_id IS 'AI agent ID (general, researcher, marketer, developer, seo_writer, designer)';
COMMENT ON COLUMN ai_copilot_conversations.scope IS 'Query scope: project (single project) or global (all projects)';

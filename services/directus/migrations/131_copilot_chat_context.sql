-- Migration: 131_copilot_chat_context.sql
-- Description: Add agent/scope/project context fields to copilot_chats for filtering and analytics
-- Date: 2026-01-21

-- =====================================================
-- Copilot chat context fields
-- =====================================================

-- NOTE:
-- - `agent_id` stores the agent slug (e.g., "general", "developer") used for this chat.
-- - `scope` enables filtering (project/global/portal/admin).
-- - `project_id` links a chat to a project when scope = 'project'.

ALTER TABLE copilot_chats
  ADD COLUMN IF NOT EXISTS agent_id VARCHAR(50) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'project'
    CHECK (scope IN ('project', 'global', 'portal', 'admin')),
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Backfill existing rows (defaults don't apply retroactively)
UPDATE copilot_chats SET agent_id = 'general' WHERE agent_id IS NULL;
UPDATE copilot_chats SET scope = 'project' WHERE scope IS NULL;

-- Indexes for common filters/sorts
CREATE INDEX IF NOT EXISTS idx_copilot_chats_agent_id ON copilot_chats(agent_id);
CREATE INDEX IF NOT EXISTS idx_copilot_chats_scope ON copilot_chats(scope);
CREATE INDEX IF NOT EXISTS idx_copilot_chats_project_id ON copilot_chats(project_id);


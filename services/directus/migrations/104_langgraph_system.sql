-- Migration 104: LangGraph System Tables
-- 
-- This migration creates tables to support the LangGraph-based agent system:
-- - Thread management and persistence
-- - Checkpoint storage for conversation state
-- - Memory storage with embeddings
-- - Approval requests for human-in-the-loop
--
-- Integrates with existing tables:
-- - ai_agents, ai_agent_sessions, ai_agent_messages
-- - ai_shared_context, ai_agent_knowledge_entries
-- - ai_suggestions, ai_agent_audit_log

-- ============================================
-- LangGraph Threads
-- Stores thread metadata for conversation management
-- ============================================
CREATE TABLE IF NOT EXISTS langgraph_threads (
  thread_id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_slug VARCHAR(50) NOT NULL,
  project_id UUID,
  title VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  message_count INTEGER DEFAULT 0 NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE langgraph_threads IS 'Stores LangGraph conversation thread metadata.';
COMMENT ON COLUMN langgraph_threads.thread_id IS 'Unique identifier for the thread (format: thread_<timestamp>_<random>).';
COMMENT ON COLUMN langgraph_threads.user_id IS 'User who owns this thread.';
COMMENT ON COLUMN langgraph_threads.agent_slug IS 'The primary agent for this thread.';
COMMENT ON COLUMN langgraph_threads.project_id IS 'Optional project context for the thread.';
COMMENT ON COLUMN langgraph_threads.status IS 'Thread lifecycle status.';
COMMENT ON COLUMN langgraph_threads.message_count IS 'Number of messages in the thread.';

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_langgraph_threads_user_id ON langgraph_threads (user_id);
CREATE INDEX IF NOT EXISTS idx_langgraph_threads_agent_slug ON langgraph_threads (agent_slug);
CREATE INDEX IF NOT EXISTS idx_langgraph_threads_status ON langgraph_threads (status);
CREATE INDEX IF NOT EXISTS idx_langgraph_threads_project_id ON langgraph_threads (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_langgraph_threads_updated_at ON langgraph_threads (updated_at DESC);

-- ============================================
-- LangGraph Checkpoints
-- Stores the state of LangGraph threads for persistence and resumability
-- ============================================
CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
  thread_id VARCHAR(255) PRIMARY KEY REFERENCES langgraph_threads(thread_id) ON DELETE CASCADE,
  checkpoint JSONB NOT NULL,
  parent_checkpoint_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE langgraph_checkpoints IS 'Stores LangGraph thread checkpoints for persistence.';
COMMENT ON COLUMN langgraph_checkpoints.thread_id IS 'Reference to the LangGraph thread.';
COMMENT ON COLUMN langgraph_checkpoints.checkpoint IS 'The full JSON state of the LangGraph checkpoint.';
COMMENT ON COLUMN langgraph_checkpoints.parent_checkpoint_id IS 'Parent checkpoint for history tracking.';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_langgraph_checkpoints_updated_at ON langgraph_checkpoints (updated_at);

-- ============================================
-- LangGraph Memories
-- Stores extracted memories from LangGraph runs for long-term context
-- ============================================
CREATE TABLE IF NOT EXISTS langgraph_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id VARCHAR(255) NOT NULL REFERENCES langgraph_threads(thread_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  agent_slug VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  type VARCHAR(50) DEFAULT 'insight' NOT NULL CHECK (type IN ('insight', 'decision', 'fact', 'action_item', 'research', 'preference', 'feedback')),
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536), -- For semantic search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE langgraph_memories IS 'Stores extracted memories from LangGraph runs.';
COMMENT ON COLUMN langgraph_memories.thread_id IS 'The LangGraph thread this memory belongs to.';
COMMENT ON COLUMN langgraph_memories.user_id IS 'The user associated with this memory.';
COMMENT ON COLUMN langgraph_memories.agent_slug IS 'The agent that generated this memory.';
COMMENT ON COLUMN langgraph_memories.content IS 'The full content of the extracted memory.';
COMMENT ON COLUMN langgraph_memories.summary IS 'A brief summary of the memory.';
COMMENT ON COLUMN langgraph_memories.type IS 'The type of memory (e.g., insight, decision).';
COMMENT ON COLUMN langgraph_memories.embedding IS 'Vector embedding for semantic search.';

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_langgraph_memories_thread_id ON langgraph_memories (thread_id);
CREATE INDEX IF NOT EXISTS idx_langgraph_memories_user_id ON langgraph_memories (user_id);
CREATE INDEX IF NOT EXISTS idx_langgraph_memories_agent_slug ON langgraph_memories (agent_slug);
CREATE INDEX IF NOT EXISTS idx_langgraph_memories_type ON langgraph_memories (type);
CREATE INDEX IF NOT EXISTS idx_langgraph_memories_created_at ON langgraph_memories (created_at DESC);

-- Vector index for semantic search (using IVFFlat for better performance)
CREATE INDEX IF NOT EXISTS idx_langgraph_memories_embedding ON langgraph_memories 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
  WHERE embedding IS NOT NULL;

-- ============================================
-- LangGraph Approvals
-- Stores human-in-the-loop approval requests
-- ============================================
CREATE TABLE IF NOT EXISTS langgraph_approvals (
  id VARCHAR(255) PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL REFERENCES langgraph_threads(thread_id) ON DELETE CASCADE,
  agent_slug VARCHAR(50) NOT NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'workflow_execute', 'external_api_call', 'data_modification',
    'email_send', 'payment_process', 'content_publish',
    'code_deploy', 'database_write', 'file_system_write', 'third_party_integration'
  )),
  action_description TEXT NOT NULL,
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level VARCHAR(20) DEFAULT 'medium' NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  workflow_context JSONB, -- For Node-RED workflow approvals
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE langgraph_approvals IS 'Stores human-in-the-loop approval requests.';
COMMENT ON COLUMN langgraph_approvals.action_type IS 'Type of action requiring approval.';
COMMENT ON COLUMN langgraph_approvals.risk_level IS 'Risk level of the action (affects UI prominence).';
COMMENT ON COLUMN langgraph_approvals.status IS 'Current status of the approval request.';
COMMENT ON COLUMN langgraph_approvals.workflow_context IS 'Additional context for Node-RED workflow approvals.';

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_langgraph_approvals_thread_id ON langgraph_approvals (thread_id);
CREATE INDEX IF NOT EXISTS idx_langgraph_approvals_status ON langgraph_approvals (status);
CREATE INDEX IF NOT EXISTS idx_langgraph_approvals_expires_at ON langgraph_approvals (expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_langgraph_approvals_reviewed_by ON langgraph_approvals (reviewed_by) WHERE reviewed_by IS NOT NULL;

-- ============================================
-- Trigger Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_langgraph_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_langgraph_threads_updated_at ON langgraph_threads;
CREATE TRIGGER trigger_langgraph_threads_updated_at
  BEFORE UPDATE ON langgraph_threads
  FOR EACH ROW EXECUTE FUNCTION update_langgraph_updated_at();

DROP TRIGGER IF EXISTS trigger_langgraph_checkpoints_updated_at ON langgraph_checkpoints;
CREATE TRIGGER trigger_langgraph_checkpoints_updated_at
  BEFORE UPDATE ON langgraph_checkpoints
  FOR EACH ROW EXECUTE FUNCTION update_langgraph_updated_at();

DROP TRIGGER IF EXISTS trigger_langgraph_memories_updated_at ON langgraph_memories;
CREATE TRIGGER trigger_langgraph_memories_updated_at
  BEFORE UPDATE ON langgraph_memories
  FOR EACH ROW EXECUTE FUNCTION update_langgraph_updated_at();

-- ============================================
-- Helper Functions
-- ============================================

-- Function to clean up expired approvals
CREATE OR REPLACE FUNCTION cleanup_expired_langgraph_approvals()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE langgraph_approvals
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old threads
CREATE OR REPLACE FUNCTION archive_old_langgraph_threads(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE langgraph_threads
  SET status = 'archived', updated_at = NOW()
  WHERE status = 'active'
    AND updated_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get thread statistics for a user
CREATE OR REPLACE FUNCTION get_langgraph_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_threads BIGINT,
  active_threads BIGINT,
  total_messages BIGINT,
  total_memories BIGINT,
  pending_approvals BIGINT,
  most_used_agent VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT t.thread_id) as total_threads,
    COUNT(DISTINCT t.thread_id) FILTER (WHERE t.status = 'active') as active_threads,
    COALESCE(SUM(t.message_count), 0) as total_messages,
    (SELECT COUNT(*) FROM langgraph_memories WHERE user_id = p_user_id) as total_memories,
    (SELECT COUNT(*) FROM langgraph_approvals a 
     JOIN langgraph_threads t2 ON a.thread_id = t2.thread_id 
     WHERE t2.user_id = p_user_id AND a.status = 'pending') as pending_approvals,
    (SELECT agent_slug FROM langgraph_threads WHERE user_id = p_user_id 
     GROUP BY agent_slug ORDER BY COUNT(*) DESC LIMIT 1) as most_used_agent
  FROM langgraph_threads t
  WHERE t.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grants (adjust roles as needed)
-- ============================================

-- Grant permissions to the application role (adjust 'app_user' to your role name)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph_threads TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph_checkpoints TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph_memories TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph_approvals TO app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_langgraph_approvals() TO app_user;
-- GRANT EXECUTE ON FUNCTION archive_old_langgraph_threads(INTEGER) TO app_user;
-- GRANT EXECUTE ON FUNCTION get_langgraph_user_stats(UUID) TO app_user;

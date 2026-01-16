-- ============================================
-- Dashboard Analytics Indexes Migration
-- Optimizes queries for workflow analytics and dashboard endpoints
-- ============================================

-- ============================================
-- INDEXES FOR nodered_execution_logs
-- Used by: getWorkflowAnalytics, getExecutionTimeline, getTopWorkflows
-- ============================================

-- Composite index for organization-based analytics queries with time filtering
-- Covers: most analytics queries that filter by org and time range
CREATE INDEX IF NOT EXISTS idx_nodered_execution_logs_org_started 
  ON nodered_execution_logs (organization_id, started_at DESC);

-- Index for status-based filtering within organization
-- Covers: success rate calculations, failed execution queries
CREATE INDEX IF NOT EXISTS idx_nodered_execution_logs_org_status 
  ON nodered_execution_logs (organization_id, status, started_at DESC);

-- Index for flow-level analytics
-- Covers: top workflows, per-flow statistics
CREATE INDEX IF NOT EXISTS idx_nodered_execution_logs_org_flow 
  ON nodered_execution_logs (organization_id, flow_id, started_at DESC);

-- Index for trigger source analysis
-- Covers: trigger breakdown charts, agent execution stats
CREATE INDEX IF NOT EXISTS idx_nodered_execution_logs_org_trigger 
  ON nodered_execution_logs (organization_id, trigger_source, started_at DESC);

-- Partial index for only completed executions (frequently queried)
CREATE INDEX IF NOT EXISTS idx_nodered_execution_logs_completed 
  ON nodered_execution_logs (organization_id, started_at DESC) 
  WHERE status = 'completed';

-- Partial index for failed executions (for error tracking dashboards)
CREATE INDEX IF NOT EXISTS idx_nodered_execution_logs_failed 
  ON nodered_execution_logs (organization_id, started_at DESC) 
  WHERE status = 'failed';

-- ============================================
-- INDEXES FOR copilot_conversations (AI Usage)
-- Used by: getCopilotUsage, getConversationVolume
-- ============================================

-- Index for user-based conversation queries
CREATE INDEX IF NOT EXISTS idx_copilot_conversations_user_created 
  ON copilot_conversations (user_id, created_at DESC);

-- Index for agent-based analytics
CREATE INDEX IF NOT EXISTS idx_copilot_conversations_agent_created 
  ON copilot_conversations (agent_slug, created_at DESC);

-- ============================================
-- INDEXES FOR langgraph_threads
-- Used by: AI Copilot Dashboard thread analytics
-- ============================================

CREATE INDEX IF NOT EXISTS idx_langgraph_threads_user_updated 
  ON langgraph_threads (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_langgraph_threads_agent_created 
  ON langgraph_threads (agent_slug, created_at DESC);

-- ============================================
-- INDEXES FOR langgraph_memories
-- Used by: Memory growth tracking on Copilot Dashboard
-- ============================================

CREATE INDEX IF NOT EXISTS idx_langgraph_memories_user_created 
  ON langgraph_memories (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_langgraph_memories_type_created 
  ON langgraph_memories (memory_type, created_at DESC);

-- ============================================
-- INDEXES FOR sync_logs (Directus sync tracking)
-- Used by: Sync activity monitoring
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sync_logs_collection_synced 
  ON sync_logs (collection_name, synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_logs_direction_synced 
  ON sync_logs (direction, synced_at DESC);

-- ============================================
-- INDEXES FOR credit_transactions
-- Used by: Credit usage breakdown, spending trends
-- ============================================

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created 
  ON credit_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type_created 
  ON credit_transactions (transaction_type, created_at DESC);

-- ============================================
-- ANALYZE TABLES
-- Update statistics for query planner
-- ============================================

ANALYZE nodered_execution_logs;
ANALYZE copilot_conversations;
ANALYZE langgraph_threads;
ANALYZE langgraph_memories;
ANALYZE sync_logs;
ANALYZE credit_transactions;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON INDEX idx_nodered_execution_logs_org_started IS 
  'Primary index for dashboard analytics - org timeline queries';

COMMENT ON INDEX idx_nodered_execution_logs_org_status IS 
  'Index for success/failure rate calculations';

COMMENT ON INDEX idx_nodered_execution_logs_org_flow IS 
  'Index for per-workflow analytics and top workflows';

COMMENT ON INDEX idx_nodered_execution_logs_completed IS 
  'Partial index for completed-only queries (faster scans)';


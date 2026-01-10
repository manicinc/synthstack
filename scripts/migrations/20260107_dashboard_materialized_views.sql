-- ============================================
-- Dashboard Materialized Views Migration
-- Pre-aggregated data for fast dashboard loading
-- Includes nightly refresh job setup
-- ============================================

-- ============================================
-- MATERIALIZED VIEW: Daily Workflow Stats
-- Aggregates executions per org per day
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS mv_workflow_daily_stats;

CREATE MATERIALIZED VIEW mv_workflow_daily_stats AS
SELECT 
  organization_id,
  DATE(started_at) as stat_date,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
  COUNT(*) FILTER (WHERE status = 'running') as running_executions,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) 
    FILTER (WHERE completed_at IS NOT NULL) as avg_duration_ms,
  SUM(credits_used) as total_credits_used,
  COUNT(DISTINCT flow_id) as unique_flows_used,
  COUNT(DISTINCT trigger_source) as unique_trigger_sources,
  jsonb_object_agg(
    COALESCE(trigger_source, 'unknown'),
    COUNT(*) FILTER (WHERE trigger_source = trigger_source)
  ) as trigger_breakdown
FROM nodered_execution_logs
WHERE started_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY organization_id, DATE(started_at);

-- Index for fast lookups
CREATE UNIQUE INDEX ON mv_workflow_daily_stats (organization_id, stat_date);
CREATE INDEX ON mv_workflow_daily_stats (stat_date DESC);

-- ============================================
-- MATERIALIZED VIEW: Weekly Workflow Aggregates
-- Used for trend charts and comparisons
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS mv_workflow_weekly_stats;

CREATE MATERIALIZED VIEW mv_workflow_weekly_stats AS
SELECT 
  organization_id,
  DATE_TRUNC('week', started_at)::DATE as week_start,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as success_rate,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) 
    FILTER (WHERE completed_at IS NOT NULL) as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
  ) FILTER (WHERE completed_at IS NOT NULL) as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
  ) FILTER (WHERE completed_at IS NOT NULL) as p95_duration_ms,
  SUM(credits_used) as total_credits
FROM nodered_execution_logs
WHERE started_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY organization_id, DATE_TRUNC('week', started_at);

CREATE UNIQUE INDEX ON mv_workflow_weekly_stats (organization_id, week_start);
CREATE INDEX ON mv_workflow_weekly_stats (week_start DESC);

-- ============================================
-- MATERIALIZED VIEW: Top Workflows per Org
-- Pre-computed for dashboard top workflows widget
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS mv_top_workflows;

CREATE MATERIALIZED VIEW mv_top_workflows AS
SELECT 
  organization_id,
  flow_id,
  flow_name,
  COUNT(*) as execution_count,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_count,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as success_rate,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) 
    FILTER (WHERE completed_at IS NOT NULL) as avg_duration_ms,
  SUM(credits_used) as total_credits_used,
  MAX(started_at) as last_executed_at,
  MIN(started_at) as first_executed_at
FROM nodered_execution_logs
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY organization_id, flow_id, flow_name
ORDER BY organization_id, execution_count DESC;

CREATE INDEX ON mv_top_workflows (organization_id, execution_count DESC);
CREATE INDEX ON mv_top_workflows (organization_id, success_rate DESC);

-- ============================================
-- MATERIALIZED VIEW: AI Copilot Daily Usage
-- Aggregates copilot conversations and token usage
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS mv_copilot_daily_usage;

CREATE MATERIALIZED VIEW mv_copilot_daily_usage AS
SELECT 
  user_id,
  DATE(created_at) as usage_date,
  COUNT(*) as conversation_count,
  COUNT(DISTINCT thread_id) as unique_threads,
  SUM(tokens_used) as total_tokens,
  AVG(tokens_used) as avg_tokens_per_conversation,
  jsonb_object_agg(
    COALESCE(agent_slug, 'unknown'),
    COUNT(*) FILTER (WHERE agent_slug = agent_slug)
  ) as agent_breakdown
FROM copilot_conversations
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY user_id, DATE(created_at);

CREATE UNIQUE INDEX ON mv_copilot_daily_usage (user_id, usage_date);
CREATE INDEX ON mv_copilot_daily_usage (usage_date DESC);

-- ============================================
-- MATERIALIZED VIEW: Memory Growth Stats
-- Tracks memory creation over time for dashboard
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS mv_memory_growth;

CREATE MATERIALIZED VIEW mv_memory_growth AS
SELECT 
  user_id,
  DATE(created_at) as stat_date,
  COUNT(*) as memories_created,
  COUNT(DISTINCT memory_type) as unique_types,
  jsonb_object_agg(
    COALESCE(memory_type, 'unknown'),
    COUNT(*) FILTER (WHERE memory_type = memory_type)
  ) as type_breakdown
FROM langgraph_memories
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY user_id, DATE(created_at);

CREATE UNIQUE INDEX ON mv_memory_growth (user_id, stat_date);
CREATE INDEX ON mv_memory_growth (stat_date DESC);

-- ============================================
-- REFRESH FUNCTION
-- Called by cron job to refresh all views
-- ============================================

CREATE OR REPLACE FUNCTION refresh_dashboard_materialized_views()
RETURNS void AS $$
BEGIN
  -- Refresh in dependency order
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_workflow_daily_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_workflow_weekly_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_workflows;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_copilot_daily_usage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_memory_growth;
  
  -- Log the refresh
  INSERT INTO system_jobs_log (job_name, completed_at, status, details)
  VALUES (
    'refresh_dashboard_views',
    NOW(),
    'completed',
    jsonb_build_object(
      'views_refreshed', ARRAY[
        'mv_workflow_daily_stats',
        'mv_workflow_weekly_stats', 
        'mv_top_workflows',
        'mv_copilot_daily_usage',
        'mv_memory_growth'
      ]
    )
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO system_jobs_log (job_name, completed_at, status, details)
  VALUES (
    'refresh_dashboard_views',
    NOW(),
    'failed',
    jsonb_build_object('error', SQLERRM)
  );
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SYSTEM JOBS LOG TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS system_jobs_log (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'running',
  details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_system_jobs_log_name_time 
  ON system_jobs_log (job_name, completed_at DESC);

-- ============================================
-- CRON JOB SETUP (requires pg_cron extension)
-- Run nightly at 2 AM UTC
-- ============================================

-- Note: This requires pg_cron to be enabled
-- Enable with: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job (run this after enabling pg_cron):
-- SELECT cron.schedule(
--   'refresh-dashboard-views',
--   '0 2 * * *',  -- 2 AM UTC daily
--   'SELECT refresh_dashboard_materialized_views();'
-- );

-- For systems without pg_cron, add this to your external cron:
-- 0 2 * * * psql -d synthstack -c "SELECT refresh_dashboard_materialized_views();"

-- ============================================
-- INITIAL REFRESH
-- ============================================

-- Perform initial refresh (this may take a while on large datasets)
SELECT refresh_dashboard_materialized_views();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON MATERIALIZED VIEW mv_workflow_daily_stats IS 
  'Daily aggregated workflow execution statistics per organization';

COMMENT ON MATERIALIZED VIEW mv_workflow_weekly_stats IS 
  'Weekly aggregated workflow stats with percentiles for trend analysis';

COMMENT ON MATERIALIZED VIEW mv_top_workflows IS 
  'Pre-computed top workflows by execution count for dashboard widget';

COMMENT ON MATERIALIZED VIEW mv_copilot_daily_usage IS 
  'Daily AI copilot usage aggregates for usage dashboard';

COMMENT ON MATERIALIZED VIEW mv_memory_growth IS 
  'Memory creation tracking for growth charts';

COMMENT ON FUNCTION refresh_dashboard_materialized_views IS 
  'Refreshes all dashboard materialized views - run nightly via cron';


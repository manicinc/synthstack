-- ============================================
-- LLM Cost Tracking Migration
-- ============================================
-- Creates tables for tracking LLM API costs,
-- usage aggregations, and budget alerts for
-- internal admin dashboard.
-- ============================================

-- ============================================
-- 1. LLM Usage Log Table
-- ============================================
-- Logs every LLM API request for cost tracking
CREATE TABLE IF NOT EXISTS llm_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Provider & Model
  provider VARCHAR(50) NOT NULL,          -- openai, anthropic, openrouter
  model VARCHAR(100) NOT NULL,            -- gpt-4o, claude-3-5-sonnet, etc.
  tier VARCHAR(20),                       -- cheap, standard, premium
  
  -- Token Usage
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Cost (in cents for precision)
  estimated_cost_cents INTEGER DEFAULT 0,
  
  -- Request Details
  request_type VARCHAR(50),               -- copilot, agent, workflow, portal
  agent_slug VARCHAR(50),                 -- general, researcher, developer, etc.
  endpoint VARCHAR(200),                  -- /chat, /complete, etc.
  
  -- Performance
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_code VARCHAR(50),
  error_message TEXT,
  
  -- Metadata
  session_id VARCHAR(100),
  request_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for llm_usage_log
CREATE INDEX IF NOT EXISTS idx_llm_usage_log_org ON llm_usage_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_log_user ON llm_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_log_provider ON llm_usage_log(provider);
CREATE INDEX IF NOT EXISTS idx_llm_usage_log_model ON llm_usage_log(model);
CREATE INDEX IF NOT EXISTS idx_llm_usage_log_tier ON llm_usage_log(tier);
CREATE INDEX IF NOT EXISTS idx_llm_usage_log_created ON llm_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_usage_log_request_type ON llm_usage_log(request_type);
CREATE INDEX IF NOT EXISTS idx_llm_usage_log_org_created ON llm_usage_log(organization_id, created_at);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_log_provider_created ON llm_usage_log(provider, created_at);

COMMENT ON TABLE llm_usage_log IS 'Logs all LLM API requests for cost tracking and analytics';

-- ============================================
-- 2. LLM Cost Aggregates Table
-- ============================================
-- Pre-computed aggregates for fast dashboard queries
CREATE TABLE IF NOT EXISTS llm_cost_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time Period
  period_type VARCHAR(10) NOT NULL,       -- hourly, daily, weekly, monthly
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Scope (NULL = global)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Dimensions
  provider VARCHAR(50),                   -- NULL = all providers
  model VARCHAR(100),                     -- NULL = all models
  tier VARCHAR(20),                       -- NULL = all tiers
  request_type VARCHAR(50),               -- NULL = all types
  
  -- Metrics
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  total_prompt_tokens BIGINT DEFAULT 0,
  total_completion_tokens BIGINT DEFAULT 0,
  total_tokens BIGINT DEFAULT 0,
  total_cost_cents BIGINT DEFAULT 0,
  
  -- Performance Metrics
  avg_latency_ms INTEGER,
  p50_latency_ms INTEGER,
  p95_latency_ms INTEGER,
  p99_latency_ms INTEGER,
  
  -- Computed at
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(period_type, period_start, organization_id, provider, model, tier, request_type)
);

-- Indexes for llm_cost_aggregates
CREATE INDEX IF NOT EXISTS idx_llm_cost_agg_period ON llm_cost_aggregates(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_llm_cost_agg_org ON llm_cost_aggregates(organization_id);
CREATE INDEX IF NOT EXISTS idx_llm_cost_agg_provider ON llm_cost_aggregates(provider);
CREATE INDEX IF NOT EXISTS idx_llm_cost_agg_global_daily ON llm_cost_aggregates(period_type, period_start) 
  WHERE organization_id IS NULL;

COMMENT ON TABLE llm_cost_aggregates IS 'Pre-computed cost aggregates for fast dashboard queries';

-- ============================================
-- 3. LLM Budget Alerts Table
-- ============================================
-- Configuration for cost threshold alerts
CREATE TABLE IF NOT EXISTS llm_budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope (NULL = global)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Alert Configuration
  name VARCHAR(200) NOT NULL,
  description TEXT,
  alert_type VARCHAR(50) NOT NULL,        -- daily_limit, weekly_limit, monthly_limit, spike, threshold
  
  -- Thresholds
  threshold_cents INTEGER NOT NULL,        -- Cost threshold in cents
  threshold_requests INTEGER,              -- Optional request count threshold
  spike_percent INTEGER,                   -- For spike alerts: % increase to trigger
  
  -- Notification Settings
  notification_emails TEXT[] DEFAULT '{}',
  notification_slack_webhook VARCHAR(500),
  notification_frequency VARCHAR(20) DEFAULT 'once', -- once, hourly, daily
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  last_value_cents INTEGER,
  trigger_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for llm_budget_alerts
CREATE INDEX IF NOT EXISTS idx_llm_alerts_org ON llm_budget_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_llm_alerts_active ON llm_budget_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_llm_alerts_type ON llm_budget_alerts(alert_type);

COMMENT ON TABLE llm_budget_alerts IS 'Budget alert configurations for LLM cost monitoring';

-- ============================================
-- 4. LLM Alert History Table
-- ============================================
-- History of triggered alerts
CREATE TABLE IF NOT EXISTS llm_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  alert_id UUID NOT NULL REFERENCES llm_budget_alerts(id) ON DELETE CASCADE,
  
  -- Trigger Details
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trigger_value_cents INTEGER NOT NULL,
  threshold_cents INTEGER NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  
  -- Notification Status
  notification_sent BOOLEAN DEFAULT false,
  notification_error TEXT,
  
  -- Context
  metadata JSONB DEFAULT '{}'
);

-- Indexes for llm_alert_history
CREATE INDEX IF NOT EXISTS idx_llm_alert_history_alert ON llm_alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_llm_alert_history_triggered ON llm_alert_history(triggered_at);

COMMENT ON TABLE llm_alert_history IS 'History of triggered budget alerts';

-- ============================================
-- 5. Views for Dashboard Queries
-- ============================================

-- Global daily costs view
CREATE OR REPLACE VIEW llm_global_daily_costs AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  provider,
  COUNT(*) AS total_requests,
  SUM(total_tokens) AS total_tokens,
  SUM(estimated_cost_cents) AS total_cost_cents,
  AVG(latency_ms)::INTEGER AS avg_latency_ms,
  COUNT(*) FILTER (WHERE success = true) AS successful_requests,
  COUNT(*) FILTER (WHERE success = false) AS failed_requests
FROM llm_usage_log
GROUP BY DATE_TRUNC('day', created_at), provider
ORDER BY day DESC, provider;

COMMENT ON VIEW llm_global_daily_costs IS 'Daily LLM costs aggregated by provider';

-- Organization usage summary view
CREATE OR REPLACE VIEW llm_org_usage_summary AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  COUNT(l.id) AS total_requests,
  COALESCE(SUM(l.total_tokens), 0) AS total_tokens,
  COALESCE(SUM(l.estimated_cost_cents), 0) AS total_cost_cents,
  COUNT(DISTINCT l.user_id) AS unique_users,
  COUNT(DISTINCT l.model) AS models_used,
  MAX(l.created_at) AS last_request_at,
  -- MTD stats
  COUNT(l.id) FILTER (WHERE l.created_at >= DATE_TRUNC('month', NOW())) AS mtd_requests,
  COALESCE(SUM(l.estimated_cost_cents) FILTER (WHERE l.created_at >= DATE_TRUNC('month', NOW())), 0) AS mtd_cost_cents,
  -- Today stats
  COUNT(l.id) FILTER (WHERE l.created_at >= DATE_TRUNC('day', NOW())) AS today_requests,
  COALESCE(SUM(l.estimated_cost_cents) FILTER (WHERE l.created_at >= DATE_TRUNC('day', NOW())), 0) AS today_cost_cents
FROM organizations o
LEFT JOIN llm_usage_log l ON l.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY total_cost_cents DESC;

COMMENT ON VIEW llm_org_usage_summary IS 'LLM usage summary per organization';

-- Model usage breakdown view
CREATE OR REPLACE VIEW llm_model_usage AS
SELECT
  provider,
  model,
  tier,
  COUNT(*) AS total_requests,
  SUM(total_tokens) AS total_tokens,
  SUM(estimated_cost_cents) AS total_cost_cents,
  AVG(estimated_cost_cents)::INTEGER AS avg_cost_cents,
  AVG(latency_ms)::INTEGER AS avg_latency_ms,
  -- Cost per 1k tokens
  CASE 
    WHEN SUM(total_tokens) > 0 
    THEN (SUM(estimated_cost_cents)::FLOAT / SUM(total_tokens) * 1000)::NUMERIC(10,4)
    ELSE 0 
  END AS cost_per_1k_tokens
FROM llm_usage_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY provider, model, tier
ORDER BY total_cost_cents DESC;

COMMENT ON VIEW llm_model_usage IS 'Model usage and cost breakdown for last 30 days';

-- ============================================
-- 6. Functions for Aggregation
-- ============================================

-- Function to compute hourly aggregates
CREATE OR REPLACE FUNCTION compute_llm_hourly_aggregates(target_hour TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  hour_start TIMESTAMP WITH TIME ZONE;
  hour_end TIMESTAMP WITH TIME ZONE;
  rows_inserted INTEGER := 0;
BEGIN
  -- Default to previous hour if not specified
  hour_start := COALESCE(target_hour, DATE_TRUNC('hour', NOW() - INTERVAL '1 hour'));
  hour_end := hour_start + INTERVAL '1 hour';
  
  -- Insert global aggregates
  INSERT INTO llm_cost_aggregates (
    period_type, period_start, period_end,
    organization_id, provider, model, tier, request_type,
    total_requests, successful_requests, failed_requests,
    total_prompt_tokens, total_completion_tokens, total_tokens,
    total_cost_cents, avg_latency_ms
  )
  SELECT
    'hourly',
    hour_start,
    hour_end,
    organization_id,
    provider,
    model,
    tier,
    request_type,
    COUNT(*),
    COUNT(*) FILTER (WHERE success = true),
    COUNT(*) FILTER (WHERE success = false),
    COALESCE(SUM(prompt_tokens), 0),
    COALESCE(SUM(completion_tokens), 0),
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(estimated_cost_cents), 0),
    AVG(latency_ms)::INTEGER
  FROM llm_usage_log
  WHERE created_at >= hour_start AND created_at < hour_end
  GROUP BY GROUPING SETS (
    (organization_id, provider, model, tier, request_type),
    (organization_id, provider),
    (organization_id),
    (provider, model),
    (provider),
    ()  -- Global total
  )
  ON CONFLICT (period_type, period_start, organization_id, provider, model, tier, request_type)
  DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    total_prompt_tokens = EXCLUDED.total_prompt_tokens,
    total_completion_tokens = EXCLUDED.total_completion_tokens,
    total_tokens = EXCLUDED.total_tokens,
    total_cost_cents = EXCLUDED.total_cost_cents,
    avg_latency_ms = EXCLUDED.avg_latency_ms,
    computed_at = NOW();
  
  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compute_llm_hourly_aggregates IS 'Computes hourly LLM cost aggregates';

-- Function to compute daily aggregates
CREATE OR REPLACE FUNCTION compute_llm_daily_aggregates(target_day DATE DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  day_start TIMESTAMP WITH TIME ZONE;
  day_end TIMESTAMP WITH TIME ZONE;
  rows_inserted INTEGER := 0;
BEGIN
  -- Default to previous day if not specified
  day_start := COALESCE(target_day::TIMESTAMP WITH TIME ZONE, DATE_TRUNC('day', NOW() - INTERVAL '1 day'));
  day_end := day_start + INTERVAL '1 day';
  
  -- Insert daily aggregates from hourly data
  INSERT INTO llm_cost_aggregates (
    period_type, period_start, period_end,
    organization_id, provider, model, tier, request_type,
    total_requests, successful_requests, failed_requests,
    total_prompt_tokens, total_completion_tokens, total_tokens,
    total_cost_cents, avg_latency_ms
  )
  SELECT
    'daily',
    day_start,
    day_end,
    organization_id,
    provider,
    model,
    tier,
    request_type,
    SUM(total_requests),
    SUM(successful_requests),
    SUM(failed_requests),
    SUM(total_prompt_tokens),
    SUM(total_completion_tokens),
    SUM(total_tokens),
    SUM(total_cost_cents),
    AVG(avg_latency_ms)::INTEGER
  FROM llm_cost_aggregates
  WHERE period_type = 'hourly'
    AND period_start >= day_start
    AND period_start < day_end
  GROUP BY organization_id, provider, model, tier, request_type
  ON CONFLICT (period_type, period_start, organization_id, provider, model, tier, request_type)
  DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    total_prompt_tokens = EXCLUDED.total_prompt_tokens,
    total_completion_tokens = EXCLUDED.total_completion_tokens,
    total_tokens = EXCLUDED.total_tokens,
    total_cost_cents = EXCLUDED.total_cost_cents,
    avg_latency_ms = EXCLUDED.avg_latency_ms,
    computed_at = NOW();
  
  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compute_llm_daily_aggregates IS 'Computes daily LLM cost aggregates from hourly data';

-- ============================================
-- 7. Seed Default Alerts
-- ============================================

-- Insert default global alerts for team@manic.agency
INSERT INTO llm_budget_alerts (
  name, description, alert_type, threshold_cents, 
  notification_emails, is_active
) VALUES 
(
  'Daily Global Spend Alert',
  'Alert when global daily LLM spend exceeds $100',
  'daily_limit',
  10000,  -- $100 in cents
  ARRAY['team@manic.agency'],
  true
),
(
  'Monthly Global Spend Alert', 
  'Alert when global monthly LLM spend exceeds $1000',
  'monthly_limit',
  100000,  -- $1000 in cents
  ARRAY['team@manic.agency'],
  true
),
(
  'Cost Spike Alert',
  'Alert when hourly spend is 200% above average',
  'spike',
  0,
  ARRAY['team@manic.agency'],
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. Grant Permissions
-- ============================================
-- Ensure the API can access these tables
GRANT SELECT, INSERT ON llm_usage_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON llm_cost_aggregates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON llm_budget_alerts TO authenticated;
GRANT SELECT, INSERT ON llm_alert_history TO authenticated;
GRANT SELECT ON llm_global_daily_costs TO authenticated;
GRANT SELECT ON llm_org_usage_summary TO authenticated;
GRANT SELECT ON llm_model_usage TO authenticated;



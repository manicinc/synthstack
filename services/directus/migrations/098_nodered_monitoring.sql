-- =====================================================
-- Node-RED Monitoring and Metrics
-- Adds monitoring capabilities and scheduled maintenance
-- =====================================================

-- Create extension for scheduled jobs if not exists (pg_cron)
-- Note: pg_cron must be enabled by superuser: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to reset daily execution counts at midnight UTC
CREATE OR REPLACE FUNCTION reset_daily_execution_counts()
RETURNS void AS $$
BEGIN
  UPDATE nodered_flow_limits 
  SET current_daily_executions = 0,
      date_updated = NOW()
  WHERE current_daily_executions > 0;
  
  RAISE NOTICE 'Reset daily execution counts at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Create an aggregate view for monitoring
CREATE OR REPLACE VIEW nodered_monitoring_summary AS
SELECT 
  -- Tenant metrics
  (SELECT COUNT(*) FROM nodered_tenant_config WHERE enabled = true) as active_tenants,
  (SELECT COUNT(*) FROM nodered_tenant_config) as total_tenants,
  
  -- Flow metrics
  (SELECT COALESCE(SUM(current_flow_count), 0) FROM nodered_flow_limits) as total_flows,
  (SELECT COALESCE(SUM(current_daily_executions), 0) FROM nodered_flow_limits) as executions_today,
  
  -- Execution metrics (last 24 hours)
  (SELECT COUNT(*) FROM nodered_execution_logs 
   WHERE date_created > NOW() - INTERVAL '24 hours') as executions_24h,
  (SELECT COUNT(*) FROM nodered_execution_logs 
   WHERE date_created > NOW() - INTERVAL '24 hours' AND status = 'completed') as successful_24h,
  (SELECT COUNT(*) FROM nodered_execution_logs 
   WHERE date_created > NOW() - INTERVAL '24 hours' AND status = 'failed') as failed_24h,
  (SELECT AVG(duration_ms) FROM nodered_execution_logs 
   WHERE date_created > NOW() - INTERVAL '24 hours' AND duration_ms IS NOT NULL) as avg_duration_ms_24h,
  
  -- Template metrics
  (SELECT COUNT(*) FROM nodered_templates WHERE status = 'published') as published_templates,
  (SELECT COALESCE(SUM(install_count), 0) FROM nodered_templates) as total_template_installs,
  
  -- Timestamps
  NOW() as computed_at;

-- Create table for historical metrics (for charting)
CREATE TABLE IF NOT EXISTS nodered_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  hour_recorded INTEGER DEFAULT EXTRACT(HOUR FROM NOW()),
  
  -- Snapshot metrics
  active_tenants INTEGER,
  total_flows INTEGER,
  executions_count INTEGER,
  successful_count INTEGER,
  failed_count INTEGER,
  avg_duration_ms NUMERIC,
  
  -- Computed metrics
  success_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN executions_count > 0 
         THEN (successful_count::NUMERIC / executions_count) * 100 
         ELSE 0 END
  ) STORED,
  
  UNIQUE(date_recorded, hour_recorded)
);

-- Function to record hourly metrics
CREATE OR REPLACE FUNCTION record_nodered_metrics()
RETURNS void AS $$
DECLARE
  v_executions INTEGER;
  v_successful INTEGER;
  v_failed INTEGER;
  v_avg_duration NUMERIC;
BEGIN
  -- Get metrics for the last hour
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    AVG(duration_ms)
  INTO v_executions, v_successful, v_failed, v_avg_duration
  FROM nodered_execution_logs
  WHERE date_created > NOW() - INTERVAL '1 hour';

  -- Insert metrics snapshot
  INSERT INTO nodered_metrics_history (
    active_tenants,
    total_flows,
    executions_count,
    successful_count,
    failed_count,
    avg_duration_ms
  )
  SELECT 
    (SELECT COUNT(*) FROM nodered_tenant_config WHERE enabled = true),
    (SELECT COALESCE(SUM(current_flow_count), 0) FROM nodered_flow_limits),
    v_executions,
    v_successful,
    v_failed,
    v_avg_duration
  ON CONFLICT (date_recorded, hour_recorded) 
  DO UPDATE SET
    active_tenants = EXCLUDED.active_tenants,
    total_flows = EXCLUDED.total_flows,
    executions_count = EXCLUDED.executions_count,
    successful_count = EXCLUDED.successful_count,
    failed_count = EXCLUDED.failed_count,
    avg_duration_ms = EXCLUDED.avg_duration_ms;
    
  RAISE NOTICE 'Recorded Node-RED metrics at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a view for tenant health
CREATE OR REPLACE VIEW nodered_tenant_health AS
SELECT 
  tc.organization_id,
  o.name as organization_name,
  tc.enabled,
  fl.tier,
  fl.current_flow_count,
  fl.max_flows,
  fl.current_daily_executions,
  fl.max_executions_per_day,
  -- Usage percentages
  CASE WHEN fl.max_flows > 0 
       THEN ROUND((fl.current_flow_count::NUMERIC / fl.max_flows) * 100, 1) 
       ELSE 0 END as flow_usage_pct,
  CASE WHEN fl.max_executions_per_day > 0 
       THEN ROUND((fl.current_daily_executions::NUMERIC / fl.max_executions_per_day) * 100, 1) 
       ELSE 0 END as exec_usage_pct,
  -- Recent execution stats
  (SELECT COUNT(*) FROM nodered_execution_logs el 
   WHERE el.organization_id = tc.organization_id 
   AND el.date_created > NOW() - INTERVAL '24 hours') as executions_24h,
  (SELECT COUNT(*) FROM nodered_execution_logs el 
   WHERE el.organization_id = tc.organization_id 
   AND el.date_created > NOW() - INTERVAL '24 hours' 
   AND el.status = 'failed') as failures_24h,
  -- Health status
  CASE 
    WHEN NOT tc.enabled THEN 'disabled'
    WHEN (SELECT COUNT(*) FROM nodered_execution_logs el 
          WHERE el.organization_id = tc.organization_id 
          AND el.date_created > NOW() - INTERVAL '1 hour' 
          AND el.status = 'failed') > 5 THEN 'critical'
    WHEN fl.current_daily_executions >= fl.max_executions_per_day * 0.9 THEN 'warning'
    WHEN fl.current_flow_count >= fl.max_flows THEN 'warning'
    ELSE 'healthy'
  END as health_status
FROM nodered_tenant_config tc
LEFT JOIN organizations o ON tc.organization_id = o.id
LEFT JOIN nodered_flow_limits fl ON tc.organization_id = fl.organization_id;

-- Create indexes for monitoring queries
CREATE INDEX IF NOT EXISTS idx_exec_logs_org_date 
ON nodered_execution_logs(organization_id, date_created DESC);

CREATE INDEX IF NOT EXISTS idx_exec_logs_status_date 
ON nodered_execution_logs(status, date_created DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_history_date 
ON nodered_metrics_history(date_recorded DESC, hour_recorded DESC);

-- Add comment
COMMENT ON VIEW nodered_monitoring_summary IS 'Real-time Node-RED platform monitoring summary';
COMMENT ON VIEW nodered_tenant_health IS 'Per-tenant health status and usage metrics';
COMMENT ON TABLE nodered_metrics_history IS 'Hourly snapshots of Node-RED metrics for historical analysis';

-- Register views with Directus (read-only)
-- Note: Views are automatically picked up by Directus but may need manual field configuration



-- Migration: 103_monitoring_alerts
-- Description: Monitoring alerts and threshold configuration
-- Created: 2026-01-07

-- Alert configurations
CREATE TABLE IF NOT EXISTS alert_configurations (
  id VARCHAR(100) PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Alert definition
  name VARCHAR(200) NOT NULL,
  description TEXT,
  alert_type VARCHAR(50) NOT NULL, -- failure_rate, slow_execution, execution_spike, quota_warning
  
  -- Thresholds
  threshold NUMERIC NOT NULL,
  threshold_unit VARCHAR(50), -- percent, milliseconds, count
  evaluation_window_minutes INTEGER DEFAULT 60,
  
  -- Notification settings
  notification_channels TEXT[] DEFAULT ARRAY['email'],
  cooldown_minutes INTEGER DEFAULT 60, -- Don't re-alert within this window
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alert_configurations_org ON alert_configurations(organization_id);
CREATE INDEX idx_alert_configurations_enabled ON alert_configurations(enabled) WHERE enabled = true;

-- Insert default alert configurations (global)
INSERT INTO alert_configurations (id, name, description, alert_type, threshold, threshold_unit, notification_channels)
VALUES
  ('high_failure_rate', 'High Failure Rate', 'Alert when workflow failure rate exceeds threshold', 'failure_rate', 20, 'percent', ARRAY['email']),
  ('slow_execution', 'Slow Execution', 'Alert when workflow execution time exceeds threshold', 'slow_execution', 30000, 'milliseconds', ARRAY['email']),
  ('execution_spike', 'Execution Spike', 'Alert when execution count spikes unexpectedly', 'execution_spike', 1000, 'count', ARRAY['email', 'slack']),
  ('quota_warning', 'Quota Warning', 'Alert when approaching execution quota limit', 'quota_warning', 80, 'percent', ARRAY['email'])
ON CONFLICT (id) DO NOTHING;

-- Active alerts
CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  configuration_id VARCHAR(100) REFERENCES alert_configurations(id),
  
  -- Alert details
  severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- info, warning, critical
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  
  -- Context
  context JSONB DEFAULT '{}', -- Additional context data
  flow_id VARCHAR(100),
  
  -- Status
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES directus_users(id),
  resolved_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false,
  
  -- Notification tracking
  notifications_sent JSONB DEFAULT '[]'
);

-- Indexes
CREATE INDEX idx_monitoring_alerts_org ON monitoring_alerts(organization_id);
CREATE INDEX idx_monitoring_alerts_active ON monitoring_alerts(organization_id, dismissed) WHERE dismissed = false;
CREATE INDEX idx_monitoring_alerts_triggered ON monitoring_alerts(triggered_at DESC);

-- Alert history (for analytics)
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  configuration_id VARCHAR(100),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  context JSONB DEFAULT '{}',
  triggered_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution_time_minutes INTEGER
);

-- Indexes
CREATE INDEX idx_alert_history_org ON alert_history(organization_id);
CREATE INDEX idx_alert_history_type ON alert_history(alert_type);
CREATE INDEX idx_alert_history_date ON alert_history(triggered_at DESC);

-- Function to create an alert
CREATE OR REPLACE FUNCTION create_monitoring_alert(
  p_organization_id UUID,
  p_configuration_id VARCHAR(100),
  p_severity VARCHAR(20),
  p_title VARCHAR(200),
  p_message TEXT,
  p_context JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
  v_config RECORD;
BEGIN
  -- Get configuration
  SELECT * INTO v_config FROM alert_configurations WHERE id = p_configuration_id;
  
  -- Check cooldown
  IF v_config.last_triggered_at IS NOT NULL AND 
     v_config.last_triggered_at > NOW() - (v_config.cooldown_minutes || ' minutes')::INTERVAL THEN
    RETURN NULL; -- Still in cooldown
  END IF;
  
  -- Create alert
  INSERT INTO monitoring_alerts (organization_id, configuration_id, severity, title, message, context)
  VALUES (p_organization_id, p_configuration_id, p_severity, p_title, p_message, p_context)
  RETURNING id INTO v_alert_id;
  
  -- Update last triggered
  UPDATE alert_configurations SET last_triggered_at = NOW() WHERE id = p_configuration_id;
  
  -- Log to history
  INSERT INTO alert_history (organization_id, configuration_id, alert_type, severity, title, context, triggered_at)
  SELECT p_organization_id, p_configuration_id, v_config.alert_type, p_severity, p_title, p_context, NOW();
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check and trigger alerts
CREATE OR REPLACE FUNCTION check_workflow_alerts(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_alerts_created INTEGER := 0;
  v_failure_rate NUMERIC;
  v_avg_duration NUMERIC;
  v_execution_count INTEGER;
  v_quota_usage NUMERIC;
  v_config RECORD;
BEGIN
  -- Calculate metrics for last hour
  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE status = 'failed')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 0),
    COALESCE(AVG(duration_ms), 0),
    COUNT(*)
  INTO v_failure_rate, v_avg_duration, v_execution_count
  FROM nodered_execution_logs
  WHERE organization_id = p_organization_id
    AND started_at > NOW() - INTERVAL '1 hour';
  
  -- Check failure rate alert
  SELECT * INTO v_config FROM alert_configurations 
  WHERE id = 'high_failure_rate' AND enabled = true
    AND (organization_id IS NULL OR organization_id = p_organization_id);
  
  IF FOUND AND v_failure_rate > v_config.threshold THEN
    PERFORM create_monitoring_alert(
      p_organization_id,
      'high_failure_rate',
      CASE WHEN v_failure_rate > 50 THEN 'critical' ELSE 'warning' END,
      'High Workflow Failure Rate',
      format('Failure rate is %.1f%% (threshold: %.1f%%)', v_failure_rate, v_config.threshold),
      jsonb_build_object('failure_rate', v_failure_rate, 'execution_count', v_execution_count)
    );
    v_alerts_created := v_alerts_created + 1;
  END IF;
  
  -- Check slow execution alert
  SELECT * INTO v_config FROM alert_configurations 
  WHERE id = 'slow_execution' AND enabled = true
    AND (organization_id IS NULL OR organization_id = p_organization_id);
  
  IF FOUND AND v_avg_duration > v_config.threshold THEN
    PERFORM create_monitoring_alert(
      p_organization_id,
      'slow_execution',
      'warning',
      'Slow Workflow Execution',
      format('Average execution time is %.0fms (threshold: %.0fms)', v_avg_duration, v_config.threshold),
      jsonb_build_object('avg_duration', v_avg_duration)
    );
    v_alerts_created := v_alerts_created + 1;
  END IF;
  
  -- Check execution spike alert
  SELECT * INTO v_config FROM alert_configurations 
  WHERE id = 'execution_spike' AND enabled = true
    AND (organization_id IS NULL OR organization_id = p_organization_id);
  
  IF FOUND AND v_execution_count > v_config.threshold THEN
    PERFORM create_monitoring_alert(
      p_organization_id,
      'execution_spike',
      'warning',
      'Execution Spike Detected',
      format('%d executions in the last hour (threshold: %d)', v_execution_count, v_config.threshold::INTEGER),
      jsonb_build_object('execution_count', v_execution_count)
    );
    v_alerts_created := v_alerts_created + 1;
  END IF;
  
  -- Check quota warning
  SELECT 
    (tc.daily_executions::NUMERIC / fl.max_daily_executions * 100)
  INTO v_quota_usage
  FROM nodered_tenant_config tc
  JOIN nodered_flow_limits fl ON tc.tier = fl.tier
  WHERE tc.organization_id = p_organization_id;
  
  SELECT * INTO v_config FROM alert_configurations 
  WHERE id = 'quota_warning' AND enabled = true
    AND (organization_id IS NULL OR organization_id = p_organization_id);
  
  IF FOUND AND v_quota_usage > v_config.threshold THEN
    PERFORM create_monitoring_alert(
      p_organization_id,
      'quota_warning',
      CASE WHEN v_quota_usage > 95 THEN 'critical' ELSE 'warning' END,
      'Approaching Execution Quota',
      format('%.1f%% of daily quota used (threshold: %.1f%%)', v_quota_usage, v_config.threshold),
      jsonb_build_object('quota_usage', v_quota_usage)
    );
    v_alerts_created := v_alerts_created + 1;
  END IF;
  
  RETURN v_alerts_created;
END;
$$ LANGUAGE plpgsql;

-- Monitoring metrics aggregation (for charts)
CREATE TABLE IF NOT EXISTS monitoring_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- executions, errors, duration, success_rate
  bucket_time TIMESTAMPTZ NOT NULL, -- Rounded to hour
  value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  UNIQUE(organization_id, metric_type, bucket_time)
);

-- Indexes
CREATE INDEX idx_monitoring_metrics_org ON monitoring_metrics(organization_id);
CREATE INDEX idx_monitoring_metrics_time ON monitoring_metrics(bucket_time DESC);
CREATE INDEX idx_monitoring_metrics_lookup ON monitoring_metrics(organization_id, metric_type, bucket_time);

-- Function to aggregate metrics hourly
CREATE OR REPLACE FUNCTION aggregate_monitoring_metrics()
RETURNS void AS $$
DECLARE
  v_bucket_time TIMESTAMPTZ := date_trunc('hour', NOW() - INTERVAL '1 hour');
BEGIN
  -- Aggregate execution counts
  INSERT INTO monitoring_metrics (organization_id, metric_type, bucket_time, value, metadata)
  SELECT 
    organization_id,
    'executions',
    v_bucket_time,
    COUNT(*),
    jsonb_build_object('completed', COUNT(*) FILTER (WHERE status = 'completed'), 'failed', COUNT(*) FILTER (WHERE status = 'failed'))
  FROM nodered_execution_logs
  WHERE started_at >= v_bucket_time AND started_at < v_bucket_time + INTERVAL '1 hour'
  GROUP BY organization_id
  ON CONFLICT (organization_id, metric_type, bucket_time) DO UPDATE SET
    value = EXCLUDED.value,
    metadata = EXCLUDED.metadata;
  
  -- Aggregate average duration
  INSERT INTO monitoring_metrics (organization_id, metric_type, bucket_time, value)
  SELECT 
    organization_id,
    'avg_duration',
    v_bucket_time,
    COALESCE(AVG(duration_ms), 0)
  FROM nodered_execution_logs
  WHERE started_at >= v_bucket_time AND started_at < v_bucket_time + INTERVAL '1 hour'
  GROUP BY organization_id
  ON CONFLICT (organization_id, metric_type, bucket_time) DO UPDATE SET
    value = EXCLUDED.value;
  
  -- Aggregate success rate
  INSERT INTO monitoring_metrics (organization_id, metric_type, bucket_time, value)
  SELECT 
    organization_id,
    'success_rate',
    v_bucket_time,
    COALESCE(COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 100)
  FROM nodered_execution_logs
  WHERE started_at >= v_bucket_time AND started_at < v_bucket_time + INTERVAL '1 hour'
  GROUP BY organization_id
  ON CONFLICT (organization_id, metric_type, bucket_time) DO UPDATE SET
    value = EXCLUDED.value;
END;
$$ LANGUAGE plpgsql;

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, hidden, singleton)
VALUES 
  ('alert_configurations', 'tune', 'Alert threshold configurations', false, false),
  ('monitoring_alerts', 'notifications_active', 'Active monitoring alerts', false, false),
  ('alert_history', 'history', 'Historical alert records', false, false),
  ('monitoring_metrics', 'analytics', 'Aggregated monitoring metrics', true, false)
ON CONFLICT (collection) DO NOTHING;



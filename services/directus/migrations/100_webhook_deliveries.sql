-- Migration: 100_webhook_deliveries
-- Description: Webhook delivery tracking and retry queue
-- Created: 2026-01-07

-- Webhook deliveries table for retry queue
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  webhook_id UUID REFERENCES integration_webhooks(id) ON DELETE SET NULL,
  
  -- Event info
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  target_url TEXT NOT NULL,
  
  -- Delivery status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, delivered, failed, dead_letter
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  
  -- Response tracking
  last_response_code INTEGER,
  last_response_body TEXT,
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'delivered', 'failed', 'dead_letter'))
);

-- Indexes for efficient querying
CREATE INDEX idx_webhook_deliveries_org ON webhook_deliveries(organization_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(status, next_retry_at) 
  WHERE status = 'pending';
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

-- Incoming webhook events log (for audit and replay)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  
  -- Event data
  event_type VARCHAR(100),
  event_id VARCHAR(255), -- External event ID if provided
  payload JSONB NOT NULL,
  
  -- Request metadata
  source_ip INET,
  headers JSONB,
  
  -- Validation
  signature_valid BOOLEAN,
  validation_error TEXT,
  
  -- Processing
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  flow_id VARCHAR(100), -- Node-RED flow that processed this
  
  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Deduplication
  UNIQUE(organization_id, integration_type, event_id)
);

-- Indexes for webhook events
CREATE INDEX idx_webhook_events_org ON webhook_events(organization_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(integration_type);
CREATE INDEX idx_webhook_events_received ON webhook_events(received_at DESC);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);

-- Function to auto-cleanup old delivered webhooks
CREATE OR REPLACE FUNCTION cleanup_old_webhook_deliveries()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_deliveries
  WHERE status = 'delivered'
    AND delivered_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get webhook delivery stats
CREATE OR REPLACE FUNCTION get_webhook_delivery_stats(
  p_organization_id UUID,
  p_since TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours'
)
RETURNS TABLE (
  total_count BIGINT,
  delivered_count BIGINT,
  pending_count BIGINT,
  failed_count BIGINT,
  dead_letter_count BIGINT,
  avg_attempts NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'dead_letter') as dead_letter_count,
    COALESCE(AVG(attempt_count), 0) as avg_attempts,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / COUNT(*) * 100)
      ELSE 0 
    END as success_rate
  FROM webhook_deliveries
  WHERE organization_id = p_organization_id
    AND created_at >= p_since;
END;
$$ LANGUAGE plpgsql;

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, hidden, singleton)
VALUES 
  ('webhook_deliveries', 'send', 'Outgoing webhook delivery queue', false, false),
  ('webhook_events', 'call_received', 'Incoming webhook events log', false, false)
ON CONFLICT (collection) DO NOTHING;

-- Add webhook retry settings to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS webhook_retry_config JSONB DEFAULT '{
  "maxAttempts": 5,
  "baseDelayMs": 1000,
  "maxDelayMs": 3600000,
  "backoffMultiplier": 2
}'::jsonb;

-- Create a view for monitoring webhook health
CREATE OR REPLACE VIEW webhook_health_summary AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COUNT(wd.id) as total_deliveries_24h,
  COUNT(wd.id) FILTER (WHERE wd.status = 'delivered') as delivered_24h,
  COUNT(wd.id) FILTER (WHERE wd.status = 'pending') as pending_24h,
  COUNT(wd.id) FILTER (WHERE wd.status = 'failed') as failed_24h,
  COUNT(wd.id) FILTER (WHERE wd.status = 'dead_letter') as dead_letter_24h,
  CASE 
    WHEN COUNT(wd.id) > 0 
    THEN ROUND((COUNT(wd.id) FILTER (WHERE wd.status = 'delivered')::NUMERIC / COUNT(wd.id) * 100), 2)
    ELSE 100 
  END as success_rate_24h,
  COUNT(we.id) as events_received_24h,
  COUNT(we.id) FILTER (WHERE we.signature_valid = false) as invalid_signatures_24h
FROM organizations o
LEFT JOIN webhook_deliveries wd ON wd.organization_id = o.id 
  AND wd.created_at >= NOW() - INTERVAL '24 hours'
LEFT JOIN webhook_events we ON we.organization_id = o.id 
  AND we.received_at >= NOW() - INTERVAL '24 hours'
GROUP BY o.id, o.name;

COMMENT ON VIEW webhook_health_summary IS 'Summary of webhook health metrics per organization (last 24 hours)';



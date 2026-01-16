-- Migration: 102_gdpr_compliance
-- Description: GDPR compliance tables for DSR and data retention
-- Created: 2026-01-07

-- Data Subject Requests (DSR)
CREATE TABLE IF NOT EXISTS dsr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES directus_users(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- Request type
  request_type VARCHAR(20) NOT NULL, -- export, delete, portability
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- When download link expires
  
  -- Results
  download_url TEXT,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT valid_request_type CHECK (request_type IN ('export', 'delete', 'portability')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Indexes
CREATE INDEX idx_dsr_requests_user ON dsr_requests(user_id);
CREATE INDEX idx_dsr_requests_status ON dsr_requests(status);
CREATE INDEX idx_dsr_requests_requested ON dsr_requests(requested_at DESC);

-- DSR Exports (temporary storage for export data)
CREATE TABLE IF NOT EXISTS dsr_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES dsr_requests(id) ON DELETE CASCADE,
  data TEXT NOT NULL, -- JSON export data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dsr_exports_request ON dsr_exports(request_id);

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  timestamp_column VARCHAR(100) NOT NULL,
  retention_days INTEGER NOT NULL,
  organization_column VARCHAR(100),
  soft_delete BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (id, name, table_name, timestamp_column, retention_days, organization_column, soft_delete)
VALUES
  ('nodered_execution_logs', 'Workflow Execution Logs', 'nodered_execution_logs', 'started_at', 90, 'organization_id', false),
  ('webhook_events', 'Webhook Events', 'webhook_events', 'received_at', 30, 'organization_id', false),
  ('webhook_deliveries', 'Webhook Deliveries', 'webhook_deliveries', 'delivered_at', 30, 'organization_id', false),
  ('oauth_states', 'OAuth States', 'oauth_states', 'expires_at', 1, NULL, false),
  ('audit_logs', 'Audit Logs', 'audit_logs', 'created_at', 365, 'organization_id', false),
  ('kb_ingestion_logs', 'KB Ingestion Logs', 'kb_ingestion_logs', 'created_at', 180, 'organization_id', false)
ON CONFLICT (id) DO NOTHING;

-- Consent Records
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL, -- marketing, analytics, third_party, etc.
  granted BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  
  UNIQUE(user_id, consent_type)
);

CREATE INDEX idx_consent_records_user ON consent_records(user_id);
CREATE INDEX idx_consent_records_type ON consent_records(consent_type);

-- Data Processing Records (Article 30 GDPR)
CREATE TABLE IF NOT EXISTS data_processing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Processing activity details
  activity_name VARCHAR(200) NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis VARCHAR(50) NOT NULL, -- consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests
  
  -- Data categories
  data_categories TEXT[] NOT NULL,
  data_subjects TEXT[] NOT NULL, -- customers, employees, prospects, etc.
  
  -- Recipients
  recipients TEXT[],
  third_country_transfers BOOLEAN DEFAULT false,
  transfer_safeguards TEXT,
  
  -- Retention
  retention_period VARCHAR(100),
  
  -- Security measures
  security_measures TEXT[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_processing_org ON data_processing_records(organization_id);

-- PII Detection Log (for audit purposes)
CREATE TABLE IF NOT EXISTS pii_detection_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source_table VARCHAR(100) NOT NULL,
  source_id VARCHAR(255),
  pii_types TEXT[] NOT NULL,
  total_redactions INTEGER NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pii_detection_org ON pii_detection_log(organization_id);
CREATE INDEX idx_pii_detection_date ON pii_detection_log(detected_at DESC);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, hidden, singleton)
VALUES 
  ('dsr_requests', 'person_remove', 'Data Subject Requests (GDPR)', false, false),
  ('dsr_exports', 'download', 'DSR Export Data', true, false),
  ('data_retention_policies', 'auto_delete', 'Data Retention Policies', false, false),
  ('consent_records', 'verified_user', 'User Consent Records', false, false),
  ('data_processing_records', 'description', 'Data Processing Activities (Article 30)', false, false),
  ('pii_detection_log', 'privacy_tip', 'PII Detection Audit Log', false, false)
ON CONFLICT (collection) DO NOTHING;

-- Function to check user consent
CREATE OR REPLACE FUNCTION check_user_consent(
  p_user_id UUID,
  p_consent_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM consent_records
    WHERE user_id = p_user_id
      AND consent_type = p_consent_type
      AND granted = true
      AND revoked_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get DSR statistics
CREATE OR REPLACE FUNCTION get_dsr_statistics(
  p_since TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
  total_requests BIGINT,
  export_requests BIGINT,
  delete_requests BIGINT,
  completed_requests BIGINT,
  pending_requests BIGINT,
  failed_requests BIGINT,
  avg_processing_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE request_type = 'export') as export_requests,
    COUNT(*) FILTER (WHERE request_type = 'delete') as delete_requests,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_requests,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (processed_at - requested_at)) / 3600) 
      FILTER (WHERE processed_at IS NOT NULL),
      0
    ) as avg_processing_time_hours
  FROM dsr_requests
  WHERE requested_at >= p_since;
END;
$$ LANGUAGE plpgsql;

-- Scheduled cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_dsr_exports()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM dsr_exports
  WHERE request_id IN (
    SELECT id FROM dsr_requests WHERE expires_at < NOW()
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;



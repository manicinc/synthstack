-- Migration: 095_nodered_system.sql
-- Description: Node-RED workflow platform integration
-- Creates collections for tenant configuration, flow limits, execution logs, and templates

-- ============================================================================
-- Node-RED Tenant Configuration (Embedded Model)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nodered_tenant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT false,
  editor_access_roles TEXT[] DEFAULT ARRAY['admin'],
  flow_execution_tier TEXT DEFAULT 'community',
  custom_nodes TEXT[],  -- Allowed community nodes for this tenant
  credential_secret TEXT,  -- Unique encryption secret for this tenant's credentials
  
  -- Directus metadata
  status VARCHAR(20) DEFAULT 'draft',
  sort INTEGER,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

COMMENT ON TABLE nodered_tenant_config IS 'Node-RED configuration per tenant organization';
COMMENT ON COLUMN nodered_tenant_config.enabled IS 'Whether Node-RED is enabled for this tenant';
COMMENT ON COLUMN nodered_tenant_config.editor_access_roles IS 'Roles allowed to access the Node-RED editor';
COMMENT ON COLUMN nodered_tenant_config.flow_execution_tier IS 'Rate limiting tier for flow executions';
COMMENT ON COLUMN nodered_tenant_config.custom_nodes IS 'List of allowed community node packages';
COMMENT ON COLUMN nodered_tenant_config.credential_secret IS 'Unique secret for encrypting this tenant credentials';

-- ============================================================================
-- Flow Limits per Organization Tier
-- ============================================================================

CREATE TABLE IF NOT EXISTS nodered_flow_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL,
  max_flows INTEGER NOT NULL,
  max_executions_per_day INTEGER NOT NULL,
  max_nodes_per_flow INTEGER DEFAULT 100,
  current_flow_count INTEGER DEFAULT 0,
  current_daily_executions INTEGER DEFAULT 0,
  executions_reset_at TIMESTAMPTZ,
  
  -- Directus metadata
  status VARCHAR(20) DEFAULT 'published',
  sort INTEGER,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

COMMENT ON TABLE nodered_flow_limits IS 'Flow execution limits by subscription tier';
COMMENT ON COLUMN nodered_flow_limits.tier IS 'Subscription tier (free, pro, agency, enterprise, lifetime)';
COMMENT ON COLUMN nodered_flow_limits.max_flows IS 'Maximum number of flows allowed';
COMMENT ON COLUMN nodered_flow_limits.max_executions_per_day IS 'Maximum flow executions per day';
COMMENT ON COLUMN nodered_flow_limits.max_nodes_per_flow IS 'Maximum nodes allowed per flow';
COMMENT ON COLUMN nodered_flow_limits.current_flow_count IS 'Current number of flows for this org';
COMMENT ON COLUMN nodered_flow_limits.current_daily_executions IS 'Current daily execution count';
COMMENT ON COLUMN nodered_flow_limits.executions_reset_at IS 'When daily execution count resets';

-- ============================================================================
-- Execution Logs for Audit Trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS nodered_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  flow_id VARCHAR(64),
  flow_name VARCHAR(255),
  trigger_type VARCHAR(50),
  trigger_source VARCHAR(255),
  status VARCHAR(20),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  nodes_executed INTEGER,
  error_message TEXT,
  error_stack TEXT,
  input_summary JSONB,
  output_summary JSONB,
  
  -- Directus metadata
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

COMMENT ON TABLE nodered_execution_logs IS 'Audit log of all Node-RED flow executions';
COMMENT ON COLUMN nodered_execution_logs.flow_id IS 'Node-RED internal flow ID';
COMMENT ON COLUMN nodered_execution_logs.flow_name IS 'Human-readable flow name';
COMMENT ON COLUMN nodered_execution_logs.trigger_type IS 'Type of trigger (webhook, schedule, manual, directus)';
COMMENT ON COLUMN nodered_execution_logs.trigger_source IS 'Source identifier for the trigger';
COMMENT ON COLUMN nodered_execution_logs.status IS 'Execution status (running, completed, failed, timeout)';
COMMENT ON COLUMN nodered_execution_logs.nodes_executed IS 'Number of nodes executed in the flow';
COMMENT ON COLUMN nodered_execution_logs.input_summary IS 'Sanitized summary of input data';
COMMENT ON COLUMN nodered_execution_logs.output_summary IS 'Sanitized summary of output data';

-- ============================================================================
-- Flow Templates Library (Managed in Directus)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nodered_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'draft',
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50),
  icon VARCHAR(50),
  color VARCHAR(20),
  
  -- Template content
  flow_json JSONB NOT NULL,
  required_nodes TEXT[],
  required_credentials TEXT[],
  
  -- Metadata
  version VARCHAR(20) DEFAULT '1.0.0',
  author VARCHAR(255),
  tags TEXT[],
  difficulty VARCHAR(20) DEFAULT 'beginner',
  estimated_setup_minutes INTEGER,
  
  -- Usage tracking
  install_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  
  -- Directus fields
  sort INTEGER,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

COMMENT ON TABLE nodered_templates IS 'Pre-built Node-RED workflow templates';
COMMENT ON COLUMN nodered_templates.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN nodered_templates.category IS 'Template category (ai-agents, notifications, integrations, scheduling)';
COMMENT ON COLUMN nodered_templates.flow_json IS 'Node-RED flow JSON definition';
COMMENT ON COLUMN nodered_templates.required_nodes IS 'Node packages required for this template';
COMMENT ON COLUMN nodered_templates.required_credentials IS 'Credential types needed (openai, slack, github, etc.)';
COMMENT ON COLUMN nodered_templates.difficulty IS 'Setup difficulty (beginner, intermediate, advanced)';

-- ============================================================================
-- Template Installations per Organization
-- ============================================================================

CREATE TABLE IF NOT EXISTS nodered_template_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES nodered_templates(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  flow_id VARCHAR(64),
  customizations JSONB,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Directus metadata
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id),
  
  UNIQUE(organization_id, template_id)
);

COMMENT ON TABLE nodered_template_installs IS 'Track which templates each org has installed';
COMMENT ON COLUMN nodered_template_installs.flow_id IS 'The flow ID created from this template';
COMMENT ON COLUMN nodered_template_installs.customizations IS 'Record of customizations made to the template';
COMMENT ON COLUMN nodered_template_installs.rating IS 'User rating of the template (1-5)';

-- ============================================================================
-- Template Categories (for UI organization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nodered_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  sort INTEGER DEFAULT 0,
  
  -- Directus metadata
  status VARCHAR(20) DEFAULT 'published',
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

COMMENT ON TABLE nodered_template_categories IS 'Categories for organizing workflow templates';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_nodered_tenant_config_org ON nodered_tenant_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_nodered_tenant_config_enabled ON nodered_tenant_config(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_nodered_flow_limits_org ON nodered_flow_limits(organization_id);
CREATE INDEX IF NOT EXISTS idx_nodered_flow_limits_tier ON nodered_flow_limits(tier);
CREATE INDEX IF NOT EXISTS idx_nodered_logs_org ON nodered_execution_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_nodered_logs_date ON nodered_execution_logs(date_created);
CREATE INDEX IF NOT EXISTS idx_nodered_logs_status ON nodered_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_nodered_logs_flow ON nodered_execution_logs(flow_id);
CREATE INDEX IF NOT EXISTS idx_nodered_templates_status ON nodered_templates(status);
CREATE INDEX IF NOT EXISTS idx_nodered_templates_category ON nodered_templates(category);
CREATE INDEX IF NOT EXISTS idx_nodered_templates_slug ON nodered_templates(slug);
CREATE INDEX IF NOT EXISTS idx_nodered_installs_org ON nodered_template_installs(organization_id);
CREATE INDEX IF NOT EXISTS idx_nodered_installs_template ON nodered_template_installs(template_id);

-- ============================================================================
-- Default Flow Limits by Tier
-- ============================================================================

INSERT INTO nodered_flow_limits (organization_id, tier, max_flows, max_executions_per_day, max_nodes_per_flow) VALUES
  (NULL, 'free', 0, 0, 0),
  (NULL, 'pro', 10, 500, 50),
  (NULL, 'agency', 50, 5000, 100),
  (NULL, 'enterprise', 999999, 999999, 500),
  (NULL, 'lifetime', 25, 2500, 75)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Default Template Categories
-- ============================================================================

INSERT INTO nodered_template_categories (name, slug, description, icon, color, sort, status) VALUES
  ('AI Agents', 'ai-agents', 'Workflows that leverage SynthStack AI agents for automation', 'smart_toy', '#f97316', 1, 'published'),
  ('Notifications', 'notifications', 'Alert and notification workflows for Slack, email, Discord', 'notifications', '#3b82f6', 2, 'published'),
  ('Integrations', 'integrations', 'Connect external services like Notion, HubSpot, Stripe', 'extension', '#8b5cf6', 3, 'published'),
  ('Scheduling', 'scheduling', 'Scheduled reports, summaries, and recurring tasks', 'schedule', '#10b981', 4, 'published'),
  ('Data Processing', 'data-processing', 'ETL, data transformation, and sync workflows', 'transform', '#ec4899', 5, 'published'),
  ('DevOps', 'devops', 'CI/CD, deployment, and infrastructure automation', 'code', '#6366f1', 6, 'published')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Register Collections in Directus
-- ============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, archive_field, archive_value, sort_field, accountability, translations, "group", collapse, preview_url, versioning) VALUES
  ('nodered_tenant_config', 'memory', 'Node-RED configuration per tenant', '{{organization_id.name}} - {{enabled}}', 'status', 'archived', 'sort', 'all', NULL, 'nodered', 'open', NULL, false),
  ('nodered_flow_limits', 'tune', 'Flow execution limits by tier', '{{tier}}: {{max_flows}} flows', 'status', 'archived', 'sort', 'all', NULL, 'nodered', 'open', NULL, false),
  ('nodered_execution_logs', 'history', 'Workflow execution audit logs', '{{flow_name}} - {{status}}', NULL, NULL, NULL, 'all', NULL, 'nodered', 'open', NULL, false),
  ('nodered_templates', 'widgets', 'Pre-built workflow templates', '{{name}}', 'status', 'archived', 'sort', 'all', NULL, 'nodered', 'open', NULL, false),
  ('nodered_template_installs', 'download', 'Template installations per org', '{{template_id.name}}', NULL, NULL, NULL, 'all', NULL, 'nodered', 'open', NULL, false),
  ('nodered_template_categories', 'category', 'Template categories', '{{name}}', 'status', 'archived', 'sort', 'all', NULL, 'nodered', 'open', NULL, false)
ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template,
  "group" = EXCLUDED."group";

-- ============================================================================
-- Create Collection Group for Node-RED
-- ============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, translations, collapse, "group") VALUES
  ('nodered', 'account_tree', 'Node-RED Workflow Platform', NULL, true, false, NULL, 'open', NULL)
ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note;

-- ============================================================================
-- Trigger to Auto-Create Tenant Config on Organization Create
-- ============================================================================

CREATE OR REPLACE FUNCTION create_nodered_tenant_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO nodered_tenant_config (organization_id, enabled, credential_secret)
  VALUES (NEW.id, false, encode(gen_random_bytes(32), 'hex'))
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_nodered_tenant_config ON organizations;
CREATE TRIGGER trigger_create_nodered_tenant_config
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_nodered_tenant_config();

-- ============================================================================
-- Trigger to Reset Daily Executions at Midnight
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_nodered_daily_executions()
RETURNS void AS $$
BEGIN
  UPDATE nodered_flow_limits
  SET current_daily_executions = 0,
      executions_reset_at = NOW()
  WHERE organization_id IS NOT NULL
    AND (executions_reset_at IS NULL OR executions_reset_at < CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger to Increment Template Install Count
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_template_install_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE nodered_templates
  SET install_count = install_count + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_template_install ON nodered_template_installs;
CREATE TRIGGER trigger_increment_template_install
  AFTER INSERT ON nodered_template_installs
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_install_count();

-- ============================================================================
-- Trigger to Update Template Rating Average
-- ============================================================================

CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE nodered_templates
  SET rating_average = (
    SELECT AVG(rating)::DECIMAL(3,2)
    FROM nodered_template_installs
    WHERE template_id = NEW.template_id AND rating IS NOT NULL
  ),
  rating_count = (
    SELECT COUNT(*)
    FROM nodered_template_installs
    WHERE template_id = NEW.template_id AND rating IS NOT NULL
  )
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_template_rating ON nodered_template_installs;
CREATE TRIGGER trigger_update_template_rating
  AFTER INSERT OR UPDATE OF rating ON nodered_template_installs
  FOR EACH ROW
  WHEN (NEW.rating IS NOT NULL)
  EXECUTE FUNCTION update_template_rating();

-- ============================================================================
-- Create tenant configs for existing organizations
-- ============================================================================

INSERT INTO nodered_tenant_config (organization_id, enabled, credential_secret)
SELECT id, false, encode(gen_random_bytes(32), 'hex')
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM nodered_tenant_config WHERE organization_id IS NOT NULL)
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Admin role gets full access
INSERT INTO directus_permissions (role, collection, action, permissions, validation, presets, fields)
SELECT 
  r.id,
  c.collection,
  a.action,
  '{}',
  '{}',
  '{}',
  '*'
FROM 
  directus_roles r,
  (VALUES 
    ('nodered_tenant_config'),
    ('nodered_flow_limits'),
    ('nodered_execution_logs'),
    ('nodered_templates'),
    ('nodered_template_installs'),
    ('nodered_template_categories')
  ) AS c(collection),
  (VALUES ('create'), ('read'), ('update'), ('delete')) AS a(action)
WHERE r.name = 'Administrator'
ON CONFLICT DO NOTHING;

-- Team members can read templates and view their org's config
INSERT INTO directus_permissions (role, collection, action, permissions, validation, presets, fields)
SELECT 
  r.id,
  c.collection,
  'read',
  '{}',
  '{}',
  '{}',
  '*'
FROM 
  directus_roles r,
  (VALUES 
    ('nodered_templates'),
    ('nodered_template_categories')
  ) AS c(collection)
WHERE r.name IN ('Team Member', 'Client')
ON CONFLICT DO NOTHING;



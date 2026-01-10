-- Migration: 110_workflow_credits.sql
-- Description: Integrate workflow executions with unified credit system
-- Created: 2025-01-07

-- ============================================
-- EXTEND NODERED_EXECUTION_LOGS
-- Add credit tracking columns
-- ============================================

-- Add credits_charged column to track how many credits were deducted
ALTER TABLE nodered_execution_logs 
ADD COLUMN IF NOT EXISTS credits_charged INTEGER DEFAULT 0;

-- Add premium_nodes_used to track which premium nodes were executed
ALTER TABLE nodered_execution_logs 
ADD COLUMN IF NOT EXISTS premium_nodes_used TEXT[] DEFAULT '{}';

-- Add is_free_execution flag for executions within daily free tier
ALTER TABLE nodered_execution_logs 
ADD COLUMN IF NOT EXISTS is_free_execution BOOLEAN DEFAULT false;

-- Add credit_transaction_id to link to credit_transactions table
ALTER TABLE nodered_execution_logs 
ADD COLUMN IF NOT EXISTS credit_transaction_id UUID;

COMMENT ON COLUMN nodered_execution_logs.credits_charged IS 'Number of credits deducted for this execution';
COMMENT ON COLUMN nodered_execution_logs.premium_nodes_used IS 'Array of premium node types that were executed';
COMMENT ON COLUMN nodered_execution_logs.is_free_execution IS 'Whether this execution was within daily free tier limit';
COMMENT ON COLUMN nodered_execution_logs.credit_transaction_id IS 'Reference to the credit transaction for this execution';

-- ============================================
-- WORKFLOW CREDIT CONFIGURATION TABLE
-- Stores tier-specific workflow credit settings
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_credit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(50) NOT NULL UNIQUE,
  
  -- Cost multiplier for this tier (1.0 = base cost)
  cost_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  
  -- Free executions per day before credits are charged
  free_executions_per_day INTEGER NOT NULL DEFAULT 0,
  
  -- Maximum credits that can be charged per execution (cap)
  max_credits_per_execution INTEGER NOT NULL DEFAULT 100,
  
  -- Whether workflow executions are enabled for this tier
  workflows_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE workflow_credit_config IS 'Configuration for workflow credit costs per subscription tier';
COMMENT ON COLUMN workflow_credit_config.cost_multiplier IS 'Multiplier applied to base credit cost (e.g., 2.0 = double cost)';
COMMENT ON COLUMN workflow_credit_config.free_executions_per_day IS 'Number of free workflow executions before credits are charged';
COMMENT ON COLUMN workflow_credit_config.max_credits_per_execution IS 'Maximum credits that can be charged for a single execution';

-- ============================================
-- SEED WORKFLOW CREDIT CONFIG
-- ============================================

INSERT INTO workflow_credit_config (tier, cost_multiplier, free_executions_per_day, max_credits_per_execution, workflows_enabled)
VALUES
  ('free', 2.0, 0, 100, false),           -- Free tier: no workflows
  ('maker', 1.5, 5, 100, true),           -- Maker: 5 free/day, 1.5x cost
  ('pro', 1.0, 20, 100, true),            -- Pro: 20 free/day, base cost
  ('agency', 0.75, 100, 150, true),       -- Agency: 100 free/day, 25% discount
  ('enterprise', 0.5, 500, 200, true),    -- Enterprise: 500 free/day, 50% discount
  ('lifetime', 0.8, 30, 100, true),       -- Lifetime: 30 free/day, 20% discount
  ('unlimited', 0.5, 999999, 200, true)   -- Unlimited: essentially free
ON CONFLICT (tier) DO UPDATE SET
  cost_multiplier = EXCLUDED.cost_multiplier,
  free_executions_per_day = EXCLUDED.free_executions_per_day,
  max_credits_per_execution = EXCLUDED.max_credits_per_execution,
  workflows_enabled = EXCLUDED.workflows_enabled,
  updated_at = NOW();

-- ============================================
-- PREMIUM NODE COSTS TABLE
-- Configurable costs for premium nodes
-- ============================================

CREATE TABLE IF NOT EXISTS premium_node_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type VARCHAR(100) NOT NULL UNIQUE,
  node_name VARCHAR(255) NOT NULL,
  credit_cost INTEGER NOT NULL DEFAULT 1,
  category VARCHAR(50) NOT NULL DEFAULT 'integration',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE premium_node_costs IS 'Credit costs for premium Node-RED nodes';
COMMENT ON COLUMN premium_node_costs.node_type IS 'Node-RED node type identifier (e.g., synthstack-agent)';
COMMENT ON COLUMN premium_node_costs.credit_cost IS 'Additional credits charged when this node executes';
COMMENT ON COLUMN premium_node_costs.category IS 'Node category (ai, integration, communication, financial)';

-- ============================================
-- SEED PREMIUM NODE COSTS
-- ============================================

INSERT INTO premium_node_costs (node_type, node_name, credit_cost, category, description)
VALUES
  -- AI/LLM nodes - highest cost
  ('synthstack-agent', 'AI Agent', 3, 'ai', 'Executes AI agent with LLM calls'),
  ('synthstack-openai', 'OpenAI', 2, 'ai', 'Direct OpenAI API calls'),
  ('synthstack-anthropic', 'Anthropic', 2, 'ai', 'Direct Anthropic API calls'),
  ('synthstack-gemini', 'Google Gemini', 2, 'ai', 'Direct Gemini API calls'),
  
  -- Communication integrations
  ('synthstack-slack', 'Slack', 1, 'communication', 'Slack messaging and API'),
  ('synthstack-discord', 'Discord', 1, 'communication', 'Discord messaging and API'),
  ('synthstack-twilio', 'Twilio', 2, 'communication', 'SMS and voice calls'),
  ('synthstack-gmail', 'Gmail', 1, 'communication', 'Gmail email operations'),
  
  -- Productivity integrations
  ('synthstack-notion', 'Notion', 1, 'integration', 'Notion database and pages'),
  ('synthstack-github', 'GitHub', 1, 'integration', 'GitHub repository operations'),
  ('synthstack-jira', 'Jira', 1, 'integration', 'Jira issue management'),
  ('synthstack-sheets', 'Google Sheets', 1, 'integration', 'Spreadsheet operations'),
  ('synthstack-drive', 'Google Drive', 1, 'integration', 'File storage operations'),
  
  -- Financial - higher cost
  ('synthstack-stripe', 'Stripe', 2, 'financial', 'Payment processing operations'),
  
  -- Knowledge base
  ('synthstack-kb', 'Knowledge Base', 1, 'ai', 'Vector search and retrieval'),
  
  -- Directus - no additional cost (included)
  ('synthstack-directus', 'Directus', 0, 'integration', 'Directus CMS operations (included)')
ON CONFLICT (node_type) DO UPDATE SET
  node_name = EXCLUDED.node_name,
  credit_cost = EXCLUDED.credit_cost,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_execution_logs_credits ON nodered_execution_logs(credits_charged) WHERE credits_charged > 0;
CREATE INDEX IF NOT EXISTS idx_execution_logs_free ON nodered_execution_logs(is_free_execution);
CREATE INDEX IF NOT EXISTS idx_execution_logs_credit_tx ON nodered_execution_logs(credit_transaction_id);
CREATE INDEX IF NOT EXISTS idx_premium_node_costs_type ON premium_node_costs(node_type);
CREATE INDEX IF NOT EXISTS idx_premium_node_costs_active ON premium_node_costs(is_active);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_workflow_credit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_credit_config_updated_at ON workflow_credit_config;
CREATE TRIGGER workflow_credit_config_updated_at
  BEFORE UPDATE ON workflow_credit_config
  FOR EACH ROW EXECUTE FUNCTION update_workflow_credit_timestamp();

DROP TRIGGER IF EXISTS premium_node_costs_updated_at ON premium_node_costs;
CREATE TRIGGER premium_node_costs_updated_at
  BEFORE UPDATE ON premium_node_costs
  FOR EACH ROW EXECUTE FUNCTION update_workflow_credit_timestamp();

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON workflow_credit_config TO synthstack;
GRANT SELECT, INSERT, UPDATE ON premium_node_costs TO synthstack;

-- ============================================
-- FEATURE FLAG FOR GRADUAL ROLLOUT
-- ============================================

INSERT INTO feature_flags (name, enabled, description, metadata)
VALUES (
  'workflow_credits_enabled',
  false,
  'Enable credit-based billing for workflow executions',
  '{"rollout_percentage": 0, "beta_users": []}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- VIEW: Execution Cost Summary
-- ============================================

CREATE OR REPLACE VIEW workflow_execution_cost_summary AS
SELECT 
  el.organization_id,
  DATE(el.started_at) as execution_date,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE el.is_free_execution = true) as free_executions,
  COUNT(*) FILTER (WHERE el.is_free_execution = false) as paid_executions,
  SUM(el.credits_charged) as total_credits_charged,
  AVG(el.credits_charged) FILTER (WHERE el.credits_charged > 0) as avg_credits_per_paid_execution,
  AVG(el.duration_ms) as avg_duration_ms,
  AVG(el.nodes_executed) as avg_nodes_executed
FROM nodered_execution_logs el
WHERE el.status = 'completed'
GROUP BY el.organization_id, DATE(el.started_at);

COMMENT ON VIEW workflow_execution_cost_summary IS 'Daily summary of workflow execution costs per organization';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE workflow_credit_config IS 'Tier-specific configuration for workflow credit costs and limits';
COMMENT ON TABLE premium_node_costs IS 'Credit costs for premium Node-RED nodes that incur additional charges';



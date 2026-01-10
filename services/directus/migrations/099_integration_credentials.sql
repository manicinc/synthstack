-- Migration: 099_integration_credentials
-- Description: Store OAuth tokens and API keys for Node-RED integrations
-- Created: 2026-01-07

-- Integration credentials table (encrypted at rest)
CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL, -- slack, discord, notion, google, twilio, jira, etc.
  credential_name VARCHAR(100) NOT NULL, -- user-friendly name
  
  -- OAuth tokens (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- API keys (encrypted)
  api_key TEXT,
  api_secret TEXT,
  
  -- Integration-specific config (JSON)
  config JSONB DEFAULT '{}',
  
  -- Metadata
  scopes TEXT[], -- OAuth scopes granted
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES directus_users(id),
  
  UNIQUE(organization_id, integration_type, credential_name)
);

-- Index for fast lookups
CREATE INDEX idx_integration_credentials_org ON integration_credentials(organization_id);
CREATE INDEX idx_integration_credentials_type ON integration_credentials(integration_type);
CREATE INDEX idx_integration_credentials_active ON integration_credentials(organization_id, integration_type, is_active) WHERE is_active = true;

-- OAuth state table for CSRF protection during OAuth flow
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  state_token VARCHAR(255) NOT NULL UNIQUE,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[],
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for state lookups
CREATE INDEX idx_oauth_states_token ON oauth_states(state_token);
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);

-- Cleanup expired states (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Integration webhook configs (for receiving webhooks from external services)
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  webhook_name VARCHAR(100) NOT NULL,
  
  -- Webhook configuration
  webhook_url TEXT NOT NULL, -- Our endpoint URL
  signing_secret TEXT, -- For signature validation
  
  -- External webhook ID (if applicable)
  external_webhook_id VARCHAR(255),
  
  -- Event filters
  event_types TEXT[], -- Which events to receive
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_received_at TIMESTAMPTZ,
  receive_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, integration_type, webhook_name)
);

-- Index for webhook lookups
CREATE INDEX idx_integration_webhooks_org ON integration_webhooks(organization_id);
CREATE INDEX idx_integration_webhooks_type ON integration_webhooks(integration_type);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_integration_credentials_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_integration_credentials_updated
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_credentials_timestamp();

CREATE TRIGGER trigger_integration_webhooks_updated
  BEFORE UPDATE ON integration_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_credentials_timestamp();

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, translations)
VALUES 
  ('integration_credentials', 'vpn_key', 'OAuth tokens and API keys for integrations', '{{credential_name}} ({{integration_type}})', false, false, NULL),
  ('oauth_states', 'security', 'OAuth flow state tokens', NULL, true, false, NULL),
  ('integration_webhooks', 'webhook', 'Webhook configurations for receiving external events', '{{webhook_name}} ({{integration_type}})', false, false, NULL)
ON CONFLICT (collection) DO NOTHING;

-- Insert supported integration types as reference
CREATE TABLE IF NOT EXISTS integration_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  auth_type VARCHAR(20) NOT NULL, -- oauth2, api_key, basic
  oauth_authorize_url TEXT,
  oauth_token_url TEXT,
  default_scopes TEXT[],
  documentation_url TEXT,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO integration_types (id, name, description, icon, color, auth_type, oauth_authorize_url, oauth_token_url, default_scopes, documentation_url)
VALUES
  ('slack', 'Slack', 'Team communication and messaging', 'fa-slack', '#E01E5A', 'oauth2', 'https://slack.com/oauth/v2/authorize', 'https://slack.com/api/oauth.v2.access', ARRAY['chat:write', 'channels:read', 'files:write'], 'https://api.slack.com/docs'),
  ('discord', 'Discord', 'Community chat and voice', 'fa-discord', '#5865F2', 'oauth2', 'https://discord.com/api/oauth2/authorize', 'https://discord.com/api/oauth2/token', ARRAY['bot', 'applications.commands'], 'https://discord.com/developers/docs'),
  ('notion', 'Notion', 'Workspace and documentation', 'fa-book', '#000000', 'oauth2', 'https://api.notion.com/v1/oauth/authorize', 'https://api.notion.com/v1/oauth/token', ARRAY[], 'https://developers.notion.com'),
  ('google', 'Google', 'Gmail, Sheets, Drive, Calendar', 'fa-google', '#4285F4', 'oauth2', 'https://accounts.google.com/o/oauth2/v2/auth', 'https://oauth2.googleapis.com/token', ARRAY['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'], 'https://developers.google.com/identity/protocols/oauth2'),
  ('twilio', 'Twilio', 'SMS and voice communications', 'fa-phone', '#F22F46', 'api_key', NULL, NULL, NULL, 'https://www.twilio.com/docs'),
  ('jira', 'Jira', 'Project and issue tracking', 'fa-jira', '#0052CC', 'oauth2', 'https://auth.atlassian.com/authorize', 'https://auth.atlassian.com/oauth/token', ARRAY['read:jira-work', 'write:jira-work', 'read:jira-user'], 'https://developer.atlassian.com/cloud/jira/platform/rest/v3'),
  ('github', 'GitHub', 'Code repository and CI/CD', 'fa-github', '#181717', 'oauth2', 'https://github.com/login/oauth/authorize', 'https://github.com/login/oauth/access_token', ARRAY['repo', 'workflow'], 'https://docs.github.com/en/rest'),
  ('stripe', 'Stripe', 'Payments and billing', 'fa-stripe', '#635BFF', 'api_key', NULL, NULL, NULL, 'https://stripe.com/docs/api')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  oauth_authorize_url = EXCLUDED.oauth_authorize_url,
  oauth_token_url = EXCLUDED.oauth_token_url,
  default_scopes = EXCLUDED.default_scopes;

-- Register integration_types with Directus
INSERT INTO directus_collections (collection, icon, note, hidden, singleton)
VALUES ('integration_types', 'extension', 'Supported integration types', true, false)
ON CONFLICT (collection) DO NOTHING;



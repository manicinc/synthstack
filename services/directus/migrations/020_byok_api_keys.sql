-- SynthStack BYOK (Bring Your Own Keys) System
-- Migration 020: User-managed API keys for AI services
--
-- Allows premium users to use their own OpenAI/Anthropic API keys
-- Keys are encrypted at rest using AES-256 with ENCRYPTION_KEY env var

-- ============================================
-- User API Keys Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Provider info
  provider VARCHAR(50) NOT NULL,  -- 'openai', 'anthropic'
  provider_name VARCHAR(100),     -- Display name like 'OpenAI', 'Anthropic Claude'

  -- Encrypted key storage
  encrypted_key TEXT NOT NULL,    -- AES-256 encrypted API key
  key_hint VARCHAR(8),            -- Last 4 chars for display (e.g., '...abc1')

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_valid BOOLEAN DEFAULT true,  -- Set to false if key fails validation
  last_error TEXT,                -- Last error message if validation failed

  -- Usage tracking
  total_requests INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One key per provider per user
  UNIQUE(user_id, provider)
);

-- ============================================
-- Supported Providers Reference
-- ============================================
CREATE TABLE IF NOT EXISTS api_providers (
  id VARCHAR(50) PRIMARY KEY,     -- 'openai', 'anthropic'
  name VARCHAR(100) NOT NULL,     -- 'OpenAI', 'Anthropic'
  description TEXT,

  -- Validation endpoint (to test if key works)
  validation_endpoint TEXT,
  validation_method VARCHAR(10) DEFAULT 'GET',

  -- Documentation
  docs_url TEXT,
  key_format_hint TEXT,           -- e.g., 'sk-...' for OpenAI

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Seed Supported Providers
-- ============================================
INSERT INTO api_providers (id, name, description, docs_url, key_format_hint, sort_order) VALUES
  ('openai', 'OpenAI', 'GPT-4, GPT-3.5, DALL-E, Whisper', 'https://platform.openai.com/api-keys', 'sk-...', 1),
  ('anthropic', 'Anthropic', 'Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku', 'https://console.anthropic.com/settings/keys', 'sk-ant-...', 2)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  docs_url = EXCLUDED.docs_url,
  key_format_hint = EXCLUDED.key_format_hint;

-- ============================================
-- API Key Usage Log (for tracking/billing)
-- ============================================
CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES user_api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Request details
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100),             -- 'gpt-4', 'claude-3-sonnet', etc.
  endpoint VARCHAR(200),          -- '/v1/chat/completions', etc.

  -- Token usage
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,

  -- Cost estimate (in cents, based on provider pricing)
  estimated_cost_cents INTEGER,

  -- Status
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  response_time_ms INTEGER,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_user ON api_key_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_date ON api_key_usage(created_at);

-- ============================================
-- Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_api_key_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_api_key_timestamp();

-- Update usage stats on api_key_usage insert
CREATE OR REPLACE FUNCTION update_api_key_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_api_keys SET
    total_requests = total_requests + 1,
    total_tokens = total_tokens + COALESCE(NEW.total_tokens, 0),
    last_used_at = NOW()
  WHERE id = NEW.api_key_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_key_usage_stats
  AFTER INSERT ON api_key_usage
  FOR EACH ROW EXECUTE FUNCTION update_api_key_stats();

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON user_api_keys TO synthstack;
GRANT SELECT ON api_providers TO synthstack;
GRANT SELECT, INSERT ON api_key_usage TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE user_api_keys IS 'User-managed API keys for BYOK (Bring Your Own Keys) feature';
COMMENT ON TABLE api_providers IS 'Supported AI API providers for BYOK';
COMMENT ON TABLE api_key_usage IS 'Usage log for BYOK API calls';
COMMENT ON COLUMN user_api_keys.encrypted_key IS 'AES-256 encrypted API key using ENCRYPTION_KEY env var';
COMMENT ON COLUMN user_api_keys.key_hint IS 'Last 4 characters of key for user identification';

-- Migration 134: User AI Settings
-- Description: Store user preferences for AI model selection and behavior.
--
-- Notes:
-- - Community Edition uses LLM routing; these settings let users choose tier/model defaults.
-- - This migration is idempotent and safe to re-run.

-- Create table if it doesn't exist (fresh installs / partial migration sets).
CREATE TABLE IF NOT EXISTS user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,

  -- Global model preferences
  global_model TEXT,
  global_model_tier TEXT DEFAULT 'standard',

  -- Per-agent model overrides (JSON object mapping agent_id -> model string)
  agent_model_overrides JSONB DEFAULT '{}'::jsonb,

  -- Temperature / behavior preferences
  default_temperature DECIMAL(3, 2) DEFAULT 0.7,
  max_context_tokens INTEGER DEFAULT 8000,
  include_project_context BOOLEAN DEFAULT true,
  stream_responses BOOLEAN DEFAULT true,
  show_reasoning BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns for upgrades (safe for existing installs)
ALTER TABLE user_ai_settings ADD COLUMN IF NOT EXISTS global_model TEXT;
ALTER TABLE user_ai_settings ADD COLUMN IF NOT EXISTS global_model_tier TEXT DEFAULT 'standard';
ALTER TABLE user_ai_settings ADD COLUMN IF NOT EXISTS agent_model_overrides JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_ai_settings ADD COLUMN IF NOT EXISTS default_temperature DECIMAL(3, 2) DEFAULT 0.7;
ALTER TABLE user_ai_settings ADD COLUMN IF NOT EXISTS max_context_tokens INTEGER DEFAULT 8000;
ALTER TABLE user_ai_settings ADD COLUMN IF NOT EXISTS include_project_context BOOLEAN DEFAULT true;
ALTER TABLE user_ai_settings ADD COLUMN IF NOT EXISTS stream_responses BOOLEAN DEFAULT true;
ALTER TABLE user_ai_settings ADD COLUMN IF NOT EXISTS show_reasoning BOOLEAN DEFAULT false;

-- Ensure model tier constraint exists (older installs may already have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_ai_settings_tier_check'
  ) THEN
    ALTER TABLE user_ai_settings
      ADD CONSTRAINT user_ai_settings_tier_check
      CHECK (global_model_tier IN ('cheap', 'standard', 'premium'));
  END IF;
END $$;

-- Ensure FK exists (older installs may not have it). Keep NOT VALID to avoid failing on legacy data.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_ai_settings_user_id_fkey'
  ) THEN
    ALTER TABLE user_ai_settings
      ADD CONSTRAINT user_ai_settings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- Index for fast lookups (unique already creates an index; keep for older installs)
CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user_id ON user_ai_settings(user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Normalize trigger naming across migrations
DROP TRIGGER IF EXISTS user_ai_settings_updated_at ON user_ai_settings;
DROP TRIGGER IF EXISTS trigger_update_user_ai_settings_updated_at ON user_ai_settings;
CREATE TRIGGER user_ai_settings_updated_at
  BEFORE UPDATE ON user_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ai_settings_updated_at();

-- Comments
COMMENT ON TABLE user_ai_settings IS 'User preferences for AI model selection and behavior';
COMMENT ON COLUMN user_ai_settings.global_model IS 'Default model ID for all interactions';
COMMENT ON COLUMN user_ai_settings.global_model_tier IS 'Default tier: cheap, standard, or premium';
COMMENT ON COLUMN user_ai_settings.agent_model_overrides IS 'JSON object mapping agent IDs to specific models';
COMMENT ON COLUMN user_ai_settings.default_temperature IS 'Default temperature for AI responses (0.0 to 1.0)';
COMMENT ON COLUMN user_ai_settings.max_context_tokens IS 'Maximum tokens to include in model context';
COMMENT ON COLUMN user_ai_settings.include_project_context IS 'Whether to include project context/RAG by default';
COMMENT ON COLUMN user_ai_settings.stream_responses IS 'Whether to stream responses by default';
COMMENT ON COLUMN user_ai_settings.show_reasoning IS 'Whether to show model reasoning (if supported)';


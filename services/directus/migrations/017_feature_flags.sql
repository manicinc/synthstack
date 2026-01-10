-- SynthStack Feature Flags System
-- Migration 017: Feature Flags for Premium vs Community Edition
--
-- This migration creates a comprehensive feature flag system to support:
-- - Community Edition (separate repo, free, open-source core)
-- - Premium Edition (all AI Cofounders, GitHub integration, proactive suggestions)
-- - Optional cheap subscription ($2-4/mo) with limited credits for basic AI features

-- ============================================
-- Upgrade old feature_flags schema if exists (from migration 002)
-- ============================================
-- Add new columns if missing (old schema from 002 had: enabled, subscription_tiers, user_ids)
DO $$
BEGIN
  -- Add is_enabled column (replaces 'enabled')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'feature_flags' AND column_name = 'is_enabled') THEN
    ALTER TABLE feature_flags ADD COLUMN is_enabled BOOLEAN DEFAULT true;
    -- Copy data from old 'enabled' column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'feature_flags' AND column_name = 'enabled') THEN
      UPDATE feature_flags SET is_enabled = enabled;
    END IF;
  END IF;

  -- Add is_premium column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'feature_flags' AND column_name = 'is_premium') THEN
    ALTER TABLE feature_flags ADD COLUMN is_premium BOOLEAN DEFAULT false;
  END IF;

  -- Add min_tier column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'feature_flags' AND column_name = 'min_tier') THEN
    ALTER TABLE feature_flags ADD COLUMN min_tier VARCHAR(50);
  END IF;

  -- Add category column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'feature_flags' AND column_name = 'category') THEN
    ALTER TABLE feature_flags ADD COLUMN category VARCHAR(50) DEFAULT 'general';
  END IF;

  -- Add date control columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'feature_flags' AND column_name = 'enabled_from') THEN
    ALTER TABLE feature_flags ADD COLUMN enabled_from TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'feature_flags' AND column_name = 'enabled_until') THEN
    ALTER TABLE feature_flags ADD COLUMN enabled_until TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add sort_order column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'feature_flags' AND column_name = 'sort_order') THEN
    ALTER TABLE feature_flags ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;

  -- Migrate subscription_tiers array to min_tier if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'feature_flags' AND column_name = 'subscription_tiers') THEN
    -- Map old tier names to new tier names and set min_tier
    UPDATE feature_flags SET
      min_tier = CASE
        WHEN 'unlimited' = ANY(subscription_tiers) OR 'pro' = ANY(subscription_tiers) THEN 'premium'
        WHEN 'maker' = ANY(subscription_tiers) THEN 'subscriber'
        WHEN 'free' = ANY(subscription_tiers) THEN 'community'
        ELSE 'community'
      END,
      is_premium = ('unlimited' = ANY(subscription_tiers) OR 'pro' = ANY(subscription_tiers))
    WHERE min_tier IS NULL;
  END IF;
END $$;

-- ============================================
-- Feature Flags Definition (if table doesn't exist)
-- ============================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  key VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'ai_cofounders', 'github_integration'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',  -- 'ai', 'integration', 'premium', 'experimental'

  -- Access control
  is_enabled BOOLEAN DEFAULT true,  -- Global kill switch
  is_premium BOOLEAN DEFAULT false,  -- Requires premium/lifetime
  min_tier VARCHAR(50),  -- 'community', 'subscriber', 'premium', 'lifetime'

  -- Rollout controls (for gradual feature releases)
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),

  -- Date controls
  enabled_from TIMESTAMP WITH TIME ZONE,
  enabled_until TIMESTAMP WITH TIME ZONE,

  -- Metadata
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- User Feature Overrides
-- For beta testers, special access, etc.
-- ============================================
CREATE TABLE IF NOT EXISTS user_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,

  -- Override settings
  is_enabled BOOLEAN NOT NULL,
  reason TEXT,  -- 'beta_tester', 'special_access', 'trial', etc.
  granted_by UUID REFERENCES app_users(id),

  -- Expiration (optional)
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, feature_key)
);

-- ============================================
-- Edition Configuration
-- Track which edition is running
-- ============================================
CREATE TABLE IF NOT EXISTS edition_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Edition type
  edition VARCHAR(50) NOT NULL DEFAULT 'community' CHECK (edition IN ('community', 'premium')),

  -- License info (for premium)
  license_key VARCHAR(255),
  license_email VARCHAR(255),
  license_type VARCHAR(50),  -- 'lifetime', 'subscription', 'enterprise'
  license_valid_until TIMESTAMP WITH TIME ZONE,

  -- Feature limits for community/subscriber
  max_docs_indexed INTEGER DEFAULT 10,  -- Docs they can upload for RAG
  max_credits_per_month INTEGER DEFAULT 50,  -- Basic AI credits

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Subscription Tiers (Updated for new model)
-- ============================================

-- Add new tier values to existing constraint if not present
-- Community: Free open-source (separate repo)
-- Subscriber: $2-4/mo with limited credits
-- Premium: $297 lifetime (all features)
-- Note: This extends the existing subscription_plans concept

-- ============================================
-- User Documents (for subscriber tier RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Document info
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_path VARCHAR(500) NOT NULL,

  -- RAG indexing
  is_indexed BOOLEAN DEFAULT false,
  vector_collection VARCHAR(100),  -- Qdrant collection
  chunk_count INTEGER DEFAULT 0,
  indexed_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'failed')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_premium ON feature_flags(is_premium) WHERE is_premium = true;
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_feature_overrides_user ON user_feature_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_overrides_feature ON user_feature_overrides(feature_key);
CREATE INDEX IF NOT EXISTS idx_user_feature_overrides_active ON user_feature_overrides(user_id, feature_key, expires_at)
  WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON user_documents(status);
CREATE INDEX IF NOT EXISTS idx_user_documents_indexed ON user_documents(user_id, is_indexed) WHERE is_indexed = true;

-- ============================================
-- Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_feature_flags_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_feature_flags_timestamp();

CREATE TRIGGER edition_config_updated_at
  BEFORE UPDATE ON edition_config
  FOR EACH ROW EXECUTE FUNCTION update_feature_flags_timestamp();

CREATE TRIGGER user_documents_updated_at
  BEFORE UPDATE ON user_documents
  FOR EACH ROW EXECUTE FUNCTION update_feature_flags_timestamp();

-- ============================================
-- Seed Data: Feature Flags
-- ============================================
INSERT INTO feature_flags (key, name, description, category, is_premium, min_tier, sort_order) VALUES
-- Premium AI Features (require lifetime purchase)
('ai_cofounders', 'AI Co-Founders', 'Access to all 6 AI agent team members (General, Researcher, Marketer, Developer, SEO Writer, Designer)', 'ai', true, 'premium', 1),
('ai_suggestions', 'Proactive AI Suggestions', 'AI-generated recommendations and content drafts from agents', 'ai', true, 'premium', 2),
('github_integration', 'GitHub Integration', 'Connect GitHub for code review, PR creation, and repository analysis', 'integration', true, 'premium', 3),
('shared_agent_context', 'Shared Agent Context', 'Cross-agent knowledge sharing and collaborative intelligence', 'ai', true, 'premium', 4),
('agent_chain_of_thought', 'Agent Reasoning Traces', 'View step-by-step reasoning from AI agents', 'ai', true, 'premium', 5),

-- Subscriber Features ($2-4/mo)
('basic_chat', 'Basic AI Chat', 'Simple chat interface with limited credits', 'ai', false, 'subscriber', 10),
('doc_upload', 'Document Upload', 'Upload your own documents for RAG indexing', 'ai', false, 'subscriber', 11),
('doc_chat', 'Chat with Documents', 'Ask questions about your uploaded documents', 'ai', false, 'subscriber', 12),

-- Community Features (free, always available)
('community_core', 'Core Platform', 'Base platform features without AI', 'general', false, 'community', 100),
('community_analytics', 'Basic Analytics', 'Usage statistics and basic insights', 'general', false, 'community', 101)

ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  min_tier = EXCLUDED.min_tier,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================
-- Seed Data: Default Edition Config
-- ============================================
INSERT INTO edition_config (edition, max_docs_indexed, max_credits_per_month)
VALUES ('community', 10, 50)
ON CONFLICT DO NOTHING;

-- ============================================
-- Update ai_agents to reference feature flags
-- ============================================
ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS feature_flag_key VARCHAR(100) REFERENCES feature_flags(key);

-- Link all agents to the ai_cofounders feature flag
UPDATE ai_agents SET feature_flag_key = 'ai_cofounders' WHERE feature_flag_key IS NULL;

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON feature_flags TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_feature_overrides TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON edition_config TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_documents TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE feature_flags IS 'System-wide feature flags for premium vs community edition control';
COMMENT ON TABLE user_feature_overrides IS 'Per-user feature overrides for beta testers and special access';
COMMENT ON TABLE edition_config IS 'Current edition configuration (community vs premium)';
COMMENT ON TABLE user_documents IS 'User-uploaded documents for subscriber-tier RAG indexing';
COMMENT ON COLUMN feature_flags.min_tier IS 'Minimum tier required: community (free), subscriber ($2-4/mo), premium (lifetime $297)';
COMMENT ON COLUMN feature_flags.is_premium IS 'If true, requires premium/lifetime purchase (not just subscription)';

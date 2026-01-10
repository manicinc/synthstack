-- SynthStack SERP Tracking System
-- Migration 059: Keyword ranking tracking with SerpAPI integration
--
-- This migration creates tables for:
-- - SERP ranking history (position tracking over time)
-- - Competitor tracking
-- - SERP feature detection (featured snippets, PAA, etc.)
-- - API usage tracking (quota management)

-- ============================================
-- SERP Ranking History
-- ============================================
CREATE TABLE IF NOT EXISTS serp_ranking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  keyword_id UUID NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Ranking data
  position INTEGER,  -- NULL if not in top 100
  url VARCHAR(2048),  -- URL that ranked
  title TEXT,  -- Page title from SERP
  snippet TEXT,  -- Snippet shown in SERP

  -- Search parameters
  search_engine VARCHAR(20) DEFAULT 'google',  -- google, bing
  location VARCHAR(100) DEFAULT 'United States',
  device VARCHAR(20) DEFAULT 'desktop',  -- desktop, mobile, tablet
  language VARCHAR(10) DEFAULT 'en',

  -- Metadata
  total_results BIGINT,
  search_time DECIMAL(5, 3),

  -- Timestamps
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Composite index for efficient queries
  UNIQUE(keyword_id, checked_at, search_engine, location, device)
);

-- ============================================
-- SERP Features Detected
-- ============================================
CREATE TABLE IF NOT EXISTS serp_features_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  ranking_id UUID NOT NULL REFERENCES serp_ranking_history(id) ON DELETE CASCADE,

  -- Feature data
  feature_type VARCHAR(50) NOT NULL,  -- featured_snippet, people_also_ask, knowledge_panel, local_pack, etc.
  position INTEGER,  -- Position in SERP (null if not positional)
  data JSONB,  -- Feature-specific data

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Competitor Domains
-- ============================================
CREATE TABLE IF NOT EXISTS serp_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Competitor info
  domain VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, domain)
);

-- ============================================
-- Competitor Rankings
-- ============================================
CREATE TABLE IF NOT EXISTS serp_competitor_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  ranking_id UUID NOT NULL REFERENCES serp_ranking_history(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES serp_competitors(id) ON DELETE CASCADE,

  -- Position data
  position INTEGER,
  url VARCHAR(2048),
  title TEXT,
  snippet TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SERP API Usage Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS serp_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Usage data
  api_provider VARCHAR(50) DEFAULT 'serpapi',  -- serpapi, serperdev, etc.
  endpoint VARCHAR(100),  -- search, locations, etc.
  keyword_id UUID REFERENCES seo_keywords(id) ON DELETE SET NULL,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,

  -- Request details
  search_query VARCHAR(500),
  parameters JSONB,

  -- Response
  status_code INTEGER,
  credits_used INTEGER DEFAULT 1,
  response_time_ms INTEGER,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Monthly Usage Summary
-- ============================================
CREATE TABLE IF NOT EXISTS serp_api_monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period
  year_month VARCHAR(7) NOT NULL,  -- Format: YYYY-MM
  api_provider VARCHAR(50) DEFAULT 'serpapi',

  -- Counts
  total_searches INTEGER DEFAULT 0,
  successful_searches INTEGER DEFAULT 0,
  failed_searches INTEGER DEFAULT 0,

  -- Quota
  monthly_limit INTEGER DEFAULT 250,
  remaining INTEGER DEFAULT 250,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(year_month, api_provider)
);

-- ============================================
-- Keyword Check Schedule
-- ============================================
ALTER TABLE seo_keywords
  ADD COLUMN IF NOT EXISTS check_frequency VARCHAR(20) DEFAULT 'monthly'
    CHECK (check_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'manual')),
  ADD COLUMN IF NOT EXISTS next_check_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_serp_check_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS serp_check_count INTEGER DEFAULT 0;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_serp_ranking_keyword ON serp_ranking_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_serp_ranking_user ON serp_ranking_history(user_id);
CREATE INDEX IF NOT EXISTS idx_serp_ranking_checked_at ON serp_ranking_history(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_serp_ranking_position ON serp_ranking_history(position) WHERE position IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_serp_ranking_lookup ON serp_ranking_history(keyword_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_serp_features_ranking ON serp_features_history(ranking_id);
CREATE INDEX IF NOT EXISTS idx_serp_features_type ON serp_features_history(feature_type);

CREATE INDEX IF NOT EXISTS idx_serp_competitors_user ON serp_competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_serp_competitors_domain ON serp_competitors(domain);

CREATE INDEX IF NOT EXISTS idx_serp_competitor_rankings_ranking ON serp_competitor_rankings(ranking_id);
CREATE INDEX IF NOT EXISTS idx_serp_competitor_rankings_competitor ON serp_competitor_rankings(competitor_id);

CREATE INDEX IF NOT EXISTS idx_serp_api_usage_created ON serp_api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_serp_api_usage_keyword ON serp_api_usage(keyword_id);
CREATE INDEX IF NOT EXISTS idx_serp_api_usage_user ON serp_api_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_serp_monthly_usage_month ON serp_api_monthly_usage(year_month);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_next_check ON seo_keywords(next_check_at) WHERE next_check_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seo_keywords_frequency ON seo_keywords(check_frequency);

-- ============================================
-- Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_serp_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER serp_competitors_updated_at
  BEFORE UPDATE ON serp_competitors
  FOR EACH ROW EXECUTE FUNCTION update_serp_timestamps();

CREATE TRIGGER serp_monthly_usage_updated_at
  BEFORE UPDATE ON serp_api_monthly_usage
  FOR EACH ROW EXECUTE FUNCTION update_serp_timestamps();

-- Trigger to update keyword position when new ranking is recorded
CREATE OR REPLACE FUNCTION update_keyword_from_ranking()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE seo_keywords SET
    current_position = NEW.position,
    position_updated_at = NEW.checked_at,
    best_position = CASE
      WHEN NEW.position IS NOT NULL AND (best_position IS NULL OR NEW.position < best_position)
      THEN NEW.position
      ELSE best_position
    END,
    last_serp_check_at = NEW.checked_at,
    serp_check_count = serp_check_count + 1
  WHERE id = NEW.keyword_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ranking_update_keyword
  AFTER INSERT ON serp_ranking_history
  FOR EACH ROW EXECUTE FUNCTION update_keyword_from_ranking();

-- ============================================
-- Initialize Monthly Usage for Current Month
-- ============================================
INSERT INTO serp_api_monthly_usage (year_month, api_provider, monthly_limit, remaining)
VALUES (TO_CHAR(NOW(), 'YYYY-MM'), 'serpapi', 250, 250)
ON CONFLICT (year_month, api_provider) DO NOTHING;

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON serp_ranking_history TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON serp_features_history TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON serp_competitors TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON serp_competitor_rankings TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON serp_api_usage TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON serp_api_monthly_usage TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE serp_ranking_history IS 'Historical SERP position tracking for keywords';
COMMENT ON TABLE serp_features_history IS 'SERP features detected during ranking checks (featured snippets, PAA, etc.)';
COMMENT ON TABLE serp_competitors IS 'Competitor domains to track in SERP results';
COMMENT ON TABLE serp_competitor_rankings IS 'Competitor positions found during ranking checks';
COMMENT ON TABLE serp_api_usage IS 'API call tracking for quota management';
COMMENT ON TABLE serp_api_monthly_usage IS 'Monthly API usage summary for quota enforcement';
COMMENT ON COLUMN seo_keywords.check_frequency IS 'How often to check SERP position: daily, weekly, biweekly, monthly, manual';

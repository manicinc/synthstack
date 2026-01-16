-- SEO Keywords Management
-- Migration 022: Create tables for managing target keywords and content optimization
--
-- This migration adds:
-- 1. seo_keywords - Central store for target keywords with metrics
-- 2. seo_keyword_content - Link keywords to content pieces
-- 3. Indexes and triggers for performance

-- ============================================
-- SEO Keywords Table
-- ============================================
CREATE TABLE IF NOT EXISTS seo_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Keyword data
  keyword VARCHAR(255) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('primary', 'secondary', 'long_tail', 'question')),
  search_intent VARCHAR(50) CHECK (search_intent IN ('informational', 'transactional', 'navigational', 'commercial')),

  -- Metrics (from AI research or manual entry)
  volume_estimate VARCHAR(50),  -- e.g., '1K-10K', '10K-100K', 'high', 'medium', 'low'
  competition VARCHAR(20) CHECK (competition IN ('high', 'medium', 'low')),
  difficulty_score INTEGER CHECK (difficulty_score >= 0 AND difficulty_score <= 100),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'researched' CHECK (status IN ('researched', 'targeting', 'optimizing', 'ranking', 'archived')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),

  -- Ranking tracking
  target_url VARCHAR(500),  -- Primary URL being optimized for this keyword
  current_position INTEGER,  -- Current search ranking position (if tracked)
  best_position INTEGER,  -- Best ranking achieved
  position_updated_at TIMESTAMP WITH TIME ZONE,

  -- Source and context
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('ai_research', 'manual', 'imported', 'competitor_analysis')),
  research_session_id UUID REFERENCES ai_agent_sessions(id) ON DELETE SET NULL,
  notes TEXT,

  -- Related keywords (stored as JSON array for flexibility)
  related_keywords JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique keywords per user
  UNIQUE(user_id, keyword)
);

-- ============================================
-- Keyword-Content Mapping Table
-- ============================================
CREATE TABLE IF NOT EXISTS seo_keyword_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,

  -- Content reference (polymorphic)
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('blog_post', 'doc_page', 'landing_page', 'changelog', 'faq')),
  content_id UUID NOT NULL,

  -- Optimization tracking
  is_primary BOOLEAN DEFAULT false,  -- Is this the primary keyword for this content?
  is_optimized BOOLEAN DEFAULT false,
  optimization_score INTEGER CHECK (optimization_score >= 0 AND optimization_score <= 100),

  -- Audit tracking
  last_audited_at TIMESTAMP WITH TIME ZONE,
  audit_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique keyword-content pairs
  UNIQUE(keyword_id, content_type, content_id)
);

-- ============================================
-- SEO Audit History Table
-- ============================================
CREATE TABLE IF NOT EXISTS seo_audit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- What was audited
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  keyword_id UUID REFERENCES seo_keywords(id) ON DELETE SET NULL,

  -- Audit results
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  title_score INTEGER,
  meta_score INTEGER,
  heading_score INTEGER,
  content_score INTEGER,
  link_score INTEGER,

  -- Detailed findings (stored as JSON)
  findings JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- AI session reference
  session_id UUID REFERENCES ai_agent_sessions(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_seo_keywords_user ON seo_keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_status ON seo_keywords(status);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_priority ON seo_keywords(priority);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_category ON seo_keywords(category);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_user_status ON seo_keywords(user_id, status);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_keyword ON seo_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_source ON seo_keywords(source);

CREATE INDEX IF NOT EXISTS idx_seo_keyword_content_keyword ON seo_keyword_content(keyword_id);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_content_content ON seo_keyword_content(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_content_optimized ON seo_keyword_content(is_optimized);

CREATE INDEX IF NOT EXISTS idx_seo_audit_history_user ON seo_audit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_audit_history_content ON seo_audit_history(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_seo_audit_history_keyword ON seo_audit_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_seo_audit_history_date ON seo_audit_history(created_at DESC);

-- ============================================
-- Updated At Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_seo_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seo_keywords_updated_at
  BEFORE UPDATE ON seo_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_keywords_updated_at();

CREATE TRIGGER seo_keyword_content_updated_at
  BEFORE UPDATE ON seo_keyword_content
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_keywords_updated_at();

-- ============================================
-- Grant Permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON seo_keywords TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON seo_keyword_content TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON seo_audit_history TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE seo_keywords IS 'Target keywords for SEO optimization with metrics and tracking';
COMMENT ON TABLE seo_keyword_content IS 'Maps keywords to content pieces for optimization tracking';
COMMENT ON TABLE seo_audit_history IS 'History of SEO audits performed on content';

COMMENT ON COLUMN seo_keywords.category IS 'Keyword type: primary (main focus), secondary (supporting), long_tail (specific phrases), question (FAQ-style)';
COMMENT ON COLUMN seo_keywords.search_intent IS 'User intent: informational (learn), transactional (buy), navigational (find site), commercial (compare)';
COMMENT ON COLUMN seo_keywords.volume_estimate IS 'Estimated monthly search volume range';
COMMENT ON COLUMN seo_keywords.status IS 'Workflow status: researched → targeting → optimizing → ranking';
COMMENT ON COLUMN seo_keywords.source IS 'How the keyword was added: ai_research (from SEO agent), manual, imported, competitor_analysis';

COMMENT ON COLUMN seo_keyword_content.is_primary IS 'Whether this is the primary/main keyword for the content piece';
COMMENT ON COLUMN seo_keyword_content.optimization_score IS 'SEO optimization score from 0-100 based on last audit';

COMMENT ON COLUMN seo_audit_history.findings IS 'JSON object with detailed audit findings per category';
COMMENT ON COLUMN seo_audit_history.recommendations IS 'JSON array of actionable recommendations from the audit';

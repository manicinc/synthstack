-- SynthStack Content Translations System
-- Migration 105: Multilingual CMS Content
--
-- This migration creates tables for managing translated content from Directus CMS collections.
-- Supports translating pages, posts, FAQ, features, and other content types.

-- ============================================
-- Content Translations Table
-- ============================================
CREATE TABLE IF NOT EXISTS content_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content reference
  collection VARCHAR(100) NOT NULL,  -- 'pages', 'posts', 'faq', 'features', 'testimonials', 'pricing_plans'
  item_id UUID NOT NULL,  -- ID of the item being translated
  locale_code VARCHAR(10) NOT NULL REFERENCES supported_locales(code) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,  -- 'title', 'description', 'content', 'body', etc.

  -- Translation content
  translated_value TEXT NOT NULL,
  original_value TEXT,  -- Original value for reference

  -- Metadata
  translator_notes TEXT,  -- Notes for translators
  max_length INTEGER,  -- Character limit hint
  is_html BOOLEAN DEFAULT false,  -- Whether content contains HTML

  -- Approval workflow
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one translation per item/locale/field combination
  UNIQUE(collection, item_id, locale_code, field_name)
);

-- ============================================
-- Translatable Collections Configuration
-- ============================================
CREATE TABLE IF NOT EXISTS translatable_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Collection info
  collection_name VARCHAR(100) UNIQUE NOT NULL,  -- Directus collection name
  display_name VARCHAR(100) NOT NULL,  -- Human-readable name
  description TEXT,

  -- Translatable fields
  translatable_fields JSONB NOT NULL DEFAULT '[]',  -- Array of field names to translate
  -- Example: ["title", "description", "content", "meta_title", "meta_description"]

  -- Configuration
  is_enabled BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,  -- Whether translations need approval
  auto_translate BOOLEAN DEFAULT false,  -- Whether to auto-translate with AI (future feature)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Translation Jobs (for bulk/AI translation)
-- ============================================
CREATE TABLE IF NOT EXISTS translation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Scope
  collection VARCHAR(100),  -- NULL = all collections
  source_locale VARCHAR(10) NOT NULL REFERENCES supported_locales(code),
  target_locales JSONB NOT NULL DEFAULT '[]',  -- Array of target locale codes

  -- Progress
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_log JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_content_translations_collection ON content_translations(collection);
CREATE INDEX IF NOT EXISTS idx_content_translations_item ON content_translations(item_id);
CREATE INDEX IF NOT EXISTS idx_content_translations_locale ON content_translations(locale_code);
CREATE INDEX IF NOT EXISTS idx_content_translations_status ON content_translations(status);
CREATE INDEX IF NOT EXISTS idx_content_translations_lookup ON content_translations(collection, item_id, locale_code);
CREATE INDEX IF NOT EXISTS idx_content_translations_approved ON content_translations(collection, item_id, locale_code, status)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_translatable_collections_enabled ON translatable_collections(is_enabled)
  WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_created_by ON translation_jobs(created_by);

-- ============================================
-- Triggers
-- ============================================
CREATE TRIGGER content_translations_updated_at
  BEFORE UPDATE ON content_translations
  FOR EACH ROW EXECUTE FUNCTION update_translations_timestamp();

CREATE TRIGGER translatable_collections_updated_at
  BEFORE UPDATE ON translatable_collections
  FOR EACH ROW EXECUTE FUNCTION update_translations_timestamp();

CREATE TRIGGER translation_jobs_updated_at
  BEFORE UPDATE ON translation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_translations_timestamp();

-- ============================================
-- Seed Data: Translatable Collections
-- ============================================
INSERT INTO translatable_collections (collection_name, display_name, description, translatable_fields, is_enabled, requires_approval) VALUES
('pages', 'Pages', 'Static pages like About, Contact, Terms', '["title", "description", "content", "meta_title", "meta_description"]'::jsonb, true, true),
('posts', 'Blog Posts', 'Blog articles and news', '["title", "excerpt", "content", "meta_title", "meta_description"]'::jsonb, true, true),
('faq', 'FAQ', 'Frequently asked questions', '["question", "answer"]'::jsonb, true, true),
('features', 'Features', 'Product features for landing page', '["title", "description", "details"]'::jsonb, true, true),
('testimonials', 'Testimonials', 'Customer testimonials and reviews', '["quote", "author_title"]'::jsonb, true, true),
('pricing_plans', 'Pricing Plans', 'Subscription pricing tiers', '["name", "description", "features"]'::jsonb, true, true)
ON CONFLICT (collection_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  translatable_fields = EXCLUDED.translatable_fields,
  updated_at = NOW();

-- ============================================
-- Add translation category for content
-- ============================================
INSERT INTO translation_categories (key, name, description, icon, sort_order) VALUES
('content', 'CMS Content', 'Translated content from Directus CMS', 'article', 11)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- Helper Function: Get translated content
-- ============================================
CREATE OR REPLACE FUNCTION get_translated_content(
  p_collection VARCHAR(100),
  p_item_id UUID,
  p_locale_code VARCHAR(10),
  p_fallback_locale VARCHAR(10) DEFAULT 'en-US'
)
RETURNS TABLE (
  field_name VARCHAR(100),
  value TEXT,
  is_translated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH target_translations AS (
    SELECT ct.field_name, ct.translated_value as value, true as is_translated
    FROM content_translations ct
    WHERE ct.collection = p_collection
      AND ct.item_id = p_item_id
      AND ct.locale_code = p_locale_code
      AND ct.status = 'approved'
  ),
  fallback_translations AS (
    SELECT ct.field_name, ct.translated_value as value, false as is_translated
    FROM content_translations ct
    WHERE ct.collection = p_collection
      AND ct.item_id = p_item_id
      AND ct.locale_code = p_fallback_locale
      AND ct.status = 'approved'
      AND ct.field_name NOT IN (SELECT tt.field_name FROM target_translations tt)
  )
  SELECT * FROM target_translations
  UNION ALL
  SELECT * FROM fallback_translations;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper Function: Get translation coverage
-- ============================================
CREATE OR REPLACE FUNCTION get_translation_coverage(
  p_collection VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
  collection VARCHAR(100),
  locale_code VARCHAR(10),
  total_items BIGINT,
  translated_items BIGINT,
  coverage_percent NUMERIC(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH collection_items AS (
    SELECT DISTINCT ct.collection, ct.item_id
    FROM content_translations ct
    WHERE (p_collection IS NULL OR ct.collection = p_collection)
  ),
  locale_coverage AS (
    SELECT
      ci.collection,
      sl.code as locale_code,
      COUNT(DISTINCT ci.item_id) as total_items,
      COUNT(DISTINCT CASE WHEN ct.status = 'approved' THEN ct.item_id END) as translated_items
    FROM collection_items ci
    CROSS JOIN supported_locales sl
    LEFT JOIN content_translations ct ON ci.collection = ct.collection
      AND ci.item_id = ct.item_id
      AND sl.code = ct.locale_code
    WHERE sl.is_enabled = true
    GROUP BY ci.collection, sl.code
  )
  SELECT
    lc.collection,
    lc.locale_code,
    lc.total_items,
    lc.translated_items,
    CASE WHEN lc.total_items > 0
      THEN ROUND((lc.translated_items::numeric / lc.total_items::numeric) * 100, 2)
      ELSE 0
    END as coverage_percent
  FROM locale_coverage lc
  ORDER BY lc.collection, lc.locale_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON content_translations TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON translatable_collections TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON translation_jobs TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE content_translations IS 'Translated content from Directus CMS collections';
COMMENT ON TABLE translatable_collections IS 'Configuration for which collections support translations';
COMMENT ON TABLE translation_jobs IS 'Bulk translation job tracking';
COMMENT ON COLUMN content_translations.status IS 'Approval workflow: draft -> pending_review -> approved/rejected';
COMMENT ON FUNCTION get_translated_content IS 'Get translated content for an item with fallback to default locale';
COMMENT ON FUNCTION get_translation_coverage IS 'Get translation coverage statistics by collection and locale';



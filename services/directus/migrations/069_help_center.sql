-- Migration: 069_help_center.sql
-- Description: Help center with collections and articles for client portal
-- Dependencies: None

-- =============================================================================
-- HELP COLLECTIONS (Categories)
-- =============================================================================

CREATE TABLE IF NOT EXISTS help_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Collection Details
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'help_outline',
  color VARCHAR(20),

  -- Cover image
  cover_image UUID REFERENCES directus_files(id),

  -- Parent for hierarchy
  parent_id UUID REFERENCES help_collections(id) ON DELETE SET NULL,

  -- Access control
  is_public BOOLEAN DEFAULT true, -- Public or portal-only
  requires_auth BOOLEAN DEFAULT false,

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,

  -- Sort
  sort INTEGER DEFAULT 0,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_help_collections_status ON help_collections(status);
CREATE INDEX IF NOT EXISTS idx_help_collections_slug ON help_collections(slug);
CREATE INDEX IF NOT EXISTS idx_help_collections_parent ON help_collections(parent_id);
CREATE INDEX IF NOT EXISTS idx_help_collections_public ON help_collections(is_public) WHERE is_public = TRUE;

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_help_collections_timestamp ON help_collections;
CREATE TRIGGER update_help_collections_timestamp
  BEFORE UPDATE ON help_collections
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- HELP ARTICLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Article Details
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  summary TEXT, -- Short description
  content TEXT, -- Full article content (Markdown/HTML)

  -- Category
  help_collection_id UUID REFERENCES help_collections(id) ON DELETE SET NULL,

  -- Author
  author_id UUID REFERENCES directus_users(id),

  -- Cover image
  cover_image UUID REFERENCES directus_files(id),

  -- Access control
  is_public BOOLEAN DEFAULT true,
  requires_auth BOOLEAN DEFAULT false,

  -- Reading time (auto-calculated or manual)
  reading_time_minutes INTEGER,

  -- Featured/sticky
  is_featured BOOLEAN DEFAULT false,

  -- Tags for search
  tags TEXT[],

  -- Related articles
  related_articles UUID[], -- Array of article IDs

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  canonical_url VARCHAR(500),

  -- Analytics
  view_count INTEGER DEFAULT 0,

  -- Sort
  sort INTEGER DEFAULT 0,

  -- Dates
  published_at TIMESTAMPTZ,
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id),

  -- Unique slug per collection
  UNIQUE(help_collection_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_help_articles_status ON help_articles(status);
CREATE INDEX IF NOT EXISTS idx_help_articles_collection ON help_articles(help_collection_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_author ON help_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_featured ON help_articles(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON help_articles(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_help_articles_search ON help_articles USING gin(to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || COALESCE(content, '')));
CREATE INDEX IF NOT EXISTS idx_help_articles_tags ON help_articles USING gin(tags) WHERE tags IS NOT NULL;

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_help_articles_timestamp ON help_articles;
CREATE TRIGGER update_help_articles_timestamp
  BEFORE UPDATE ON help_articles
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- HELP FEEDBACK
-- =============================================================================

CREATE TABLE IF NOT EXISTS help_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Article reference
  article_id UUID REFERENCES help_articles(id) ON DELETE SET NULL,

  -- Feedback for non-article pages
  page_url VARCHAR(500),
  page_title VARCHAR(255),

  -- Rating (1-5 or thumbs up/down)
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_helpful BOOLEAN, -- Simple thumbs up/down

  -- Comments
  comments TEXT,

  -- Contact info (optional)
  email VARCHAR(255),
  name VARCHAR(255),

  -- Visitor/user tracking
  visitor_id VARCHAR(255),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Context
  user_agent TEXT,
  referrer_url VARCHAR(500),

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_help_feedback_article ON help_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_help_feedback_rating ON help_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_help_feedback_helpful ON help_feedback(is_helpful);
CREATE INDEX IF NOT EXISTS idx_help_feedback_date ON help_feedback(date_created DESC);

-- =============================================================================
-- HELP SEARCH QUERIES (for analytics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS help_search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  query VARCHAR(500) NOT NULL,
  results_count INTEGER DEFAULT 0,

  -- Tracking
  visitor_id VARCHAR(255),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,

  -- Context
  source VARCHAR(50), -- 'portal', 'public', 'admin'

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_help_search_query ON help_search_queries(query);
CREATE INDEX IF NOT EXISTS idx_help_search_date ON help_search_queries(date_created DESC);
CREATE INDEX IF NOT EXISTS idx_help_search_results ON help_search_queries(results_count) WHERE results_count = 0;

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, archive_field, archive_value, unarchive_value, sort)
VALUES
  ('help_collections', 'collections_bookmark', 'Help center categories', '{{title}}', 'sort', 'status', 'archived', 'published', 90),
  ('help_articles', 'article', 'Help center articles', '{{title}}', 'sort', 'status', 'archived', 'published', 91),
  ('help_feedback', 'feedback', 'Article feedback and ratings', NULL, NULL, NULL, NULL, NULL, 92),
  ('help_search_queries', 'search', 'Help search analytics', '{{query}}', NULL, NULL, NULL, NULL, 93)
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Help Collections Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('help_collections', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('help_collections', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Draft", "value": "draft"}, {"text": "Published", "value": "published"}, {"text": "Archived", "value": "archived"}]}', 'labels', '{"choices": [{"text": "Draft", "value": "draft", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Published", "value": "published", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Archived", "value": "archived", "foreground": "#FFFFFF", "background": "#6B7280"}]}', FALSE, FALSE, 2, 'half', NULL, FALSE),
  ('help_collections', 'title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 3, 'half', NULL, TRUE),
  ('help_collections', 'slug', NULL, 'input', '{"slug": true}', NULL, NULL, FALSE, FALSE, 4, 'half', 'URL-friendly identifier', TRUE),
  ('help_collections', 'description', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 5, 'full', NULL, FALSE),
  ('help_collections', 'icon', NULL, 'select-icon', NULL, 'icon', NULL, FALSE, FALSE, 6, 'half', NULL, FALSE),
  ('help_collections', 'color', NULL, 'select-color', NULL, 'color', NULL, FALSE, FALSE, 7, 'half', NULL, FALSE),
  ('help_collections', 'cover_image', 'file', 'file-image', NULL, 'image', NULL, FALSE, FALSE, 8, 'full', NULL, FALSE),
  ('help_collections', 'parent_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{title}}"}', 'related-values', NULL, FALSE, FALSE, 9, 'half', 'Parent collection', FALSE),
  ('help_collections', 'is_public', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 10, 'half', 'Visible to public', FALSE),
  ('help_collections', 'requires_auth', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 11, 'half', 'Requires login', FALSE),
  ('help_collections', 'meta_title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 12, 'half', 'SEO title', FALSE),
  ('help_collections', 'meta_description', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 13, 'half', 'SEO description', FALSE),
  ('help_collections', 'sort', NULL, 'input', '{"min": 0}', NULL, NULL, FALSE, TRUE, 14, 'half', NULL, FALSE),
  ('help_collections', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 15, 'half', NULL, FALSE),
  ('help_collections', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 16, 'half', NULL, FALSE),
  ('help_collections', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 17, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Help Articles Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('help_articles', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('help_articles', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Draft", "value": "draft"}, {"text": "Published", "value": "published"}, {"text": "Archived", "value": "archived"}]}', 'labels', '{"choices": [{"text": "Draft", "value": "draft", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Published", "value": "published", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Archived", "value": "archived", "foreground": "#FFFFFF", "background": "#6B7280"}]}', FALSE, FALSE, 2, 'half', NULL, FALSE),
  ('help_articles', 'title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 3, 'half', NULL, TRUE),
  ('help_articles', 'slug', NULL, 'input', '{"slug": true}', NULL, NULL, FALSE, FALSE, 4, 'half', NULL, TRUE),
  ('help_articles', 'help_collection_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{title}}"}', 'related-values', NULL, FALSE, FALSE, 5, 'half', 'Category', FALSE),
  ('help_articles', 'author_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'user', NULL, FALSE, FALSE, 6, 'half', 'Author', FALSE),
  ('help_articles', 'summary', NULL, 'input', '{"placeholder": "Brief description..."}', NULL, NULL, FALSE, FALSE, 7, 'full', 'Short summary', FALSE),
  ('help_articles', 'content', NULL, 'input-rich-text-html', '{"toolbar": ["bold", "italic", "underline", "link", "code", "bullist", "numlist", "blockquote", "h2", "h3", "hr", "image", "media"]}', NULL, NULL, FALSE, FALSE, 8, 'full', 'Article content', FALSE),
  ('help_articles', 'cover_image', 'file', 'file-image', NULL, 'image', NULL, FALSE, FALSE, 9, 'full', NULL, FALSE),
  ('help_articles', 'tags', 'cast-json', 'tags', NULL, 'labels', NULL, FALSE, FALSE, 10, 'full', 'Tags for search', FALSE),
  ('help_articles', 'is_public', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 11, 'half', 'Visible to public', FALSE),
  ('help_articles', 'is_featured', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 12, 'half', 'Featured article', FALSE),
  ('help_articles', 'reading_time_minutes', NULL, 'input', '{"min": 1}', NULL, NULL, FALSE, FALSE, 13, 'half', 'Est. reading time', FALSE),
  ('help_articles', 'view_count', NULL, 'input', '{"min": 0}', NULL, NULL, TRUE, FALSE, 14, 'half', 'Page views', FALSE),
  ('help_articles', 'published_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', FALSE, FALSE, 15, 'half', NULL, FALSE),
  ('help_articles', 'meta_title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 16, 'half', 'SEO title', FALSE),
  ('help_articles', 'meta_description', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 17, 'half', 'SEO description', FALSE),
  ('help_articles', 'sort', NULL, 'input', '{"min": 0}', NULL, NULL, FALSE, TRUE, 18, 'half', NULL, FALSE),
  ('help_articles', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 19, 'half', NULL, FALSE),
  ('help_articles', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 20, 'half', NULL, FALSE),
  ('help_articles', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 21, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Help Feedback Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('help_feedback', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('help_feedback', 'article_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{title}}"}', 'related-values', NULL, FALSE, FALSE, 2, 'half', NULL, FALSE),
  ('help_feedback', 'page_url', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 3, 'half', 'For non-article pages', FALSE),
  ('help_feedback', 'rating', NULL, 'slider', '{"min": 1, "max": 5, "step": 1}', NULL, NULL, FALSE, FALSE, 4, 'half', '1-5 rating', FALSE),
  ('help_feedback', 'is_helpful', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 5, 'half', 'Thumbs up/down', FALSE),
  ('help_feedback', 'comments', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 6, 'full', NULL, FALSE),
  ('help_feedback', 'email', NULL, 'input', '{"iconRight": "email"}', NULL, NULL, FALSE, FALSE, 7, 'half', NULL, FALSE),
  ('help_feedback', 'name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 8, 'half', NULL, FALSE),
  ('help_feedback', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 9, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Help Collections -> Parent
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('help_collections', 'parent_id', 'help_collections', 'children', 'nullify')
ON CONFLICT DO NOTHING;

-- Help Collections -> Cover Image
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('help_collections', 'cover_image', 'directus_files', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Help Articles -> Collection
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('help_articles', 'help_collection_id', 'help_collections', 'articles', 'nullify')
ON CONFLICT DO NOTHING;

-- Help Articles -> Author
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('help_articles', 'author_id', 'directus_users', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Help Articles -> Cover Image
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('help_articles', 'cover_image', 'directus_files', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Help Feedback -> Article
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('help_feedback', 'article_id', 'help_articles', 'feedback', 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- AUTO-PUBLISH TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION set_article_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') AND NEW.published_at IS NULL THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_article_published_at ON help_articles;
CREATE TRIGGER trigger_article_published_at
  BEFORE UPDATE ON help_articles
  FOR EACH ROW
  EXECUTE FUNCTION set_article_published_at();

-- =============================================================================
-- FEATURE FLAGS
-- =============================================================================

INSERT INTO feature_flags (key, name, description, category, is_enabled, is_premium, min_tier, sort_order)
VALUES
  ('help_center', 'Help Center', 'Public help documentation', 'help', true, false, 'community', 600),
  ('help_feedback', 'Help Feedback', 'Allow feedback on help articles', 'help', true, false, 'subscriber', 601),
  ('help_analytics', 'Help Analytics', 'Track search queries and article views', 'help', true, false, 'subscriber', 602)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- =============================================================================
-- SEED SAMPLE DATA
-- =============================================================================

-- Sample collections
INSERT INTO help_collections (id, title, slug, description, icon, status, is_public)
VALUES
  ('c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'Getting Started', 'getting-started', 'Learn the basics of using the platform', 'rocket_launch', 'published', true),
  ('c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f', 'Client Portal', 'client-portal', 'How to use the client portal', 'account_circle', 'published', true),
  ('c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f', 'Billing & Invoices', 'billing', 'Understanding billing and invoices', 'payments', 'published', true),
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'FAQs', 'faqs', 'Frequently asked questions', 'help_outline', 'published', true)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- Sample articles
INSERT INTO help_articles (id, help_collection_id, title, slug, summary, content, status, is_public, is_featured, published_at)
VALUES
  ('a0b1c2d3-e4f5-4a6b-7c8d-9e0f1a2b3c4d', 'c0d1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f', 'Welcome to the Platform', 'welcome', 'A quick introduction to get you started', '# Welcome!\n\nThis guide will help you get started with our platform.\n\n## First Steps\n\n1. Log into your account\n2. Explore the dashboard\n3. Check your projects\n\n## Need Help?\n\nContact our support team if you have questions.', 'published', true, true, NOW()),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e', 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f', 'Navigating the Portal', 'navigating-portal', 'Learn how to navigate the client portal', '# Navigating the Client Portal\n\nThe client portal gives you access to your projects, invoices, and communication with our team.\n\n## Main Sections\n\n- **Dashboard**: Overview of your projects\n- **Projects**: Detailed project views\n- **Billing**: Invoices and payments\n- **Help**: This help center', 'published', true, false, NOW()),
  ('a2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6f', 'c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f', 'Understanding Your Invoice', 'understanding-invoices', 'How to read and pay your invoices', '# Understanding Your Invoice\n\nThis guide explains the different parts of your invoice and how to pay.\n\n## Invoice Sections\n\n- **Header**: Invoice number, date, due date\n- **Line Items**: Services provided\n- **Totals**: Subtotal, tax, total\n\n## Payment Methods\n\nYou can pay via credit card directly in the portal.', 'published', true, false, NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE help_collections IS 'Categories for organizing help articles';
COMMENT ON TABLE help_articles IS 'Help center articles with rich content';
COMMENT ON TABLE help_feedback IS 'User feedback and ratings for help content';
COMMENT ON TABLE help_search_queries IS 'Analytics for help center search queries';

-- SynthStack Documentation Management Migration
-- Manages documentation pages, categories, and syncing with markdown files

-- Documentation Categories (Platform, Guides, Tutorials, API Reference, etc.)
CREATE TABLE IF NOT EXISTS doc_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  parent_id UUID REFERENCES doc_categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_doc_categories_slug ON doc_categories(slug);
CREATE INDEX IF NOT EXISTS idx_doc_categories_parent ON doc_categories(parent_id);

-- Documentation Pages
CREATE TABLE IF NOT EXISTS doc_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'draft',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,

  -- Content
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  summary TEXT,
  body TEXT NOT NULL,

  -- Organization
  category_id UUID REFERENCES doc_categories(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES doc_pages(id) ON DELETE SET NULL,

  -- Source tracking (for sync with markdown files)
  source_type VARCHAR(20) DEFAULT 'cms', -- 'cms', 'markdown', 'api'
  source_file VARCHAR(255), -- e.g., 'ADMIN_CMS.md' if synced from /docs/
  source_hash VARCHAR(64), -- MD5 hash to detect changes
  last_synced_at TIMESTAMP WITH TIME ZONE,

  -- Versioning
  version INT DEFAULT 1,

  -- Publishing
  published_at TIMESTAMP WITH TIME ZONE,
  featured BOOLEAN DEFAULT FALSE,

  -- SEO
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[],
  og_image UUID REFERENCES directus_files(id),

  -- RAG Integration
  rag_indexed BOOLEAN DEFAULT FALSE,
  rag_indexed_at TIMESTAMP WITH TIME ZONE,
  rag_chunk_count INT DEFAULT 0,

  -- Analytics
  views INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_doc_pages_slug ON doc_pages(slug);
CREATE INDEX IF NOT EXISTS idx_doc_pages_status ON doc_pages(status);
CREATE INDEX IF NOT EXISTS idx_doc_pages_category ON doc_pages(category_id);
CREATE INDEX IF NOT EXISTS idx_doc_pages_parent ON doc_pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_doc_pages_source ON doc_pages(source_type, source_file);
CREATE INDEX IF NOT EXISTS idx_doc_pages_published ON doc_pages(published_at);

-- Documentation Versions (for tracking changes)
CREATE TABLE IF NOT EXISTS doc_page_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_page_id UUID NOT NULL REFERENCES doc_pages(id) ON DELETE CASCADE,
  version INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES directus_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_doc_page_versions_page ON doc_page_versions(doc_page_id);
CREATE INDEX IF NOT EXISTS idx_doc_page_versions_version ON doc_page_versions(doc_page_id, version);

-- Documentation Tags (for cross-categorization)
CREATE TABLE IF NOT EXISTS doc_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7)
);
CREATE INDEX IF NOT EXISTS idx_doc_tags_slug ON doc_tags(slug);

-- Documentation Page Tags (many-to-many)
CREATE TABLE IF NOT EXISTS doc_pages_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_page_id UUID NOT NULL REFERENCES doc_pages(id) ON DELETE CASCADE,
  doc_tag_id UUID NOT NULL REFERENCES doc_tags(id) ON DELETE CASCADE,
  UNIQUE(doc_page_id, doc_tag_id)
);
CREATE INDEX IF NOT EXISTS idx_doc_pages_tags_page ON doc_pages_tags(doc_page_id);
CREATE INDEX IF NOT EXISTS idx_doc_pages_tags_tag ON doc_pages_tags(doc_tag_id);

-- Documentation Feedback
CREATE TABLE IF NOT EXISTS doc_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'new',
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  date_updated TIMESTAMP WITH TIME ZONE,
  doc_page_id UUID NOT NULL REFERENCES doc_pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  helpful BOOLEAN,
  feedback_type VARCHAR(50), -- 'helpful', 'confusing', 'outdated', 'incomplete', 'other'
  comment TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES directus_users(id)
);
CREATE INDEX IF NOT EXISTS idx_doc_feedback_page ON doc_feedback(doc_page_id);
CREATE INDEX IF NOT EXISTS idx_doc_feedback_status ON doc_feedback(status);

-- Seed default categories
INSERT INTO doc_categories (name, slug, description, icon, sort) VALUES
  ('Getting Started', 'getting-started', 'Quick start guides and installation instructions', 'rocket_launch', 1),
  ('Platform', 'platform', 'Core platform documentation and architecture', 'hub', 2),
  ('API Reference', 'api-reference', 'REST API documentation and endpoints', 'api', 3),
  ('Tutorials', 'tutorials', 'Step-by-step guides and how-tos', 'school', 4),
  ('Design', 'design', 'Design system, components, and styling guides', 'palette', 5),
  ('Deployment', 'deployment', 'Deployment guides and infrastructure', 'cloud_upload', 6),
  ('Contributing', 'contributing', 'How to contribute to the project', 'handshake', 7)
ON CONFLICT (slug) DO NOTHING;

-- Seed default tags
INSERT INTO doc_tags (name, slug, color) VALUES
  ('Beginner', 'beginner', '#10B981'),
  ('Advanced', 'advanced', '#EF4444'),
  ('API', 'api', '#6366F1'),
  ('Configuration', 'configuration', '#F59E0B'),
  ('Security', 'security', '#DC2626'),
  ('Performance', 'performance', '#8B5CF6'),
  ('Database', 'database', '#3B82F6'),
  ('Frontend', 'frontend', '#EC4899'),
  ('Backend', 'backend', '#14B8A6')
ON CONFLICT (slug) DO NOTHING;

-- Add 'tutorial' category to blog_categories if not exists
INSERT INTO blog_categories (name, slug, description, color)
VALUES ('Tutorial', 'tutorial', 'Step-by-step guides and tutorials', '#10B981')
ON CONFLICT (slug) DO NOTHING;

-- Function to auto-update version on doc_pages change
CREATE OR REPLACE FUNCTION update_doc_page_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if body changed
  IF OLD.body IS DISTINCT FROM NEW.body THEN
    -- Insert version record
    INSERT INTO doc_page_versions (doc_page_id, version, title, body, created_by)
    VALUES (NEW.id, OLD.version, OLD.title, OLD.body, NEW.user_updated);

    -- Increment version
    NEW.version = OLD.version + 1;

    -- Mark as needing re-indexing
    NEW.rag_indexed = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for version tracking
DROP TRIGGER IF EXISTS doc_pages_version_trigger ON doc_pages;
CREATE TRIGGER doc_pages_version_trigger
  BEFORE UPDATE ON doc_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_doc_page_version();

-- View for documentation with category info
CREATE OR REPLACE VIEW doc_pages_with_category AS
SELECT
  dp.*,
  dc.name as category_name,
  dc.slug as category_slug,
  dc.icon as category_icon,
  dc.color as category_color
FROM doc_pages dp
LEFT JOIN doc_categories dc ON dp.category_id = dc.id
WHERE dp.status = 'published';

-- View for documentation navigation (hierarchical)
CREATE OR REPLACE VIEW doc_navigation AS
SELECT
  dp.id,
  dp.title,
  dp.slug,
  dp.summary,
  dp.category_id,
  dc.name as category_name,
  dc.slug as category_slug,
  dc.icon as category_icon,
  dp.parent_id,
  pp.title as parent_title,
  pp.slug as parent_slug,
  dp.sort,
  dp.source_type,
  dp.published_at
FROM doc_pages dp
LEFT JOIN doc_categories dc ON dp.category_id = dc.id
LEFT JOIN doc_pages pp ON dp.parent_id = pp.id
WHERE dp.status = 'published'
ORDER BY dc.sort, dp.sort, dp.title;

COMMENT ON TABLE doc_pages IS 'Documentation pages managed in Directus CMS';
COMMENT ON TABLE doc_categories IS 'Categories for organizing documentation';
COMMENT ON TABLE doc_page_versions IS 'Version history for documentation pages';
COMMENT ON TABLE doc_tags IS 'Tags for cross-referencing documentation';
COMMENT ON TABLE doc_feedback IS 'User feedback on documentation quality';

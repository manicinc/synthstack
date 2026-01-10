-- ============================================
-- Migration 076: AgencyOS Help Center
-- ============================================
-- Creates help center collections, articles, feedback, and form inbox
-- ============================================

-- Help Collections Table (Help Categories)
CREATE TABLE IF NOT EXISTS help_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort INTEGER DEFAULT 0,

  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100)
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, display_template)
VALUES ('help_collections', 'folder_open', 'Help center categories', '#8B5CF6', 'sort', '{{title}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('help_collections', 'id', 'uuid', 'input', NULL, NULL, NULL),
('help_collections', 'sort', NULL, 'input', NULL, NULL, NULL),
('help_collections', 'slug', NULL, 'input', '{"placeholder":"getting-started","slug":true}'::jsonb, NULL, 'URL-friendly identifier'),
('help_collections', 'title', NULL, 'input', '{"placeholder":"Category name"}'::jsonb, NULL, NULL),
('help_collections', 'description', NULL, 'input-multiline', NULL, NULL, 'Category description'),
('help_collections', 'icon', NULL, 'select-icon', NULL, NULL, 'Category icon'),
('help_collections', 'articles', 'o2m', 'list-o2m', '{"template":"{{title}}"}'::jsonb, NULL, 'Articles in category')
ON CONFLICT DO NOTHING;

-- Help Articles Table (Knowledge Base Articles)
CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  help_collection UUID REFERENCES help_collections(id) ON DELETE CASCADE,
  owner UUID REFERENCES directus_users(id),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  content TEXT
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, archive_field, archive_value, unarchive_value, display_template)
VALUES ('help_articles', 'article', 'Knowledge base articles', '#3B82F6', 'sort', 'status', 'archived', 'draft', '{{title}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('help_articles', 'id', 'uuid', 'input', NULL, NULL, NULL),
('help_articles', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Published","value":"published"},{"text":"Archived","value":"archived"}]}'::jsonb, 'badge', NULL),
('help_articles', 'sort', NULL, 'input', NULL, NULL, NULL),
('help_articles', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('help_articles', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('help_articles', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('help_articles', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('help_articles', 'help_collection', 'm2o', 'select-dropdown-m2o', '{"template":"{{title}}"}'::jsonb, NULL, 'Parent category'),
('help_articles', 'owner', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Article author'),
('help_articles', 'slug', NULL, 'input', '{"placeholder":"article-slug","slug":true}'::jsonb, NULL, 'URL-friendly identifier'),
('help_articles', 'title', NULL, 'input', '{"placeholder":"Article title"}'::jsonb, NULL, NULL),
('help_articles', 'summary', NULL, 'input-multiline', NULL, NULL, 'Short description'),
('help_articles', 'content', NULL, 'input-rich-text-md', NULL, NULL, 'Article content')
ON CONFLICT DO NOTHING;

-- Help Feedback Table (Article Ratings & Feedback)
CREATE TABLE IF NOT EXISTS help_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  title VARCHAR(255),
  url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  visitor_id VARCHAR(255) -- Anonymous visitor tracking
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, display_template)
VALUES ('help_feedback', 'feedback', 'Article feedback and ratings', '#F59E0B', '{{rating}} stars - {{title}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('help_feedback', 'id', 'uuid', 'input', NULL, NULL, NULL),
('help_feedback', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('help_feedback', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('help_feedback', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('help_feedback', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('help_feedback', 'title', NULL, 'input', '{"placeholder":"Article title"}'::jsonb, NULL, NULL),
('help_feedback', 'url', NULL, 'input', '{"placeholder":"https://..."}'::jsonb, NULL, 'Article URL'),
('help_feedback', 'rating', NULL, 'select-dropdown', '{"choices":[{"text":"⭐","value":"1"},{"text":"⭐⭐","value":"2"},{"text":"⭐⭐⭐","value":"3"},{"text":"⭐⭐⭐⭐","value":"4"},{"text":"⭐⭐⭐⭐⭐","value":"5"}]}'::jsonb, NULL, 'Star rating'),
('help_feedback', 'comments', NULL, 'input-multiline', NULL, NULL, 'User feedback'),
('help_feedback', 'visitor_id', NULL, 'input', '{"placeholder":"Anonymous visitor ID"}'::jsonb, NULL, 'Visitor identifier')
ON CONFLICT DO NOTHING;

-- Inbox Table (Form Submissions)
CREATE TABLE IF NOT EXISTS inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'spam')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  form VARCHAR(255), -- Form identifier (contact, quote, support, etc.)
  data JSONB -- Form submission data
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, archive_field, archive_value, unarchive_value, display_template)
VALUES ('inbox', 'inbox', 'Form submissions inbox', '#10B981', 'sort', 'status', 'archived', 'unread', '{{form}} - {{date_created}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('inbox', 'id', 'uuid', 'input', NULL, NULL, NULL),
('inbox', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Unread","value":"unread"},{"text":"Read","value":"read"},{"text":"Archived","value":"archived"},{"text":"Spam","value":"spam"}]}'::jsonb, 'badge', NULL),
('inbox', 'sort', NULL, 'input', NULL, NULL, NULL),
('inbox', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('inbox', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('inbox', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('inbox', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('inbox', 'form', NULL, 'select-dropdown', '{"allowOther":true,"choices":[{"text":"Contact","value":"contact"},{"text":"Quote Request","value":"quote"},{"text":"Support","value":"support"},{"text":"Feedback","value":"feedback"}]}'::jsonb, NULL, 'Form type'),
('inbox', 'data', 'cast-json', 'input-code', '{"language":"json"}'::jsonb, NULL, 'Form submission data')
ON CONFLICT DO NOTHING;

-- Add relations
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES
('help_articles', 'help_collection', 'help_collections', 'articles')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_help_articles_help_collection ON help_articles(help_collection);
CREATE INDEX IF NOT EXISTS idx_help_articles_status ON help_articles(status);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_collections_slug ON help_collections(slug);
CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox(status);
CREATE INDEX IF NOT EXISTS idx_inbox_form ON inbox(form);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 076: AgencyOS Help Center completed successfully';
  RAISE NOTICE '   Created: help_collections, help_articles, help_feedback, inbox';
END $$;

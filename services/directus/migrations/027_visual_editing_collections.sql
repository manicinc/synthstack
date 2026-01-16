-- Visual Editing Collections
-- Migration 027: Create posts, pages, guides, and docs collections for visual editing

-- ============================================
-- Posts Collection (Blog Posts)
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'draft',
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  summary TEXT,
  body TEXT NOT NULL,
  author VARCHAR(255),
  published_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts collection metadata
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, archive_field, archive_value, unarchive_value)
VALUES ('posts', 'article', 'Blog posts and articles', '{{title}}', false, false, 'status', 'archived', 'published')
ON CONFLICT (collection) DO UPDATE SET
  icon = 'article',
  note = 'Blog posts and articles',
  display_template = '{{title}}';

-- Posts fields metadata
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  v.collection,
  v.field,
  v.special,
  v.interface,
  v.options::json,
  v.display,
  v.display_options::json,
  v.readonly,
  v.hidden,
  v.sort,
  v.width,
  v.translations::json,
  v.note,
  v.conditions::json,
  v.required,
  v."group",
  v.validation::json,
  v.validation_message
FROM (
  VALUES
  ('posts', 'id', NULL, 'input', NULL, NULL, NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('posts', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Published","value":"published"},{"text":"Archived","value":"archived"}]}', NULL, NULL, false, false, 2, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('posts', 'title', NULL, 'input', NULL, NULL, NULL, false, false, 3, 'full', NULL, NULL, NULL, true, NULL, NULL, NULL),
  ('posts', 'slug', NULL, 'input', NULL, NULL, NULL, false, false, 4, 'half', NULL, 'URL-friendly version of title', NULL, true, NULL, NULL, NULL),
  ('posts', 'summary', NULL, 'input-multiline', NULL, NULL, NULL, false, false, 5, 'full', NULL, 'Short description for previews', NULL, false, NULL, NULL, NULL),
  ('posts', 'body', NULL, 'input-rich-text-html', NULL, NULL, NULL, false, false, 6, 'full', NULL, NULL, NULL, true, NULL, NULL, NULL),
  ('posts', 'author', NULL, 'input', NULL, NULL, NULL, false, false, 7, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('posts', 'published_date', NULL, 'datetime', NULL, NULL, NULL, false, false, 8, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('posts', 'created_at', '["date-created"]', 'datetime', NULL, NULL, NULL, true, true, 9, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('posts', 'updated_at', '["date-updated"]', 'datetime', NULL, NULL, NULL, true, true, 10, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- ============================================
-- Pages Collection (Marketing Pages)
-- ============================================
CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'draft',
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  content TEXT NOT NULL,
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pages collection metadata
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, archive_field, archive_value, unarchive_value)
VALUES ('pages', 'pages', 'Marketing and landing pages', '{{title}}', false, false, 'status', 'archived', 'published')
ON CONFLICT (collection) DO UPDATE SET
  icon = 'pages',
  note = 'Marketing and landing pages',
  display_template = '{{title}}';

-- Pages fields metadata
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  v.collection,
  v.field,
  v.special,
  v.interface,
  v.options::json,
  v.display,
  v.display_options::json,
  v.readonly,
  v.hidden,
  v.sort,
  v.width,
  v.translations::json,
  v.note,
  v.conditions::json,
  v.required,
  v."group",
  v.validation::json,
  v.validation_message
FROM (
  VALUES
  ('pages', 'id', NULL, 'input', NULL, NULL, NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('pages', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Published","value":"published"},{"text":"Archived","value":"archived"}]}', NULL, NULL, false, false, 2, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('pages', 'title', NULL, 'input', NULL, NULL, NULL, false, false, 3, 'full', NULL, NULL, NULL, true, NULL, NULL, NULL),
  ('pages', 'slug', NULL, 'input', NULL, NULL, NULL, false, false, 4, 'half', NULL, 'URL path', NULL, true, NULL, NULL, NULL),
  ('pages', 'description', NULL, 'input-multiline', NULL, NULL, NULL, false, false, 5, 'full', NULL, 'Page description', NULL, false, NULL, NULL, NULL),
  ('pages', 'content', NULL, 'input-rich-text-html', NULL, NULL, NULL, false, false, 6, 'full', NULL, NULL, NULL, true, NULL, NULL, NULL),
  ('pages', 'meta_title', NULL, 'input', NULL, NULL, NULL, false, false, 7, 'half', NULL, 'SEO title', NULL, false, NULL, NULL, NULL),
  ('pages', 'meta_description', NULL, 'input-multiline', NULL, NULL, NULL, false, false, 8, 'full', NULL, 'SEO description', NULL, false, NULL, NULL, NULL),
  ('pages', 'created_at', '["date-created"]', 'datetime', NULL, NULL, NULL, true, true, 9, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('pages', 'updated_at', '["date-updated"]', 'datetime', NULL, NULL, NULL, true, true, 10, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- ============================================
-- Guides Collection (Tutorial Content)
-- ============================================
CREATE TABLE IF NOT EXISTS guides (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'draft',
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100),
  difficulty VARCHAR(50),
  summary TEXT,
  content TEXT NOT NULL,
  author VARCHAR(255),
  published_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guides collection metadata
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, archive_field, archive_value, unarchive_value)
VALUES ('guides', 'school', 'Tutorial and guide content', '{{title}}', false, false, 'status', 'archived', 'published')
ON CONFLICT (collection) DO UPDATE SET
  icon = 'school',
  note = 'Tutorial and guide content',
  display_template = '{{title}}';

-- Guides fields metadata
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  v.collection,
  v.field,
  v.special,
  v.interface,
  v.options::json,
  v.display,
  v.display_options::json,
  v.readonly,
  v.hidden,
  v.sort,
  v.width,
  v.translations::json,
  v.note,
  v.conditions::json,
  v.required,
  v."group",
  v.validation::json,
  v.validation_message
FROM (
  VALUES
  ('guides', 'id', NULL, 'input', NULL, NULL, NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('guides', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Published","value":"published"},{"text":"Archived","value":"archived"}]}', NULL, NULL, false, false, 2, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('guides', 'title', NULL, 'input', NULL, NULL, NULL, false, false, 3, 'full', NULL, NULL, NULL, true, NULL, NULL, NULL),
  ('guides', 'slug', NULL, 'input', NULL, NULL, NULL, false, false, 4, 'half', NULL, 'URL-friendly slug', NULL, true, NULL, NULL, NULL),
  ('guides', 'category', NULL, 'input', NULL, NULL, NULL, false, false, 5, 'half', NULL, 'Guide category', NULL, false, NULL, NULL, NULL),
  ('guides', 'difficulty', NULL, 'select-dropdown', '{"choices":[{"text":"Beginner","value":"beginner"},{"text":"Intermediate","value":"intermediate"},{"text":"Advanced","value":"advanced"}]}', NULL, NULL, false, false, 6, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('guides', 'summary', NULL, 'input-multiline', NULL, NULL, NULL, false, false, 7, 'full', NULL, 'Guide summary', NULL, false, NULL, NULL, NULL),
  ('guides', 'content', NULL, 'input-rich-text-html', NULL, NULL, NULL, false, false, 8, 'full', NULL, NULL, NULL, true, NULL, NULL, NULL),
  ('guides', 'author', NULL, 'input', NULL, NULL, NULL, false, false, 9, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('guides', 'published_date', NULL, 'datetime', NULL, NULL, NULL, false, false, 10, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('guides', 'created_at', '["date-created"]', 'datetime', NULL, NULL, NULL, true, true, 11, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('guides', 'updated_at', '["date-updated"]', 'datetime', NULL, NULL, NULL, true, true, 12, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- ============================================
-- Docs Collection (Documentation)
-- ============================================
CREATE TABLE IF NOT EXISTS docs (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'draft',
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100),
  order_index INTEGER DEFAULT 0,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Docs collection metadata
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, archive_field, archive_value, unarchive_value)
VALUES ('docs', 'description', 'Technical documentation', '{{title}}', false, false, 'status', 'archived', 'published')
ON CONFLICT (collection) DO UPDATE SET
  icon = 'description',
  note = 'Technical documentation',
  display_template = '{{title}}';

-- Docs fields metadata
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
SELECT
  v.collection,
  v.field,
  v.special,
  v.interface,
  v.options::json,
  v.display,
  v.display_options::json,
  v.readonly,
  v.hidden,
  v.sort,
  v.width,
  v.translations::json,
  v.note,
  v.conditions::json,
  v.required,
  v."group",
  v.validation::json,
  v.validation_message
FROM (
  VALUES
  ('docs', 'id', NULL, 'input', NULL, NULL, NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('docs', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Published","value":"published"},{"text":"Archived","value":"archived"}]}', NULL, NULL, false, false, 2, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('docs', 'title', NULL, 'input', NULL, NULL, NULL, false, false, 3, 'full', NULL, NULL, NULL, true, NULL, NULL, NULL),
  ('docs', 'slug', NULL, 'input', NULL, NULL, NULL, false, false, 4, 'half', NULL, 'URL slug', NULL, true, NULL, NULL, NULL),
  ('docs', 'category', NULL, 'input', NULL, NULL, NULL, false, false, 5, 'half', NULL, 'Documentation category', NULL, false, NULL, NULL, NULL),
  ('docs', 'order_index', NULL, 'input', NULL, NULL, NULL, false, false, 6, 'half', NULL, 'Sort order', NULL, false, NULL, NULL, NULL),
  ('docs', 'content', NULL, 'input-rich-text-html', NULL, NULL, NULL, false, false, 7, 'full', NULL, NULL, NULL, true, NULL, NULL, NULL),
  ('docs', 'created_at', '["date-created"]', 'datetime', NULL, NULL, NULL, true, true, 8, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('docs', 'updated_at', '["date-updated"]', 'datetime', NULL, NULL, NULL, true, true, 9, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE posts IS 'Blog posts and articles for visual editing';
COMMENT ON TABLE pages IS 'Marketing and landing pages for visual editing';
COMMENT ON TABLE guides IS 'Tutorial and guide content for visual editing';
COMMENT ON TABLE docs IS 'Technical documentation for visual editing';

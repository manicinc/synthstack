-- Visual Editing Setup
-- Migration 028: Configure preview URLs for visual editing

-- Update blog_posts collection with preview URL
UPDATE directus_collections
SET preview_url = 'http://localhost:3050/blog/{slug}?visual-editing=true'
WHERE collection = 'blog_posts';

-- Add note about visual editing
COMMENT ON TABLE blog_posts IS 'Blog posts with visual editing enabled via preview URL';

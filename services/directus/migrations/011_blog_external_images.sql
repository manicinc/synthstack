-- Add external image URL support to blog posts
-- Allows using Unsplash/external URLs alongside Directus file uploads

-- Add external image URL column
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS hero_image_url VARCHAR(500);

COMMENT ON COLUMN blog_posts.hero_image_url IS 'External URL for hero image (e.g., Unsplash). Used if hero_image (file reference) is null.';

-- Add external OG image URL column
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS og_image_url VARCHAR(500);

COMMENT ON COLUMN blog_posts.og_image_url IS 'External URL for Open Graph image. Used if og_image (file reference) is null.';

-- Create a view that resolves the image URL (prefers uploaded file, falls back to URL)
CREATE OR REPLACE VIEW blog_posts_with_images AS
SELECT
  bp.*,
  COALESCE(
    CONCAT('/assets/', df.filename_disk),
    bp.hero_image_url
  ) AS resolved_hero_image,
  COALESCE(
    CONCAT('/assets/', og.filename_disk),
    bp.og_image_url,
    CONCAT('/assets/', df.filename_disk),
    bp.hero_image_url
  ) AS resolved_og_image,
  bc.name AS category_name,
  bc.slug AS category_slug,
  bc.color AS category_color,
  ba.name AS author_name,
  ba.slug AS author_slug
FROM blog_posts bp
LEFT JOIN directus_files df ON bp.hero_image = df.id
LEFT JOIN directus_files og ON bp.og_image = og.id
LEFT JOIN blog_categories bc ON bp.category_id = bc.id
LEFT JOIN blog_authors ba ON bp.author_id = ba.id;

-- Update seed data with Unsplash URLs
UPDATE blog_posts SET hero_image_url = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop'
WHERE slug = 'agency-in-a-box' AND hero_image IS NULL;

UPDATE blog_posts SET hero_image_url = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=500&fit=crop'
WHERE slug = 'vue3-composition-patterns' AND hero_image IS NULL;

UPDATE blog_posts SET hero_image_url = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop'
WHERE slug = 'directus-headless-cms' AND hero_image IS NULL;

UPDATE blog_posts SET hero_image_url = 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&h=500&fit=crop'
WHERE slug = 'docker-compose-production' AND hero_image IS NULL;

UPDATE blog_posts SET hero_image_url = 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=500&fit=crop'
WHERE slug = 'stripe-subscriptions-guide' AND hero_image IS NULL;

UPDATE blog_posts SET hero_image_url = 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop'
WHERE slug = 'building-for-agencies' AND hero_image IS NULL;

UPDATE blog_posts SET hero_image_url = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=500&fit=crop'
WHERE slug = 'introducing-synthstack' AND hero_image IS NULL;

COMMENT ON VIEW blog_posts_with_images IS 'Blog posts with resolved image URLs and joined category/author data';

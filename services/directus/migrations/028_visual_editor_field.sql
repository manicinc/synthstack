-- Add visual editor link field to blog_posts collection
-- This field will display a link to open the blog post in visual editing mode

-- Note: This is handled in Directus data model, not SQL
-- Create a display-only field via Directus admin:
-- 1. Go to Settings → Data Model → blog_posts
-- 2. Create new field:
--    - Field: visual_editor_link
--    - Type: Alias (no database column)
--    - Interface: Input (read-only with custom display)
--    - Display Template: {{DIRECTUS_URL}}/content/blog_posts/{{id}}?visual-editing=true

-- For now, we'll document the manual setup process
SELECT 'Visual editor link field should be added via Directus admin interface' as note;

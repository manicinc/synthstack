-- Migration: 055_project_tags.sql
-- Description: Add tags support to projects with multi-color tags

-- =========================================
-- Add tags column to projects table
-- =========================================
-- Tags are stored as JSONB array of objects with name and color
-- Example: [{"name": "example", "color": "primary"}, {"name": "featured", "color": "positive"}]
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Create GIN index for efficient tag searching
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN (tags);

-- =========================================
-- Register the new field with Directus
-- =========================================
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, required, "group", note)
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
  v.required,
  v."group",
  v.note
FROM (
  VALUES (
    'projects',
    'tags',
    'cast-json',
    'tags',
    '{"placeholder": "Add tags...", "allowCustom": true}',
    'labels',
    '{}',
    false,
    false,
    15,
    'full',
    false,
    NULL,
    'Project tags for categorization (supports custom colors)'
  )
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, required, "group", note)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =========================================
-- Update SynthStack example project with "example" tag
-- =========================================
UPDATE projects
SET tags = '[{"name": "example", "color": "info"}]'::jsonb
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- ============================================
-- Demo User Permissions Migration
-- Creates a restricted "Demo Guest" role with limited access
-- ============================================

-- Create Demo Guest role
INSERT INTO directus_roles (id, name, icon, description)
VALUES (
  'c1af92e5-834f-457d-90b7-f3a017214b34',
  'Demo Guest',
  'visibility',
  'Read-only demo user with access only to blog posts'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description;

-- Create access policy for Demo Guest role
INSERT INTO directus_policies (id, name, icon, description, admin_access, app_access)
VALUES (
  '751c51ee-3405-4aed-8143-6598cccf75ed',
  'Demo Guest Access',
  'visibility',
  'Limited read access for demo users',
  false,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  admin_access = EXCLUDED.admin_access,
  app_access = EXCLUDED.app_access;

-- Link policy to role
INSERT INTO directus_access (id, role, policy)
VALUES (
  '3bbc3020-663f-4847-9880-d49b60af1b45',
  'c1af92e5-834f-457d-90b7-f3a017214b34',
  '751c51ee-3405-4aed-8143-6598cccf75ed'
)
ON CONFLICT (id) DO NOTHING;

-- Delete any existing permissions for this policy to avoid duplicates
DELETE FROM directus_permissions WHERE policy = '751c51ee-3405-4aed-8143-6598cccf75ed';

-- Create permissions for blog collections
INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
VALUES
  -- Blog Posts - full read access
  ('blog_posts', 'read', '{}', NULL, '*', '751c51ee-3405-4aed-8143-6598cccf75ed'),
  -- Blog Posts - create
  ('blog_posts', 'create', '{}', NULL, '*', '751c51ee-3405-4aed-8143-6598cccf75ed'),
  -- Blog Posts - update only their own
  ('blog_posts', 'update', '{"author_id":{"_eq":"$CURRENT_USER"}}', NULL, '*', '751c51ee-3405-4aed-8143-6598cccf75ed'),
  -- Blog Posts - delete only their own
  ('blog_posts', 'delete', '{"author_id":{"_eq":"$CURRENT_USER"}}', NULL, '*', '751c51ee-3405-4aed-8143-6598cccf75ed'),
  -- Blog Categories - read only
  ('blog_categories', 'read', '{}', NULL, '*', '751c51ee-3405-4aed-8143-6598cccf75ed'),
  -- Blog Authors - read only
  ('blog_authors', 'read', '{}', NULL, '*', '751c51ee-3405-4aed-8143-6598cccf75ed'),
  -- Directus Files - read only (for blog images)
  ('directus_files', 'read', '{}', NULL, '*', '751c51ee-3405-4aed-8143-6598cccf75ed');

-- Assign demo user to Demo Guest role (not Administrator)
UPDATE directus_users 
SET role = 'c1af92e5-834f-457d-90b7-f3a017214b34'
WHERE email = 'demo@synthstack.app';

-- Create blog author for demo user if not exists
INSERT INTO blog_authors (id, name, slug, email, bio, status)
VALUES (
  '70252ed8-6883-4f60-9608-746b3a2ef9ee',
  'Demo User',
  'demo-user',
  'demo@synthstack.app',
  'Demo user showcasing SynthStack blog capabilities',
  'published'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  bio = EXCLUDED.bio;

-- Create sample blog posts by demo user
INSERT INTO blog_posts (title, slug, summary, body, author_id, status, published_at, featured)
VALUES
  (
    'Welcome to SynthStack',
    'welcome-synthstack',
    'Learn about SynthStack and its powerful AI-native features',
    'SynthStack is an AI-native SaaS boilerplate that helps you build production-ready applications quickly.',
    '70252ed8-6883-4f60-9608-746b3a2ef9ee',
    'published',
    NOW(),
    false
  ),
  (
    'AI Co-Founders Guide',
    'ai-cofounders-guide',
    'Using AI agents in your workflow',
    'SynthStack has 6 specialized AI agents ready to help with different aspects of your business.',
    '70252ed8-6883-4f60-9608-746b3a2ef9ee',
    'published',
    NOW(),
    false
  ),
  (
    'Draft by Demo User',
    'draft-demo-user',
    'Demo draft post - only editable by demo user',
    'This is a draft post. Try editing this as the demo user to see the permissions in action.',
    '70252ed8-6883-4f60-9608-746b3a2ef9ee',
    'draft',
    NULL,
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- Output confirmation
SELECT 'Demo Guest role and permissions created successfully' as status;

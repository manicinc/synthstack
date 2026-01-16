-- Migration: Guest User Blog Post Permissions
-- Description: Allow guest/public users to view only their own blog posts using policy-based permissions
-- Date: 2025-12-18

DO $$
DECLARE
  guest_role_id UUID;
  guest_policy_id UUID;
  existing_access_id UUID;
BEGIN
  -- 1. Get or create Guest User role
  SELECT id INTO guest_role_id FROM directus_roles WHERE name = 'Guest User';

  IF guest_role_id IS NULL THEN
    INSERT INTO directus_roles (id, name, icon, description)
    VALUES (gen_random_uuid(), 'Guest User', 'person', 'Guest users who can create and view their own blog posts')
    RETURNING id INTO guest_role_id;

    RAISE NOTICE 'Created Guest User role with ID: %', guest_role_id;
  ELSE
    RAISE NOTICE 'Guest User role already exists with ID: %', guest_role_id;
  END IF;

  -- 2. Get or create policy for guest users
  SELECT id INTO guest_policy_id FROM directus_policies WHERE name = 'Guest Blog Post Access';

  IF guest_policy_id IS NULL THEN
    INSERT INTO directus_policies (id, name, icon, description, app_access, admin_access)
    VALUES (
      gen_random_uuid(),
      'Guest Blog Post Access',
      'article',
      'Policy for guest users to manage their own blog posts',
      true,
      false
    )
    RETURNING id INTO guest_policy_id;

    RAISE NOTICE 'Created Guest Blog Post Access policy with ID: %', guest_policy_id;
  ELSE
    RAISE NOTICE 'Guest Blog Post Access policy already exists with ID: %', guest_policy_id;
  END IF;

  -- 3. Link role to policy via access (if not already linked)
  SELECT id INTO existing_access_id FROM directus_access WHERE role = guest_role_id AND policy = guest_policy_id;

  IF existing_access_id IS NULL THEN
    INSERT INTO directus_access (id, role, policy, sort)
    VALUES (
      gen_random_uuid(),
      guest_role_id,
      guest_policy_id,
      1
    );

    RAISE NOTICE 'Linked role to policy via access';
  ELSE
    RAISE NOTICE 'Role already linked to policy';
  END IF;

  -- 4. Grant permissions to the policy

  -- READ blog_posts (only user's own posts)
  IF NOT EXISTS (SELECT 1 FROM directus_permissions WHERE policy = guest_policy_id AND collection = 'blog_posts' AND action = 'read') THEN
    INSERT INTO directus_permissions (collection, action, permissions, policy, fields)
    VALUES (
      'blog_posts',
      'read',
      '{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]}',
      guest_policy_id,
      '*'
    );
    RAISE NOTICE 'Added READ permission for blog_posts';
  END IF;

  -- CREATE blog_posts
  IF NOT EXISTS (SELECT 1 FROM directus_permissions WHERE policy = guest_policy_id AND collection = 'blog_posts' AND action = 'create') THEN
    INSERT INTO directus_permissions (collection, action, permissions, validation, policy, fields)
    VALUES (
      'blog_posts',
      'create',
      '{}',
      '{"_and":[{"status":{"_eq":"draft"}}]}',
      guest_policy_id,
      '*'
    );
    RAISE NOTICE 'Added CREATE permission for blog_posts';
  END IF;

  -- UPDATE blog_posts (only user's own posts)
  IF NOT EXISTS (SELECT 1 FROM directus_permissions WHERE policy = guest_policy_id AND collection = 'blog_posts' AND action = 'update') THEN
    INSERT INTO directus_permissions (collection, action, permissions, policy, fields)
    VALUES (
      'blog_posts',
      'update',
      '{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}}]}',
      guest_policy_id,
      '*'
    );
    RAISE NOTICE 'Added UPDATE permission for blog_posts';
  END IF;

  -- DELETE blog_posts (only user's own draft posts)
  IF NOT EXISTS (SELECT 1 FROM directus_permissions WHERE policy = guest_policy_id AND collection = 'blog_posts' AND action = 'delete') THEN
    INSERT INTO directus_permissions (collection, action, permissions, policy)
    VALUES (
      'blog_posts',
      'delete',
      '{"_and":[{"user_created":{"_eq":"$CURRENT_USER"}},{"status":{"_eq":"draft"}}]}',
      guest_policy_id
    );
    RAISE NOTICE 'Added DELETE permission for blog_posts';
  END IF;

  -- READ directus_files (only user's uploaded files)
  IF NOT EXISTS (SELECT 1 FROM directus_permissions WHERE policy = guest_policy_id AND collection = 'directus_files' AND action = 'read') THEN
    INSERT INTO directus_permissions (collection, action, permissions, policy, fields)
    VALUES (
      'directus_files',
      'read',
      '{"_and":[{"uploaded_by":{"_eq":"$CURRENT_USER"}}]}',
      guest_policy_id,
      '*'
    );
    RAISE NOTICE 'Added READ permission for directus_files';
  END IF;

  -- CREATE directus_files (for image uploads)
  IF NOT EXISTS (SELECT 1 FROM directus_permissions WHERE policy = guest_policy_id AND collection = 'directus_files' AND action = 'create') THEN
    INSERT INTO directus_permissions (collection, action, policy, fields)
    VALUES (
      'directus_files',
      'create',
      guest_policy_id,
      '*'
    );
    RAISE NOTICE 'Added CREATE permission for directus_files';
  END IF;

  RAISE NOTICE 'Guest user permissions migration completed successfully';
END $$;

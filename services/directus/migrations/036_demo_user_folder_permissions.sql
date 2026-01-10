-- Migration: 036_demo_user_folder_permissions.sql
-- Description: Add read permissions for directus_folders and directus_files to Demo Viewer role
-- This allows demo users to browse the media library without errors

-- Policy ID for the Demo Viewer Read Only policy
-- (from 023_demo_user_readonly.sql)

-- Add read permission for directus_folders
INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
SELECT
  'directus_folders',
  'read',
  '{}',
  '{}',
  NULL,
  '*',
  'b466125d-66c6-45be-b653-2b648cf57211'
WHERE NOT EXISTS (
  SELECT 1 FROM directus_permissions
  WHERE collection = 'directus_folders'
  AND action = 'read'
  AND policy = 'b466125d-66c6-45be-b653-2b648cf57211'
);

-- Add read permission for directus_files
INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
SELECT
  'directus_files',
  'read',
  '{}',
  '{}',
  NULL,
  '*',
  'b466125d-66c6-45be-b653-2b648cf57211'
WHERE NOT EXISTS (
  SELECT 1 FROM directus_permissions
  WHERE collection = 'directus_files'
  AND action = 'read'
  AND policy = 'b466125d-66c6-45be-b653-2b648cf57211'
);

-- Add read permission for directus_settings (needed for app configuration)
INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
SELECT
  'directus_settings',
  'read',
  '{}',
  '{}',
  NULL,
  '*',
  'b466125d-66c6-45be-b653-2b648cf57211'
WHERE NOT EXISTS (
  SELECT 1 FROM directus_permissions
  WHERE collection = 'directus_settings'
  AND action = 'read'
  AND policy = 'b466125d-66c6-45be-b653-2b648cf57211'
);

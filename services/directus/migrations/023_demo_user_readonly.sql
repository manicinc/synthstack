-- Migration: 023_demo_user_readonly.sql
-- Description: Create read-only Demo Viewer role and policy for demo users
-- This ensures demo users can view the Directus admin but cannot create/update/delete anything

-- Create Demo Viewer role if not exists
INSERT INTO directus_roles (id, name, icon, description)
VALUES (
  'caedeafc-5445-4b67-83e4-55c5bf426bb0',
  'Demo Viewer',
  'visibility',
  'Read-only access for demo users - cannot create, update, or delete'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Create Read Only policy if not exists  
INSERT INTO directus_policies (id, name, icon, description, admin_access, app_access, enforce_tfa)
VALUES (
  'b466125d-66c6-45be-b653-2b648cf57211',
  'Read Only All Collections',
  'lock',
  'Can only view items, no create/update/delete',
  false,
  true,
  false
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  app_access = EXCLUDED.app_access,
  admin_access = EXCLUDED.admin_access;

-- Link policy to role via access table
INSERT INTO directus_access (id, role, policy, sort)
VALUES (
  '7c487afd-3b48-4c80-a192-33942c10adc3',
  'caedeafc-5445-4b67-83e4-55c5bf426bb0',
  'b466125d-66c6-45be-b653-2b648cf57211',
  1
)
ON CONFLICT (id) DO NOTHING;

-- Create demo user with Demo Viewer role
-- Password: DemoUser2024!
INSERT INTO directus_users (id, email, password, first_name, last_name, status, role)
VALUES (
  '795880e4-ffdb-4a6e-8e3f-07f5baf725bd',
  'demo@synthstack.app',
  '$argon2id$v=19$m=65536,t=3,p=4$TlOWI3n7rX02fefYx4kkXw$Dd7n2UcmexeCaG+pY6CNFIHVfvAM0KvrySlPygtUQsM',
  'Demo',
  'User',
  'active',
  'caedeafc-5445-4b67-83e4-55c5bf426bb0'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  status = EXCLUDED.status,
  role = EXCLUDED.role;

-- Add read permissions for all custom collections
DO $$
DECLARE
  coll_name text;
BEGIN
  FOR coll_name IN
    SELECT collection FROM directus_collections
    WHERE collection NOT LIKE 'directus_%'
  LOOP
    INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
    SELECT
      coll_name,
      'read',
      '{}',
      '{}',
      NULL,
      '*',
      'b466125d-66c6-45be-b653-2b648cf57211'
    WHERE NOT EXISTS (
      SELECT 1 FROM directus_permissions
      WHERE collection = coll_name
      AND action = 'read'
      AND policy = 'b466125d-66c6-45be-b653-2b648cf57211'
    );
  END LOOP;
END $$;

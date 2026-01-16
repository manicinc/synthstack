-- Migration: 060_project_client_portal.sql
-- Description: Enhance projects for client portal access with organization linking
-- Dependencies: 024_projects_system.sql, 028_organizations_contacts.sql

-- =============================================================================
-- ENHANCE PROJECTS TABLE FOR CLIENT PORTAL
-- =============================================================================

-- Add organization link for client association
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add client visibility flag
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_client_visible BOOLEAN DEFAULT false;

-- Add billing type
ALTER TABLE projects ADD COLUMN IF NOT EXISTS billing VARCHAR(50) DEFAULT 'fixed'
  CHECK (billing IN ('hourly', 'fixed', 'retainer', 'milestone'));

-- Add client-facing notes (visible in portal)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- Add project start/end dates for better tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Add budget tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_visible ON projects(is_client_visible) WHERE is_client_visible = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_billing ON projects(billing);

-- =============================================================================
-- PROJECT CONTACTS JUNCTION TABLE
-- =============================================================================
-- Links contacts to projects with role-based permissions for client portal

CREATE TABLE IF NOT EXISTS project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Role in the project
  role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('owner', 'approver', 'collaborator', 'viewer')),

  -- Granular permissions
  can_view_tasks BOOLEAN DEFAULT true,
  can_create_tasks BOOLEAN DEFAULT false,
  can_view_files BOOLEAN DEFAULT true,
  can_upload_files BOOLEAN DEFAULT false,
  can_view_invoices BOOLEAN DEFAULT false,
  can_view_conversations BOOLEAN DEFAULT true,
  can_send_messages BOOLEAN DEFAULT true,

  -- Notification preferences
  notify_on_updates BOOLEAN DEFAULT true,
  notify_on_messages BOOLEAN DEFAULT true,
  notify_on_milestones BOOLEAN DEFAULT true,

  -- Sort order
  sort INTEGER DEFAULT 0,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id),

  -- Unique constraint
  UNIQUE(project_id, contact_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_contacts_project ON project_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contacts_contact ON project_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_project_contacts_role ON project_contacts(role);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_project_contacts_timestamp ON project_contacts;
CREATE TRIGGER update_project_contacts_timestamp
  BEFORE UPDATE ON project_contacts
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, hidden)
VALUES (
  'project_contacts',
  'people',
  'Client contacts associated with projects',
  '{{contact_id.first_name}} {{contact_id.last_name}} - {{role}}',
  'sort',
  true
) ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE NEW FIELDS IN DIRECTUS
-- =============================================================================

-- Projects - New Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
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
  v.note,
  v.required
FROM (
  VALUES
  ('projects', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 50, 'half', 'Client organization', FALSE),
  ('projects', 'is_client_visible', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 51, 'half', 'Visible in client portal', FALSE),
  ('projects', 'billing', NULL, 'select-dropdown', '{"choices": [{"text": "Hourly", "value": "hourly"}, {"text": "Fixed Price", "value": "fixed"}, {"text": "Retainer", "value": "retainer"}, {"text": "Milestone", "value": "milestone"}]}', 'labels', '{"choices": [{"text": "Hourly", "value": "hourly", "foreground": "#FFFFFF", "background": "#6366F1"}, {"text": "Fixed Price", "value": "fixed", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Retainer", "value": "retainer", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Milestone", "value": "milestone", "foreground": "#FFFFFF", "background": "#8B5CF6"}]}', FALSE, FALSE, 52, 'half', 'Billing method', FALSE),
  ('projects', 'client_notes', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 53, 'full', 'Notes visible to client in portal', FALSE),
  ('projects', 'start_date', 'date-created', 'datetime', NULL, 'datetime', '{"relative": false}', FALSE, FALSE, 54, 'half', 'Project start date', FALSE),
  ('projects', 'due_date', NULL, 'datetime', NULL, 'datetime', '{"relative": false}', FALSE, FALSE, 55, 'half', 'Project due date', FALSE),
  ('projects', 'budget', NULL, 'input', '{"iconLeft": "$", "min": 0}', NULL, NULL, FALSE, FALSE, 56, 'half', 'Total budget', FALSE),
  ('projects', 'hourly_rate', NULL, 'input', '{"iconLeft": "$", "min": 0}', NULL, NULL, FALSE, FALSE, 57, 'half', 'Hourly rate (if applicable)', FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Project Contacts - Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
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
  v.note,
  v.required
FROM (
  VALUES
  ('project_contacts', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('project_contacts', 'project_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 2, 'half', NULL, TRUE),
  ('project_contacts', 'contact_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'related-values', NULL, FALSE, FALSE, 3, 'half', NULL, TRUE),
  ('project_contacts', 'role', NULL, 'select-dropdown', '{"choices": [{"text": "Owner", "value": "owner"}, {"text": "Approver", "value": "approver"}, {"text": "Collaborator", "value": "collaborator"}, {"text": "Viewer", "value": "viewer"}]}', 'labels', '{"choices": [{"text": "Owner", "value": "owner", "foreground": "#FFFFFF", "background": "#6366F1"}, {"text": "Approver", "value": "approver", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Collaborator", "value": "collaborator", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Viewer", "value": "viewer", "foreground": "#FFFFFF", "background": "#6B7280"}]}', FALSE, FALSE, 4, 'half', 'Role in project', FALSE),
  ('project_contacts', 'can_view_tasks', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 5, 'half', NULL, FALSE),
  ('project_contacts', 'can_create_tasks', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 6, 'half', NULL, FALSE),
  ('project_contacts', 'can_view_files', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 7, 'half', NULL, FALSE),
  ('project_contacts', 'can_upload_files', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 8, 'half', NULL, FALSE),
  ('project_contacts', 'can_view_invoices', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 9, 'half', NULL, FALSE),
  ('project_contacts', 'can_view_conversations', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 10, 'half', NULL, FALSE),
  ('project_contacts', 'can_send_messages', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 11, 'half', NULL, FALSE),
  ('project_contacts', 'notify_on_updates', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 12, 'half', NULL, FALSE),
  ('project_contacts', 'notify_on_messages', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 13, 'half', NULL, FALSE),
  ('project_contacts', 'notify_on_milestones', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 14, 'half', NULL, FALSE),
  ('project_contacts', 'sort', NULL, 'input', '{"min": 0}', NULL, NULL, FALSE, TRUE, 15, 'half', NULL, FALSE),
  ('project_contacts', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 16, 'half', NULL, FALSE),
  ('project_contacts', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 17, 'half', NULL, FALSE),
  ('project_contacts', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 18, 'half', NULL, FALSE),
  ('project_contacts', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 19, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Projects -> Organization (many-to-one)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('projects', 'organization_id', 'organizations', 'projects', 'nullify')
ON CONFLICT DO NOTHING;

-- Project Contacts -> Projects (many-to-one with reverse)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('project_contacts', 'project_id', 'projects', 'project_contacts', 'nullify')
ON CONFLICT DO NOTHING;

-- Project Contacts -> Contacts (many-to-one)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('project_contacts', 'contact_id', 'contacts', 'project_contacts', 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- FEATURE FLAGS FOR CLIENT PORTAL
-- =============================================================================

INSERT INTO feature_flags (key, name, description, category, is_enabled, is_premium, min_tier, sort_order)
VALUES
  ('client_portal', 'Client Portal', 'Enable client-facing project portal', 'portal', true, false, 'subscriber', 300),
  ('client_project_access', 'Client Project Access', 'Allow clients to view their projects', 'portal', true, false, 'subscriber', 301)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN projects.organization_id IS 'Client organization associated with this project';
COMMENT ON COLUMN projects.is_client_visible IS 'Whether this project is visible in the client portal';
COMMENT ON COLUMN projects.billing IS 'Billing method: hourly, fixed, retainer, milestone';
COMMENT ON COLUMN projects.client_notes IS 'Notes visible to clients in the portal';
COMMENT ON TABLE project_contacts IS 'Junction table linking contacts to projects with role-based permissions';

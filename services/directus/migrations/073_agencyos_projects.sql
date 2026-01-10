-- ============================================
-- Migration 073: AgencyOS Projects & Tasks
-- ============================================
-- Creates project management collections for client service projects
-- Note: Separate from SynthStack's dev projects
-- ============================================

-- OS Projects Table (Client Service Projects)
CREATE TABLE IF NOT EXISTS os_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  name VARCHAR(255) NOT NULL,
  description TEXT,
  organization UUID REFERENCES organizations(id) ON DELETE CASCADE,
  owner UUID REFERENCES directus_users(id),
  start_date DATE,
  due_date DATE,
  billing JSONB -- Billing configuration (hourly rate, fixed price, etc.)
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, archive_field, archive_value, unarchive_value, display_template)
VALUES ('os_projects', 'folder', 'Client service projects', '#10B981', 'sort', 'status', 'archived', 'active', '{{name}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_projects', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_projects', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Planning","value":"planning"},{"text":"Active","value":"active"},{"text":"On Hold","value":"on_hold"},{"text":"Completed","value":"completed"},{"text":"Cancelled","value":"cancelled"},{"text":"Archived","value":"archived"}]}'::jsonb, 'badge', NULL),
('os_projects', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_projects', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_projects', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_projects', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_projects', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_projects', 'name', NULL, 'input', '{"placeholder":"Project name"}'::jsonb, NULL, NULL),
('os_projects', 'description', NULL, 'input-rich-text-md', NULL, NULL, 'Project description and goals'),
('os_projects', 'organization', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Client organization'),
('os_projects', 'owner', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Project manager'),
('os_projects', 'start_date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, NULL),
('os_projects', 'due_date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, NULL),
('os_projects', 'billing', 'cast-json', 'input-code', '{"language":"json"}'::jsonb, NULL, 'Billing configuration'),
('os_projects', 'tasks', 'o2m', 'list-o2m', '{"template":"{{name}}"}'::jsonb, NULL, 'Project tasks'),
('os_projects', 'contacts', 'o2m', 'list-o2m', '{"template":"{{contacts_id.first_name}} {{contacts_id.last_name}}"}'::jsonb, NULL, 'Project contacts'),
('os_projects', 'expenses', 'o2m', 'list-o2m', '{"template":"{{name}}"}'::jsonb, NULL, 'Project expenses'),
('os_projects', 'invoices', 'o2m', 'list-o2m', '{"template":"{{invoice_number}}"}'::jsonb, NULL, 'Project invoices')
ON CONFLICT DO NOTHING;

-- OS Project Contacts Junction Table
CREATE TABLE IF NOT EXISTS os_project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_projects_id UUID REFERENCES os_projects(id) ON DELETE CASCADE,
  contacts_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  sort INTEGER DEFAULT 0,

  UNIQUE (os_projects_id, contacts_id)
);

-- Register junction
INSERT INTO directus_collections (collection, icon, note, hidden)
VALUES ('os_project_contacts', 'link', 'Links contacts to projects', true)
ON CONFLICT (collection) DO NOTHING;

-- Add junction fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_project_contacts', 'id', 'uuid', 'input', NULL),
('os_project_contacts', 'os_projects_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb),
('os_project_contacts', 'contacts_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb),
('os_project_contacts', 'sort', NULL, 'input', NULL)
ON CONFLICT DO NOTHING;

-- Add relations
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field) VALUES
('os_project_contacts', 'os_projects_id', 'os_projects', 'contacts', 'contacts_id'),
('os_project_contacts', 'contacts_id', 'contacts', NULL, 'os_projects_id')
ON CONFLICT DO NOTHING;

-- OS Project Files Junction Table
CREATE TABLE IF NOT EXISTS os_project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_projects_id UUID REFERENCES os_projects(id) ON DELETE CASCADE,
  directus_files_id UUID REFERENCES directus_files(id) ON DELETE CASCADE,
  sort INTEGER DEFAULT 0,

  UNIQUE (os_projects_id, directus_files_id)
);

-- Register junction
INSERT INTO directus_collections (collection, icon, note, hidden)
VALUES ('os_project_files', 'link', 'Links files to projects', true)
ON CONFLICT (collection) DO NOTHING;

-- Add junction fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_project_files', 'id', 'uuid', 'input', NULL),
('os_project_files', 'os_projects_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb),
('os_project_files', 'directus_files_id', 'file', 'file', NULL),
('os_project_files', 'sort', NULL, 'input', NULL)
ON CONFLICT DO NOTHING;

-- OS Project Templates Table
CREATE TABLE IF NOT EXISTS os_project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'active',
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  name VARCHAR(255) NOT NULL,
  description TEXT,
  tasks JSONB -- Template task definitions
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field)
VALUES ('os_project_templates', 'content_copy', 'Reusable project templates', '#8B5CF6', 'sort')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_project_templates', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_project_templates', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Active","value":"active"},{"text":"Archived","value":"archived"}]}'::jsonb, 'badge', NULL),
('os_project_templates', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_project_templates', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_project_templates', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_project_templates', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_project_templates', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_project_templates', 'name', NULL, 'input', '{"placeholder":"Template name"}'::jsonb, NULL, NULL),
('os_project_templates', 'description', NULL, 'input-multiline', NULL, NULL, NULL),
('os_project_templates', 'tasks', 'cast-json', 'input-code', '{"language":"json"}'::jsonb, NULL, 'Task definitions')
ON CONFLICT DO NOTHING;

-- OS Tasks Table
CREATE TABLE IF NOT EXISTS os_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  project UUID REFERENCES os_projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES directus_users(id),
  due_date DATE,
  start_date DATE,
  date_completed TIMESTAMPTZ,
  type VARCHAR(100), -- 'design', 'development', 'content', 'review', etc.
  responsibility VARCHAR(100), -- 'client', 'team', 'external'
  is_visible_to_client BOOLEAN DEFAULT false,
  embed_url VARCHAR(500), -- For embedded resources (Figma, Google Docs, etc.)
  form UUID, -- Reference to forms collection if exists
  client_task_details TEXT
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, archive_field, archive_value, unarchive_value, display_template)
VALUES ('os_tasks', 'check_circle', 'Project tasks', '#3B82F6', 'sort', 'status', 'cancelled', 'todo', '{{name}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_tasks', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_tasks', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"To Do","value":"todo"},{"text":"In Progress","value":"in_progress"},{"text":"Review","value":"review"},{"text":"Done","value":"done"},{"text":"Blocked","value":"blocked"},{"text":"Cancelled","value":"cancelled"}]}'::jsonb, 'badge', NULL),
('os_tasks', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_tasks', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_tasks', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_tasks', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_tasks', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_tasks', 'project', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Parent project'),
('os_tasks', 'name', NULL, 'input', '{"placeholder":"Task name"}'::jsonb, NULL, NULL),
('os_tasks', 'description', NULL, 'input-rich-text-md', NULL, NULL, 'Task details'),
('os_tasks', 'assigned_to', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Assigned team member'),
('os_tasks', 'due_date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, NULL),
('os_tasks', 'start_date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, NULL),
('os_tasks', 'date_completed', NULL, 'datetime', NULL, NULL, NULL),
('os_tasks', 'type', NULL, 'input', '{"placeholder":"design, development, etc."}'::jsonb, NULL, 'Task type'),
('os_tasks', 'responsibility', NULL, 'select-dropdown', '{"choices":[{"text":"Team","value":"team"},{"text":"Client","value":"client"},{"text":"External","value":"external"}]}'::jsonb, NULL, 'Who is responsible'),
('os_tasks', 'is_visible_to_client', 'cast-boolean', 'boolean', NULL, NULL, 'Show in client portal'),
('os_tasks', 'embed_url', NULL, 'input', '{"placeholder":"Figma, Google Docs, etc."}'::jsonb, NULL, 'Embedded resource URL'),
('os_tasks', 'client_task_details', NULL, 'input-multiline', NULL, NULL, 'Client-facing description'),
('os_tasks', 'files', 'o2m', 'list-o2m', '{"template":"{{directus_files_id.title}}"}'::jsonb, NULL, 'Task attachments')
ON CONFLICT DO NOTHING;

-- OS Task Files Junction Table
CREATE TABLE IF NOT EXISTS os_task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_tasks_id UUID REFERENCES os_tasks(id) ON DELETE CASCADE,
  directus_files_id UUID REFERENCES directus_files(id) ON DELETE CASCADE,
  sort INTEGER DEFAULT 0,

  UNIQUE (os_tasks_id, directus_files_id)
);

-- Register junction
INSERT INTO directus_collections (collection, icon, note, hidden)
VALUES ('os_task_files', 'link', 'Links files to tasks', true)
ON CONFLICT (collection) DO NOTHING;

-- Add junction fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_task_files', 'id', 'uuid', 'input', NULL),
('os_task_files', 'os_tasks_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb),
('os_task_files', 'directus_files_id', 'file', 'file', NULL),
('os_task_files', 'sort', NULL, 'input', NULL)
ON CONFLICT DO NOTHING;

-- Add relations
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field) VALUES
('os_task_files', 'os_tasks_id', 'os_tasks', 'files', 'directus_files_id'),
('os_task_files', 'directus_files_id', 'directus_files', NULL, 'os_tasks_id')
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_os_projects_organization ON os_projects(organization);
CREATE INDEX IF NOT EXISTS idx_os_projects_owner ON os_projects(owner);
CREATE INDEX IF NOT EXISTS idx_os_projects_status ON os_projects(status);
CREATE INDEX IF NOT EXISTS idx_os_tasks_project ON os_tasks(project);
CREATE INDEX IF NOT EXISTS idx_os_tasks_assigned_to ON os_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_os_tasks_status ON os_tasks(status);
CREATE INDEX IF NOT EXISTS idx_os_tasks_due_date ON os_tasks(due_date);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 073: AgencyOS Projects & Tasks completed successfully';
  RAISE NOTICE '   Created: os_projects, os_project_contacts, os_project_files, os_project_templates';
  RAISE NOTICE '   Created: os_tasks, os_task_files';
END $$;

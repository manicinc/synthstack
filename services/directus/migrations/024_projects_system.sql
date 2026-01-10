-- Migration: 024_projects_system.sql
-- Description: Create Projects system with todos, milestones, and marketing plans
-- This replaces the printer/filament system with a generic project management system

-- =========================================
-- Projects Table
-- =========================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  owner_id UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort_field, archive_field, archive_value, unarchive_value, sort)
VALUES (
  'projects',
  'folder_special',
  'Project management with todos, milestones, and marketing plans',
  '{{name}}',
  false,
  false,
  NULL,
  'status',
  'archived',
  'active',
  10
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =========================================
-- Todos Table
-- =========================================
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  assignee_id UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort_field, sort)
VALUES (
  'todos',
  'check_box',
  'Todo items within projects',
  '{{title}}',
  false,
  false,
  'sort',
  11
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =========================================
-- Milestones Table
-- =========================================
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_date TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'missed')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort_field, sort)
VALUES (
  'milestones',
  'flag',
  'Project milestones and deadlines',
  '{{title}}',
  false,
  false,
  'sort',
  12
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =========================================
-- Marketing Plans Table
-- =========================================
CREATE TABLE IF NOT EXISTS marketing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  budget DECIMAL(12,2),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, sort)
VALUES (
  'marketing_plans',
  'campaign',
  'Marketing plans and strategies for projects',
  '{{title}}',
  false,
  false,
  13
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- =========================================
-- Indexes for Performance
-- =========================================
CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_marketing_plans_project ON marketing_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_marketing_plans_status ON marketing_plans(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

-- =========================================
-- Directus Relations
-- =========================================

-- Projects -> Owner (user)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('projects', 'owner_id', 'directus_users', NULL)
ON CONFLICT DO NOTHING;

-- Todos -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('todos', 'project_id', 'projects', 'todos')
ON CONFLICT DO NOTHING;

-- Todos -> Assignee (user)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('todos', 'assignee_id', 'directus_users', NULL)
ON CONFLICT DO NOTHING;

-- Milestones -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('milestones', 'project_id', 'projects', 'milestones')
ON CONFLICT DO NOTHING;

-- Marketing Plans -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field)
VALUES ('marketing_plans', 'project_id', 'projects', 'marketing_plans')
ON CONFLICT DO NOTHING;

-- =========================================
-- Permissions for Demo Viewer Role
-- =========================================

-- Grant read access to projects for Demo Viewer
INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
SELECT 'projects', 'read', '{}', '{}', NULL, '*', 'b466125d-66c6-45be-b653-2b648cf57211'
WHERE NOT EXISTS (
  SELECT 1 FROM directus_permissions
  WHERE collection = 'projects' AND action = 'read' AND policy = 'b466125d-66c6-45be-b653-2b648cf57211'
);

-- Grant read access to todos for Demo Viewer
INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
SELECT 'todos', 'read', '{}', '{}', NULL, '*', 'b466125d-66c6-45be-b653-2b648cf57211'
WHERE NOT EXISTS (
  SELECT 1 FROM directus_permissions
  WHERE collection = 'todos' AND action = 'read' AND policy = 'b466125d-66c6-45be-b653-2b648cf57211'
);

-- Grant read access to milestones for Demo Viewer
INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
SELECT 'milestones', 'read', '{}', '{}', NULL, '*', 'b466125d-66c6-45be-b653-2b648cf57211'
WHERE NOT EXISTS (
  SELECT 1 FROM directus_permissions
  WHERE collection = 'milestones' AND action = 'read' AND policy = 'b466125d-66c6-45be-b653-2b648cf57211'
);

-- Grant read access to marketing_plans for Demo Viewer
INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
SELECT 'marketing_plans', 'read', '{}', '{}', NULL, '*', 'b466125d-66c6-45be-b653-2b648cf57211'
WHERE NOT EXISTS (
  SELECT 1 FROM directus_permissions
  WHERE collection = 'marketing_plans' AND action = 'read' AND policy = 'b466125d-66c6-45be-b653-2b648cf57211'
);

-- =========================================
-- Seed Sample Data
-- =========================================

-- Create a sample project
INSERT INTO projects (id, name, description, status)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'SynthStack Launch',
  'Main project for launching SynthStack platform with AI copilots and cross-platform support',
  'active'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Sample todos
INSERT INTO todos (id, project_id, title, description, status, priority, sort)
VALUES
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c51', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Set up CI/CD pipeline', 'Configure GitHub Actions for automated testing and deployment', 'completed', 'high', 1),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c52', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Implement AI Copilot Hub', 'Create the main dashboard with copilot chat interface', 'in_progress', 'urgent', 2),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c53', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Write documentation', 'Create comprehensive docs for API and user guides', 'pending', 'medium', 3),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c54', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Design landing page', 'Create compelling landing page with feature highlights', 'pending', 'medium', 4),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c55', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Set up monitoring', 'Configure error tracking and performance monitoring', 'pending', 'low', 5)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority;

-- Sample milestones
INSERT INTO milestones (id, project_id, title, description, target_date, status, sort)
VALUES
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d61', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Alpha Release', 'Internal testing with core features', NOW() + INTERVAL '14 days', 'in_progress', 1),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d62', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Beta Launch', 'Public beta with early adopters', NOW() + INTERVAL '30 days', 'upcoming', 2),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d63', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Production Launch', 'Full public launch with marketing campaign', NOW() + INTERVAL '60 days', 'upcoming', 3)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  target_date = EXCLUDED.target_date,
  status = EXCLUDED.status;

-- Sample marketing plan
INSERT INTO marketing_plans (id, project_id, title, content, status, budget, start_date, end_date)
VALUES (
  'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e71',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Launch Campaign Q1 2025',
  '{
    "channels": ["Twitter/X", "LinkedIn", "ProductHunt", "Hacker News"],
    "goals": ["1000 signups in first week", "50 paying customers in first month"],
    "messaging": {
      "headline": "Your Agency in a Box",
      "subheadline": "AI-native, cross-platform development made simple"
    },
    "tactics": [
      "ProductHunt launch with video demo",
      "Developer-focused blog posts",
      "Twitter thread explaining architecture",
      "LinkedIn thought leadership posts"
    ]
  }',
  'draft',
  5000.00,
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '90 days'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  status = EXCLUDED.status;

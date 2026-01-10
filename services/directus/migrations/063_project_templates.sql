-- Migration: 063_project_templates.sql
-- Description: Reusable project templates with task definitions
-- Dependencies: 024_projects_system.sql

-- =============================================================================
-- PROJECT TEMPLATES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template Info
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'folder_special',
  color VARCHAR(20),

  -- Default Project Settings
  default_billing VARCHAR(50) DEFAULT 'fixed'
    CHECK (default_billing IN ('hourly', 'fixed', 'retainer', 'milestone')),
  default_hourly_rate DECIMAL(10,2),
  estimated_duration INTEGER, -- Days
  estimated_budget DECIMAL(12,2),

  -- Task Templates (JSONB array)
  -- Each task: { name, description, responsibility, days_offset, estimated_hours, is_client_visible }
  tasks JSONB DEFAULT '[]'::jsonb,

  -- Milestone Templates (JSONB array)
  -- Each milestone: { title, description, days_offset }
  milestones JSONB DEFAULT '[]'::jsonb,

  -- Default tags for projects created from this template
  default_tags TEXT[],

  -- Usage tracking
  use_count INTEGER DEFAULT 0,

  -- Sort order
  sort INTEGER DEFAULT 0,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_templates_status ON project_templates(status);
CREATE INDEX IF NOT EXISTS idx_project_templates_sort ON project_templates(sort);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_project_templates_timestamp ON project_templates;
CREATE TRIGGER update_project_templates_timestamp
  BEFORE UPDATE ON project_templates
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- REGISTER COLLECTION WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, archive_field, archive_value, unarchive_value, sort)
VALUES (
  'project_templates',
  'content_copy',
  'Reusable project templates with predefined tasks and milestones',
  '{{name}}',
  'sort',
  'status',
  'archived',
  'active',
  15
) ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

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
  ('project_templates', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('project_templates', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Draft", "value": "draft"}, {"text": "Active", "value": "active"}, {"text": "Archived", "value": "archived"}]}', 'labels', '{"choices": [{"text": "Draft", "value": "draft", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Active", "value": "active", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Archived", "value": "archived", "foreground": "#FFFFFF", "background": "#6B7280"}]}', FALSE, FALSE, 2, 'half', NULL, FALSE),
  ('project_templates', 'name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 3, 'half', 'Template name', TRUE),
  ('project_templates', 'description', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 4, 'full', 'Template description', FALSE),
  ('project_templates', 'icon', NULL, 'select-icon', NULL, 'icon', NULL, FALSE, FALSE, 5, 'half', NULL, FALSE),
  ('project_templates', 'color', NULL, 'select-color', NULL, 'color', NULL, FALSE, FALSE, 6, 'half', NULL, FALSE),
  ('project_templates', 'default_billing', NULL, 'select-dropdown', '{"choices": [{"text": "Hourly", "value": "hourly"}, {"text": "Fixed Price", "value": "fixed"}, {"text": "Retainer", "value": "retainer"}, {"text": "Milestone", "value": "milestone"}]}', NULL, NULL, FALSE, FALSE, 7, 'half', NULL, FALSE),
  ('project_templates', 'default_hourly_rate', NULL, 'input', '{"iconLeft": "$", "min": 0}', NULL, NULL, FALSE, FALSE, 8, 'half', NULL, FALSE),
  ('project_templates', 'estimated_duration', NULL, 'input', '{"min": 0, "placeholder": "Days"}', NULL, NULL, FALSE, FALSE, 9, 'half', 'Estimated days to complete', FALSE),
  ('project_templates', 'estimated_budget', NULL, 'input', '{"iconLeft": "$", "min": 0}', NULL, NULL, FALSE, FALSE, 10, 'half', NULL, FALSE),
  ('project_templates', 'tasks', 'cast-json', 'input-code', '{"language": "json", "lineNumber": true}', NULL, NULL, FALSE, FALSE, 11, 'full', 'Task definitions as JSON array', FALSE),
  ('project_templates', 'milestones', 'cast-json', 'input-code', '{"language": "json", "lineNumber": true}', NULL, NULL, FALSE, FALSE, 12, 'full', 'Milestone definitions as JSON array', FALSE),
  ('project_templates', 'default_tags', 'cast-json', 'tags', NULL, 'labels', NULL, FALSE, FALSE, 13, 'full', 'Default tags for new projects', FALSE),
  ('project_templates', 'use_count', NULL, 'input', '{"min": 0}', NULL, NULL, TRUE, FALSE, 14, 'half', 'Times used', FALSE),
  ('project_templates', 'sort', NULL, 'input', '{"min": 0}', NULL, NULL, FALSE, TRUE, 15, 'half', NULL, FALSE),
  ('project_templates', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 16, 'half', NULL, FALSE),
  ('project_templates', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 17, 'half', NULL, FALSE),
  ('project_templates', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 18, 'half', NULL, FALSE),
  ('project_templates', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 19, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =============================================================================
-- ADD TEMPLATE REFERENCE TO PROJECTS
-- =============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES project_templates(id) ON DELETE SET NULL;

-- Add field to Directus
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
VALUES ('projects', 'template_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, TRUE, 58, 'half', 'Template used to create this project', FALSE)
ON CONFLICT DO NOTHING;

-- Relationship
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('projects', 'template_id', 'project_templates', 'projects', 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SEED SAMPLE TEMPLATES
-- =============================================================================

INSERT INTO project_templates (id, name, description, status, default_billing, estimated_duration, tasks, milestones, default_tags)
VALUES
  (
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Website Redesign',
    'Complete website redesign project template including discovery, design, development, and launch phases.',
    'active',
    'fixed',
    60,
    '[
      {"name": "Discovery Call", "description": "Initial client meeting to understand requirements", "responsibility": "internal", "days_offset": 0, "estimated_hours": 2, "is_client_visible": true},
      {"name": "Project Brief", "description": "Create comprehensive project brief document", "responsibility": "internal", "days_offset": 3, "estimated_hours": 4, "is_client_visible": true},
      {"name": "Client Brief Review", "description": "Client reviews and approves project brief", "responsibility": "client", "days_offset": 7, "estimated_hours": 1, "is_client_visible": true},
      {"name": "Wireframes", "description": "Create wireframes for key pages", "responsibility": "internal", "days_offset": 14, "estimated_hours": 16, "is_client_visible": true},
      {"name": "Design Mockups", "description": "High-fidelity design mockups", "responsibility": "internal", "days_offset": 21, "estimated_hours": 24, "is_client_visible": true},
      {"name": "Design Approval", "description": "Client approves final designs", "responsibility": "client", "days_offset": 28, "estimated_hours": 2, "is_client_visible": true},
      {"name": "Development", "description": "Build the website", "responsibility": "internal", "days_offset": 35, "estimated_hours": 80, "is_client_visible": true},
      {"name": "Content Entry", "description": "Enter content into CMS", "responsibility": "shared", "days_offset": 49, "estimated_hours": 8, "is_client_visible": true},
      {"name": "QA Testing", "description": "Quality assurance testing", "responsibility": "internal", "days_offset": 53, "estimated_hours": 8, "is_client_visible": false},
      {"name": "Launch", "description": "Deploy to production", "responsibility": "internal", "days_offset": 60, "estimated_hours": 4, "is_client_visible": true}
    ]'::jsonb,
    '[
      {"title": "Discovery Complete", "description": "Project requirements finalized", "days_offset": 7},
      {"title": "Design Approved", "description": "All designs approved by client", "days_offset": 28},
      {"title": "Development Complete", "description": "Website built and ready for content", "days_offset": 49},
      {"title": "Launch", "description": "Website live", "days_offset": 60}
    ]'::jsonb,
    ARRAY['web', 'redesign']
  ),
  (
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'Monthly Retainer',
    'Ongoing monthly retainer for support and maintenance.',
    'active',
    'retainer',
    30,
    '[
      {"name": "Monthly Planning", "description": "Plan work for the month", "responsibility": "shared", "days_offset": 0, "estimated_hours": 1, "is_client_visible": true},
      {"name": "Maintenance Tasks", "description": "Regular maintenance and updates", "responsibility": "internal", "days_offset": 1, "estimated_hours": 8, "is_client_visible": false},
      {"name": "Monthly Report", "description": "Summary of work completed", "responsibility": "internal", "days_offset": 28, "estimated_hours": 1, "is_client_visible": true}
    ]'::jsonb,
    '[
      {"title": "Month End Review", "description": "Review completed work and plan next month", "days_offset": 30}
    ]'::jsonb,
    ARRAY['retainer', 'ongoing']
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tasks = EXCLUDED.tasks,
  milestones = EXCLUDED.milestones;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE project_templates IS 'Reusable project templates with predefined tasks and milestones';
COMMENT ON COLUMN project_templates.tasks IS 'JSON array of task definitions with name, description, responsibility, days_offset, estimated_hours, is_client_visible';
COMMENT ON COLUMN project_templates.milestones IS 'JSON array of milestone definitions with title, description, days_offset';

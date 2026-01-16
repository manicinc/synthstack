-- Migration: 061_task_enhancement.sql
-- Description: Enhance todos/tasks for client portal visibility and file attachments
-- Dependencies: 024_projects_system.sql, 060_project_client_portal.sql

-- =============================================================================
-- ENHANCE TODOS TABLE FOR CLIENT PORTAL
-- =============================================================================

-- Client visibility flag
ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_visible_to_client BOOLEAN DEFAULT false;

-- Client-facing task details (what they see vs internal description)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS client_task_details TEXT;

-- Responsibility assignment
ALTER TABLE todos ADD COLUMN IF NOT EXISTS responsibility VARCHAR(50) DEFAULT 'internal'
  CHECK (responsibility IN ('internal', 'client', 'vendor', 'shared'));

-- Start date for task tracking
ALTER TABLE todos ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;

-- Completion date
ALTER TABLE todos ADD COLUMN IF NOT EXISTS date_completed TIMESTAMPTZ;

-- Estimated hours
ALTER TABLE todos ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(6,2);

-- Actual hours tracked
ALTER TABLE todos ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(6,2);

-- Embed URL for external resources (Figma, Miro, etc.)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS embed_url VARCHAR(500);

-- Form ID for intake forms
ALTER TABLE todos ADD COLUMN IF NOT EXISTS form_id UUID;

-- Tags for filtering
ALTER TABLE todos ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Indexes
CREATE INDEX IF NOT EXISTS idx_todos_client_visible ON todos(is_visible_to_client) WHERE is_visible_to_client = TRUE;
CREATE INDEX IF NOT EXISTS idx_todos_responsibility ON todos(responsibility);
CREATE INDEX IF NOT EXISTS idx_todos_date_completed ON todos(date_completed) WHERE date_completed IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_tags ON todos USING gin(tags) WHERE tags IS NOT NULL;

-- =============================================================================
-- TODO FILES JUNCTION TABLE
-- =============================================================================
-- Links files to todos for attachments

CREATE TABLE IF NOT EXISTS todo_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES directus_files(id) ON DELETE CASCADE,

  -- Description/label for the file
  label VARCHAR(255),

  -- Is this file visible to clients?
  is_client_visible BOOLEAN DEFAULT true,

  -- Sort order
  sort INTEGER DEFAULT 0,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),

  UNIQUE(todo_id, file_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_todo_files_todo ON todo_files(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_files_file ON todo_files(file_id);

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, hidden)
VALUES (
  'todo_files',
  'attach_file',
  'File attachments for tasks',
  '{{file_id.filename_download}}',
  'sort',
  true
) ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE NEW FIELDS IN DIRECTUS
-- =============================================================================

-- Todos - New Fields
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
  ('todos', 'is_visible_to_client', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 30, 'half', 'Show in client portal', FALSE),
  ('todos', 'client_task_details', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 31, 'full', 'Description visible to clients (optional)', FALSE),
  ('todos', 'responsibility', NULL, 'select-dropdown', '{"choices": [{"text": "Internal", "value": "internal"}, {"text": "Client", "value": "client"}, {"text": "Vendor", "value": "vendor"}, {"text": "Shared", "value": "shared"}]}', 'labels', '{"choices": [{"text": "Internal", "value": "internal", "foreground": "#FFFFFF", "background": "#6366F1"}, {"text": "Client", "value": "client", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Vendor", "value": "vendor", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Shared", "value": "shared", "foreground": "#FFFFFF", "background": "#8B5CF6"}]}', FALSE, FALSE, 32, 'half', 'Who is responsible', FALSE),
  ('todos', 'start_date', NULL, 'datetime', NULL, 'datetime', '{"relative": false}', FALSE, FALSE, 33, 'half', 'Task start date', FALSE),
  ('todos', 'date_completed', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', FALSE, FALSE, 34, 'half', 'When task was completed', FALSE),
  ('todos', 'estimated_hours', NULL, 'input', '{"min": 0, "step": 0.25}', NULL, NULL, FALSE, FALSE, 35, 'half', 'Estimated hours', FALSE),
  ('todos', 'actual_hours', NULL, 'input', '{"min": 0, "step": 0.25}', NULL, NULL, FALSE, FALSE, 36, 'half', 'Actual hours tracked', FALSE),
  ('todos', 'embed_url', NULL, 'input', '{"iconRight": "link", "placeholder": "https://figma.com/..."}', NULL, NULL, FALSE, FALSE, 37, 'full', 'External resource URL (Figma, Miro, etc.)', FALSE),
  ('todos', 'tags', 'cast-json', 'tags', '{"iconRight": "local_offer"}', 'labels', NULL, FALSE, FALSE, 38, 'full', 'Tags for filtering', FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Todo Files - Fields
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
  ('todo_files', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('todo_files', 'todo_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{title}}"}', 'related-values', NULL, FALSE, FALSE, 2, 'half', NULL, TRUE),
  ('todo_files', 'file_id', 'file', 'file', NULL, 'file', NULL, FALSE, FALSE, 3, 'half', NULL, TRUE),
  ('todo_files', 'label', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 4, 'full', 'Optional file label', FALSE),
  ('todo_files', 'is_client_visible', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 5, 'half', 'Visible to clients', FALSE),
  ('todo_files', 'sort', NULL, 'input', '{"min": 0}', NULL, NULL, FALSE, TRUE, 6, 'half', NULL, FALSE),
  ('todo_files', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 7, 'half', NULL, FALSE),
  ('todo_files', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 8, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Todo Files -> Todos (many-to-one with reverse)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('todo_files', 'todo_id', 'todos', 'files', 'nullify')
ON CONFLICT DO NOTHING;

-- Todo Files -> Files (many-to-one)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('todo_files', 'file_id', 'directus_files', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- AUTO-SET COMPLETION DATE TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION set_todo_completion_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Set date_completed when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.date_completed = NOW();
  END IF;

  -- Clear date_completed if status changes from 'completed' to something else
  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.date_completed = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_todo_completion_date ON todos;
CREATE TRIGGER trigger_todo_completion_date
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION set_todo_completion_date();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN todos.is_visible_to_client IS 'Whether this task is visible in the client portal';
COMMENT ON COLUMN todos.client_task_details IS 'Client-friendly description (if different from internal)';
COMMENT ON COLUMN todos.responsibility IS 'Who is responsible: internal team, client, or vendor';
COMMENT ON COLUMN todos.embed_url IS 'URL to embedded resource (Figma, Miro, Loom, etc.)';
COMMENT ON TABLE todo_files IS 'Junction table linking files to tasks';

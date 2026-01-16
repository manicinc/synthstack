-- Migration 033: Enhance Existing Collections
-- Link new business features (organizations, deals, invoices) to existing SynthStack collections
-- Enhance projects, todos, and app_users with business management fields

-- ======================
-- 1. ENHANCE PROJECTS TABLE
-- ======================

-- Add business management fields to existing projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_hours DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS billable_hours DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_deal ON projects(deal_id);
CREATE INDEX IF NOT EXISTS idx_projects_invoice ON projects(invoice_id);

-- Configure Directus fields for projects enhancements
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
VALUES
  -- Organization relationship
  ('projects', 'organization_id', 'm2o', 'select-dropdown-m2o',
   '{"template": "{{name}}"}',
   'related-values',
   '{"template": "{{name}}"}',
   false, false, 11, 'full',
   '[{"language":"en-US","translation":"Organization"}]',
   'Link this project to a client organization',
   NULL, false, NULL, NULL, NULL),

  -- Deal relationship
  ('projects', 'deal_id', 'm2o', 'select-dropdown-m2o',
   '{"template": "{{title}}"}',
   'related-values',
   '{"template": "{{title}}"}',
   false, false, 12, 'full',
   '[{"language":"en-US","translation":"Deal"}]',
   'The sales deal that created this project',
   NULL, false, NULL, NULL, NULL),

  -- Budget
  ('projects', 'budget', NULL, 'input',
   '{"iconLeft":"attach_money","placeholder":"0.00","min":0}',
   'formatted-value',
   '{"format":true,"prefix":"$"}',
   false, false, 13, 'half',
   '[{"language":"en-US","translation":"Budget"}]',
   'Total project budget',
   NULL, false, NULL, NULL, NULL),

  -- Hourly rate
  ('projects', 'hourly_rate', NULL, 'input',
   '{"iconLeft":"schedule","placeholder":"0.00","min":0}',
   'formatted-value',
   '{"format":true,"prefix":"$","suffix":"/hr"}',
   false, false, 14, 'half',
   '[{"language":"en-US","translation":"Hourly Rate"}]',
   'Default hourly rate for time tracking',
   NULL, false, NULL, NULL, NULL),

  -- Total hours (read-only, calculated from todos)
  ('projects', 'total_hours', NULL, 'input',
   '{"iconLeft":"schedule","placeholder":"0.00","disabled":true}',
   'formatted-value',
   '{"suffix":" hrs"}',
   true, false, 15, 'half',
   '[{"language":"en-US","translation":"Total Hours"}]',
   'Total hours logged (auto-calculated from tasks)',
   NULL, false, NULL, NULL, NULL),

  -- Billable hours (read-only, calculated from todos)
  ('projects', 'billable_hours', NULL, 'input',
   '{"iconLeft":"attach_money","placeholder":"0.00","disabled":true}',
   'formatted-value',
   '{"suffix":" hrs"}',
   true, false, 16, 'half',
   '[{"language":"en-US","translation":"Billable Hours"}]',
   'Billable hours logged (auto-calculated from billable tasks)',
   NULL, false, NULL, NULL, NULL),

  -- Is billable toggle
  ('projects', 'is_billable', 'cast-boolean', 'boolean',
   '{"label":"Project is billable to client"}',
   'boolean',
   NULL,
   false, false, 17, 'half',
   '[{"language":"en-US","translation":"Billable"}]',
   'Whether this project time should be billed',
   NULL, false, NULL, NULL, NULL),

  -- Invoice relationship
  ('projects', 'invoice_id', 'm2o', 'select-dropdown-m2o',
   '{"template": "{{invoice_number}}"}',
   'related-values',
   '{"template": "{{invoice_number}}"}',
   false, false, 18, 'half',
   '[{"language":"en-US","translation":"Invoice"}]',
   'Link to invoice if project has been invoiced',
   NULL, false, NULL, NULL, NULL);

-- ======================
-- 2. ENHANCE TODOS TABLE
-- ======================

-- Add time tracking and billing fields to existing todos
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS billable_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS billable_amount DECIMAL(12,2) GENERATED ALWAYS AS (
  CASE
    WHEN is_billable AND actual_hours IS NOT NULL AND billable_rate IS NOT NULL
    THEN actual_hours * billable_rate
    ELSE 0.00
  END
) STORED;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_todos_billable ON todos(is_billable) WHERE is_billable = true;

-- Configure Directus fields for todos enhancements
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
VALUES
  -- Is billable toggle
  ('todos', 'is_billable', 'cast-boolean', 'boolean',
   '{"label":"Task is billable"}',
   'boolean',
   NULL,
   false, false, 21, 'half',
   '[{"language":"en-US","translation":"Billable"}]',
   'Whether this task time should be billed to client',
   NULL, false, NULL, NULL, NULL),

  -- Billable rate (overrides project rate)
  ('todos', 'billable_rate', NULL, 'input',
   '{"iconLeft":"attach_money","placeholder":"Use project rate","min":0}',
   'formatted-value',
   '{"format":true,"prefix":"$","suffix":"/hr"}',
   false, false, 22, 'half',
   '[{"language":"en-US","translation":"Billable Rate"}]',
   'Hourly rate for this task (leave empty to use project rate)',
   '[{"name":"is_billable","rule":{"_eq":true}}]',
   false, NULL, NULL, NULL),

  -- Estimated hours
  ('todos', 'estimated_hours', NULL, 'input',
   '{"iconLeft":"schedule","placeholder":"0.0","min":0,"step":0.25}',
   'formatted-value',
   '{"suffix":" hrs"}',
   false, false, 23, 'half',
   '[{"language":"en-US","translation":"Estimated Hours"}]',
   'Estimated time to complete this task',
   NULL, false, NULL, NULL, NULL),

  -- Actual hours
  ('todos', 'actual_hours', NULL, 'input',
   '{"iconLeft":"timer","placeholder":"0.0","min":0,"step":0.25}',
   'formatted-value',
   '{"suffix":" hrs"}',
   false, false, 24, 'half',
   '[{"language":"en-US","translation":"Actual Hours"}]',
   'Actual time spent on this task',
   NULL, false, NULL, NULL, NULL),

  -- Billable amount (read-only, calculated)
  ('todos', 'billable_amount', NULL, 'input',
   '{"iconLeft":"attach_money","placeholder":"0.00","disabled":true}',
   'formatted-value',
   '{"format":true,"prefix":"$"}',
   true, false, 25, 'half',
   '[{"language":"en-US","translation":"Billable Amount"}]',
   'Total billable amount (actual hours × rate)',
   '[{"name":"is_billable","rule":{"_eq":true}}]',
   false, NULL, NULL, NULL);

-- ======================
-- 3. ENHANCE APP_USERS TABLE
-- ======================

-- Add contact relationship to link app users to CRM contacts
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_client_portal_user BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_app_users_contact ON app_users(contact_id);

-- Configure Directus fields for app_users enhancements
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
VALUES
  -- Contact relationship
  ('app_users', 'contact_id', 'm2o', 'select-dropdown-m2o',
   '{"template": "{{first_name}} {{last_name}} ({{organization_id.name}})"}',
   'related-values',
   '{"template": "{{first_name}} {{last_name}}"}',
   false, false, 31, 'full',
   '[{"language":"en-US","translation":"Contact"}]',
   'Link this app user to a CRM contact for client portal access',
   NULL, false, NULL, NULL, NULL),

  -- Client portal flag
  ('app_users', 'is_client_portal_user', 'cast-boolean', 'boolean',
   '{"label":"Client Portal User"}',
   'boolean',
   NULL,
   false, false, 32, 'half',
   '[{"language":"en-US","translation":"Client Portal User"}]',
   'Whether this user has access to client portal features',
   NULL, false, NULL, NULL, NULL);

-- ======================
-- 4. CREATE BUSINESS LOGIC TRIGGERS
-- ======================

-- Trigger: Update project hours when todo actual_hours changes
CREATE OR REPLACE FUNCTION update_project_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_total_hours DECIMAL(10,2);
  v_billable_hours DECIMAL(10,2);
BEGIN
  -- Only proceed if project_id exists
  IF NEW.project_id IS NOT NULL THEN
    -- Calculate total and billable hours for the project
    SELECT
      COALESCE(SUM(actual_hours), 0.00),
      COALESCE(SUM(CASE WHEN is_billable THEN actual_hours ELSE 0 END), 0.00)
    INTO v_total_hours, v_billable_hours
    FROM todos
    WHERE project_id = NEW.project_id
      AND actual_hours IS NOT NULL;

    -- Update the project
    UPDATE projects
    SET
      total_hours = v_total_hours,
      billable_hours = v_billable_hours
    WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_project_hours ON todos;
CREATE TRIGGER trg_update_project_hours
AFTER INSERT OR UPDATE OF actual_hours, is_billable, project_id ON todos
FOR EACH ROW
EXECUTE FUNCTION update_project_hours();

-- Trigger: Link deal to project when deal is won
CREATE OR REPLACE FUNCTION link_deal_to_project()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_is_won BOOLEAN;
BEGIN
  -- Check if the new stage is a "won" stage
  SELECT is_won INTO v_stage_is_won
  FROM deal_stages
  WHERE id = NEW.stage_id;

  -- If deal is won and has a project_id, link the project to the deal
  IF v_stage_is_won AND NEW.project_id IS NOT NULL THEN
    UPDATE projects
    SET deal_id = NEW.id
    WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_link_deal_to_project ON deals;
CREATE TRIGGER trg_link_deal_to_project
AFTER UPDATE OF stage_id, project_id ON deals
FOR EACH ROW
EXECUTE FUNCTION link_deal_to_project();

-- ======================
-- 5. CREATE BUSINESS ANALYTICS VIEWS
-- ======================

-- View: Project financial summary
CREATE OR REPLACE VIEW project_financials AS
SELECT
  p.id,
  p.name AS project_name,
  o.name AS organization_name,
  p.budget,
  p.hourly_rate,
  p.total_hours,
  p.billable_hours,
  (p.billable_hours * COALESCE(p.hourly_rate, 0)) AS estimated_revenue,
  COALESCE(SUM(t.billable_amount), 0) AS actual_revenue,
  p.budget - COALESCE(SUM(t.billable_amount), 0) AS budget_remaining,
  CASE
    WHEN p.budget > 0 THEN (COALESCE(SUM(t.billable_amount), 0) / p.budget * 100)
    ELSE 0
  END AS budget_utilization_percent,
  COUNT(t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks,
  COUNT(t.id) AS total_tasks,
  p.date_created,
  p.date_updated
FROM projects p
LEFT JOIN organizations o ON p.organization_id = o.id
LEFT JOIN todos t ON t.project_id = p.id
GROUP BY p.id, o.name;

COMMENT ON VIEW project_financials IS 'Financial summary for each project including budget tracking and revenue';

-- View: Organization project summary
CREATE OR REPLACE VIEW organization_projects AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  COUNT(DISTINCT p.id) AS total_projects,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_projects,
  COALESCE(SUM(p.budget), 0) AS total_budget,
  COALESCE(SUM(p.billable_hours), 0) AS total_billable_hours,
  COALESCE(SUM(i.total), 0) AS total_invoiced,
  COALESCE(SUM(i.amount_paid), 0) AS total_paid,
  COALESCE(SUM(i.amount_due), 0) AS total_outstanding
FROM organizations o
LEFT JOIN projects p ON p.organization_id = o.id
LEFT JOIN invoices i ON i.organization_id = o.id
GROUP BY o.id, o.name;

COMMENT ON VIEW organization_projects IS 'Project and financial summary per organization';

-- View: Time tracking summary
CREATE OR REPLACE VIEW time_tracking_summary AS
SELECT
  t.id AS todo_id,
  t.title AS task_name,
  p.name AS project_name,
  o.name AS organization_name,
  u.first_name || ' ' || u.last_name AS assigned_to,
  t.estimated_hours,
  t.actual_hours,
  t.is_billable,
  t.billable_rate,
  t.billable_amount,
  CASE
    WHEN t.estimated_hours > 0 AND t.actual_hours IS NOT NULL
    THEN (t.actual_hours / t.estimated_hours * 100)
    ELSE 0
  END AS time_variance_percent,
  t.status,
  t.date_created,
  t.date_updated
FROM todos t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN organizations o ON p.organization_id = o.id
LEFT JOIN directus_users u ON t.assignee_id = u.id
WHERE t.actual_hours IS NOT NULL OR t.estimated_hours IS NOT NULL;

COMMENT ON VIEW time_tracking_summary IS 'Detailed time tracking with variance analysis';

-- ======================
-- 6. CONFIGURE DIRECTUS COLLECTIONS
-- ======================

-- Update projects collection settings
UPDATE directus_collections
SET
  note = 'Projects with client organization linkage, time tracking, and billing capabilities',
  display_template = '{{name}} - {{organization_id.name}}'
WHERE collection = 'projects';

-- Update todos collection settings
UPDATE directus_collections
SET
  note = 'Tasks with time tracking and billable hours calculation',
  display_template = '{{title}} ({{actual_hours}}h)'
WHERE collection = 'todos';

-- Update app_users collection settings
UPDATE directus_collections
SET
  note = 'Application users with optional CRM contact linkage for client portal access'
WHERE collection = 'app_users';

-- ======================
-- 7. SAMPLE DATA UPDATES
-- ======================

-- Link existing sample project to an organization (if exists)
DO $$
DECLARE
  v_sample_org_id UUID;
  v_sample_project_id UUID;
BEGIN
  -- Get first organization
  SELECT id INTO v_sample_org_id FROM organizations LIMIT 1;

  -- Get first project
  SELECT id INTO v_sample_project_id FROM projects LIMIT 1;

  -- Update project if both exist
  IF v_sample_org_id IS NOT NULL AND v_sample_project_id IS NOT NULL THEN
    UPDATE projects
    SET
      organization_id = v_sample_org_id,
      budget = 50000.00,
      hourly_rate = 150.00,
      is_billable = true
    WHERE id = v_sample_project_id;

    -- Add time tracking to first few todos
    UPDATE todos
    SET
      is_billable = true,
      estimated_hours = 8.0,
      actual_hours = 6.5
    WHERE id IN (
      SELECT id
      FROM todos
      WHERE project_id = v_sample_project_id
      ORDER BY date_created
      LIMIT 3
    );
  END IF;
END $$;

-- ======================
-- 8. CONFIGURE RELATIONS IN DIRECTUS
-- ======================

-- Ensure all relationships are properly configured
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field)
VALUES
  ('projects', 'organization_id', 'organizations', NULL, NULL),
  ('projects', 'deal_id', 'deals', NULL, NULL),
  ('projects', 'invoice_id', 'invoices', NULL, NULL),
  ('app_users', 'contact_id', 'contacts', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ======================
-- MIGRATION COMPLETE
-- ======================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 033 completed successfully';
  RAISE NOTICE 'Enhanced collections: projects, todos, app_users';
  RAISE NOTICE 'Added fields: organization links, time tracking, billing fields';
  RAISE NOTICE 'Created views: project_financials, organization_projects, time_tracking_summary';
  RAISE NOTICE 'Created triggers: update_project_hours, link_deal_to_project';
END $$;

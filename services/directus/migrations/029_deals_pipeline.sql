-- Migration 029: Deals & Sales Pipeline
-- Description: CRM sales pipeline with drag-and-drop Kanban stages
-- Dependencies: Requires organizations, contacts (migration 028)

-- =============================================================================
-- DEAL STAGES TABLE
-- =============================================================================
-- Pipeline stages for sales workflow

CREATE TABLE IF NOT EXISTS deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stage Details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6B7280', -- Hex color code

  -- Ordering
  order_index INTEGER NOT NULL,

  -- Stage Type
  is_closed BOOLEAN DEFAULT FALSE, -- TRUE for "Won" or "Lost" stages
  is_won BOOLEAN DEFAULT FALSE, -- TRUE only for "Won" stage

  -- Default Probability
  default_probability INTEGER DEFAULT 50 CHECK (default_probability >= 0 AND default_probability <= 100),

  -- Audit Fields
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- Ensure unique order
CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_stages_order ON deal_stages(order_index);

-- =============================================================================
-- DEALS TABLE
-- =============================================================================
-- Sales opportunities with pipeline tracking

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deal Information
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Value
  value DECIMAL(12,2), -- Deal value in USD
  currency VARCHAR(3) DEFAULT 'USD',

  -- Relationships
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  stage_id UUID NOT NULL REFERENCES deal_stages(id) ON DELETE RESTRICT,

  -- Pipeline
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,

  -- Source Tracking
  source VARCHAR(100), -- 'referral', 'website', 'cold_outreach', 'event', 'partner'
  source_details TEXT,

  -- Project Link (when deal is won)
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Owner
  owner_id UUID REFERENCES directus_users(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,
  tags TEXT[],

  -- Audit Fields
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_deals_organization ON deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_project ON deals(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close_date) WHERE expected_close_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_title_search ON deals USING gin(to_tsvector('english', title));

-- Composite index for pipeline queries
CREATE INDEX IF NOT EXISTS idx_deals_stage_org ON deals(stage_id, organization_id);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_deals_timestamp ON deals;
CREATE TRIGGER update_deals_timestamp
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- SEED DEFAULT DEAL STAGES
-- =============================================================================

INSERT INTO deal_stages (id, name, description, color, order_index, is_closed, is_won, default_probability)
VALUES
  ('dad56216-74f7-47e0-b525-8dc32cb31da3', 'Lead', 'Initial contact or inbound inquiry', '#6B7280', 1, FALSE, FALSE, 10),
  ('04338f44-0ffd-4cb5-b835-f94859653f54', 'Qualified', 'Qualified opportunity with budget and timeline', '#3B82F6', 2, FALSE, FALSE, 25),
  ('015a1cf1-e3aa-42ea-a1f7-3872a9ba3db4', 'Proposal Sent', 'Proposal or quote has been sent', '#F59E0B', 3, FALSE, FALSE, 50),
  ('5478c2cc-9dcb-445e-aabe-2780444eecaf', 'Negotiation', 'Actively negotiating terms and pricing', '#F97316', 4, FALSE, FALSE, 75),
  ('052b49ef-f5d8-4b06-a26e-10a451150c43', 'Won', 'Deal has been closed successfully', '#10B981', 5, TRUE, TRUE, 100),
  ('fdb2775b-4b0c-4594-832a-7b80dd8648d9', 'Lost', 'Deal was not won', '#EF4444', 6, TRUE, FALSE, 0)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, archive_field)
VALUES
  ('deal_stages', 'view_column', 'Sales pipeline stages', '{{name}}', 'order_index', NULL),
  ('deals', 'trending_up', 'Sales opportunities and pipeline', '{{title}}', '-date_created', NULL)
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Deal Stages Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
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
  v.translations::json,
  v.note,
  v.conditions::json,
  v.required,
  v."group",
  v.validation::json,
  v.validation_message
FROM (
  VALUES
  ('deal_stages', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deal_stages', 'name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 2, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('deal_stages', 'description', NULL, 'input-multiline', NULL, NULL, NULL, FALSE, FALSE, 3, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deal_stages', 'color', NULL, 'select-color', NULL, 'color', NULL, FALSE, FALSE, 4, 'half', NULL, 'Hex color code', NULL, FALSE, NULL, NULL, NULL),
  ('deal_stages', 'order_index', NULL, 'input', '{"iconRight": "reorder"}', NULL, NULL, FALSE, FALSE, 5, 'half', NULL, 'Display order (lower = earlier)', NULL, TRUE, NULL, NULL, NULL),
  ('deal_stages', 'is_closed', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 6, 'half', NULL, 'Mark as closed stage (Won or Lost)', NULL, FALSE, NULL, NULL, NULL),
  ('deal_stages', 'is_won', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 7, 'half', NULL, 'Mark as won stage', NULL, FALSE, NULL, NULL, NULL),
  ('deal_stages', 'default_probability', NULL, 'slider', '{"minValue": 0, "maxValue": 100, "step": 5}', NULL, NULL, FALSE, FALSE, 8, 'half', NULL, 'Default win probability %', NULL, FALSE, NULL, NULL, NULL),
  ('deal_stages', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 9, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deal_stages', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 10, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Deals Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
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
  v.translations::json,
  v.note,
  v.conditions::json,
  v.required,
  v."group",
  v.validation::json,
  v.validation_message
FROM (
  VALUES
  -- Basic Info
  ('deals', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deals', 'title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 2, 'full', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('deals', 'description', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 3, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Value
  ('deals', 'value', NULL, 'input', '{"iconLeft": "$", "placeholder": "0.00"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', FALSE, FALSE, 4, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deals', 'currency', NULL, 'select-dropdown', '{"choices": [{"text": "USD", "value": "USD"}, {"text": "EUR", "value": "EUR"}, {"text": "GBP", "value": "GBP"}]}', NULL, NULL, FALSE, FALSE, 5, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Relationships
  ('deals', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', '{"template": "{{name}}"}', FALSE, FALSE, 6, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('deals', 'contact_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}", "filter": {"organization_id": {"_eq": "$CURRENT_ITEM.organization_id"}}}', 'related-values', '{"template": "{{first_name}} {{last_name}}"}', FALSE, FALSE, 7, 'half', NULL, 'Primary contact for this deal', NULL, FALSE, NULL, NULL, NULL),

  -- Pipeline
  ('deals', 'stage_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', '{"template": "{{name}}"}', FALSE, FALSE, 8, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('deals', 'probability', NULL, 'slider', '{"minValue": 0, "maxValue": 100, "step": 5, "iconRight": "%"}', NULL, NULL, FALSE, FALSE, 9, 'half', NULL, 'Win probability %', NULL, FALSE, NULL, NULL, NULL),
  ('deals', 'expected_close_date', NULL, 'datetime', '{"includeSeconds": false}', 'datetime', '{"relative": true}', FALSE, FALSE, 10, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deals', 'actual_close_date', NULL, 'datetime', '{"includeSeconds": false}', 'datetime', '{"relative": true}', TRUE, FALSE, 11, 'half', NULL, 'Auto-set when deal is won/lost', NULL, FALSE, NULL, NULL, NULL),

  -- Source
  ('deals', 'source', NULL, 'select-dropdown', '{"choices": [{"text": "Referral", "value": "referral"}, {"text": "Website", "value": "website"}, {"text": "Cold Outreach", "value": "cold_outreach"}, {"text": "Event", "value": "event"}, {"text": "Partner", "value": "partner"}, {"text": "Other", "value": "other"}], "allowOther": true}', NULL, NULL, FALSE, FALSE, 12, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deals', 'source_details', NULL, 'input-multiline', NULL, NULL, NULL, FALSE, FALSE, 13, 'half', NULL, 'How did this deal originate?', NULL, FALSE, NULL, NULL, NULL),

  -- Project Link
  ('deals', 'project_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', '{"template": "{{name}}"}', TRUE, FALSE, 14, 'half', NULL, 'Project created from won deal', NULL, FALSE, NULL, NULL, NULL),

  -- Owner
  ('deals', 'owner_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'user', NULL, FALSE, FALSE, 15, 'half', NULL, 'Deal owner / account manager', NULL, FALSE, NULL, NULL, NULL),

  -- Notes
  ('deals', 'notes', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 16, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deals', 'tags', 'cast-json', 'tags', '{"iconRight": "local_offer"}', NULL, NULL, FALSE, FALSE, 17, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Audit
  ('deals', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 18, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deals', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 19, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deals', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 20, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('deals', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 21, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Deal -> Organization (many-to-one)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('deals', 'organization_id', 'organizations', 'deals', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Deal -> Contact (many-to-one)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('deals', 'contact_id', 'contacts', 'deals', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Deal -> Stage (many-to-one)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('deals', 'stage_id', 'deal_stages', 'deals', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Deal -> Project (many-to-one)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('deals', 'project_id', 'projects', 'deal', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Deal -> Owner (many-to-one)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('deals', 'owner_id', 'directus_users', 'deals', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- TRIGGER: Auto-set actual_close_date when deal moves to Won/Lost
-- =============================================================================

CREATE OR REPLACE FUNCTION update_deal_close_date()
RETURNS TRIGGER AS $$
DECLARE
  stage_is_closed BOOLEAN;
  stage_is_won BOOLEAN;
BEGIN
  -- Get stage info
  SELECT is_closed, is_won INTO stage_is_closed, stage_is_won
  FROM deal_stages
  WHERE id = NEW.stage_id;

  -- If moved to a closed stage and actual_close_date is not set
  IF stage_is_closed AND (NEW.actual_close_date IS NULL OR OLD.stage_id != NEW.stage_id) THEN
    NEW.actual_close_date := NOW();

    -- Set probability to 100 if won, 0 if lost
    IF stage_is_won THEN
      NEW.probability := 100;
    ELSE
      NEW.probability := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_deal_close_date ON deals;
CREATE TRIGGER trigger_update_deal_close_date
  BEFORE UPDATE ON deals
  FOR EACH ROW
  WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
  EXECUTE FUNCTION update_deal_close_date();

-- =============================================================================
-- SAMPLE SEED DATA
-- =============================================================================

-- Insert sample deals
INSERT INTO deals (id, title, description, value, organization_id, contact_id, stage_id, probability, expected_close_date, owner_id, source, notes, tags)
VALUES
  (
    'd5a6b7c8-e9f0-4a1b-2c3d-4e5f6a7b8c9d',
    'Enterprise License - Acme Corp',
    'Annual enterprise license with premium support',
    50000.00,
	    'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
	    (SELECT id FROM contacts WHERE email = 'john.smith@acme.example.com' LIMIT 1),
	    '015a1cf1-e3aa-42ea-a1f7-3872a9ba3db4',
	    50,
	    CURRENT_DATE + INTERVAL '30 days',
	    (SELECT id FROM directus_users WHERE email = 'admin@synthstack.app' LIMIT 1),
    'referral',
    'Strong interest in AI features',
    ARRAY['enterprise', 'priority']
  ),
  (
    'd6a7b8c9-e0f1-4a2b-3c4d-5e6f7a8b9c0d',
    'Consulting Services - Beta Industries',
    '6-month consulting engagement',
    75000.00,
	    'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c',
	    (SELECT id FROM contacts WHERE email = 'michael.brown@beta.example.com' LIMIT 1),
	    '5478c2cc-9dcb-445e-aabe-2780444eecaf',
	    75,
	    CURRENT_DATE + INTERVAL '14 days',
	    (SELECT id FROM directus_users WHERE email = 'admin@synthstack.app' LIMIT 1),
    'website',
    'Final pricing discussions underway',
    ARRAY['consulting', 'high-value']
  ),
  (
    'd7a8b9c0-e1f2-4a3b-4c5d-6e7f8a9b0c1d',
    'Startup Package - Gamma Solutions',
    'Startup tier with onboarding',
    5000.00,
	    'f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c',
	    (SELECT id FROM contacts WHERE email = 'emily.davis@gamma.example.com' LIMIT 1),
	    '04338f44-0ffd-4cb5-b835-f94859653f54',
	    25,
	    CURRENT_DATE + INTERVAL '60 days',
	    (SELECT id FROM directus_users WHERE email = 'admin@synthstack.app' LIMIT 1),
    'website',
    'Inbound demo request',
    ARRAY['startup', 'tech']
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DATABASE VIEWS FOR ANALYTICS
-- =============================================================================

-- Pipeline summary view
CREATE OR REPLACE VIEW deal_pipeline_summary AS
SELECT
  ds.id as stage_id,
  ds.name as stage_name,
  ds.color as stage_color,
  ds.order_index,
  COUNT(d.id) as deal_count,
  COALESCE(SUM(d.value), 0) as total_value,
  COALESCE(AVG(d.probability), 0) as avg_probability,
  COALESCE(SUM(d.value * d.probability / 100), 0) as weighted_value
FROM deal_stages ds
LEFT JOIN deals d ON d.stage_id = ds.id
GROUP BY ds.id, ds.name, ds.color, ds.order_index
ORDER BY ds.order_index;

-- Deals by organization
CREATE OR REPLACE VIEW deals_by_organization AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  COUNT(d.id) as total_deals,
  COUNT(d.id) FILTER (WHERE ds.is_won = TRUE) as won_deals,
  COUNT(d.id) FILTER (WHERE ds.is_closed = FALSE) as active_deals,
  COALESCE(SUM(d.value), 0) as total_deal_value,
  COALESCE(SUM(d.value) FILTER (WHERE ds.is_won = TRUE), 0) as won_deal_value
FROM organizations o
LEFT JOIN deals d ON d.organization_id = o.id
LEFT JOIN deal_stages ds ON ds.id = d.stage_id
GROUP BY o.id, o.name;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE deal_stages IS 'Sales pipeline stages for Kanban board';
COMMENT ON TABLE deals IS 'Sales opportunities with pipeline tracking';

COMMENT ON COLUMN deals.probability IS 'Win probability percentage (0-100)';
COMMENT ON COLUMN deals.expected_close_date IS 'Expected deal close date';
COMMENT ON COLUMN deals.actual_close_date IS 'Auto-set when deal moves to Won/Lost stage';
COMMENT ON COLUMN deals.project_id IS 'Linked project when deal is won';
COMMENT ON COLUMN deal_stages.is_closed IS 'Mark as closed stage (Won or Lost)';
COMMENT ON COLUMN deal_stages.is_won IS 'Mark as won stage (for automatic project creation)';

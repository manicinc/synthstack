-- Migration 032: Proposals & Templates
-- Description: Proposal builder with templates and e-signature support
-- Dependencies: Requires organizations, contacts, deals (migrations 028, 029)

-- =============================================================================
-- PROPOSAL TEMPLATES TABLE
-- =============================================================================
-- Reusable proposal templates with JSONB content structure

CREATE TABLE IF NOT EXISTS proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template Details
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Content (JSONB for flexibility)
  content JSONB, -- Structured content blocks
  /*
  Example structure:
  {
    "sections": [
      {
        "type": "intro",
        "title": "Executive Summary",
        "content": "<p>Introduction text...</p>"
      },
      {
        "type": "pricing",
        "title": "Investment",
        "items": [
          {"description": "...", "price": 5000}
        ]
      },
      {
        "type": "terms",
        "title": "Terms & Conditions",
        "content": "<p>Legal text...</p>"
      }
    ]
  }
  */

  -- Category
  category VARCHAR(100), -- 'consulting', 'development', 'retainer', 'project', etc.

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,

  -- Audit Fields
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposal_templates_active ON proposal_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_proposal_templates_default ON proposal_templates(is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_proposal_templates_category ON proposal_templates(category);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_proposal_templates_timestamp ON proposal_templates;
CREATE TRIGGER update_proposal_templates_timestamp
  BEFORE UPDATE ON proposal_templates
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- PROPOSALS TABLE
-- =============================================================================
-- Client proposals with e-signature tracking

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Proposal Details
  title VARCHAR(255) NOT NULL,
  proposal_number VARCHAR(50) UNIQUE NOT NULL,

  -- Relationships
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,

  -- Template
  template_id UUID REFERENCES proposal_templates(id) ON DELETE SET NULL,

  -- Content (can be customized from template)
  content JSONB,

  -- Value
  total_value DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',

  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),

  -- Dates
  sent_date TIMESTAMPTZ,
  viewed_date TIMESTAMPTZ,
  response_date TIMESTAMPTZ, -- Date accepted or rejected
  valid_until DATE, -- Expiration date

  -- E-signature
  signature_data TEXT, -- Base64 image or signature JSON
  signer_name VARCHAR(255),
  signer_title VARCHAR(255),
  signature_date TIMESTAMPTZ,
  signature_ip VARCHAR(45),
  signature_user_agent TEXT,

  -- PDF Generation
  pdf_url TEXT, -- Link to generated PDF

  -- Notes
  notes TEXT,
  internal_notes TEXT,

  -- Audit Fields
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposals_organization ON proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_contact ON proposals(contact_id);
CREATE INDEX IF NOT EXISTS idx_proposals_deal ON proposals(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_template ON proposals(template_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_sent_date ON proposals(sent_date);
CREATE INDEX IF NOT EXISTS idx_proposals_valid_until ON proposals(valid_until);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_proposals_timestamp ON proposals;
CREATE TRIGGER update_proposals_timestamp
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- PROPOSAL NUMBER GENERATION SEQUENCE
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS proposal_number_seq START 1;

-- Function to generate proposal number
CREATE OR REPLACE FUNCTION generate_proposal_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_num INTEGER;
  proposal_num VARCHAR(50);
BEGIN
  next_num := nextval('proposal_number_seq');
  proposal_num := 'PROP-' || LPAD(next_num::TEXT, 4, '0');
  RETURN proposal_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate proposal number
CREATE OR REPLACE FUNCTION set_proposal_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.proposal_number IS NULL OR NEW.proposal_number = '' THEN
    NEW.proposal_number := generate_proposal_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_proposal_number ON proposals;
CREATE TRIGGER trigger_set_proposal_number
  BEFORE INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION set_proposal_number();

-- =============================================================================
-- TRIGGER: Auto-set sent_date when status changes to 'sent'
-- =============================================================================

CREATE OR REPLACE FUNCTION set_proposal_sent_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' AND NEW.sent_date IS NULL THEN
    NEW.sent_date := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_proposal_sent_date ON proposals;
CREATE TRIGGER trigger_set_proposal_sent_date
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION set_proposal_sent_date();

-- =============================================================================
-- TRIGGER: Auto-set response_date when accepted/rejected
-- =============================================================================

CREATE OR REPLACE FUNCTION set_proposal_response_date()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'accepted' OR NEW.status = 'rejected') AND
     (OLD.status != 'accepted' AND OLD.status != 'rejected') AND
     NEW.response_date IS NULL THEN
    NEW.response_date := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_proposal_response_date ON proposals;
CREATE TRIGGER trigger_set_proposal_response_date
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION set_proposal_response_date();

-- =============================================================================
-- TRIGGER: Check if proposal is expired
-- =============================================================================

CREATE OR REPLACE FUNCTION check_proposal_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- If valid_until has passed and status is still sent/viewed, mark as expired
  IF NEW.valid_until < CURRENT_DATE AND
     NEW.status IN ('sent', 'viewed') THEN
    NEW.status := 'expired';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_proposal_expiration ON proposals;
CREATE TRIGGER trigger_check_proposal_expiration
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION check_proposal_expiration();

-- =============================================================================
-- SEED DEFAULT PROPOSAL TEMPLATES
-- =============================================================================

INSERT INTO proposal_templates (id, name, description, category, is_active, is_default, content)
VALUES
  (
    'c9daa86b-95c4-4e57-99c9-d55c6804f33f',
    'Standard Consulting Proposal',
    'Template for consulting engagements',
    'consulting',
    TRUE,
    TRUE,
    '{
      "sections": [
        {
          "type": "intro",
          "title": "Executive Summary",
          "content": "<p>Thank you for the opportunity to present this proposal...</p>"
        },
        {
          "type": "scope",
          "title": "Scope of Work",
          "content": "<p>Our engagement will include the following deliverables...</p>"
        },
        {
          "type": "pricing",
          "title": "Investment",
          "items": [
            {"description": "Strategy & Planning", "price": 15000},
            {"description": "Implementation", "price": 35000},
            {"description": "Training & Support", "price": 10000}
          ]
        },
        {
          "type": "timeline",
          "title": "Project Timeline",
          "content": "<p>Phase 1: Discovery (2 weeks)<br>Phase 2: Implementation (8 weeks)<br>Phase 3: Launch (2 weeks)</p>"
        },
        {
          "type": "terms",
          "title": "Terms & Conditions",
          "content": "<p>Payment terms: 50% upfront, 50% upon completion...</p>"
        }
      ]
    }'::jsonb
  ),
  (
    '705c8d32-1d66-4ec0-a58e-5cb6f90a2406',
    'Software Development Proposal',
    'Template for custom development projects',
    'development',
    TRUE,
    FALSE,
    '{
      "sections": [
        {
          "type": "intro",
          "title": "Project Overview",
          "content": "<p>We are excited to propose a custom software solution...</p>"
        },
        {
          "type": "features",
          "title": "Features & Functionality",
          "content": "<ul><li>User authentication</li><li>Dashboard</li><li>Reporting</li></ul>"
        },
        {
          "type": "pricing",
          "title": "Investment",
          "items": [
            {"description": "Discovery & Design", "price": 10000},
            {"description": "Development (MVP)", "price": 50000},
            {"description": "Testing & QA", "price": 8000},
            {"description": "Deployment & Support", "price": 7000}
          ]
        },
        {
          "type": "terms",
          "title": "Terms & Conditions",
          "content": "<p>Payment schedule: 30% at project start, 40% at mid-point, 30% at delivery...</p>"
        }
      ]
    }'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, archive_field, archive_value, unarchive_value)
VALUES
  ('proposal_templates', 'description', 'Reusable proposal templates', '{{name}}', 'name', 'is_active', FALSE, TRUE),
  ('proposals', 'article', 'Client proposals with e-signatures', 'Proposal {{proposal_number}}', '-date_created', 'status', 'rejected', 'draft')
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Proposal Templates Fields
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
  ('proposal_templates', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposal_templates', 'name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 2, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('proposal_templates', 'description', NULL, 'input-multiline', NULL, NULL, NULL, FALSE, FALSE, 3, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposal_templates', 'content', 'cast-json', 'input-code', '{"language": "json"}', NULL, NULL, FALSE, FALSE, 4, 'full', NULL, 'Structured content blocks (JSON)', NULL, FALSE, NULL, NULL, NULL),
  ('proposal_templates', 'category', NULL, 'select-dropdown', '{"choices": [{"text": "Consulting", "value": "consulting"}, {"text": "Development", "value": "development"}, {"text": "Retainer", "value": "retainer"}, {"text": "Project", "value": "project"}, {"text": "Other", "value": "other"}], "allowOther": true}', NULL, NULL, FALSE, FALSE, 5, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposal_templates', 'is_active', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 6, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposal_templates', 'is_default', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 7, 'half', NULL, 'Use as default template', NULL, FALSE, NULL, NULL, NULL),
  ('proposal_templates', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 8, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposal_templates', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 9, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Proposals Fields
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
  ('proposals', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 2, 'full', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('proposals', 'proposal_number', NULL, 'input', '{"iconLeft": "article", "placeholder": "Auto-generated"}', NULL, NULL, TRUE, FALSE, 3, 'half', NULL, 'Auto-generated on save', NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Draft", "value": "draft"}, {"text": "Sent", "value": "sent"}, {"text": "Viewed", "value": "viewed"}, {"text": "Accepted", "value": "accepted"}, {"text": "Rejected", "value": "rejected"}, {"text": "Expired", "value": "expired"}]}', 'labels', '{"choices": [{"text": "Draft", "value": "draft", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Sent", "value": "sent", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "Viewed", "value": "viewed", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Accepted", "value": "accepted", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Rejected", "value": "rejected", "foreground": "#FFFFFF", "background": "#EF4444"}, {"text": "Expired", "value": "expired", "foreground": "#FFFFFF", "background": "#6B7280"}]}', FALSE, FALSE, 4, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Relationships
  ('proposals', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', '{"template": "{{name}}"}', FALSE, FALSE, 5, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('proposals', 'contact_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'related-values', '{"template": "{{first_name}} {{last_name}}"}', FALSE, FALSE, 6, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'deal_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{title}}"}', 'related-values', '{"template": "{{title}}"}', FALSE, FALSE, 7, 'half', NULL, 'Optional deal link', NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'template_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', '{"template": "{{name}}"}', FALSE, FALSE, 8, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Content
  ('proposals', 'content', 'cast-json', 'input-code', '{"language": "json"}', NULL, NULL, FALSE, FALSE, 9, 'full', NULL, 'Customized proposal content (JSON)', NULL, FALSE, NULL, NULL, NULL),

  -- Value
  ('proposals', 'total_value', NULL, 'input', '{"iconLeft": "$", "placeholder": "0.00"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', FALSE, FALSE, 10, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'currency', NULL, 'select-dropdown', '{"choices": [{"text": "USD", "value": "USD"}, {"text": "EUR", "value": "EUR"}, {"text": "GBP", "value": "GBP"}]}', NULL, NULL, FALSE, FALSE, 11, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Dates
  ('proposals', 'sent_date', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 12, 'half', NULL, 'Auto-set when sent', NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'viewed_date', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', FALSE, FALSE, 13, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'response_date', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 14, 'half', NULL, 'Auto-set when accepted/rejected', NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'valid_until', NULL, 'datetime', '{"includeSeconds": false}', 'datetime', '{"format": "short"}', FALSE, FALSE, 15, 'half', NULL, 'Expiration date', NULL, FALSE, NULL, NULL, NULL),

  -- E-signature
  ('proposals', 'signature_data', NULL, 'input-code', '{"language": "text"}', NULL, NULL, TRUE, FALSE, 16, 'full', NULL, 'Signature image or JSON data', NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'signer_name', NULL, 'input', NULL, NULL, NULL, TRUE, FALSE, 17, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'signer_title', NULL, 'input', NULL, NULL, NULL, TRUE, FALSE, 18, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'signature_date', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 19, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'signature_ip', NULL, 'input', NULL, NULL, NULL, TRUE, TRUE, 20, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'signature_user_agent', NULL, 'input', NULL, NULL, NULL, TRUE, TRUE, 21, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- PDF
  ('proposals', 'pdf_url', NULL, 'input', '{"iconRight": "link"}', NULL, NULL, TRUE, FALSE, 22, 'full', NULL, 'Generated PDF link', NULL, FALSE, NULL, NULL, NULL),

  -- Notes
  ('proposals', 'notes', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 23, 'full', NULL, 'Visible to client', NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'internal_notes', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 24, 'full', NULL, 'Internal only', NULL, FALSE, NULL, NULL, NULL),

  -- Audit
  ('proposals', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 25, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 26, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 27, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('proposals', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 28, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Proposal -> Organization
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('proposals', 'organization_id', 'organizations', 'proposals', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Proposal -> Contact
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('proposals', 'contact_id', 'contacts', 'proposals', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Proposal -> Deal
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('proposals', 'deal_id', 'deals', 'proposals', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Proposal -> Template
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('proposals', 'template_id', 'proposal_templates', NULL, NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SAMPLE SEED DATA
-- =============================================================================

-- Insert sample proposal
INSERT INTO proposals (organization_id, contact_id, deal_id, template_id, title, status, total_value, valid_until, content)
VALUES
  (
	    'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', -- Acme Corp
	    (SELECT id FROM contacts WHERE email = 'john.smith@acme.example.com' LIMIT 1),
	    'd5a6b7c8-e9f0-4a1b-2c3d-4e5f6a7b8c9d', -- Sample deal
	    'c9daa86b-95c4-4e57-99c9-d55c6804f33f',
	    'Enterprise AI Integration - Strategic Consulting',
	    'sent',
    60000.00,
    CURRENT_DATE + INTERVAL '30 days',
    '{
      "sections": [
        {
          "type": "intro",
          "title": "Executive Summary",
          "content": "<p>Thank you for the opportunity to present our proposal for strategic AI integration consulting services for Acme Corporation.</p>"
        },
        {
          "type": "scope",
          "title": "Scope of Work",
          "content": "<p>Our engagement will include:<ul><li>AI readiness assessment</li><li>Custom strategy development</li><li>Implementation roadmap</li><li>Team training</li></ul></p>"
        },
        {
          "type": "pricing",
          "title": "Investment",
          "items": [
            {"description": "Discovery & Assessment", "price": 15000},
            {"description": "Strategy Development", "price": 25000},
            {"description": "Implementation Planning", "price": 15000},
            {"description": "Training & Support", "price": 5000}
          ]
        },
        {
          "type": "timeline",
          "title": "Project Timeline",
          "content": "<p><strong>Phase 1:</strong> Discovery (3 weeks)<br><strong>Phase 2:</strong> Strategy (4 weeks)<br><strong>Phase 3:</strong> Implementation Planning (3 weeks)<br><strong>Phase 4:</strong> Training (2 weeks)</p>"
        },
        {
          "type": "terms",
          "title": "Terms & Conditions",
          "content": "<p><strong>Payment Terms:</strong> 40% upon project start, 40% at mid-point, 20% upon completion.<br><strong>Valid Until:</strong> This proposal is valid for 30 days from the date sent.</p>"
        }
      ]
    }'::jsonb
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DATABASE VIEWS FOR ANALYTICS
-- =============================================================================

-- Proposals summary
CREATE OR REPLACE VIEW proposals_summary AS
SELECT
  p.id,
  p.proposal_number,
  p.title,
  p.status,
  p.total_value,
  p.sent_date,
  p.viewed_date,
  p.response_date,
  p.valid_until,
  o.id as organization_id,
  o.name as organization_name,
  c.first_name || ' ' || c.last_name as contact_name,
  d.id as deal_id,
  d.title as deal_title,
  CASE
    WHEN p.status = 'accepted' THEN 'Won'
    WHEN p.status = 'rejected' THEN 'Lost'
    WHEN p.status = 'expired' THEN 'Expired'
    WHEN p.valid_until < CURRENT_DATE THEN 'Expired'
    WHEN p.status = 'viewed' THEN 'Under Review'
    WHEN p.status = 'sent' THEN 'Awaiting Review'
    ELSE 'Draft'
  END as status_label
FROM proposals p
JOIN organizations o ON o.id = p.organization_id
LEFT JOIN contacts c ON c.id = p.contact_id
LEFT JOIN deals d ON d.id = p.deal_id;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE proposal_templates IS 'Reusable proposal templates with JSONB content structure';
COMMENT ON TABLE proposals IS 'Client proposals with e-signature support';

COMMENT ON COLUMN proposals.content IS 'JSONB structured content blocks (can be customized from template)';
COMMENT ON COLUMN proposals.signature_data IS 'Base64 image or signature JSON data';
COMMENT ON COLUMN proposals.valid_until IS 'Proposal expiration date';

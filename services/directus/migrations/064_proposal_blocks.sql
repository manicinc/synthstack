-- Migration: 064_proposal_blocks.sql
-- Description: Block-based proposal content system with e-signature
-- Dependencies: 032_proposals.sql (if exists), 028_organizations_contacts.sql

-- =============================================================================
-- ENHANCE PROPOSALS TABLE (if not exists, create it)
-- =============================================================================

-- Create proposals table if it doesn't exist
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  title VARCHAR(255) NOT NULL,
  summary TEXT,

  -- Client
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Pricing
  total_value DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Validity
  valid_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Public URL
  public_token VARCHAR(64) UNIQUE,
  public_url VARCHAR(500),

  -- PDF generation
  pdf_url VARCHAR(500),
  pdf_generated_at TIMESTAMPTZ,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_organization ON proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_project ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_public_token ON proposals(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_valid_until ON proposals(valid_until);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_proposals_timestamp ON proposals;
CREATE TRIGGER update_proposals_timestamp
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- PROPOSAL CONTACTS (recipients)
-- =============================================================================

CREATE TABLE IF NOT EXISTS proposal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Role
  role VARCHAR(50) DEFAULT 'recipient' CHECK (role IN ('recipient', 'signer', 'cc')),

  -- Email tracking
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,

  -- Sort order
  sort INTEGER DEFAULT 0,

  UNIQUE(proposal_id, contact_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposal_contacts_proposal ON proposal_contacts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_contacts_contact ON proposal_contacts(contact_id);

-- =============================================================================
-- PROPOSAL BLOCKS (content sections)
-- =============================================================================

CREATE TABLE IF NOT EXISTS proposal_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,

  -- Block type (polymorphic reference)
  collection VARCHAR(100) NOT NULL, -- 'block_richtext', 'block_pricing', 'block_team', etc.
  item UUID, -- ID of the actual block content

  -- Display settings
  is_page_break BOOLEAN DEFAULT false,

  -- Sort order
  sort INTEGER DEFAULT 0,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposal_blocks_proposal ON proposal_blocks(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_blocks_sort ON proposal_blocks(sort);

-- =============================================================================
-- PROPOSAL APPROVALS (e-signatures)
-- =============================================================================

CREATE TABLE IF NOT EXISTS proposal_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Signer info (can be different from contact)
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  organization_name VARCHAR(255),
  job_title VARCHAR(255),

  -- Signature status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined')),

  -- Signature data
  signature_type VARCHAR(50) DEFAULT 'text' CHECK (signature_type IN ('text', 'draw', 'upload')),
  signature_text VARCHAR(255), -- Typed name
  signature_image UUID REFERENCES directus_files(id), -- Drawn/uploaded signature

  -- Legal agreements
  esignature_agreement BOOLEAN DEFAULT false,
  terms_accepted BOOLEAN DEFAULT false,

  -- Verification
  ip_address INET,
  user_agent TEXT,
  metadata JSONB, -- Additional verification data

  -- Timestamps
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposal_approvals_proposal ON proposal_approvals(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_approvals_email ON proposal_approvals(email);
CREATE INDEX IF NOT EXISTS idx_proposal_approvals_status ON proposal_approvals(status);

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, archive_field, archive_value, unarchive_value, sort)
VALUES
  ('proposals', 'description', 'Client proposals with e-signature', '{{title}}', NULL, 'status', 'expired', 'draft', 50),
  ('proposal_contacts', 'people', 'Proposal recipients', '{{contact_id.first_name}} {{contact_id.last_name}}', 'sort', NULL, NULL, NULL, 51),
  ('proposal_blocks', 'view_list', 'Content blocks within proposals', NULL, 'sort', NULL, NULL, NULL, 52),
  ('proposal_approvals', 'verified', 'E-signature approvals', '{{email}} - {{status}}', NULL, NULL, NULL, NULL, 53)
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Proposals Fields
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
  ('proposals', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('proposals', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Draft", "value": "draft"}, {"text": "Sent", "value": "sent"}, {"text": "Viewed", "value": "viewed"}, {"text": "Accepted", "value": "accepted"}, {"text": "Rejected", "value": "rejected"}, {"text": "Expired", "value": "expired"}]}', 'labels', '{"choices": [{"text": "Draft", "value": "draft", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Sent", "value": "sent", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "Viewed", "value": "viewed", "foreground": "#FFFFFF", "background": "#8B5CF6"}, {"text": "Accepted", "value": "accepted", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Rejected", "value": "rejected", "foreground": "#FFFFFF", "background": "#EF4444"}, {"text": "Expired", "value": "expired", "foreground": "#FFFFFF", "background": "#F59E0B"}]}', FALSE, FALSE, 2, 'half', NULL, FALSE),
  ('proposals', 'title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 3, 'half', 'Proposal title', TRUE),
  ('proposals', 'summary', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 4, 'full', 'Executive summary', FALSE),
  ('proposals', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 5, 'half', NULL, FALSE),
  ('proposals', 'project_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 6, 'half', 'Link to project (optional)', FALSE),
  ('proposals', 'total_value', NULL, 'input', '{"iconLeft": "$", "min": 0}', NULL, NULL, FALSE, FALSE, 7, 'half', 'Total proposal value', FALSE),
  ('proposals', 'currency', NULL, 'select-dropdown', '{"choices": [{"text": "USD", "value": "USD"}, {"text": "EUR", "value": "EUR"}, {"text": "GBP", "value": "GBP"}, {"text": "CAD", "value": "CAD"}, {"text": "AUD", "value": "AUD"}]}', NULL, NULL, FALSE, FALSE, 8, 'half', NULL, FALSE),
  ('proposals', 'valid_until', NULL, 'datetime', NULL, 'datetime', '{"relative": false}', FALSE, FALSE, 9, 'half', 'Proposal expiration', FALSE),
  ('proposals', 'sent_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 10, 'half', NULL, FALSE),
  ('proposals', 'viewed_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 11, 'half', NULL, FALSE),
  ('proposals', 'accepted_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 12, 'half', NULL, FALSE),
  ('proposals', 'rejected_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 13, 'half', NULL, FALSE),
  ('proposals', 'public_token', NULL, 'input', NULL, NULL, NULL, TRUE, TRUE, 14, 'half', NULL, FALSE),
  ('proposals', 'public_url', NULL, 'input', '{"iconRight": "link"}', NULL, NULL, TRUE, FALSE, 15, 'full', 'Shareable link', FALSE),
  ('proposals', 'pdf_url', NULL, 'input', '{"iconRight": "picture_as_pdf"}', NULL, NULL, TRUE, FALSE, 16, 'full', 'Generated PDF', FALSE),
  ('proposals', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 17, 'half', NULL, FALSE),
  ('proposals', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 18, 'half', NULL, FALSE),
  ('proposals', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 19, 'half', NULL, FALSE),
  ('proposals', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 20, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Proposal Approvals Fields
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
  ('proposal_approvals', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('proposal_approvals', 'proposal_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{title}}"}', 'related-values', NULL, FALSE, FALSE, 2, 'full', NULL, TRUE),
  ('proposal_approvals', 'contact_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'related-values', NULL, FALSE, FALSE, 3, 'half', NULL, FALSE),
  ('proposal_approvals', 'email', NULL, 'input', '{"iconRight": "email"}', NULL, NULL, FALSE, FALSE, 4, 'half', 'Signer email', TRUE),
  ('proposal_approvals', 'first_name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 5, 'half', NULL, FALSE),
  ('proposal_approvals', 'last_name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 6, 'half', NULL, FALSE),
  ('proposal_approvals', 'organization_name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 7, 'half', NULL, FALSE),
  ('proposal_approvals', 'job_title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 8, 'half', NULL, FALSE),
  ('proposal_approvals', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Pending", "value": "pending"}, {"text": "Signed", "value": "signed"}, {"text": "Declined", "value": "declined"}]}', 'labels', '{"choices": [{"text": "Pending", "value": "pending", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Signed", "value": "signed", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Declined", "value": "declined", "foreground": "#FFFFFF", "background": "#EF4444"}]}', FALSE, FALSE, 9, 'half', NULL, FALSE),
  ('proposal_approvals', 'signature_type', NULL, 'select-dropdown', '{"choices": [{"text": "Typed", "value": "text"}, {"text": "Drawn", "value": "draw"}, {"text": "Uploaded", "value": "upload"}]}', NULL, NULL, FALSE, FALSE, 10, 'half', NULL, FALSE),
  ('proposal_approvals', 'signature_text', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 11, 'half', 'Typed signature', FALSE),
  ('proposal_approvals', 'signature_image', 'file', 'file-image', NULL, 'image', NULL, FALSE, FALSE, 12, 'full', 'Drawn/uploaded signature', FALSE),
  ('proposal_approvals', 'esignature_agreement', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 13, 'half', 'Agreed to e-signature', FALSE),
  ('proposal_approvals', 'signed_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 14, 'half', NULL, FALSE),
  ('proposal_approvals', 'ip_address', NULL, 'input', NULL, NULL, NULL, TRUE, TRUE, 15, 'half', NULL, FALSE),
  ('proposal_approvals', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 16, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Proposals -> Organization
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('proposals', 'organization_id', 'organizations', 'proposals', 'nullify')
ON CONFLICT DO NOTHING;

-- Proposals -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('proposals', 'project_id', 'projects', 'proposals', 'nullify')
ON CONFLICT DO NOTHING;

-- Proposal Contacts -> Proposal
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('proposal_contacts', 'proposal_id', 'proposals', 'contacts', 'nullify')
ON CONFLICT DO NOTHING;

-- Proposal Contacts -> Contact
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('proposal_contacts', 'contact_id', 'contacts', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Proposal Blocks -> Proposal
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('proposal_blocks', 'proposal_id', 'proposals', 'blocks', 'nullify')
ON CONFLICT DO NOTHING;

-- Proposal Approvals -> Proposal
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('proposal_approvals', 'proposal_id', 'proposals', 'approvals', 'nullify')
ON CONFLICT DO NOTHING;

-- Proposal Approvals -> Contact
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('proposal_approvals', 'contact_id', 'contacts', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- GENERATE PUBLIC TOKEN TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_proposal_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_token IS NULL THEN
    NEW.public_token = encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_proposal_token ON proposals;
CREATE TRIGGER trigger_proposal_token
  BEFORE INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION generate_proposal_token();

-- =============================================================================
-- FEATURE FLAGS
-- =============================================================================

INSERT INTO feature_flags (key, name, description, category, is_enabled, is_premium, min_tier, sort_order)
VALUES
  ('proposal_esignature', 'E-Signature', 'Enable electronic signatures on proposals', 'proposals', true, true, 'premium', 400),
  ('proposal_blocks', 'Block-based Proposals', 'Use block-based proposal builder', 'proposals', true, false, 'subscriber', 401),
  ('proposal_pdf', 'PDF Generation', 'Generate PDF versions of proposals', 'proposals', true, false, 'subscriber', 402)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE proposals IS 'Client proposals with block-based content and e-signature';
COMMENT ON TABLE proposal_contacts IS 'Recipients and signers for proposals';
COMMENT ON TABLE proposal_blocks IS 'Content blocks within proposals (polymorphic)';
COMMENT ON TABLE proposal_approvals IS 'E-signature records with legal verification';
COMMENT ON COLUMN proposal_approvals.ip_address IS 'IP address of signer for legal verification';

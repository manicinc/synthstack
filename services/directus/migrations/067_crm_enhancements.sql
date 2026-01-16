-- Migration: 067_crm_enhancements.sql
-- Description: Additional CRM enhancements - organization addresses and notes
-- Dependencies: 028_organizations_contacts.sql

-- =============================================================================
-- ORGANIZATION ADDRESSES
-- =============================================================================
-- Multiple addresses per organization (headquarters, billing, shipping, etc.)

CREATE TABLE IF NOT EXISTS organization_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Address Type
  address_type VARCHAR(50) DEFAULT 'office' CHECK (address_type IN ('headquarters', 'office', 'billing', 'shipping', 'warehouse', 'other')),
  label VARCHAR(100), -- Custom label e.g., "NYC Office"

  -- Address Details
  street_address TEXT,
  street_address_2 TEXT,
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),

  -- Contact at this location
  phone VARCHAR(50),
  fax VARCHAR(50),

  -- Primary flags
  is_primary_billing BOOLEAN DEFAULT false,
  is_primary_shipping BOOLEAN DEFAULT false,
  is_headquarters BOOLEAN DEFAULT false,

  -- Sort
  sort INTEGER DEFAULT 0,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_addresses_organization ON organization_addresses(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_addresses_type ON organization_addresses(address_type);
CREATE INDEX IF NOT EXISTS idx_org_addresses_primary_billing ON organization_addresses(is_primary_billing) WHERE is_primary_billing = TRUE;
CREATE INDEX IF NOT EXISTS idx_org_addresses_primary_shipping ON organization_addresses(is_primary_shipping) WHERE is_primary_shipping = TRUE;

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_org_addresses_timestamp ON organization_addresses;
CREATE TRIGGER update_org_addresses_timestamp
  BEFORE UPDATE ON organization_addresses
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- ORGANIZATION NOTES / HISTORY
-- =============================================================================
-- Activity log and notes for organizations

CREATE TABLE IF NOT EXISTS organization_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Note Type
  note_type VARCHAR(50) DEFAULT 'note' CHECK (note_type IN ('note', 'call_log', 'meeting_note', 'status_change', 'document', 'other')),

  -- Content
  title VARCHAR(255),
  content TEXT,

  -- Pinned notes appear at top
  is_pinned BOOLEAN DEFAULT false,

  -- Visibility
  is_internal BOOLEAN DEFAULT true, -- Only team can see

  -- Related activity (optional)
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_notes_organization ON organization_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_notes_type ON organization_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_org_notes_pinned ON organization_notes(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_org_notes_date ON organization_notes(date_created DESC);

-- =============================================================================
-- CONTACT NOTES
-- =============================================================================

CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Note Type
  note_type VARCHAR(50) DEFAULT 'note' CHECK (note_type IN ('note', 'call_log', 'meeting_note', 'interaction', 'other')),

  -- Content
  title VARCHAR(255),
  content TEXT,

  -- Pinned
  is_pinned BOOLEAN DEFAULT false,

  -- Related activity
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_type ON contact_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_contact_notes_pinned ON contact_notes(is_pinned) WHERE is_pinned = TRUE;

-- =============================================================================
-- ENHANCE CONTACTS TABLE
-- =============================================================================

-- Add additional fields to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS avatar UUID REFERENCES directus_files(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source VARCHAR(100); -- How they became a contact
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- =============================================================================
-- ENHANCE ORGANIZATIONS TABLE
-- =============================================================================

-- Add additional fields to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo UUID REFERENCES directus_files(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS founded_year INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS twitter_handle VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(500);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS source VARCHAR(100); -- Lead source
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, hidden, sort)
VALUES
  ('organization_addresses', 'place', 'Organization addresses', '{{label}} - {{city}}', 'sort', true, 70),
  ('organization_notes', 'note', 'Notes and history for organizations', '{{title}}', NULL, true, 71),
  ('contact_notes', 'note', 'Notes for contacts', '{{title}}', NULL, true, 72)
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Organization Addresses Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('organization_addresses', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('organization_addresses', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 2, 'full', NULL, TRUE),
  ('organization_addresses', 'address_type', NULL, 'select-dropdown', '{"choices": [{"text": "Headquarters", "value": "headquarters"}, {"text": "Office", "value": "office"}, {"text": "Billing", "value": "billing"}, {"text": "Shipping", "value": "shipping"}, {"text": "Warehouse", "value": "warehouse"}, {"text": "Other", "value": "other"}]}', 'labels', '{"choices": [{"text": "Headquarters", "value": "headquarters", "foreground": "#FFFFFF", "background": "#6366F1"}, {"text": "Office", "value": "office", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "Billing", "value": "billing", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Shipping", "value": "shipping", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Warehouse", "value": "warehouse", "foreground": "#FFFFFF", "background": "#8B5CF6"}, {"text": "Other", "value": "other", "foreground": "#FFFFFF", "background": "#6B7280"}]}', FALSE, FALSE, 3, 'half', NULL, FALSE),
  ('organization_addresses', 'label', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 4, 'half', 'Custom label e.g., NYC Office', FALSE),
  ('organization_addresses', 'street_address', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 5, 'full', NULL, FALSE),
  ('organization_addresses', 'street_address_2', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 6, 'full', 'Suite, floor, etc.', FALSE),
  ('organization_addresses', 'city', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 7, 'half', NULL, FALSE),
  ('organization_addresses', 'state_province', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 8, 'half', NULL, FALSE),
  ('organization_addresses', 'postal_code', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 9, 'half', NULL, FALSE),
  ('organization_addresses', 'country', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 10, 'half', NULL, FALSE),
  ('organization_addresses', 'phone', NULL, 'input', '{"iconRight": "phone"}', NULL, NULL, FALSE, FALSE, 11, 'half', NULL, FALSE),
  ('organization_addresses', 'is_primary_billing', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 12, 'half', NULL, FALSE),
  ('organization_addresses', 'is_primary_shipping', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 13, 'half', NULL, FALSE),
  ('organization_addresses', 'is_headquarters', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 14, 'half', NULL, FALSE),
  ('organization_addresses', 'sort', NULL, 'input', '{"min": 0}', NULL, NULL, FALSE, TRUE, 15, 'half', NULL, FALSE),
  ('organization_addresses', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 16, 'half', NULL, FALSE),
  ('organization_addresses', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 17, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Organization Notes Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('organization_notes', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('organization_notes', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 2, 'full', NULL, TRUE),
  ('organization_notes', 'note_type', NULL, 'select-dropdown', '{"choices": [{"text": "Note", "value": "note"}, {"text": "Call Log", "value": "call_log"}, {"text": "Meeting Note", "value": "meeting_note"}, {"text": "Status Change", "value": "status_change"}, {"text": "Document", "value": "document"}, {"text": "Other", "value": "other"}]}', NULL, NULL, FALSE, FALSE, 3, 'half', NULL, FALSE),
  ('organization_notes', 'title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 4, 'half', NULL, FALSE),
  ('organization_notes', 'content', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 5, 'full', NULL, FALSE),
  ('organization_notes', 'is_pinned', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 6, 'half', 'Pin to top', FALSE),
  ('organization_notes', 'is_internal', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 7, 'half', 'Internal only', FALSE),
  ('organization_notes', 'activity_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 8, 'half', 'Related activity', FALSE),
  ('organization_notes', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 9, 'half', NULL, FALSE),
  ('organization_notes', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, FALSE, 10, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Add new fields to organizations in Directus
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('organizations', 'logo', 'file', 'file-image', NULL, 'image', '{"circle": false}', FALSE, FALSE, 25, 'half', 'Company logo', FALSE),
  ('organizations', 'founded_year', NULL, 'input', '{"min": 1800, "max": 2100}', NULL, NULL, FALSE, FALSE, 26, 'half', NULL, FALSE),
  ('organizations', 'description', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 27, 'full', 'Company description', FALSE),
  ('organizations', 'linkedin_url', NULL, 'input', '{"iconRight": "link", "placeholder": "https://linkedin.com/company/..."}', NULL, NULL, FALSE, FALSE, 28, 'half', NULL, FALSE),
  ('organizations', 'twitter_handle', NULL, 'input', '{"iconLeft": "@"}', NULL, NULL, FALSE, FALSE, 29, 'half', NULL, FALSE),
  ('organizations', 'source', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 30, 'half', 'How they became a lead', FALSE),
  ('organizations', 'last_contacted_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 31, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Add new fields to contacts in Directus
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('contacts', 'avatar', 'file', 'file-image', NULL, 'image', '{"circle": true}', FALSE, FALSE, 25, 'half', NULL, FALSE),
  ('contacts', 'birthday', NULL, 'datetime', '{"includeSeconds": false}', 'datetime', NULL, FALSE, FALSE, 26, 'half', NULL, FALSE),
  ('contacts', 'timezone', NULL, 'input', '{"placeholder": "America/New_York"}', NULL, NULL, FALSE, FALSE, 27, 'half', NULL, FALSE),
  ('contacts', 'language', NULL, 'select-dropdown', '{"choices": [{"text": "English", "value": "en"}, {"text": "Spanish", "value": "es"}, {"text": "French", "value": "fr"}, {"text": "German", "value": "de"}, {"text": "Chinese", "value": "zh"}, {"text": "Japanese", "value": "ja"}]}', NULL, NULL, FALSE, FALSE, 28, 'half', NULL, FALSE),
  ('contacts', 'source', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 29, 'half', 'How they became a contact', FALSE),
  ('contacts', 'tags', 'cast-json', 'tags', NULL, 'labels', NULL, FALSE, FALSE, 30, 'full', NULL, FALSE),
  ('contacts', 'last_contacted_at', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, FALSE, 31, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Organization Addresses -> Organization
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('organization_addresses', 'organization_id', 'organizations', 'addresses', 'nullify')
ON CONFLICT DO NOTHING;

-- Organization Notes -> Organization
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('organization_notes', 'organization_id', 'organizations', 'notes', 'nullify')
ON CONFLICT DO NOTHING;

-- Organization Notes -> Activity
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('organization_notes', 'activity_id', 'activities', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Contact Notes -> Contact
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('contact_notes', 'contact_id', 'contacts', 'notes', 'nullify')
ON CONFLICT DO NOTHING;

-- Contact Notes -> Activity
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('contact_notes', 'activity_id', 'activities', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Organizations -> Logo
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('organizations', 'logo', 'directus_files', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Contacts -> Avatar
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('contacts', 'avatar', 'directus_files', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE organization_addresses IS 'Multiple addresses per organization';
COMMENT ON TABLE organization_notes IS 'Notes and activity history for organizations';
COMMENT ON TABLE contact_notes IS 'Notes for individual contacts';

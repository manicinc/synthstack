-- ============================================
-- Migration 072: Extend Organizations & Contacts for AgencyOS
-- ============================================
-- Extends existing organizations and contacts tables with AgencyOS fields
-- Creates many-to-many relationship between organizations and contacts
-- ============================================

-- Extend Organizations Table
-- Add AgencyOS-specific fields that don't conflict with existing schema
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo UUID REFERENCES directus_files(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS payment_terms UUID REFERENCES os_payment_terms(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ap_contact UUID REFERENCES contacts(id); -- Accounts Payable contact
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner UUID REFERENCES directus_users(id); -- Deal owner (different from account_manager)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS branding JSONB; -- Brand assets, guidelines
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing JSONB; -- Billing configuration

-- Add indexes for new organization fields
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner);
CREATE INDEX IF NOT EXISTS idx_organizations_payment_terms ON organizations(payment_terms);
CREATE INDEX IF NOT EXISTS idx_organizations_logo ON organizations(logo);

-- Extend Contacts Table
-- Add AgencyOS-specific fields
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_notes TEXT; -- Separate from general notes
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES directus_users(id); -- Link to Directus user account
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS activity VARCHAR(50); -- Latest activity type

-- Add indexes for new contact fields
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id) WHERE user_id IS NOT NULL;

-- Create Organizations_Contacts Junction Table (Many-to-Many)
-- Allows contacts to belong to multiple organizations
CREATE TABLE IF NOT EXISTS organizations_contacts (
  id SERIAL PRIMARY KEY,
  organizations_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contacts_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  sort INTEGER DEFAULT 0,

  -- Ensure uniqueness
  UNIQUE (organizations_id, contacts_id)
);

-- Indexes for junction table
CREATE INDEX IF NOT EXISTS idx_org_contacts_org ON organizations_contacts(organizations_id);
CREATE INDEX IF NOT EXISTS idx_org_contacts_contact ON organizations_contacts(contacts_id);
CREATE INDEX IF NOT EXISTS idx_org_contacts_primary ON organizations_contacts(is_primary) WHERE is_primary = TRUE;

-- Register junction collection with Directus
INSERT INTO directus_collections (collection, icon, note, hidden)
VALUES ('organizations_contacts', 'link', 'Links contacts to multiple organizations', true)
ON CONFLICT (collection) DO NOTHING;

-- Add junction table fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('organizations_contacts', 'id', NULL, 'input', NULL),
('organizations_contacts', 'organizations_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb),
('organizations_contacts', 'contacts_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb),
('organizations_contacts', 'is_primary', 'cast-boolean', 'boolean', NULL),
('organizations_contacts', 'sort', NULL, 'input', NULL)
ON CONFLICT DO NOTHING;

-- Update Organizations field configurations
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('organizations', 'logo', 'file', 'file-image', NULL, 'image', 'Company logo'),
('organizations', 'brand_color', 'cast-json', 'select-color', NULL, NULL, 'Primary brand color'),
('organizations', 'payment_terms', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Default payment terms'),
('organizations', 'ap_contact', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Accounts Payable contact'),
('organizations', 'owner', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Deal/Account owner'),
('organizations', 'branding', 'cast-json', 'input-code', '{"language":"json"}'::jsonb, NULL, 'Branding assets and guidelines'),
('organizations', 'billing', 'cast-json', 'input-code', '{"language":"json"}'::jsonb, NULL, 'Billing configuration'),
('organizations', 'contacts', 'o2m', 'list-o2m', '{"template":"{{contacts_id.first_name}} {{contacts_id.last_name}}"}'::jsonb, NULL, 'Related contacts (via junction)')
ON CONFLICT DO NOTHING;

-- Update Organizations relations
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field) VALUES
('organizations_contacts', 'organizations_id', 'organizations', 'contacts', 'contacts_id'),
('organizations_contacts', 'contacts_id', 'contacts', 'organizations', 'organizations_id')
ON CONFLICT DO NOTHING;

-- Update Contacts field configurations
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('contacts', 'contact_notes', NULL, 'input-multiline', NULL, NULL, 'Contact-specific notes'),
('contacts', 'user_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Linked Directus user'),
('contacts', 'activity', NULL, 'input', '{"placeholder":"Latest activity"}'::jsonb, NULL, 'Most recent activity type'),
('contacts', 'organizations', 'o2m', 'list-o2m', '{"template":"{{organizations_id.name}}"}'::jsonb, NULL, 'Related organizations')
ON CONFLICT DO NOTHING;

-- Migrate existing organization_id data to junction table
-- For contacts that have an organization_id, create junction entries
INSERT INTO organizations_contacts (organizations_id, contacts_id, is_primary, sort)
SELECT
  organization_id,
  id,
  is_primary,
  0
FROM contacts
WHERE organization_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 072: Extended Organizations & Contacts for AgencyOS';
  RAISE NOTICE '   Extended organizations with: logo, brand_color, payment_terms, ap_contact, owner, branding, billing';
  RAISE NOTICE '   Extended contacts with: contact_notes, user_id, activity';
  RAISE NOTICE '   Created: organizations_contacts junction table';
  RAISE NOTICE '   Migrated existing organization_id relationships to junction table';
END $$;

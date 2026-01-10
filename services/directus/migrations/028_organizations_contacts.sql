-- Migration 028: Organizations & Contacts (CRM Foundation)
-- Description: Core CRM collections for managing client companies and contacts
-- Dependencies: Requires app_users table (existing)

-- =============================================================================
-- ORGANIZATIONS TABLE
-- =============================================================================
-- Central hub for client companies with Stripe integration

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  industry VARCHAR(100),
  employee_count VARCHAR(50), -- '1-10', '11-50', '51-200', '201-500', '500+'
  annual_revenue VARCHAR(50), -- '$0-1M', '$1M-10M', '$10M-50M', '$50M+'

  -- Contact Information
  billing_email VARCHAR(255),
  phone VARCHAR(50),

  -- Address (JSONB for flexibility)
  billing_address JSONB, -- { street, city, state, zip, country }
  shipping_address JSONB,

  -- Tax Information
  tax_id VARCHAR(100), -- EIN, VAT number, etc.
  tax_exempt BOOLEAN DEFAULT FALSE,

  -- Stripe Integration
  stripe_customer_id VARCHAR(255) UNIQUE,

  -- Business Details
  notes TEXT,
  tags TEXT[], -- ['enterprise', 'tech', 'priority']

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect', 'archived')),

  -- Relationships
  parent_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  account_manager_id UUID REFERENCES directus_users(id) ON DELETE SET NULL,

  -- Audit Fields
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_account_manager ON organizations(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_name_search ON organizations USING gin(to_tsvector('english', name));

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_organizations_timestamp ON organizations;
CREATE TRIGGER update_organizations_timestamp
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- CONTACTS TABLE
-- =============================================================================
-- Individual contacts within organizations (with optional app_user link)

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization Relationship
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  mobile VARCHAR(50),

  -- Professional Information
  job_title VARCHAR(255),
  department VARCHAR(100),

  -- Optional Link to App User
  app_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,

  -- Contact Details
  notes TEXT,
  linkedin_url VARCHAR(500),
  twitter_handle VARCHAR(100),

  -- Primary Contact Flag
  is_primary BOOLEAN DEFAULT FALSE,

  -- Communication Preferences
  email_opt_in BOOLEAN DEFAULT TRUE,
  newsletter_opt_in BOOLEAN DEFAULT FALSE,
  preferred_contact_method VARCHAR(50) DEFAULT 'email', -- 'email', 'phone', 'mobile'

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

  -- Audit Fields
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes for Performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_app_user ON contacts(app_user_id) WHERE app_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON contacts(is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_name_search ON contacts USING gin(to_tsvector('english', first_name || ' ' || last_name));

-- Ensure only one primary contact per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_primary_per_org ON contacts(organization_id)
  WHERE is_primary = TRUE;

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_contacts_timestamp ON contacts;
CREATE TRIGGER update_contacts_timestamp
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, archive_field, archive_value, unarchive_value)
VALUES
  ('organizations', 'business', 'Client companies and prospects', '{{name}}', 'name', 'status', 'archived', 'active'),
  ('contacts', 'person', 'Individual contacts within organizations', '{{first_name}} {{last_name}}', 'last_name', 'status', 'archived', 'active')
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Organizations Fields
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
  ('organizations', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'name', NULL, 'input', '{"iconRight": "business"}', NULL, NULL, FALSE, FALSE, 2, 'full', NULL, 'Company name', NULL, TRUE, NULL, NULL, NULL),
  ('organizations', 'website', NULL, 'input', '{"iconRight": "link", "placeholder": "https://"}', NULL, NULL, FALSE, FALSE, 3, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'industry', NULL, 'select-dropdown', '{"choices": [{"text": "Technology", "value": "technology"}, {"text": "Healthcare", "value": "healthcare"}, {"text": "Finance", "value": "finance"}, {"text": "Manufacturing", "value": "manufacturing"}, {"text": "Retail", "value": "retail"}, {"text": "Education", "value": "education"}, {"text": "Other", "value": "other"}]}', NULL, NULL, FALSE, FALSE, 4, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'employee_count', NULL, 'select-dropdown', '{"choices": [{"text": "1-10", "value": "1-10"}, {"text": "11-50", "value": "11-50"}, {"text": "51-200", "value": "51-200"}, {"text": "201-500", "value": "201-500"}, {"text": "500+", "value": "500+"}]}', NULL, NULL, FALSE, FALSE, 5, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'annual_revenue', NULL, 'select-dropdown', '{"choices": [{"text": "$0-1M", "value": "0-1M"}, {"text": "$1M-10M", "value": "1M-10M"}, {"text": "$10M-50M", "value": "10M-50M"}, {"text": "$50M+", "value": "50M+"}]}', NULL, NULL, FALSE, FALSE, 6, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Contact Info
  ('organizations', 'billing_email', NULL, 'input', '{"iconRight": "email"}', NULL, NULL, FALSE, FALSE, 7, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'phone', NULL, 'input', '{"iconRight": "phone"}', NULL, NULL, FALSE, FALSE, 8, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Address
  ('organizations', 'billing_address', 'cast-json', 'input-code', '{"language": "json", "placeholder": "{\"street\": \"\", \"city\": \"\", \"state\": \"\", \"zip\": \"\", \"country\": \"\"}"}', NULL, NULL, FALSE, FALSE, 9, 'full', NULL, 'Billing address (JSON)', NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'shipping_address', 'cast-json', 'input-code', '{"language": "json"}', NULL, NULL, FALSE, FALSE, 10, 'full', NULL, 'Shipping address (JSON)', NULL, FALSE, NULL, NULL, NULL),

  -- Tax
  ('organizations', 'tax_id', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 11, 'half', NULL, 'EIN, VAT number, etc.', NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'tax_exempt', 'cast-boolean', 'boolean', NULL, NULL, NULL, FALSE, FALSE, 12, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Stripe
  ('organizations', 'stripe_customer_id', NULL, 'input', '{"iconRight": "credit_card"}', NULL, NULL, TRUE, FALSE, 13, 'half', NULL, 'Stripe customer ID (auto-generated)', NULL, FALSE, NULL, NULL, NULL),

  -- Business Details
  ('organizations', 'notes', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 14, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'tags', 'cast-json', 'tags', '{"iconRight": "local_offer"}', NULL, NULL, FALSE, FALSE, 15, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Status
  ('organizations', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Active", "value": "active"}, {"text": "Inactive", "value": "inactive"}, {"text": "Prospect", "value": "prospect"}, {"text": "Archived", "value": "archived"}]}', 'labels', '{"choices": [{"text": "Active", "value": "active", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Inactive", "value": "inactive", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Prospect", "value": "prospect", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Archived", "value": "archived", "foreground": "#FFFFFF", "background": "#EF4444"}]}', FALSE, FALSE, 16, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Relationships
  ('organizations', 'parent_organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 17, 'half', NULL, 'Parent company (if subsidiary)', NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'account_manager_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'related-values', NULL, FALSE, FALSE, 18, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Audit
  ('organizations', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 19, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 20, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 21, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('organizations', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 22, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Contacts Fields
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
  ('contacts', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('contacts', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 2, 'full', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('contacts', 'first_name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 3, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('contacts', 'last_name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 4, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('contacts', 'email', NULL, 'input', '{"iconRight": "email"}', NULL, NULL, FALSE, FALSE, 5, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('contacts', 'phone', NULL, 'input', '{"iconRight": "phone"}', NULL, NULL, FALSE, FALSE, 6, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('contacts', 'mobile', NULL, 'input', '{"iconRight": "smartphone"}', NULL, NULL, FALSE, FALSE, 7, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Professional
  ('contacts', 'job_title', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 8, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('contacts', 'department', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 9, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- App User Link
  ('contacts', 'app_user_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{email}}"}', 'related-values', NULL, FALSE, FALSE, 10, 'half', NULL, 'Optional link to registered user', NULL, FALSE, NULL, NULL, NULL),

  -- Contact Details
  ('contacts', 'notes', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 11, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('contacts', 'linkedin_url', NULL, 'input', '{"iconRight": "link"}', NULL, NULL, FALSE, FALSE, 12, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('contacts', 'twitter_handle', NULL, 'input', '{"iconLeft": "@"}', NULL, NULL, FALSE, FALSE, 13, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Flags
  ('contacts', 'is_primary', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 14, 'half', NULL, 'Primary contact for organization', NULL, FALSE, NULL, NULL, NULL),

  -- Communication
  ('contacts', 'email_opt_in', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 15, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('contacts', 'newsletter_opt_in', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 16, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('contacts', 'preferred_contact_method', NULL, 'select-dropdown', '{"choices": [{"text": "Email", "value": "email"}, {"text": "Phone", "value": "phone"}, {"text": "Mobile", "value": "mobile"}]}', NULL, NULL, FALSE, FALSE, 17, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Status
  ('contacts', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Active", "value": "active"}, {"text": "Inactive", "value": "inactive"}, {"text": "Archived", "value": "archived"}]}', 'labels', '{"choices": [{"text": "Active", "value": "active", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Inactive", "value": "inactive", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Archived", "value": "archived", "foreground": "#FFFFFF", "background": "#EF4444"}]}', FALSE, FALSE, 18, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Audit
  ('contacts', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 19, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('contacts', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 20, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('contacts', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 21, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('contacts', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 22, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Organization -> Contacts (one-to-many)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('contacts', 'organization_id', 'organizations', 'contacts', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SAMPLE SEED DATA
-- =============================================================================

-- Insert sample organizations
INSERT INTO organizations (id, name, website, industry, employee_count, billing_email, phone, status, notes, tags)
VALUES
  ('f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', 'Acme Corporation', 'https://acme.example.com', 'technology', '51-200', 'billing@acme.example.com', '+1-555-0100', 'active', 'Enterprise client - annual contract', ARRAY['enterprise', 'tech', 'priority']),
  ('f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c', 'Beta Industries', 'https://beta.example.com', 'manufacturing', '201-500', 'accounts@beta.example.com', '+1-555-0200', 'active', 'Manufacturing partner', ARRAY['manufacturing', 'partner']),
  ('f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c', 'Gamma Solutions', NULL, 'technology', '1-10', 'info@gamma.example.com', '+1-555-0300', 'prospect', 'Inbound lead from website', ARRAY['tech', 'startup'])
ON CONFLICT (id) DO NOTHING;

-- Insert sample contacts
INSERT INTO contacts (organization_id, first_name, last_name, email, phone, job_title, is_primary, status)
VALUES
  ('f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', 'John', 'Smith', 'john.smith@acme.example.com', '+1-555-0101', 'CTO', TRUE, 'active'),
  ('f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', 'Sarah', 'Johnson', 'sarah.johnson@acme.example.com', '+1-555-0102', 'VP of Engineering', FALSE, 'active'),
  ('f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c', 'Michael', 'Brown', 'michael.brown@beta.example.com', '+1-555-0201', 'CEO', TRUE, 'active'),
  ('f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c', 'Emily', 'Davis', 'emily.davis@gamma.example.com', '+1-555-0301', 'Founder', TRUE, 'active')
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE organizations IS 'Client companies and prospects with Stripe integration';
COMMENT ON TABLE contacts IS 'Individual contacts within organizations';

COMMENT ON COLUMN organizations.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN organizations.billing_address IS 'JSONB: {street, city, state, zip, country}';
COMMENT ON COLUMN contacts.app_user_id IS 'Optional link to registered app_users (for client portal access)';
COMMENT ON COLUMN contacts.is_primary IS 'Primary contact for organization (only one per org)';

-- Migration 030: Invoicing System
-- Description: Professional invoicing with automatic calculations and Stripe integration
-- Dependencies: Requires organizations, projects (existing), todos (existing)

-- =============================================================================
-- TAX RATES TABLE
-- =============================================================================
-- Reusable tax rates for invoice line items

CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tax Details
  name VARCHAR(100) NOT NULL, -- 'Sales Tax (CA)', 'VAT (UK)', etc.
  rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100), -- Percentage (e.g., 8.25)

  -- Region
  country VARCHAR(2), -- ISO 3166-1 alpha-2 (US, GB, DE, etc.)
  state VARCHAR(50), -- State/province code

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,

  -- Description
  description TEXT,

  -- Audit Fields
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_rates_active ON tax_rates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tax_rates_default ON tax_rates(is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_tax_rates_country ON tax_rates(country);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_tax_rates_timestamp ON tax_rates;
CREATE TRIGGER update_tax_rates_timestamp
  BEFORE UPDATE ON tax_rates
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- INVOICES TABLE
-- =============================================================================
-- Client invoices with automatic total calculations

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice Number (auto-generated)
  invoice_number VARCHAR(50) UNIQUE NOT NULL,

  -- Relationships
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Dates
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),

  -- Amounts (calculated via triggers/scripts)
  subtotal DECIMAL(12,2) DEFAULT 0.00,
  total_tax DECIMAL(12,2) DEFAULT 0.00,
  total DECIMAL(12,2) DEFAULT 0.00,
  amount_paid DECIMAL(12,2) DEFAULT 0.00,
  amount_due DECIMAL(12,2) GENERATED ALWAYS AS (total - amount_paid) STORED,

  -- Payment Terms
  payment_terms VARCHAR(50) DEFAULT 'Net 30', -- 'Net 30', 'Due on Receipt', 'Net 60', etc.

  -- Stripe Integration
  stripe_invoice_id VARCHAR(255),
  stripe_checkout_url TEXT,
  stripe_payment_intent_id VARCHAR(255),

  -- Notes
  notes TEXT,
  internal_notes TEXT, -- Not visible to client

  -- Audit Fields
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_invoices_organization ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice ON invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices(status, due_date)
  WHERE status IN ('sent', 'overdue');

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_invoices_timestamp ON invoices;
CREATE TRIGGER update_invoices_timestamp
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- INVOICE ITEMS TABLE
-- =============================================================================
-- Line items on invoices with automatic amount calculations

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice Relationship
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Line Item Details
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1.00 CHECK (quantity > 0),
  unit_price DECIMAL(12,2) DEFAULT 0.00 CHECK (unit_price >= 0),

  -- Calculated Amount
  line_amount DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- Tax
  tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0.00, -- Calculated by Run Script

  -- Optional Links
  todo_id UUID REFERENCES todos(id) ON DELETE SET NULL, -- Link to billable task

  -- Ordering
  sort INTEGER,

  -- Audit Fields
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tax_rate ON invoice_items(tax_rate_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_todo ON invoice_items(todo_id) WHERE todo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_sort ON invoice_items(invoice_id, sort);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_invoice_items_timestamp ON invoice_items;
CREATE TRIGGER update_invoice_items_timestamp
  BEFORE UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- INVOICE NUMBER GENERATION SEQUENCE
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_num INTEGER;
  invoice_num VARCHAR(50);
BEGIN
  next_num := nextval('invoice_number_seq');
  invoice_num := 'INV-' || LPAD(next_num::TEXT, 4, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invoice_number ON invoices;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- =============================================================================
-- TRIGGER: Auto-update invoice status to overdue
-- =============================================================================

CREATE OR REPLACE FUNCTION check_invoice_overdue()
RETURNS TRIGGER AS $$
BEGIN
  -- If invoice is sent and past due date, mark as overdue
  IF NEW.status = 'sent' AND NEW.due_date < CURRENT_DATE AND NEW.amount_due > 0 THEN
    NEW.status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_invoice_overdue ON invoices;
CREATE TRIGGER trigger_check_invoice_overdue
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION check_invoice_overdue();

-- =============================================================================
-- SEED DEFAULT TAX RATES
-- =============================================================================

INSERT INTO tax_rates (id, name, rate, country, state, is_active, is_default, description)
VALUES
  ('1652b7ce-2463-498d-beab-b433dc49783c', 'Sales Tax (CA)', 8.25, 'US', 'CA', TRUE, FALSE, 'California combined sales tax'),
  ('f3f713e5-4cfc-403b-8d0d-60634ebf6841', 'Sales Tax (NY)', 8.52, 'US', 'NY', TRUE, FALSE, 'New York combined sales tax'),
  ('53ecbdac-de91-43c4-8ae5-74a5ef2a2abb', 'Sales Tax (TX)', 6.25, 'US', 'TX', TRUE, FALSE, 'Texas state sales tax'),
  ('652d1bfa-3b52-47cf-b8dd-00549ef050f7', 'VAT (UK)', 20.00, 'GB', NULL, TRUE, FALSE, 'UK Value Added Tax'),
  ('3adf8ac9-1090-41c8-be59-f4430c207c7f', 'VAT (EU)', 19.00, 'DE', NULL, TRUE, FALSE, 'Germany VAT (standard rate)'),
  ('340f7d6a-248b-4568-b77b-5f29ee00ca02', 'No Tax', 0.00, NULL, NULL, TRUE, TRUE, 'Tax-exempt or no tax')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, archive_field, archive_value, unarchive_value)
VALUES
  ('tax_rates', 'percent', 'Tax rates for invoicing', '{{name}}', 'name', 'is_active', FALSE, TRUE),
  ('invoices', 'receipt', 'Client invoices', 'Invoice {{invoice_number}}', '-invoice_date', 'status', 'cancelled', 'draft'),
  ('invoice_items', 'format_list_bulleted', 'Invoice line items', '{{description}}', 'sort', NULL, NULL, NULL)
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Tax Rates Fields
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
  ('tax_rates', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('tax_rates', 'name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 2, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('tax_rates', 'rate', NULL, 'input', '{"iconRight": "%", "placeholder": "0.00"}', 'formatted-value', '{"suffix": "%", "decimals": 2}', FALSE, FALSE, 3, 'half', NULL, 'Tax percentage (e.g., 8.25)', NULL, TRUE, NULL, NULL, NULL),
  ('tax_rates', 'country', NULL, 'input', '{"placeholder": "US"}', NULL, NULL, FALSE, FALSE, 4, 'half', NULL, 'ISO 3166-1 alpha-2 country code', NULL, FALSE, NULL, NULL, NULL),
  ('tax_rates', 'state', NULL, 'input', '{"placeholder": "CA"}', NULL, NULL, FALSE, FALSE, 5, 'half', NULL, 'State/province code', NULL, FALSE, NULL, NULL, NULL),
  ('tax_rates', 'is_active', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 6, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('tax_rates', 'is_default', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 7, 'half', NULL, 'Default tax rate for new items', NULL, FALSE, NULL, NULL, NULL),
  ('tax_rates', 'description', NULL, 'input-multiline', NULL, NULL, NULL, FALSE, FALSE, 8, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('tax_rates', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 9, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('tax_rates', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 10, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Invoices Fields
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
  ('invoices', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'invoice_number', NULL, 'input', '{"iconLeft": "receipt", "placeholder": "Auto-generated"}', NULL, NULL, TRUE, FALSE, 2, 'half', NULL, 'Auto-generated on save', NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Draft", "value": "draft"}, {"text": "Sent", "value": "sent"}, {"text": "Paid", "value": "paid"}, {"text": "Overdue", "value": "overdue"}, {"text": "Cancelled", "value": "cancelled"}]}', 'labels', '{"choices": [{"text": "Draft", "value": "draft", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Sent", "value": "sent", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "Paid", "value": "paid", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Overdue", "value": "overdue", "foreground": "#FFFFFF", "background": "#EF4444"}, {"text": "Cancelled", "value": "cancelled", "foreground": "#FFFFFF", "background": "#6B7280"}]}', FALSE, FALSE, 3, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Relationships
  ('invoices', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', '{"template": "{{name}}"}', FALSE, FALSE, 4, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('invoices', 'project_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', '{"template": "{{name}}"}', FALSE, FALSE, 5, 'half', NULL, 'Optional project link', NULL, FALSE, NULL, NULL, NULL),

  -- Dates
  ('invoices', 'invoice_date', NULL, 'datetime', '{"includeSeconds": false}', 'datetime', '{"format": "short"}', FALSE, FALSE, 6, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'due_date', NULL, 'datetime', '{"includeSeconds": false}', 'datetime', '{"format": "short"}', FALSE, FALSE, 7, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'paid_date', NULL, 'datetime', '{"includeSeconds": false}', 'datetime', '{"format": "short"}', TRUE, FALSE, 8, 'half', NULL, 'Auto-set when paid', NULL, FALSE, NULL, NULL, NULL),

  -- Amounts (read-only - calculated)
  ('invoices', 'subtotal', NULL, 'input', '{"iconLeft": "$"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', TRUE, FALSE, 9, 'half', NULL, 'Auto-calculated from line items', NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'total_tax', NULL, 'input', '{"iconLeft": "$"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', TRUE, FALSE, 10, 'half', NULL, 'Auto-calculated from line items', NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'total', NULL, 'input', '{"iconLeft": "$"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', TRUE, FALSE, 11, 'half', NULL, 'Auto-calculated (subtotal + tax)', NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'amount_paid', NULL, 'input', '{"iconLeft": "$"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', TRUE, FALSE, 12, 'half', NULL, 'Auto-calculated from payments', NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'amount_due', NULL, 'input', '{"iconLeft": "$"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', TRUE, FALSE, 13, 'half', NULL, 'Auto-calculated (total - paid)', NULL, FALSE, NULL, NULL, NULL),

  -- Payment Terms
  ('invoices', 'payment_terms', NULL, 'select-dropdown', '{"choices": [{"text": "Due on Receipt", "value": "Due on Receipt"}, {"text": "Net 15", "value": "Net 15"}, {"text": "Net 30", "value": "Net 30"}, {"text": "Net 60", "value": "Net 60"}, {"text": "Net 90", "value": "Net 90"}], "allowOther": true}', NULL, NULL, FALSE, FALSE, 14, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Stripe Integration
  ('invoices', 'stripe_invoice_id', NULL, 'input', '{"iconRight": "credit_card"}', NULL, NULL, TRUE, FALSE, 15, 'half', NULL, 'Stripe invoice ID', NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'stripe_checkout_url', NULL, 'input', '{"iconRight": "link"}', NULL, NULL, TRUE, FALSE, 16, 'full', NULL, 'Payment link for client', NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'stripe_payment_intent_id', NULL, 'input', NULL, NULL, NULL, TRUE, TRUE, 17, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Notes
  ('invoices', 'notes', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 18, 'full', NULL, 'Visible to client', NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'internal_notes', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 19, 'full', NULL, 'Internal only (not visible to client)', NULL, FALSE, NULL, NULL, NULL),

  -- Audit
  ('invoices', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 20, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 21, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 22, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoices', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 23, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Invoice Items Fields
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
  ('invoice_items', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoice_items', 'invoice_id', 'm2o', 'select-dropdown-m2o', NULL, NULL, NULL, FALSE, TRUE, 2, 'full', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('invoice_items', 'description', NULL, 'input-multiline', '{"placeholder": "Service or product description"}', NULL, NULL, FALSE, FALSE, 3, 'full', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('invoice_items', 'quantity', NULL, 'input', '{"iconRight": "×", "placeholder": "1.00"}', 'formatted-value', '{"decimals": 2}', FALSE, FALSE, 4, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoice_items', 'unit_price', NULL, 'input', '{"iconLeft": "$", "placeholder": "0.00"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', FALSE, FALSE, 5, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoice_items', 'line_amount', NULL, 'input', '{"iconLeft": "$"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', TRUE, FALSE, 6, 'half', NULL, 'Auto-calculated (qty × price)', NULL, FALSE, NULL, NULL, NULL),
  ('invoice_items', 'tax_rate_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}} ({{rate}}%)"}', 'related-values', '{"template": "{{name}}"}', FALSE, FALSE, 7, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoice_items', 'tax_amount', NULL, 'input', '{"iconLeft": "$"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', TRUE, FALSE, 8, 'half', NULL, 'Auto-calculated from tax rate', NULL, FALSE, NULL, NULL, NULL),
  ('invoice_items', 'todo_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{content}}"}', 'related-values', NULL, FALSE, FALSE, 9, 'half', NULL, 'Optional link to task', NULL, FALSE, NULL, NULL, NULL),
  ('invoice_items', 'sort', NULL, 'input', '{"iconRight": "reorder"}', NULL, NULL, FALSE, TRUE, 10, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoice_items', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 11, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('invoice_items', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 12, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Invoice -> Organization
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('invoices', 'organization_id', 'organizations', 'invoices', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Invoice -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('invoices', 'project_id', 'projects', 'invoices', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Invoice Items -> Invoice
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('invoice_items', 'invoice_id', 'invoices', 'items', NULL, NULL, NULL, 'sort', 'delete')
ON CONFLICT DO NOTHING;

-- Invoice Items -> Tax Rate
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('invoice_items', 'tax_rate_id', 'tax_rates', NULL, NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Invoice Items -> Todo
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('invoice_items', 'todo_id', 'todos', NULL, NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SAMPLE SEED DATA
-- =============================================================================

-- Insert sample invoices
INSERT INTO invoices (id, organization_id, project_id, invoice_date, due_date, payment_terms, status, notes)
VALUES
  (
    'a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d',
    'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', -- Acme Corp
    NULL,
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '15 days',
    'Net 30',
    'sent',
    'Monthly consulting services for January 2025'
  ),
  (
    'b9c0d1e2-f3a4-4b5c-7d8e-9f0a1b2c3d4e',
    'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c', -- Beta Industries
    NULL,
    CURRENT_DATE - INTERVAL '60 days',
    CURRENT_DATE - INTERVAL '30 days',
    'Net 30',
    'overdue',
    'Q4 2024 project work'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample invoice items
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate_id, sort)
VALUES
  -- Invoice 1 items
  ('a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 'Strategy Consulting - 40 hours', 40, 150.00, '1652b7ce-2463-498d-beab-b433dc49783c', 1),
  ('a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 'Technical Implementation - 60 hours', 60, 175.00, '1652b7ce-2463-498d-beab-b433dc49783c', 2),
  ('a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 'Project Management - 20 hours', 20, 125.00, '1652b7ce-2463-498d-beab-b433dc49783c', 3),

  -- Invoice 2 items
  ('b9c0d1e2-f3a4-4b5c-7d8e-9f0a1b2c3d4e', 'Custom Development', 1, 25000.00, 'f3f713e5-4cfc-403b-8d0d-60634ebf6841', 1),
  ('b9c0d1e2-f3a4-4b5c-7d8e-9f0a1b2c3d4e', 'Training & Documentation', 1, 5000.00, 'f3f713e5-4cfc-403b-8d0d-60634ebf6841', 2)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DATABASE VIEWS FOR ANALYTICS
-- =============================================================================

-- Invoice summary with organization name
CREATE OR REPLACE VIEW invoice_summary AS
SELECT
  i.id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.paid_date,
  i.status,
  i.subtotal,
  i.total_tax,
  i.total,
  i.amount_paid,
  i.amount_due,
  i.payment_terms,
  o.id as organization_id,
  o.name as organization_name,
  o.billing_email,
  p.id as project_id,
  p.name as project_name,
  CASE
    WHEN i.status = 'paid' THEN 'Paid'
    WHEN i.status = 'overdue' THEN 'Overdue'
    WHEN i.due_date < CURRENT_DATE AND i.status = 'sent' THEN 'Past Due'
    WHEN i.due_date <= CURRENT_DATE + INTERVAL '7 days' AND i.status = 'sent' THEN 'Due Soon'
    ELSE i.status
  END as status_label,
  CASE
    WHEN i.status = 'paid' THEN 0
    WHEN i.status = 'overdue' THEN i.due_date - CURRENT_DATE
    WHEN i.status = 'sent' THEN i.due_date - CURRENT_DATE
    ELSE NULL
  END as days_until_due
FROM invoices i
JOIN organizations o ON o.id = i.organization_id
LEFT JOIN projects p ON p.id = i.project_id;

-- Revenue by month
CREATE OR REPLACE VIEW revenue_by_month AS
SELECT
  DATE_TRUNC('month', invoice_date) as month,
  COUNT(*) as invoice_count,
  SUM(total) as total_invoiced,
  SUM(amount_paid) as total_paid,
  SUM(amount_due) as total_outstanding
FROM invoices
WHERE status != 'cancelled'
GROUP BY DATE_TRUNC('month', invoice_date)
ORDER BY month DESC;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE tax_rates IS 'Reusable tax rates for invoice line items';
COMMENT ON TABLE invoices IS 'Client invoices with automatic total calculations';
COMMENT ON TABLE invoice_items IS 'Line items on invoices';

COMMENT ON COLUMN invoices.invoice_number IS 'Auto-generated unique invoice number (e.g., INV-0001)';
COMMENT ON COLUMN invoices.subtotal IS 'Sum of all line_amount (calculated via Run Script)';
COMMENT ON COLUMN invoices.total_tax IS 'Sum of all tax_amount (calculated via Run Script)';
COMMENT ON COLUMN invoices.total IS 'Subtotal + total_tax (calculated via Run Script)';
COMMENT ON COLUMN invoices.amount_paid IS 'Sum of payments (calculated via Run Script)';
COMMENT ON COLUMN invoices.amount_due IS 'Auto-calculated: total - amount_paid';
COMMENT ON COLUMN invoice_items.line_amount IS 'Auto-calculated: quantity × unit_price';
COMMENT ON COLUMN invoice_items.tax_amount IS 'Calculated via Run Script from tax_rate';

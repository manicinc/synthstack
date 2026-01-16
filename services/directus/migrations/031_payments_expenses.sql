-- Migration 031: Payments & Expenses
-- Description: Payment tracking with Stripe integration and billable expense management
-- Dependencies: Requires invoices (migration 030), projects (existing)

-- =============================================================================
-- PAYMENTS TABLE
-- =============================================================================
-- Track payments received for invoices (Stripe and manual)

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice Relationship
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,

  -- Payment Details
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ DEFAULT NOW(),

  -- Payment Method
  payment_method VARCHAR(50) DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'check', 'wire', 'ach', 'cash', 'other')),

  -- Stripe Integration
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  stripe_balance_transaction_id VARCHAR(255),

  -- Transaction Details
  transaction_fee DECIMAL(10,2) DEFAULT 0.00, -- Stripe fee or other processing fee
  net_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount - transaction_fee) STORED,

  -- Reference
  reference_number VARCHAR(100), -- Check number, wire confirmation, etc.
  receipt_url TEXT, -- Link to Stripe receipt or uploaded receipt

  -- Notes
  notes TEXT,

  -- Audit Fields
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_stripe_charge ON payments(stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_payments_timestamp ON payments;
CREATE TRIGGER update_payments_timestamp
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- EXPENSES TABLE
-- =============================================================================
-- Track project expenses with billable flag for invoice generation

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Relationship
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Expense Details
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  expense_date DATE DEFAULT CURRENT_DATE,

  -- Category
  category VARCHAR(100), -- 'software', 'hardware', 'travel', 'meals', 'lodging', 'supplies', 'other'

  -- Vendor/Supplier
  vendor VARCHAR(255),

  -- Billable Configuration
  is_billable BOOLEAN DEFAULT FALSE,
  is_invoiced BOOLEAN DEFAULT FALSE,
  markup_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (markup_percentage >= 0 AND markup_percentage <= 100),
  billable_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount * (1 + markup_percentage / 100)) STORED,

  -- Invoice Link
  invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE SET NULL,

  -- Receipt
  receipt UUID REFERENCES directus_files(id) ON DELETE SET NULL,

  -- Reimbursement
  is_reimbursable BOOLEAN DEFAULT FALSE,
  reimbursed_to UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  reimbursed_date DATE,

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
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_is_billable ON expenses(is_billable) WHERE is_billable = TRUE;
CREATE INDEX IF NOT EXISTS idx_expenses_is_invoiced ON expenses(is_invoiced) WHERE is_invoiced = TRUE;
CREATE INDEX IF NOT EXISTS idx_expenses_invoice_item ON expenses(invoice_item_id) WHERE invoice_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_is_reimbursable ON expenses(is_reimbursable) WHERE is_reimbursable = TRUE;

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_expenses_timestamp ON expenses;
CREATE TRIGGER update_expenses_timestamp
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- TRIGGER: Mark expense as invoiced when linked to invoice item
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_expense_invoiced()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_item_id IS NOT NULL AND (OLD.invoice_item_id IS NULL OR OLD.invoice_item_id != NEW.invoice_item_id) THEN
    NEW.is_invoiced := TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_expense_invoiced ON expenses;
CREATE TRIGGER trigger_mark_expense_invoiced
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION mark_expense_invoiced();

-- =============================================================================
-- TRIGGER: Mark expense as reimbursed when reimbursed_date is set
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_expense_reimbursed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reimbursed_date IS NOT NULL AND OLD.reimbursed_date IS NULL THEN
    NEW.is_reimbursable := TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_expense_reimbursed ON expenses;
CREATE TRIGGER trigger_mark_expense_reimbursed
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION mark_expense_reimbursed();

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field)
VALUES
  ('payments', 'payment', 'Invoice payments and transactions', 'Payment of ${{amount}}', '-payment_date'),
  ('expenses', 'attach_money', 'Project expenses and billable items', '{{description}}', '-expense_date')
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Payments Fields
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
  ('payments', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('payments', 'invoice_id', 'm2o', 'select-dropdown-m2o', '{"template": "Invoice {{invoice_number}}"}', 'related-values', '{"template": "{{invoice_number}}"}', FALSE, FALSE, 2, 'full', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('payments', 'amount', NULL, 'input', '{"iconLeft": "$", "placeholder": "0.00"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', FALSE, FALSE, 3, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('payments', 'payment_date', NULL, 'datetime', NULL, 'datetime', '{"relative": true}', FALSE, FALSE, 4, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Payment Method
  ('payments', 'payment_method', NULL, 'select-dropdown', '{"choices": [{"text": "Stripe", "value": "stripe"}, {"text": "Check", "value": "check"}, {"text": "Wire Transfer", "value": "wire"}, {"text": "ACH", "value": "ach"}, {"text": "Cash", "value": "cash"}, {"text": "Other", "value": "other"}]}', 'labels', '{"choices": [{"text": "Stripe", "value": "stripe", "foreground": "#FFFFFF", "background": "#635BFF"}, {"text": "Check", "value": "check", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Wire", "value": "wire", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "ACH", "value": "ach", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Cash", "value": "cash", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Other", "value": "other", "foreground": "#FFFFFF", "background": "#6B7280"}]}', FALSE, FALSE, 5, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Stripe Integration
  ('payments', 'stripe_payment_intent_id', NULL, 'input', '{"iconRight": "credit_card"}', NULL, NULL, TRUE, FALSE, 6, 'half', NULL, 'Stripe payment intent ID', NULL, FALSE, NULL, NULL, NULL),
  ('payments', 'stripe_charge_id', NULL, 'input', NULL, NULL, NULL, TRUE, TRUE, 7, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('payments', 'stripe_balance_transaction_id', NULL, 'input', NULL, NULL, NULL, TRUE, TRUE, 8, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Transaction Details
  ('payments', 'transaction_fee', NULL, 'input', '{"iconLeft": "$"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', FALSE, FALSE, 9, 'half', NULL, 'Processing fee', NULL, FALSE, NULL, NULL, NULL),
  ('payments', 'net_amount', NULL, 'input', '{"iconLeft": "$"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', TRUE, FALSE, 10, 'half', NULL, 'Auto-calculated (amount - fee)', NULL, FALSE, NULL, NULL, NULL),

  -- Reference
  ('payments', 'reference_number', NULL, 'input', '{"placeholder": "Check #, confirmation #, etc."}', NULL, NULL, FALSE, FALSE, 11, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('payments', 'receipt_url', NULL, 'input', '{"iconRight": "link"}', NULL, NULL, FALSE, FALSE, 12, 'half', NULL, 'Link to receipt or uploaded file', NULL, FALSE, NULL, NULL, NULL),

  -- Notes
  ('payments', 'notes', NULL, 'input-multiline', NULL, NULL, NULL, FALSE, FALSE, 13, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Audit
  ('payments', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 14, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('payments', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 15, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('payments', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 16, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('payments', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 17, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- Expenses Fields
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
  ('expenses', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'project_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', '{"template": "{{name}}"}', FALSE, FALSE, 2, 'half', NULL, 'Optional project link', NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'description', NULL, 'input-multiline', '{"placeholder": "Describe the expense"}', NULL, NULL, FALSE, FALSE, 3, 'full', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('expenses', 'amount', NULL, 'input', '{"iconLeft": "$", "placeholder": "0.00"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', FALSE, FALSE, 4, 'half', NULL, NULL, NULL, TRUE, NULL, NULL, NULL),
  ('expenses', 'expense_date', NULL, 'datetime', '{"includeSeconds": false}', 'datetime', '{"format": "short"}', FALSE, FALSE, 5, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Category & Vendor
  ('expenses', 'category', NULL, 'select-dropdown', '{"choices": [{"text": "Software", "value": "software"}, {"text": "Hardware", "value": "hardware"}, {"text": "Travel", "value": "travel"}, {"text": "Meals", "value": "meals"}, {"text": "Lodging", "value": "lodging"}, {"text": "Supplies", "value": "supplies"}, {"text": "Services", "value": "services"}, {"text": "Other", "value": "other"}], "allowOther": true}', NULL, NULL, FALSE, FALSE, 6, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'vendor', NULL, 'input', '{"placeholder": "Vendor or supplier name"}', NULL, NULL, FALSE, FALSE, 7, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Billable Configuration
  ('expenses', 'is_billable', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 8, 'half', NULL, 'Can be billed to client', NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'is_invoiced', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, TRUE, FALSE, 9, 'half', NULL, 'Already added to invoice', NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'markup_percentage', NULL, 'slider', '{"minValue": 0, "maxValue": 100, "step": 5, "iconRight": "%"}', NULL, NULL, FALSE, FALSE, 10, 'half', NULL, 'Markup when billing to client', NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'billable_amount', NULL, 'input', '{"iconLeft": "$"}', 'formatted-value', '{"prefix": "$", "decimals": 2}', TRUE, FALSE, 11, 'half', NULL, 'Auto-calculated with markup', NULL, FALSE, NULL, NULL, NULL),

  -- Invoice Link
  ('expenses', 'invoice_item_id', 'm2o', 'select-dropdown-m2o', NULL, 'related-values', NULL, TRUE, FALSE, 12, 'half', NULL, 'Linked invoice line item', NULL, FALSE, NULL, NULL, NULL),

  -- Receipt
  ('expenses', 'receipt', 'file', 'file', NULL, 'file', NULL, FALSE, FALSE, 13, 'half', NULL, 'Upload receipt or proof', NULL, FALSE, NULL, NULL, NULL),

  -- Reimbursement
  ('expenses', 'is_reimbursable', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 14, 'half', NULL, 'Needs reimbursement', NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'reimbursed_to', 'm2o', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'user', NULL, FALSE, FALSE, 15, 'half', NULL, 'Team member to reimburse', NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'reimbursed_date', NULL, 'datetime', '{"includeSeconds": false}', 'datetime', '{"format": "short"}', FALSE, FALSE, 16, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Notes & Tags
  ('expenses', 'notes', NULL, 'input-multiline', NULL, NULL, NULL, FALSE, FALSE, 17, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'tags', 'cast-json', 'tags', '{"iconRight": "local_offer"}', NULL, NULL, FALSE, FALSE, 18, 'full', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),

  -- Audit
  ('expenses', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 19, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 20, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 21, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL),
  ('expenses', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 22, 'half', NULL, NULL, NULL, FALSE, NULL, NULL, NULL)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field
);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Payment -> Invoice
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('payments', 'invoice_id', 'invoices', 'payments', NULL, NULL, NULL, '-payment_date', 'nullify')
ON CONFLICT DO NOTHING;

-- Expense -> Project
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('expenses', 'project_id', 'projects', 'expenses', NULL, NULL, NULL, '-expense_date', 'nullify')
ON CONFLICT DO NOTHING;

-- Expense -> Invoice Item
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('expenses', 'invoice_item_id', 'invoice_items', 'expense', NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Expense -> Receipt (File)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('expenses', 'receipt', 'directus_files', NULL, NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Expense -> Reimbursed To (User)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
VALUES ('expenses', 'reimbursed_to', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SAMPLE SEED DATA
-- =============================================================================

-- Insert sample payment
INSERT INTO payments (invoice_id, amount, payment_date, payment_method, stripe_payment_intent_id, transaction_fee, notes)
VALUES
  (
    '88888888-8888-8888-8888-888888888888', -- Sample invoice from migration 030
    16750.00,
    CURRENT_DATE - INTERVAL '5 days',
    'stripe',
    'pi_test_12345678',
    486.38, -- 2.9% + $0.30 Stripe fee
    'Partial payment received via Stripe'
  )
ON CONFLICT DO NOTHING;

-- Insert sample expenses
INSERT INTO expenses (project_id, description, amount, expense_date, category, vendor, is_billable, markup_percentage, is_reimbursable, tags)
VALUES
  (
    NULL, -- Not linked to project yet
    'Adobe Creative Cloud - Team License (Annual)',
    599.88,
    CURRENT_DATE - INTERVAL '30 days',
    'software',
    'Adobe Inc.',
    TRUE,
    15.00, -- 15% markup
    FALSE,
    ARRAY['software', 'recurring']
  ),
  (
    NULL,
    'Client meeting - Airfare to NYC',
    450.00,
    CURRENT_DATE - INTERVAL '7 days',
    'travel',
    'United Airlines',
    TRUE,
    0.00, -- No markup on travel
    TRUE, -- Needs reimbursement
    ARRAY['travel', 'client-meeting']
  ),
  (
    NULL,
    'Office supplies - Notebooks and pens',
    75.50,
    CURRENT_DATE - INTERVAL '2 days',
    'supplies',
    'Office Depot',
    FALSE,
    0.00,
    FALSE,
    ARRAY['office', 'supplies']
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DATABASE VIEWS FOR ANALYTICS
-- =============================================================================

-- Payment history with invoice details
CREATE OR REPLACE VIEW payment_history AS
SELECT
  p.id as payment_id,
  p.amount,
  p.payment_date,
  p.payment_method,
  p.transaction_fee,
  p.net_amount,
  p.reference_number,
  i.id as invoice_id,
  i.invoice_number,
  i.total as invoice_total,
  i.amount_paid as invoice_amount_paid,
  i.amount_due as invoice_amount_due,
  o.id as organization_id,
  o.name as organization_name
FROM payments p
JOIN invoices i ON i.id = p.invoice_id
JOIN organizations o ON o.id = i.organization_id
ORDER BY p.payment_date DESC;

-- Billable expenses not yet invoiced
CREATE OR REPLACE VIEW unbilled_expenses AS
SELECT
  e.id,
  e.description,
  e.amount,
  e.billable_amount,
  e.expense_date,
  e.category,
  e.vendor,
  e.markup_percentage,
  p.id as project_id,
  p.name as project_name,
  o.id as organization_id,
  o.name as organization_name
FROM expenses e
LEFT JOIN projects p ON p.id = e.project_id
LEFT JOIN deals d ON d.project_id = p.id
LEFT JOIN organizations o ON o.id = d.organization_id
WHERE e.is_billable = TRUE
  AND e.is_invoiced = FALSE
ORDER BY e.expense_date DESC;

-- Expenses by category
CREATE OR REPLACE VIEW expenses_by_category AS
SELECT
  category,
  COUNT(*) as expense_count,
  SUM(amount) as total_amount,
  SUM(amount) FILTER (WHERE is_billable = TRUE) as billable_amount,
  SUM(amount) FILTER (WHERE is_reimbursable = TRUE) as reimbursable_amount
FROM expenses
GROUP BY category
ORDER BY total_amount DESC;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE payments IS 'Invoice payments with Stripe integration';
COMMENT ON TABLE expenses IS 'Project expenses with billable tracking';

COMMENT ON COLUMN payments.amount IS 'Payment amount received';
COMMENT ON COLUMN payments.transaction_fee IS 'Processing fee (e.g., Stripe fee)';
COMMENT ON COLUMN payments.net_amount IS 'Auto-calculated: amount - transaction_fee';
COMMENT ON COLUMN expenses.is_billable IS 'Can be billed to client on invoice';
COMMENT ON COLUMN expenses.is_invoiced IS 'Already added to an invoice';
COMMENT ON COLUMN expenses.markup_percentage IS 'Markup % when billing to client';
COMMENT ON COLUMN expenses.billable_amount IS 'Auto-calculated: amount * (1 + markup%)';

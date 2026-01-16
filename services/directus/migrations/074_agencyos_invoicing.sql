-- ============================================
-- Migration 074: AgencyOS Invoicing System
-- ============================================
-- Creates invoicing, payments, expenses, and items catalog
-- Designed for automated invoice calculations via Flows
-- ============================================

-- OS Items Table (Reusable Invoice Items Catalog)
CREATE TABLE IF NOT EXISTS os_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_price NUMERIC(10,2) DEFAULT 0.00,
  unit_cost NUMERIC(10,2) DEFAULT 0.00,
  default_tax_rate UUID REFERENCES os_tax_rates(id),
  icon VARCHAR(100)
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, archive_field, archive_value, unarchive_value, display_template)
VALUES ('os_items', 'inventory_2', 'Reusable invoice items catalog', '#F59E0B', 'sort', 'status', 'archived', 'active', '{{name}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_items', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_items', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Active","value":"active"},{"text":"Archived","value":"archived"}]}'::jsonb, 'badge', NULL),
('os_items', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_items', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_items', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_items', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_items', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_items', 'name', NULL, 'input', '{"placeholder":"Item name"}'::jsonb, NULL, NULL),
('os_items', 'description', NULL, 'input-multiline', NULL, NULL, 'Item description'),
('os_items', 'unit_price', NULL, 'input', '{"placeholder":"0.00","type":"number"}'::jsonb, NULL, 'Default selling price'),
('os_items', 'unit_cost', NULL, 'input', '{"placeholder":"0.00","type":"number"}'::jsonb, NULL, 'Internal cost'),
('os_items', 'default_tax_rate', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Default tax rate'),
('os_items', 'icon', NULL, 'select-icon', NULL, NULL, 'Item icon')
ON CONFLICT DO NOTHING;

-- OS Invoices Table
CREATE TABLE IF NOT EXISTS os_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  reference VARCHAR(255),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  organization UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contact UUID REFERENCES contacts(id),
  project UUID REFERENCES os_projects(id),

  -- Auto-calculated fields (managed by Flows)
  subtotal NUMERIC(10,2) DEFAULT 0.00,
  total_tax NUMERIC(10,2) DEFAULT 0.00,
  total NUMERIC(10,2) DEFAULT 0.00,
  amount_paid NUMERIC(10,2) DEFAULT 0.00,
  amount_due NUMERIC(10,2) DEFAULT 0.00
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, archive_field, archive_value, unarchive_value, display_template)
VALUES ('os_invoices', 'receipt_long', 'Client invoices', '#EF4444', 'sort', 'status', 'cancelled', 'draft', '{{invoice_number}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_invoices', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_invoices', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Draft","value":"draft"},{"text":"Sent","value":"sent"},{"text":"Viewed","value":"viewed"},{"text":"Partial","value":"partial"},{"text":"Paid","value":"paid"},{"text":"Overdue","value":"overdue"},{"text":"Cancelled","value":"cancelled"}]}'::jsonb, 'badge', NULL),
('os_invoices', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_invoices', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_invoices', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_invoices', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_invoices', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_invoices', 'invoice_number', NULL, 'input', '{"placeholder":"INV-2024-001"}'::jsonb, NULL, NULL),
('os_invoices', 'reference', NULL, 'input', '{"placeholder":"PO# or reference"}'::jsonb, NULL, 'Client reference number'),
('os_invoices', 'issue_date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, NULL),
('os_invoices', 'due_date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, NULL),
('os_invoices', 'organization', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Bill to organization'),
('os_invoices', 'contact', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Bill to contact'),
('os_invoices', 'project', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Related project'),
('os_invoices', 'subtotal', NULL, 'input', '{"placeholder":"0.00","disabled":true}'::jsonb, NULL, 'Auto-calculated subtotal'),
('os_invoices', 'total_tax', NULL, 'input', '{"placeholder":"0.00","disabled":true}'::jsonb, NULL, 'Auto-calculated tax'),
('os_invoices', 'total', NULL, 'input', '{"placeholder":"0.00","disabled":true}'::jsonb, NULL, 'Auto-calculated total'),
('os_invoices', 'amount_paid', NULL, 'input', '{"placeholder":"0.00","disabled":true}'::jsonb, NULL, 'Auto-calculated paid amount'),
('os_invoices', 'amount_due', NULL, 'input', '{"placeholder":"0.00","disabled":true}'::jsonb, NULL, 'Auto-calculated amount due'),
('os_invoices', 'line_items', 'o2m', 'list-o2m', '{"template":"{{description}}"}'::jsonb, NULL, 'Invoice line items'),
('os_invoices', 'payments', 'o2m', 'list-o2m', '{"template":"{{amount}}"}'::jsonb, NULL, 'Payments received')
ON CONFLICT DO NOTHING;

-- OS Invoice Items Table
CREATE TABLE IF NOT EXISTS os_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  invoice UUID REFERENCES os_invoices(id) ON DELETE CASCADE NOT NULL,
  line_item_number INTEGER,
  type VARCHAR(100), -- 'service', 'product', 'expense', 'discount'
  item_name VARCHAR(255),
  description TEXT,
  item UUID REFERENCES os_items(id), -- Link to catalog item
  billable_expense UUID REFERENCES os_expenses(id), -- Link to expense if from expense

  unit_price NUMERIC(10,2) DEFAULT 0.00,
  quantity NUMERIC(10,2) DEFAULT 1.00,
  override_unit_price BOOLEAN DEFAULT false,

  -- Auto-calculated fields (managed by Flows)
  line_amount NUMERIC(10,2) DEFAULT 0.00,
  tax_rate UUID REFERENCES os_tax_rates(id),
  tax_amount NUMERIC(10,2) DEFAULT 0.00
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, hidden)
VALUES ('os_invoice_items', 'format_list_bulleted', 'Invoice line items', '#EC4899', false)
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_invoice_items', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_invoice_items', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_invoice_items', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_invoice_items', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_invoice_items', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_invoice_items', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_invoice_items', 'invoice', 'm2o', 'select-dropdown-m2o', '{"template":"{{invoice_number}}"}'::jsonb, NULL, 'Parent invoice'),
('os_invoice_items', 'line_item_number', NULL, 'input', '{"type":"number"}'::jsonb, NULL, 'Line number'),
('os_invoice_items', 'type', NULL, 'select-dropdown', '{"choices":[{"text":"Service","value":"service"},{"text":"Product","value":"product"},{"text":"Expense","value":"expense"},{"text":"Discount","value":"discount"}]}'::jsonb, NULL, 'Item type'),
('os_invoice_items', 'item_name', NULL, 'input', '{"placeholder":"Item name"}'::jsonb, NULL, 'Display name'),
('os_invoice_items', 'description', NULL, 'input-multiline', NULL, NULL, 'Line item description'),
('os_invoice_items', 'item', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Catalog item'),
('os_invoice_items', 'billable_expense', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Linked expense'),
('os_invoice_items', 'unit_price', NULL, 'input', '{"placeholder":"0.00","type":"number"}'::jsonb, NULL, 'Price per unit'),
('os_invoice_items', 'quantity', NULL, 'input', '{"placeholder":"1.00","type":"number"}'::jsonb, NULL, 'Quantity'),
('os_invoice_items', 'override_unit_price', 'cast-boolean', 'boolean', NULL, NULL, 'Override catalog price'),
('os_invoice_items', 'line_amount', NULL, 'input', '{"placeholder":"0.00","disabled":true}'::jsonb, NULL, 'Auto-calculated line total'),
('os_invoice_items', 'tax_rate', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Tax rate'),
('os_invoice_items', 'tax_amount', NULL, 'input', '{"placeholder":"0.00","disabled":true}'::jsonb, NULL, 'Auto-calculated tax')
ON CONFLICT DO NOTHING;

-- OS Payments Table
CREATE TABLE IF NOT EXISTS os_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  payment_date DATE DEFAULT CURRENT_DATE,
  amount NUMERIC(10,2) NOT NULL,
  transaction_fee NUMERIC(10,2) DEFAULT 0.00,
  organization UUID REFERENCES organizations(id),
  contact UUID REFERENCES contacts(id),
  invoice UUID REFERENCES os_invoices(id) ON DELETE SET NULL,

  -- Stripe integration
  stripe_payment_id VARCHAR(255),
  receipt_url TEXT,
  metadata JSONB
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, display_template)
VALUES ('os_payments', 'payments', 'Payment records', '#10B981', 'sort', '{{amount}} - {{payment_date}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_payments', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_payments', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Pending","value":"pending"},{"text":"Completed","value":"completed"},{"text":"Failed","value":"failed"},{"text":"Refunded","value":"refunded"}]}'::jsonb, 'badge', NULL),
('os_payments', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_payments', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_payments', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_payments', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_payments', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_payments', 'payment_date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, NULL),
('os_payments', 'amount', NULL, 'input', '{"placeholder":"0.00","type":"number"}'::jsonb, NULL, 'Payment amount'),
('os_payments', 'transaction_fee', NULL, 'input', '{"placeholder":"0.00","type":"number"}'::jsonb, NULL, 'Processing fee'),
('os_payments', 'organization', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Paying organization'),
('os_payments', 'contact', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Paying contact'),
('os_payments', 'invoice', 'm2o', 'select-dropdown-m2o', '{"template":"{{invoice_number}}"}'::jsonb, NULL, 'Related invoice'),
('os_payments', 'stripe_payment_id', NULL, 'input', '{"placeholder":"pi_xxxxx"}'::jsonb, NULL, 'Stripe Payment ID'),
('os_payments', 'receipt_url', NULL, 'input', '{"placeholder":"https://..."}'::jsonb, NULL, 'Receipt URL'),
('os_payments', 'metadata', 'cast-json', 'input-code', '{"language":"json"}'::jsonb, NULL, 'Payment metadata')
ON CONFLICT DO NOTHING;

-- OS Expenses Table
CREATE TABLE IF NOT EXISTS os_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'invoiced', 'reimbursed', 'rejected')),
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  category VARCHAR(100), -- 'travel', 'software', 'materials', 'consulting', etc.
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cost NUMERIC(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  file UUID REFERENCES directus_files(id),
  project UUID REFERENCES os_projects(id) ON DELETE SET NULL,

  is_billable BOOLEAN DEFAULT true,
  is_reimbursable BOOLEAN DEFAULT false,
  invoice_item UUID REFERENCES os_invoice_items(id) -- Set when expense is added to invoice
);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, display_template)
VALUES ('os_expenses', 'receipt', 'Billable expenses', '#F59E0B', 'sort', '{{name}} - {{cost}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('os_expenses', 'id', 'uuid', 'input', NULL, NULL, NULL),
('os_expenses', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Pending","value":"pending"},{"text":"Approved","value":"approved"},{"text":"Invoiced","value":"invoiced"},{"text":"Reimbursed","value":"reimbursed"},{"text":"Rejected","value":"rejected"}]}'::jsonb, 'badge', NULL),
('os_expenses', 'sort', NULL, 'input', NULL, NULL, NULL),
('os_expenses', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_expenses', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('os_expenses', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('os_expenses', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('os_expenses', 'category', NULL, 'select-dropdown', '{"allowOther":true,"choices":[{"text":"Travel","value":"travel"},{"text":"Software","value":"software"},{"text":"Materials","value":"materials"},{"text":"Consulting","value":"consulting"},{"text":"Other","value":"other"}]}'::jsonb, NULL, 'Expense category'),
('os_expenses', 'name', NULL, 'input', '{"placeholder":"Expense name"}'::jsonb, NULL, NULL),
('os_expenses', 'description', NULL, 'input-multiline', NULL, NULL, 'Expense details'),
('os_expenses', 'cost', NULL, 'input', '{"placeholder":"0.00","type":"number"}'::jsonb, NULL, 'Expense amount'),
('os_expenses', 'date', NULL, 'datetime', '{"includeSeconds":false}'::jsonb, NULL, NULL),
('os_expenses', 'file', 'file', 'file', NULL, NULL, 'Receipt or documentation'),
('os_expenses', 'project', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Related project'),
('os_expenses', 'is_billable', 'cast-boolean', 'boolean', NULL, NULL, 'Bill to client'),
('os_expenses', 'is_reimbursable', 'cast-boolean', 'boolean', NULL, NULL, 'Reimburse team member'),
('os_expenses', 'invoice_item', 'm2o', 'select-dropdown-m2o', '{"template":"{{description}}"}'::jsonb, NULL, 'Linked invoice item')
ON CONFLICT DO NOTHING;

-- Add relations
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field) VALUES
('os_invoice_items', 'invoice', 'os_invoices', 'line_items'),
('os_payments', 'invoice', 'os_invoices', 'payments')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_os_invoices_organization ON os_invoices(organization);
CREATE INDEX IF NOT EXISTS idx_os_invoices_project ON os_invoices(project);
CREATE INDEX IF NOT EXISTS idx_os_invoices_status ON os_invoices(status);
CREATE INDEX IF NOT EXISTS idx_os_invoices_due_date ON os_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_os_invoices_invoice_number ON os_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_os_invoice_items_invoice ON os_invoice_items(invoice);
CREATE INDEX IF NOT EXISTS idx_os_payments_invoice ON os_payments(invoice);
CREATE INDEX IF NOT EXISTS idx_os_payments_organization ON os_payments(organization);
CREATE INDEX IF NOT EXISTS idx_os_expenses_project ON os_expenses(project);
CREATE INDEX IF NOT EXISTS idx_os_expenses_status ON os_expenses(status);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 074: AgencyOS Invoicing System completed successfully';
  RAISE NOTICE '   Created: os_items, os_invoices, os_invoice_items, os_payments, os_expenses';
  RAISE NOTICE '   Note: Auto-calculation flows will be added in migration 078';
END $$;

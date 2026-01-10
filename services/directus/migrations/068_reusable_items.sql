-- Migration: 068_reusable_items.sql
-- Description: Reusable invoice line items catalog
-- Dependencies: 030_invoices.sql

-- =============================================================================
-- ITEMS TABLE (Reusable Invoice Items)
-- =============================================================================

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  -- Item Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100), -- Stock Keeping Unit
  icon VARCHAR(50),

  -- Categorization
  category VARCHAR(100),
  tags TEXT[],

  -- Pricing
  unit_price DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2), -- For margin tracking
  currency VARCHAR(3) DEFAULT 'USD',

  -- Unit of measure
  unit VARCHAR(50) DEFAULT 'unit', -- 'unit', 'hour', 'day', 'project', 'month', 'word', 'page'

  -- Tax
  default_tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
  is_taxable BOOLEAN DEFAULT true,

  -- Inventory (optional)
  track_inventory BOOLEAN DEFAULT false,
  quantity_in_stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER,

  -- Sort
  sort INTEGER DEFAULT 0,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_name_search ON items USING gin(to_tsvector('english', name));

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_items_timestamp ON items;
CREATE TRIGGER update_items_timestamp
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION directus_set_timestamp();

-- =============================================================================
-- ENHANCE INVOICE ITEMS TABLE
-- =============================================================================

-- Add reference to items catalog
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE SET NULL;

-- Add item type
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'custom'
  CHECK (item_type IN ('catalog', 'expense', 'custom', 'discount', 'credit'));

-- Add override flag
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS override_unit_price BOOLEAN DEFAULT false;

-- =============================================================================
-- EXPENSE CATEGORIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),

  -- Parent for hierarchy
  parent_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,

  -- Default tax treatment
  is_billable_default BOOLEAN DEFAULT true,
  default_markup_percent DECIMAL(5,2) DEFAULT 0,

  -- Sort
  sort INTEGER DEFAULT 0,

  -- Audit
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expense_categories_parent ON expense_categories(parent_id);

-- =============================================================================
-- ENHANCE EXPENSES TABLE (if exists)
-- =============================================================================

-- Add category reference
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor VARCHAR(255);
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_file_id UUID REFERENCES directus_files(id);
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50); -- 'cash', 'card', 'bank_transfer', 'check'
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_reimbursable BOOLEAN DEFAULT false;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursed_at TIMESTAMPTZ;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS markup_percent DECIMAL(5,2) DEFAULT 0;
  END IF;
END $$;

-- =============================================================================
-- REGISTER COLLECTIONS WITH DIRECTUS
-- =============================================================================

INSERT INTO directus_collections (collection, icon, note, display_template, sort_field, archive_field, archive_value, unarchive_value, sort)
VALUES
  ('items', 'inventory_2', 'Reusable invoice line items catalog', '{{name}}', 'sort', 'status', 'archived', 'active', 80),
  ('expense_categories', 'category', 'Categories for expense tracking', '{{name}}', 'sort', NULL, NULL, NULL, 81)
ON CONFLICT (collection) DO NOTHING;

-- =============================================================================
-- CONFIGURE FIELDS IN DIRECTUS
-- =============================================================================

-- Items Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('items', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('items', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Active", "value": "active"}, {"text": "Archived", "value": "archived"}]}', 'labels', '{"choices": [{"text": "Active", "value": "active", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Archived", "value": "archived", "foreground": "#FFFFFF", "background": "#6B7280"}]}', FALSE, FALSE, 2, 'half', NULL, FALSE),
  ('items', 'name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 3, 'half', 'Item name', TRUE),
  ('items', 'description', NULL, 'input-rich-text-md', NULL, NULL, NULL, FALSE, FALSE, 4, 'full', NULL, FALSE),
  ('items', 'sku', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 5, 'half', 'Stock Keeping Unit', FALSE),
  ('items', 'icon', NULL, 'select-icon', NULL, 'icon', NULL, FALSE, FALSE, 6, 'half', NULL, FALSE),
  ('items', 'category', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 7, 'half', NULL, FALSE),
  ('items', 'tags', 'cast-json', 'tags', NULL, 'labels', NULL, FALSE, FALSE, 8, 'half', NULL, FALSE),
  ('items', 'unit_price', NULL, 'input', '{"iconLeft": "$", "min": 0, "step": 0.01}', NULL, NULL, FALSE, FALSE, 9, 'half', 'Sale price', TRUE),
  ('items', 'unit_cost', NULL, 'input', '{"iconLeft": "$", "min": 0, "step": 0.01}', NULL, NULL, FALSE, FALSE, 10, 'half', 'Cost (for margin)', FALSE),
  ('items', 'currency', NULL, 'select-dropdown', '{"choices": [{"text": "USD", "value": "USD"}, {"text": "EUR", "value": "EUR"}, {"text": "GBP", "value": "GBP"}, {"text": "CAD", "value": "CAD"}, {"text": "AUD", "value": "AUD"}]}', NULL, NULL, FALSE, FALSE, 11, 'half', NULL, FALSE),
  ('items', 'unit', NULL, 'select-dropdown', '{"choices": [{"text": "Unit", "value": "unit"}, {"text": "Hour", "value": "hour"}, {"text": "Day", "value": "day"}, {"text": "Project", "value": "project"}, {"text": "Month", "value": "month"}, {"text": "Word", "value": "word"}, {"text": "Page", "value": "page"}]}', NULL, NULL, FALSE, FALSE, 12, 'half', 'Unit of measure', FALSE),
  ('items', 'default_tax_rate_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}} ({{rate}}%)"}', 'related-values', NULL, FALSE, FALSE, 13, 'half', 'Default tax rate', FALSE),
  ('items', 'is_taxable', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 14, 'half', NULL, FALSE),
  ('items', 'track_inventory', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 15, 'half', 'Track stock levels', FALSE),
  ('items', 'quantity_in_stock', NULL, 'input', '{"min": 0}', NULL, NULL, FALSE, FALSE, 16, 'half', NULL, FALSE),
  ('items', 'low_stock_threshold', NULL, 'input', '{"min": 0}', NULL, NULL, FALSE, FALSE, 17, 'half', 'Alert when below', FALSE),
  ('items', 'sort', NULL, 'input', '{"min": 0}', NULL, NULL, FALSE, TRUE, 18, 'half', NULL, FALSE),
  ('items', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 19, 'half', NULL, FALSE),
  ('items', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', TRUE, TRUE, 20, 'half', NULL, FALSE),
  ('items', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 21, 'half', NULL, FALSE),
  ('items', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, 'user', NULL, TRUE, TRUE, 22, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Expense Categories Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('expense_categories', 'id', 'uuid', 'input', NULL, NULL, NULL, TRUE, TRUE, 1, 'full', NULL, FALSE),
  ('expense_categories', 'name', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 2, 'half', NULL, TRUE),
  ('expense_categories', 'description', NULL, 'input', NULL, NULL, NULL, FALSE, FALSE, 3, 'half', NULL, FALSE),
  ('expense_categories', 'icon', NULL, 'select-icon', NULL, 'icon', NULL, FALSE, FALSE, 4, 'half', NULL, FALSE),
  ('expense_categories', 'color', NULL, 'select-color', NULL, 'color', NULL, FALSE, FALSE, 5, 'half', NULL, FALSE),
  ('expense_categories', 'parent_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}}"}', 'related-values', NULL, FALSE, FALSE, 6, 'half', 'Parent category', FALSE),
  ('expense_categories', 'is_billable_default', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, FALSE, 7, 'half', NULL, FALSE),
  ('expense_categories', 'default_markup_percent', NULL, 'input', '{"min": 0, "max": 100, "step": 0.01}', NULL, NULL, FALSE, FALSE, 8, 'half', 'Default markup %', FALSE),
  ('expense_categories', 'sort', NULL, 'input', '{"min": 0}', NULL, NULL, FALSE, TRUE, 9, 'half', NULL, FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- Add new fields to invoice_items
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
SELECT v.collection, v.field, v.special, v.interface, v.options::json, v.display, v.display_options::json, v.readonly, v.hidden, v.sort, v.width, v.note, v.required
FROM (
  VALUES
  ('invoice_items', 'item_id', 'm2o', 'select-dropdown-m2o', '{"template": "{{name}} - ${{unit_price}}"}', 'related-values', NULL, FALSE, FALSE, 25, 'half', 'From catalog', FALSE),
  ('invoice_items', 'item_type', NULL, 'select-dropdown', '{"choices": [{"text": "Catalog Item", "value": "catalog"}, {"text": "Expense", "value": "expense"}, {"text": "Custom", "value": "custom"}, {"text": "Discount", "value": "discount"}, {"text": "Credit", "value": "credit"}]}', 'labels', '{"choices": [{"text": "Catalog", "value": "catalog", "foreground": "#FFFFFF", "background": "#3B82F6"}, {"text": "Expense", "value": "expense", "foreground": "#FFFFFF", "background": "#F59E0B"}, {"text": "Custom", "value": "custom", "foreground": "#FFFFFF", "background": "#6B7280"}, {"text": "Discount", "value": "discount", "foreground": "#FFFFFF", "background": "#10B981"}, {"text": "Credit", "value": "credit", "foreground": "#FFFFFF", "background": "#8B5CF6"}]}', FALSE, FALSE, 26, 'half', NULL, FALSE),
  ('invoice_items', 'override_unit_price', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, FALSE, TRUE, 27, 'half', 'Override catalog price', FALSE)
) AS v(collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, note, required)
WHERE NOT EXISTS (SELECT 1 FROM directus_fields f WHERE f.collection = v.collection AND f.field = v.field);

-- =============================================================================
-- CONFIGURE RELATIONSHIPS
-- =============================================================================

-- Items -> Tax Rate
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('items', 'default_tax_rate_id', 'tax_rates', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- Expense Categories -> Parent
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('expense_categories', 'parent_id', 'expense_categories', 'children', 'nullify')
ON CONFLICT DO NOTHING;

-- Invoice Items -> Items
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_deselect_action)
VALUES ('invoice_items', 'item_id', 'items', NULL, 'nullify')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SEED SAMPLE ITEMS
-- =============================================================================

INSERT INTO items (id, name, description, category, unit_price, unit, sku, status)
VALUES
  ('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80', 'Strategy Consulting', 'Hourly strategy and business consulting', 'Services', 250.00, 'hour', 'SVC-STRATEGY', 'active'),
  ('d5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f91', 'Web Development', 'Hourly web development services', 'Services', 175.00, 'hour', 'SVC-WEBDEV', 'active'),
  ('d6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f02', 'UI/UX Design', 'User interface and experience design', 'Services', 150.00, 'hour', 'SVC-DESIGN', 'active'),
  ('d7e8f9a0-b1c2-4d3e-4f5a-6b7c8d9e0f13', 'Project Management', 'Project coordination and management', 'Services', 125.00, 'hour', 'SVC-PM', 'active'),
  ('d8e9f0a1-b2c3-4d4e-5f6a-7b8c9d0e1f24', 'Monthly Retainer', 'Monthly retainer for ongoing support', 'Retainer', 5000.00, 'month', 'RET-MONTHLY', 'active'),
  ('d9e0f1a2-b3c4-4d5e-6f7a-8b9c0d1e2f35', 'Website Hosting', 'Managed website hosting', 'Hosting', 99.00, 'month', 'HOST-WEB', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unit_price = EXCLUDED.unit_price;

-- Seed expense categories
INSERT INTO expense_categories (id, name, icon, color, is_billable_default, default_markup_percent)
VALUES
  ('e0f1a2b3-c4d5-4e6f-7a8b-9c0d1e2f3a40', 'Software & Subscriptions', 'computer', '#6366F1', true, 10),
  ('e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a51', 'Travel', 'flight', '#3B82F6', true, 0),
  ('e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a62', 'Equipment', 'devices', '#10B981', true, 15),
  ('e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a73', 'Office Supplies', 'inventory', '#F59E0B', false, 0),
  ('e4f5a6b7-c8d9-4e0f-1a2b-3c4d5e6f7a84', 'Marketing', 'campaign', '#8B5CF6', true, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE items IS 'Reusable catalog of products and services for invoicing';
COMMENT ON TABLE expense_categories IS 'Categories for organizing and tracking expenses';
COMMENT ON COLUMN items.unit_cost IS 'Cost to deliver - for margin calculation';
COMMENT ON COLUMN items.unit IS 'Unit of measure: hour, day, project, month, etc.';

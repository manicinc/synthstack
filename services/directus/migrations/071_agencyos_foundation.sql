-- ============================================
-- Migration 071: AgencyOS Foundation Tables
-- ============================================
-- Creates foundational lookup tables for AgencyOS features
-- - Deal Stages (for sales pipeline)
-- - Payment Terms (Net 30, Net 60, etc.)
-- - Tax Rates (sales tax, VAT, etc.)
-- - Email Templates
-- ============================================

-- Deal Stages Table
CREATE TABLE IF NOT EXISTS os_deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'active',
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  name VARCHAR(255) NOT NULL,
  color VARCHAR(50)
);

-- Register collection with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field)
VALUES ('os_deal_stages', 'timeline', 'Deal pipeline stages', '#6366F1', 'sort')
ON CONFLICT (collection) DO NOTHING;

-- Add default fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_deal_stages', 'id', 'uuid', 'input', NULL),
('os_deal_stages', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Active","value":"active"},{"text":"Archived","value":"archived"}]}'::jsonb),
('os_deal_stages', 'sort', NULL, 'input', NULL),
('os_deal_stages', 'user_created', 'user-created', 'select-dropdown-m2o', NULL),
('os_deal_stages', 'date_created', 'date-created', 'datetime', NULL),
('os_deal_stages', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL),
('os_deal_stages', 'date_updated', 'date-updated', 'datetime', NULL),
('os_deal_stages', 'name', NULL, 'input', '{"placeholder":"Stage name"}'::jsonb),
('os_deal_stages', 'color', 'cast-json', 'select-color', NULL)
ON CONFLICT DO NOTHING;

-- Insert default deal stages
INSERT INTO os_deal_stages (name, color, sort) VALUES
  ('New', '#94A3B8', 1),
  ('Qualified', '#3B82F6', 2),
  ('Proposal', '#8B5CF6', 3),
  ('Negotiation', '#F59E0B', 4),
  ('Won', '#10B981', 5),
  ('Lost', '#EF4444', 6)
ON CONFLICT DO NOTHING;

-- Payment Terms Table
CREATE TABLE IF NOT EXISTS os_payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  name VARCHAR(255) NOT NULL,
  days INTEGER DEFAULT 30
);

-- Register collection
INSERT INTO directus_collections (collection, icon, note, color)
VALUES ('os_payment_terms', 'calendar_today', 'Payment term definitions', '#10B981')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_payment_terms', 'id', 'uuid', 'input', NULL),
('os_payment_terms', 'user_created', 'user-created', 'select-dropdown-m2o', NULL),
('os_payment_terms', 'date_created', 'date-created', 'datetime', NULL),
('os_payment_terms', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL),
('os_payment_terms', 'date_updated', 'date-updated', 'datetime', NULL),
('os_payment_terms', 'name', NULL, 'input', '{"placeholder":"Net 30"}'::jsonb),
('os_payment_terms', 'days', NULL, 'input', '{"placeholder":"30"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert default payment terms
INSERT INTO os_payment_terms (name, days) VALUES
  ('Due on Receipt', 0),
  ('Net 15', 15),
  ('Net 30', 30),
  ('Net 60', 60),
  ('Net 90', 90)
ON CONFLICT DO NOTHING;

-- Tax Rates Table
CREATE TABLE IF NOT EXISTS os_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'active',
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  name VARCHAR(255) NOT NULL,
  rate NUMERIC(5,2) DEFAULT 0.00
);

-- Register collection
INSERT INTO directus_collections (collection, icon, note, color, sort_field)
VALUES ('os_tax_rates', 'percent', 'Tax rate definitions', '#F59E0B', 'sort')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_tax_rates', 'id', 'uuid', 'input', NULL),
('os_tax_rates', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Active","value":"active"},{"text":"Archived","value":"archived"}]}'::jsonb),
('os_tax_rates', 'sort', NULL, 'input', NULL),
('os_tax_rates', 'user_created', 'user-created', 'select-dropdown-m2o', NULL),
('os_tax_rates', 'date_created', 'date-created', 'datetime', NULL),
('os_tax_rates', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL),
('os_tax_rates', 'date_updated', 'date-updated', 'datetime', NULL),
('os_tax_rates', 'name', NULL, 'input', '{"placeholder":"Sales Tax"}'::jsonb),
('os_tax_rates', 'rate', NULL, 'input', '{"placeholder":"8.5"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert default tax rates
INSERT INTO os_tax_rates (name, rate, sort) VALUES
  ('No Tax', 0.00, 1),
  ('Sales Tax (8.5%)', 8.50, 2),
  ('VAT (20%)', 20.00, 3)
ON CONFLICT DO NOTHING;

-- Email Templates Table
CREATE TABLE IF NOT EXISTS os_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'active',
  sort INTEGER DEFAULT 0,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT
);

-- Register collection
INSERT INTO directus_collections (collection, icon, note, color, sort_field)
VALUES ('os_email_templates', 'email', 'Reusable email templates', '#EC4899', 'sort')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options) VALUES
('os_email_templates', 'id', 'uuid', 'input', NULL),
('os_email_templates', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Active","value":"active"},{"text":"Archived","value":"archived"}]}'::jsonb),
('os_email_templates', 'sort', NULL, 'input', NULL),
('os_email_templates', 'user_created', 'user-created', 'select-dropdown-m2o', NULL),
('os_email_templates', 'date_created', 'date-created', 'datetime', NULL),
('os_email_templates', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL),
('os_email_templates', 'date_updated', 'date-updated', 'datetime', NULL),
('os_email_templates', 'name', NULL, 'input', '{"placeholder":"Template Name"}'::jsonb),
('os_email_templates', 'subject', NULL, 'input', '{"placeholder":"Email subject"}'::jsonb),
('os_email_templates', 'body', NULL, 'input-rich-text-html', NULL)
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 071: AgencyOS Foundation Tables completed successfully';
  RAISE NOTICE '   Created: os_deal_stages, os_payment_terms, os_tax_rates, os_email_templates';
END $$;

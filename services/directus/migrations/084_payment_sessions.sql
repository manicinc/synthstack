-- ============================================
-- Migration 084: Payment Sessions for Stripe Checkout
-- ============================================
-- Tracks Stripe Checkout sessions before payment completion
-- When payment completes, a record is created in os_payments
-- ============================================

-- Payment Sessions Table
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMPTZ DEFAULT NOW(),
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMPTZ DEFAULT NOW(),

  -- Session details
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL UNIQUE, -- Stripe Checkout Session ID
  provider VARCHAR(50) DEFAULT 'stripe' CHECK (provider IN ('stripe', 'paypal', 'square')),

  -- Payment details
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',

  -- Customer details
  customer_email VARCHAR(255),
  contact_id UUID REFERENCES contacts(id),
  organization_id UUID REFERENCES organizations(id),

  -- Session URLs
  success_url TEXT,
  cancel_url TEXT,

  -- Tracking
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_sessions_invoice ON payment_sessions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_created ON payment_sessions(date_created DESC);

-- Register with Directus
INSERT INTO directus_collections (collection, icon, note, color, sort_field, display_template)
VALUES ('payment_sessions', 'credit_card', 'Stripe Checkout sessions', '#6366F1', NULL, '{{session_id}} - {{status}}')
ON CONFLICT (collection) DO NOTHING;

-- Add fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, note) VALUES
('payment_sessions', 'id', 'uuid', 'input', NULL, NULL, NULL),
('payment_sessions', 'status', NULL, 'select-dropdown', '{"choices":[{"text":"Pending","value":"pending"},{"text":"Completed","value":"completed"},{"text":"Expired","value":"expired"},{"text":"Cancelled","value":"cancelled"}]}'::jsonb, 'badge', 'Checkout session status'),
('payment_sessions', 'user_created', 'user-created', 'select-dropdown-m2o', NULL, NULL, NULL),
('payment_sessions', 'date_created', 'date-created', 'datetime', NULL, NULL, NULL),
('payment_sessions', 'user_updated', 'user-updated', 'select-dropdown-m2o', NULL, NULL, NULL),
('payment_sessions', 'date_updated', 'date-updated', 'datetime', NULL, NULL, NULL),
('payment_sessions', 'invoice_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{invoice_number}}"}'::jsonb, NULL, 'Related invoice'),
('payment_sessions', 'session_id', NULL, 'input', '{"placeholder":"cs_xxxxx","disabled":true}'::jsonb, NULL, 'Stripe Session ID'),
('payment_sessions', 'provider', NULL, 'select-dropdown', '{"choices":[{"text":"Stripe","value":"stripe"},{"text":"PayPal","value":"paypal"},{"text":"Square","value":"square"}]}'::jsonb, NULL, 'Payment provider'),
('payment_sessions', 'amount', NULL, 'input', '{"placeholder":"0.00","type":"number","disabled":true}'::jsonb, NULL, 'Payment amount'),
('payment_sessions', 'currency', NULL, 'input', '{"placeholder":"usd","maxLength":3}'::jsonb, NULL, 'Currency code'),
('payment_sessions', 'customer_email', NULL, 'input', '{"placeholder":"customer@example.com","iconRight":"email"}'::jsonb, NULL, 'Customer email'),
('payment_sessions', 'contact_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{first_name}} {{last_name}}"}'::jsonb, NULL, 'Portal contact'),
('payment_sessions', 'organization_id', 'm2o', 'select-dropdown-m2o', '{"template":"{{name}}"}'::jsonb, NULL, 'Customer organization'),
('payment_sessions', 'success_url', NULL, 'input', '{"placeholder":"https://..."}'::jsonb, NULL, 'Success redirect URL'),
('payment_sessions', 'cancel_url', NULL, 'input', '{"placeholder":"https://..."}'::jsonb, NULL, 'Cancel redirect URL'),
('payment_sessions', 'completed_at', NULL, 'datetime', NULL, NULL, 'When payment completed'),
('payment_sessions', 'expires_at', NULL, 'datetime', NULL, NULL, 'When session expires'),
('payment_sessions', 'metadata', 'cast-json', 'input-code', '{"language":"json"}'::jsonb, NULL, 'Additional session data')
ON CONFLICT DO NOTHING;

-- Add permission for public to create payment sessions (via API)
-- Note: Direct Directus access still requires authentication
-- API gateway handles portal authentication

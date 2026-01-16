-- Subscription & Billing Schema Migration
-- Comprehensive subscription plans, webhooks, and credit management

-- ============================================
-- SUBSCRIPTION PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  
  -- Plan Identity
  tier VARCHAR(20) NOT NULL UNIQUE
    CHECK (tier IN ('free', 'maker', 'pro', 'unlimited')),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Pricing (in cents)
  price_monthly_cents INT NOT NULL DEFAULT 0,
  price_yearly_cents INT NOT NULL DEFAULT 0,
  
  -- Stripe Integration
  stripe_product_id VARCHAR(255),
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  
  -- Limits & Features
  credits_per_day INT NOT NULL DEFAULT 3,
  rate_limit_per_minute INT NOT NULL DEFAULT 10,
  rate_limit_generation INT NOT NULL DEFAULT 3,
  max_file_size_mb INT NOT NULL DEFAULT 10,
  features JSONB DEFAULT '[]',
  
  -- Display
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  badge_text VARCHAR(50),
  sort_order INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = TRUE;

-- Insert default plans
INSERT INTO subscription_plans (
  tier, name, description,
  price_monthly_cents, price_yearly_cents,
  credits_per_day, rate_limit_per_minute, rate_limit_generation, max_file_size_mb,
  features, is_active, is_featured, badge_text, sort_order
) VALUES
(
  'free', 'Free', 'Get started with basic features',
  0, 0,
  3, 10, 3, 10,
  '["Basic STL analysis", "Community profiles (view only)", "3 generations per day"]'::jsonb,
  TRUE, FALSE, NULL, 0
),
(
  'maker', 'Maker', 'Perfect for hobbyists and makers',
  999, 9990,
  30, 30, 15, 50,
  '["Advanced STL analysis", "Community profile creation", "30 generations per day", "Slicer exports (OrcaSlicer, PrusaSlicer)", "Email support"]'::jsonb,
  TRUE, FALSE, 'Popular', 1
),
(
  'pro', 'Pro', 'For power users and professionals',
  2499, 24990,
  100, 60, 30, 200,
  '["Everything in Maker", "100 generations per day", "Priority AI processing", "Batch processing (up to 5 files)", "API access", "Priority support"]'::jsonb,
  TRUE, TRUE, 'Best Value', 2
),
(
  'unlimited', 'Unlimited', 'Unlimited power for teams and businesses',
  7999, 79990,
  -1, 100, 60, 500,
  '["Everything in Pro", "Unlimited generations", "Team sharing (up to 5 members)", "Custom slicer profiles", "White-label exports", "Dedicated support", "Early access to features"]'::jsonb,
  TRUE, FALSE, 'Enterprise', 3
)
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  price_yearly_cents = EXCLUDED.price_yearly_cents,
  credits_per_day = EXCLUDED.credits_per_day,
  rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
  rate_limit_generation = EXCLUDED.rate_limit_generation,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  features = EXCLUDED.features,
  is_featured = EXCLUDED.is_featured,
  badge_text = EXCLUDED.badge_text,
  sort_order = EXCLUDED.sort_order,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- PAYMENT WEBHOOKS LOG
-- ============================================
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Webhook Identity
  provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  
  -- Payload
  payload JSONB NOT NULL,
  
  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  retry_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(provider, event_id)
);

CREATE INDEX idx_webhooks_provider ON payment_webhooks(provider);
CREATE INDEX idx_webhooks_event_type ON payment_webhooks(event_type);
CREATE INDEX idx_webhooks_processed ON payment_webhooks(processed) WHERE processed = FALSE;
CREATE INDEX idx_webhooks_created ON payment_webhooks(created_at DESC);

-- ============================================
-- CREDIT PACKAGES (for one-time purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  
  -- Package Details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  credits INT NOT NULL,
  price_cents INT NOT NULL,
  
  -- Stripe Integration
  stripe_price_id VARCHAR(255),
  
  -- Display
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  badge_text VARCHAR(50),
  sort_order INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_packages_active ON credit_packages(is_active) WHERE is_active = TRUE;

-- Insert default credit packages
INSERT INTO credit_packages (name, description, credits, price_cents, is_active, is_featured, badge_text, sort_order)
VALUES
  ('Starter Pack', '10 extra credits', 10, 499, TRUE, FALSE, NULL, 0),
  ('Power Pack', '50 extra credits', 50, 1999, TRUE, TRUE, 'Best Value', 1),
  ('Pro Pack', '150 extra credits', 150, 4999, TRUE, FALSE, 'Most Credits', 2)
ON CONFLICT DO NOTHING;

-- ============================================
-- CREDIT PURCHASES (one-time credit buys)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Purchase Details
  package_id UUID REFERENCES credit_packages(id) ON DELETE SET NULL,
  credits INT NOT NULL,
  price_cents INT NOT NULL,
  
  -- Stripe
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_credit_purchases_user ON credit_purchases(user_id);
CREATE INDEX idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX idx_credit_purchases_stripe ON credit_purchases(stripe_session_id);

-- ============================================
-- SUBSCRIPTION HISTORY (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Subscription Details
  action VARCHAR(50) NOT NULL
    CHECK (action IN ('created', 'upgraded', 'downgraded', 'canceled', 'reactivated', 'paused', 'resumed', 'expired', 'renewed')),
  
  from_tier VARCHAR(20),
  to_tier VARCHAR(20),
  
  -- Stripe
  stripe_subscription_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  
  -- Details
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sub_history_user ON subscription_history(user_id);
CREATE INDEX idx_sub_history_action ON subscription_history(action);
CREATE INDEX idx_sub_history_created ON subscription_history(created_at DESC);

-- ============================================
-- INVOICE CACHE (for quick access)
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Stripe Invoice
  stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_invoice_number VARCHAR(100),
  
  -- Invoice Details
  status VARCHAR(50) NOT NULL,
  amount_cents INT NOT NULL,
  currency VARCHAR(10) DEFAULT 'usd',
  description TEXT,
  pdf_url TEXT,
  hosted_invoice_url TEXT,
  
  -- Period
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_cache_user ON invoice_cache(user_id);
CREATE INDEX idx_invoice_cache_stripe ON invoice_cache(stripe_invoice_id);
CREATE INDEX idx_invoice_cache_date ON invoice_cache(invoice_date DESC);

-- ============================================
-- CREDIT TRANSACTIONS (detailed log)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Transaction Details
  type VARCHAR(50) NOT NULL
    CHECK (type IN ('subscription_grant', 'daily_reset', 'generation', 'purchase', 'admin_adjustment', 'refund', 'expiration', 'bonus')),
  
  amount INT NOT NULL, -- Positive for credit, negative for debit
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,
  
  -- Reference
  reference_type VARCHAR(50), -- 'generation', 'subscription', 'purchase', etc.
  reference_id UUID,
  
  -- Details
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_tx_type ON credit_transactions(type);
CREATE INDEX idx_credit_tx_created ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_tx_ref ON credit_transactions(reference_type, reference_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update timestamp for subscription_plans
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscription_plans_updated ON subscription_plans;
CREATE TRIGGER trigger_subscription_plans_updated
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Auto-update timestamp for credit_packages
DROP TRIGGER IF EXISTS trigger_credit_packages_updated ON credit_packages;
CREATE TRIGGER trigger_credit_packages_updated
  BEFORE UPDATE ON credit_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- ============================================
-- VIEWS
-- ============================================

-- User billing overview
CREATE OR REPLACE VIEW user_billing_overview AS
SELECT 
  au.id,
  au.email,
  au.display_name,
  au.subscription_tier,
  au.subscription_status,
  au.subscription_id,
  au.stripe_customer_id,
  au.subscription_started_at,
  au.subscription_ends_at,
  au.credits_remaining,
  au.lifetime_credits_used,
  sp.name as plan_name,
  sp.price_monthly_cents,
  sp.price_yearly_cents,
  sp.credits_per_day,
  (SELECT COUNT(*) FROM invoice_cache ic WHERE ic.user_id = au.id) as invoice_count,
  (SELECT SUM(credits) FROM credit_purchases cp WHERE cp.user_id = au.id AND cp.status = 'completed') as purchased_credits,
  (SELECT COUNT(*) FROM subscription_history sh WHERE sh.user_id = au.id) as subscription_changes
FROM app_users au
LEFT JOIN subscription_plans sp ON au.subscription_tier = sp.tier;

-- Revenue analytics
CREATE OR REPLACE VIEW revenue_daily AS
SELECT 
  DATE(ic.invoice_date) as date,
  COUNT(*) as invoice_count,
  SUM(ic.amount_cents) as total_cents,
  COUNT(DISTINCT ic.user_id) as unique_customers
FROM invoice_cache ic
WHERE ic.status = 'paid'
GROUP BY DATE(ic.invoice_date)
ORDER BY date DESC;

-- ============================================
-- PERMISSIONS
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
  END IF;
END $$;

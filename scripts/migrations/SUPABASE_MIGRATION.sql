-- ============================================
-- SynthStack Supabase Migration
-- Complete setup for subscription billing with Supabase auth
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- APP USERS (Synced from Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY, -- Supabase auth.users.id (not auto-generated)
  status VARCHAR(50) DEFAULT 'active',

  -- Basic Info
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),

  -- Subscription & Billing
  subscription_tier VARCHAR(20) DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'maker', 'pro', 'agency', 'unlimited')),
  subscription_status VARCHAR(20) DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),
  stripe_customer_id VARCHAR(255),
  subscription_id VARCHAR(255),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,

  -- Credits
  credits_remaining INT DEFAULT 10,
  lifetime_credits_used INT DEFAULT 0,
  credits_reset_at TIMESTAMP WITH TIME ZONE,

  -- Moderation
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE,
  warning_count INT DEFAULT 0,

  -- Admin
  admin_notes TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_moderator BOOLEAN DEFAULT FALSE,

  -- Auth provider tracking
  auth_provider VARCHAR(50) DEFAULT 'supabase',
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP WITH TIME ZONE,

  -- Tracking
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_generation_at TIMESTAMP WITH TIME ZONE,
  total_generations INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_app_users_subscription ON app_users(subscription_tier, subscription_status);
CREATE INDEX idx_app_users_stripe ON app_users(stripe_customer_id);
CREATE INDEX idx_app_users_banned ON app_users(is_banned) WHERE is_banned = TRUE;
CREATE INDEX idx_app_users_created ON app_users(created_at DESC);

-- ============================================
-- SUBSCRIPTION PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Plan Identity
  tier VARCHAR(20) NOT NULL UNIQUE
    CHECK (tier IN ('free', 'maker', 'pro', 'agency', 'unlimited')),
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
  credits_per_day, rate_limit_per_minute, max_file_size_mb,
  features, is_active, is_featured, badge_text, sort_order
) VALUES
(
  'free', 'Free', 'Get started with basic features',
  0, 0,
  10, 10, 10,
  '["10 generations per day", "Basic AI features", "Community support"]'::jsonb,
  TRUE, FALSE, NULL, 0
),
(
  'maker', 'Maker', 'Perfect for hobbyists and makers',
  1299, 11691,
  30, 30, 50,
  '["30 generations per day", "Advanced AI features", "Email support", "Priority processing"]'::jsonb,
  TRUE, FALSE, 'Popular', 1
),
(
  'pro', 'Pro', 'For power users and professionals',
  2499, 22491,
  100, 60, 200,
  '["100 generations per day", "Premium AI features", "API access", "Priority support", "Batch processing"]'::jsonb,
  TRUE, TRUE, 'Best Value', 2
),
(
  'agency', 'Agency', 'Unlimited power for teams',
  3999, 35991,
  -1, 100, 500,
  '["Unlimited generations", "All premium features", "Team sharing", "Dedicated support", "White-label", "Custom integrations"]'::jsonb,
  TRUE, FALSE, 'Enterprise', 3
)
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  price_yearly_cents = EXCLUDED.price_yearly_cents,
  credits_per_day = EXCLUDED.credits_per_day,
  rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  features = EXCLUDED.features,
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
-- CREDIT PACKAGES (one-time purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name VARCHAR(100) NOT NULL,
  description TEXT,
  credits INT NOT NULL,
  price_cents INT NOT NULL,
  stripe_price_id VARCHAR(255),

  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  badge_text VARCHAR(50),
  sort_order INT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_packages_active ON credit_packages(is_active) WHERE is_active = TRUE;

-- ============================================
-- CREDIT PURCHASES (one-time credit buys)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  package_id UUID REFERENCES credit_packages(id) ON DELETE SET NULL,
  credits INT NOT NULL,
  price_cents INT NOT NULL,

  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),

  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

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
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  action VARCHAR(50) NOT NULL
    CHECK (action IN ('created', 'upgraded', 'downgraded', 'canceled', 'reactivated', 'paused', 'resumed', 'expired', 'renewed')),

  from_tier VARCHAR(20),
  to_tier VARCHAR(20),

  stripe_subscription_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),

  reason TEXT,
  metadata JSONB DEFAULT '{}',

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
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_invoice_number VARCHAR(100),

  status VARCHAR(50) NOT NULL,
  amount_cents INT NOT NULL,
  currency VARCHAR(10) DEFAULT 'usd',
  description TEXT,
  pdf_url TEXT,
  hosted_invoice_url TEXT,

  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,

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
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL
    CHECK (type IN ('subscription_grant', 'daily_reset', 'generation', 'purchase', 'admin_adjustment', 'refund', 'expiration', 'bonus')),

  amount INT NOT NULL, -- Positive for credit, negative for debit
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,

  reference_type VARCHAR(50),
  reference_id VARCHAR(255),

  reason TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_tx_type ON credit_transactions(type);
CREATE INDEX idx_credit_tx_created ON credit_transactions(created_at DESC);

-- ============================================
-- PAYMENT SESSIONS (track Stripe checkout sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,

  session_id VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('subscription', 'credit_purchase', 'invoice')),

  amount_cents INT,
  currency VARCHAR(10) DEFAULT 'usd',

  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired', 'canceled')),

  metadata JSONB DEFAULT '{}',

  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_sessions_user ON payment_sessions(user_id);
CREATE INDEX idx_payment_sessions_session ON payment_sessions(session_id);
CREATE INDEX idx_payment_sessions_status ON payment_sessions(status);

-- ============================================
-- ANALYTICS EVENTS (track user activity)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,

  metadata JSONB DEFAULT '{}',

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER app_users_updated
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscription_plans_updated
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER credit_packages_updated
  BEFORE UPDATE ON credit_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own profile" ON app_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON app_users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own credit transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription history" ON subscription_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own invoices" ON invoice_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own credit purchases" ON credit_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment sessions" ON payment_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Subscription plans are public (read-only)
CREATE POLICY "Subscription plans are public" ON subscription_plans
  FOR SELECT USING (is_active = TRUE);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to create user from Supabase auth trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_users (id, email, display_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily credits (call from cron)
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE app_users au
  SET
    credits_remaining = sp.credits_per_day,
    credits_reset_at = NOW() + INTERVAL '1 day'
  FROM subscription_plans sp
  WHERE au.subscription_tier = sp.tier
    AND (au.credits_reset_at IS NULL OR au.credits_reset_at < NOW())
    AND sp.credits_per_day >= 0; -- Skip unlimited plans

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SUPABASE AUTH INTEGRATION
-- ============================================

-- Create trigger on auth.users (run this in Supabase SQL editor)
-- This automatically creates an app_users record when someone signs up

/*
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE app_users IS 'Application users synced from Supabase auth';
COMMENT ON TABLE subscription_plans IS 'Available subscription tiers and pricing';
COMMENT ON TABLE payment_webhooks IS 'Stripe webhook event log';
COMMENT ON TABLE credit_transactions IS 'Detailed credit usage history';
COMMENT ON TABLE subscription_history IS 'Subscription tier change audit trail';
COMMENT ON TABLE invoice_cache IS 'Cached Stripe invoice data for quick access';
COMMENT ON TABLE analytics_events IS 'User activity and event tracking';

COMMENT ON FUNCTION handle_new_user() IS 'Auto-create app_users record when new user signs up via Supabase auth';
COMMENT ON FUNCTION reset_daily_credits() IS 'Reset daily credit allocation - call from cron job';

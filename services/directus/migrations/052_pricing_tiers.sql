-- =============================================
-- Migration: CMS-Managed Pricing Tiers
-- =============================================
-- Allows marketing/product team to manage pricing
-- without code deployments. Supports A/B testing,
-- regional pricing, and version history.
-- =============================================

-- Pricing Tiers Collection
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'published',
  sort INTEGER,

  -- Tier Identity
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  price_display VARCHAR(50),  -- e.g., "$7/mo", "Custom", "Free"
  currency VARCHAR(3) DEFAULT 'USD',

  -- Billing
  billing_type VARCHAR(20) DEFAULT 'recurring',  -- 'recurring', 'one_time', 'custom'
  stripe_price_id_monthly VARCHAR(100),
  stripe_price_id_yearly VARCHAR(100),

  -- Features (JSON array of feature strings)
  features JSONB DEFAULT '[]'::jsonb,

  -- UI Configuration
  badge TEXT,  -- e.g., "Most Popular", "Best Value"
  badge_color VARCHAR(20),
  is_featured BOOLEAN DEFAULT false,
  is_enterprise BOOLEAN DEFAULT false,

  -- CTA
  cta_label VARCHAR(50) DEFAULT 'Get Started',
  cta_url VARCHAR(255),
  cta_style VARCHAR(20) DEFAULT 'primary',  -- 'primary', 'outline', 'secondary'

  -- Targeting (for A/B testing / regional pricing)
  region VARCHAR(10),  -- null = global, 'US', 'EU', etc.
  audience VARCHAR(50),  -- null = all, 'new_users', 'returning', etc.

  -- AI Credits (for SaaS tiers)
  credits_monthly INTEGER,
  credits_included TEXT,  -- Display text like "500 credits/mo"

  -- Metadata
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_updated TIMESTAMPTZ DEFAULT NOW(),
  user_created UUID REFERENCES directus_users(id),
  user_updated UUID REFERENCES directus_users(id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_status ON pricing_tiers(status);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_slug ON pricing_tiers(slug);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_sort ON pricing_tiers(sort);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_region ON pricing_tiers(region);

-- Register collection in Directus
INSERT INTO directus_collections (collection, icon, note, sort, singleton, accountability, translations)
VALUES (
  'pricing_tiers',
  'payments',
  'Manage pricing tiers and subscription plans',
  50,
  false,
  'all',
  '[{"language": "en-US", "translation": "Pricing Tiers"}]'
) ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note;

-- Register fields in Directus
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
VALUES
  -- Identity
  ('pricing_tiers', 'id', 'uuid', 'input', '{"iconLeft": "vpn_key"}', 'raw', NULL, true, true, 1, 'half', NULL, NULL, NULL, false, NULL),
  ('pricing_tiers', 'status', NULL, 'select-dropdown', '{"choices": [{"text": "Published", "value": "published"}, {"text": "Draft", "value": "draft"}, {"text": "Archived", "value": "archived"}]}', 'labels', '{"showAsDot": true, "choices": [{"text": "Published", "value": "published", "foreground": "#FFFFFF", "background": "#00C897"}, {"text": "Draft", "value": "draft", "foreground": "#18222F", "background": "#D3DAE4"}, {"text": "Archived", "value": "archived", "foreground": "#FFFFFF", "background": "#F7971C"}]}', false, false, 2, 'half', NULL, NULL, NULL, false, NULL),
  ('pricing_tiers', 'sort', NULL, 'input', '{"iconLeft": "sort"}', 'raw', NULL, false, false, 3, 'half', NULL, 'Display order on pricing page', NULL, false, NULL),
  ('pricing_tiers', 'slug', NULL, 'input', '{"iconLeft": "link", "slug": true}', 'raw', NULL, false, false, 4, 'half', NULL, 'URL-friendly identifier (e.g., "pro", "starter")', NULL, true, NULL),
  ('pricing_tiers', 'name', NULL, 'input', '{"iconLeft": "title"}', 'raw', NULL, false, false, 5, 'half', NULL, 'Display name (e.g., "Pro License")', NULL, true, NULL),
  ('pricing_tiers', 'description', NULL, 'input', '{"iconLeft": "description"}', 'raw', NULL, false, false, 6, 'full', NULL, 'Short tagline (e.g., "For serious makers")', NULL, false, NULL),

  -- Pricing Group
  ('pricing_tiers', 'pricing_group', 'alias,no-data,group', 'group-detail', '{"start": "open"}', NULL, NULL, false, false, 7, 'full', '[{"language": "en-US", "translation": "Pricing"}]', NULL, NULL, false, NULL),
  ('pricing_tiers', 'price_display', NULL, 'input', '{"iconLeft": "sell"}', 'raw', NULL, false, false, 8, 'half', NULL, 'Display price (e.g., "$297", "Free", "Custom")', NULL, false, 'pricing_group'),
  ('pricing_tiers', 'price_monthly', NULL, 'input', '{"iconLeft": "attach_money", "step": "0.01"}', 'raw', NULL, false, false, 9, 'half', NULL, 'Monthly price in cents for Stripe', NULL, false, 'pricing_group'),
  ('pricing_tiers', 'price_yearly', NULL, 'input', '{"iconLeft": "attach_money", "step": "0.01"}', 'raw', NULL, false, false, 10, 'half', NULL, 'Yearly price in cents for Stripe', NULL, false, 'pricing_group'),
  ('pricing_tiers', 'billing_type', NULL, 'select-dropdown', '{"choices": [{"text": "Recurring", "value": "recurring"}, {"text": "One-time", "value": "one_time"}, {"text": "Custom/Contact", "value": "custom"}]}', 'raw', NULL, false, false, 11, 'half', NULL, NULL, NULL, false, 'pricing_group'),
  ('pricing_tiers', 'currency', NULL, 'input', '{"iconLeft": "currency_exchange"}', 'raw', NULL, false, false, 12, 'half', NULL, 'ISO currency code', NULL, false, 'pricing_group'),
  ('pricing_tiers', 'stripe_price_id_monthly', NULL, 'input', '{"iconLeft": "credit_card"}', 'raw', NULL, false, false, 13, 'half', NULL, 'Stripe Price ID for monthly billing', NULL, false, 'pricing_group'),
  ('pricing_tiers', 'stripe_price_id_yearly', NULL, 'input', '{"iconLeft": "credit_card"}', 'raw', NULL, false, false, 14, 'half', NULL, 'Stripe Price ID for yearly billing', NULL, false, 'pricing_group'),

  -- Features Group
  ('pricing_tiers', 'features_group', 'alias,no-data,group', 'group-detail', '{"start": "open"}', NULL, NULL, false, false, 15, 'full', '[{"language": "en-US", "translation": "Features"}]', NULL, NULL, false, NULL),
  ('pricing_tiers', 'features', 'cast-json', 'list', '{"template": "{{value}}", "addLabel": "Add Feature"}', 'raw', NULL, false, false, 16, 'full', NULL, 'List of features included in this tier', NULL, false, 'features_group'),
  ('pricing_tiers', 'credits_monthly', NULL, 'input', '{"iconLeft": "toll"}', 'raw', NULL, false, false, 17, 'half', NULL, 'AI credits per month (null = unlimited)', NULL, false, 'features_group'),
  ('pricing_tiers', 'credits_included', NULL, 'input', '{"iconLeft": "toll"}', 'raw', NULL, false, false, 18, 'half', NULL, 'Credits display text (e.g., "500/mo")', NULL, false, 'features_group'),

  -- UI Group
  ('pricing_tiers', 'ui_group', 'alias,no-data,group', 'group-detail', '{"start": "open"}', NULL, NULL, false, false, 19, 'full', '[{"language": "en-US", "translation": "UI Configuration"}]', NULL, NULL, false, NULL),
  ('pricing_tiers', 'badge', NULL, 'input', '{"iconLeft": "new_releases"}', 'raw', NULL, false, false, 20, 'half', NULL, 'Badge text (e.g., "Most Popular")', NULL, false, 'ui_group'),
  ('pricing_tiers', 'badge_color', NULL, 'select-dropdown', '{"choices": [{"text": "Primary", "value": "primary"}, {"text": "Secondary", "value": "secondary"}, {"text": "Accent", "value": "accent"}, {"text": "Positive", "value": "positive"}, {"text": "Warning", "value": "warning"}]}', 'raw', NULL, false, false, 21, 'half', NULL, NULL, NULL, false, 'ui_group'),
  ('pricing_tiers', 'is_featured', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, false, false, 22, 'half', NULL, 'Highlight this tier on the pricing page', NULL, false, 'ui_group'),
  ('pricing_tiers', 'is_enterprise', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, false, false, 23, 'half', NULL, 'Show as enterprise/custom tier', NULL, false, 'ui_group'),
  ('pricing_tiers', 'cta_label', NULL, 'input', '{"iconLeft": "smart_button"}', 'raw', NULL, false, false, 24, 'third', NULL, 'Button text', NULL, false, 'ui_group'),
  ('pricing_tiers', 'cta_url', NULL, 'input', '{"iconLeft": "link"}', 'raw', NULL, false, false, 25, 'third', NULL, 'Button link (leave empty for checkout)', NULL, false, 'ui_group'),
  ('pricing_tiers', 'cta_style', NULL, 'select-dropdown', '{"choices": [{"text": "Primary", "value": "primary"}, {"text": "Outline", "value": "outline"}, {"text": "Secondary", "value": "secondary"}]}', 'raw', NULL, false, false, 26, 'third', NULL, NULL, NULL, false, 'ui_group'),

  -- Targeting Group
  ('pricing_tiers', 'targeting_group', 'alias,no-data,group', 'group-detail', '{"start": "closed"}', NULL, NULL, false, false, 27, 'full', '[{"language": "en-US", "translation": "Targeting (A/B Testing)"}]', NULL, NULL, false, NULL),
  ('pricing_tiers', 'region', NULL, 'input', '{"iconLeft": "public"}', 'raw', NULL, false, false, 28, 'half', NULL, 'Region code (null = global)', NULL, false, 'targeting_group'),
  ('pricing_tiers', 'audience', NULL, 'input', '{"iconLeft": "people"}', 'raw', NULL, false, false, 29, 'half', NULL, 'Target audience (null = all)', NULL, false, 'targeting_group'),

  -- Metadata
  ('pricing_tiers', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative": true}', true, true, 30, 'half', NULL, NULL, NULL, false, NULL),
  ('pricing_tiers', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', '{"relative": true}', true, true, 31, 'half', NULL, NULL, NULL, false, NULL),
  ('pricing_tiers', 'user_created', 'user-created', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'user', NULL, true, true, 32, 'half', NULL, NULL, NULL, false, NULL),
  ('pricing_tiers', 'user_updated', 'user-updated', 'select-dropdown-m2o', '{"template": "{{first_name}} {{last_name}}"}', 'user', NULL, true, true, 33, 'half', NULL, NULL, NULL, false, NULL)
ON CONFLICT (collection, field) DO UPDATE SET
  special = EXCLUDED.special,
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  readonly = EXCLUDED.readonly,
  hidden = EXCLUDED.hidden,
  sort = EXCLUDED.sort,
  width = EXCLUDED.width,
  translations = EXCLUDED.translations,
  note = EXCLUDED.note,
  "group" = EXCLUDED."group";

-- Public read access for pricing tiers
INSERT INTO directus_permissions (role, collection, action, permissions, validation, presets, fields)
VALUES
  (NULL, 'pricing_tiers', 'read', '{"status": {"_eq": "published"}}', '{}', NULL, '*')
ON CONFLICT DO NOTHING;

-- =============================================
-- Seed Initial Pricing Tiers (SynthStack SaaS)
-- =============================================

INSERT INTO pricing_tiers (slug, name, description, price_display, price_monthly, price_yearly, billing_type, features, badge, is_featured, cta_label, cta_style, credits_monthly, credits_included, sort, status)
VALUES
  -- Free Tier
  (
    'free',
    'Free',
    'Get started with AI content',
    '$0',
    0,
    0,
    'recurring',
    '["3 AI generations per day", "Basic project management", "Community support", "Public templates"]'::jsonb,
    NULL,
    false,
    'Get Started',
    'outline',
    90,
    '90 credits/mo',
    1,
    'published'
  ),
  -- Pro Subscription
  (
    'pro',
    'Pro',
    'For serious creators',
    '$19/mo',
    19,
    190,
    'recurring',
    '["Unlimited AI generations", "Priority processing", "Private projects", "Custom templates", "Email support", "API access", "Team collaboration"]'::jsonb,
    'Most Popular',
    true,
    'Start Free Trial',
    'primary',
    NULL,
    'Unlimited',
    2,
    'published'
  ),
  -- Enterprise
  (
    'enterprise',
    'Enterprise',
    'Custom solutions for teams',
    'Custom',
    NULL,
    NULL,
    'custom',
    '["Everything in Pro", "Dedicated support", "Custom integrations", "SLA guarantee", "On-premise option", "SSO / SAML", "Advanced analytics"]'::jsonb,
    NULL,
    false,
    'Contact Sales',
    'secondary',
    NULL,
    'Unlimited',
    3,
    'published'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_display = EXCLUDED.price_display,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  billing_type = EXCLUDED.billing_type,
  features = EXCLUDED.features,
  badge = EXCLUDED.badge,
  is_featured = EXCLUDED.is_featured,
  cta_label = EXCLUDED.cta_label,
  cta_style = EXCLUDED.cta_style,
  credits_monthly = EXCLUDED.credits_monthly,
  credits_included = EXCLUDED.credits_included,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  date_updated = NOW();

COMMENT ON TABLE pricing_tiers IS 'CMS-managed pricing tiers for the pricing page. Supports one-time licenses, recurring subscriptions, and custom enterprise plans.';

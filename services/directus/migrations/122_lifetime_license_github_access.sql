-- ===================================================================
-- Lifetime License GitHub Access Provisioning
-- ===================================================================
-- This migration creates the infrastructure for managing lifetime
-- license purchases and automating GitHub repository access provisioning.

-- Store lifetime license purchases with GitHub access tracking
CREATE TABLE IF NOT EXISTS lifetime_licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Purchase info
  stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  amount_paid_cents INT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- GitHub access
  github_username VARCHAR(100),
  github_username_submitted_at TIMESTAMPTZ,
  github_invitation_sent_at TIMESTAMPTZ,
  github_invitation_accepted_at TIMESTAMPTZ,
  github_access_status VARCHAR(50) DEFAULT 'pending'
    CHECK (github_access_status IN ('pending', 'username_submitted', 'invited', 'active', 'revoked')),

  -- Onboarding
  welcome_email_sent_at TIMESTAMPTZ,
  access_email_sent_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ,

  -- Tracking
  last_notified_at TIMESTAMPTZ,
  notification_count INT DEFAULT 0,
  notes TEXT,

  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lifetime_licenses_stripe_session ON lifetime_licenses(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_lifetime_licenses_email ON lifetime_licenses(email);
CREATE INDEX IF NOT EXISTS idx_lifetime_licenses_github_username ON lifetime_licenses(github_username);
CREATE INDEX IF NOT EXISTS idx_lifetime_licenses_status ON lifetime_licenses(github_access_status);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_lifetime_licenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lifetime_licenses_updated_at_trigger
  BEFORE UPDATE ON lifetime_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_lifetime_licenses_updated_at();

-- Add to Directus collections for admin panel
INSERT INTO directus_collections (collection, icon, note, display_template, archive_field, archive_value, unarchive_value, singleton, translations)
VALUES (
  'lifetime_licenses',
  'vpn_key',
  'Lifetime license purchases and GitHub repository access tracking',
  '{{email}} - {{github_username}}',
  NULL,
  NULL,
  NULL,
  false,
  NULL
)
ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  display_template = EXCLUDED.display_template;

-- Add fields to Directus for admin panel
INSERT INTO directus_fields (collection, field, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message)
VALUES
  ('lifetime_licenses', 'id', 'input', '{"readonly":true}', 'raw', NULL, true, false, 1, 'full', NULL, 'UUID primary key', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'email', 'input', '{"iconRight":"email"}', 'raw', NULL, false, false, 2, 'half', NULL, 'Customer email address', NULL, true, NULL, NULL, NULL),
  ('lifetime_licenses', 'stripe_session_id', 'input', '{"iconRight":"shopping_cart","readonly":true}', 'raw', NULL, true, false, 3, 'half', NULL, 'Stripe checkout session ID', NULL, true, NULL, NULL, NULL),
  ('lifetime_licenses', 'stripe_customer_id', 'input', '{"iconRight":"person","readonly":true}', 'raw', NULL, true, false, 4, 'half', NULL, 'Stripe customer ID', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'amount_paid_cents', 'input', '{"iconRight":"attach_money","readonly":true}', 'raw', NULL, true, false, 5, 'half', NULL, 'Amount paid in cents', NULL, true, NULL, NULL, NULL),
  ('lifetime_licenses', 'github_username', 'input', '{"iconRight":"code"}', 'raw', NULL, false, false, 6, 'half', NULL, 'GitHub username for repository access', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'github_access_status', 'select-dropdown', '{"choices":[{"text":"Pending","value":"pending"},{"text":"Username Submitted","value":"username_submitted"},{"text":"Invited","value":"invited"},{"text":"Active","value":"active"},{"text":"Revoked","value":"revoked"}]}', 'labels', '{"choices":[{"text":"Pending","value":"pending","foreground":"#FFFFFF","background":"#6B7280"},{"text":"Username Submitted","value":"username_submitted","foreground":"#FFFFFF","background":"#3B82F6"},{"text":"Invited","value":"invited","foreground":"#FFFFFF","background":"#F59E0B"},{"text":"Active","value":"active","foreground":"#FFFFFF","background":"#10B981"},{"text":"Revoked","value":"revoked","foreground":"#FFFFFF","background":"#EF4444"}]}', false, false, 7, 'half', NULL, 'Current GitHub access status', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'purchased_at', 'datetime', NULL, 'datetime', NULL, true, false, 8, 'half', NULL, 'Purchase timestamp', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'github_username_submitted_at', 'datetime', NULL, 'datetime', NULL, true, false, 9, 'half', NULL, 'When GitHub username was submitted', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'github_invitation_sent_at', 'datetime', NULL, 'datetime', NULL, true, false, 10, 'half', NULL, 'When GitHub invitation was sent', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'github_invitation_accepted_at', 'datetime', NULL, 'datetime', NULL, true, false, 11, 'half', NULL, 'When GitHub invitation was accepted', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'welcome_email_sent_at', 'datetime', NULL, 'datetime', NULL, true, false, 12, 'half', NULL, 'When welcome email was sent', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'access_email_sent_at', 'datetime', NULL, 'datetime', NULL, true, false, 13, 'half', NULL, 'When access granted email was sent', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'onboarding_completed_at', 'datetime', NULL, 'datetime', NULL, false, false, 14, 'half', NULL, 'When onboarding was completed', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'last_notified_at', 'datetime', NULL, 'datetime', NULL, false, false, 15, 'half', NULL, 'Last notification sent', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'notification_count', 'input', '{"iconRight":"notifications"}', 'raw', NULL, false, false, 16, 'half', NULL, 'Number of notifications sent', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'notes', 'input-multiline', NULL, 'raw', NULL, false, false, 17, 'full', NULL, 'Admin notes', NULL, false, NULL, NULL, NULL),
  ('lifetime_licenses', 'updated_at', 'datetime', '{"readonly":true}', 'datetime', NULL, true, false, 18, 'half', NULL, 'Last update timestamp', NULL, false, NULL, NULL, NULL)
ON CONFLICT (collection, field) DO UPDATE SET
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  readonly = EXCLUDED.readonly,
  note = EXCLUDED.note;

-- Grant permissions (adjust as needed for your Directus setup)
-- This assumes you have an admin role with ID from directus_roles table
-- You may need to adjust this based on your specific Directus configuration

COMMENT ON TABLE lifetime_licenses IS 'Tracks lifetime license purchases and GitHub repository access provisioning';
COMMENT ON COLUMN lifetime_licenses.stripe_session_id IS 'Unique Stripe checkout session ID (used for idempotency)';
COMMENT ON COLUMN lifetime_licenses.github_access_status IS 'Access status: pending (email sent) → username_submitted → invited (GitHub invitation sent) → active (accepted) or revoked';
COMMENT ON COLUMN lifetime_licenses.amount_paid_cents IS 'Amount paid in cents (e.g., 29700 for $297)';

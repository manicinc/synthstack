-- SynthStack Admin Extensions Migration
-- User management, community moderation, and analytics tables

-- ============================================
-- APP USERS (Synced from Supabase)
-- ============================================
-- This table mirrors Supabase users for admin management
-- Two-way sync: Supabase → Directus (user changes) and Directus → Supabase (admin actions)

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY, -- Supabase user ID (not auto-generated)
  status VARCHAR(50) DEFAULT 'active',
  
  -- Basic Info
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  
  -- Subscription & Billing
  subscription_tier VARCHAR(20) DEFAULT 'free' 
    CHECK (subscription_tier IN ('free', 'maker', 'pro', 'unlimited')),
  subscription_status VARCHAR(20) DEFAULT 'active' 
    CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
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
  banned_by UUID REFERENCES directus_users(id),
  warning_count INT DEFAULT 0,
  
  -- Admin
  admin_notes TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_moderator BOOLEAN DEFAULT FALSE,
  
  -- Tracking
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_generation_at TIMESTAMP WITH TIME ZONE,
  total_generations INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for app_users
CREATE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_app_users_subscription ON app_users(subscription_tier, subscription_status);
CREATE INDEX idx_app_users_banned ON app_users(is_banned) WHERE is_banned = TRUE;
CREATE INDEX idx_app_users_created ON app_users(created_at DESC);

-- ============================================
-- USER CREDIT ADJUSTMENTS (Audit Log)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  adjustment INT NOT NULL, -- Positive or negative
  reason VARCHAR(255) NOT NULL,
  notes TEXT,
  
  -- Who made the adjustment
  adjusted_by UUID REFERENCES directus_users(id),
  
  -- Balance tracking
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_adj_user ON credit_adjustments(user_id);
CREATE INDEX idx_credit_adj_date ON credit_adjustments(created_at DESC);

-- ============================================
-- COMMUNITY COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'flagged', 'deleted')),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES print_profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES community_comments(id) ON DELETE CASCADE, -- For replies
  
  -- Content
  content TEXT NOT NULL,
  
  -- Moderation
  moderated_by UUID REFERENCES directus_users(id),
  moderated_at TIMESTAMP WITH TIME ZONE,
  moderation_notes TEXT,
  
  -- Tracking
  is_edited BOOLEAN DEFAULT FALSE,
  edit_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_profile ON community_comments(profile_id);
CREATE INDEX idx_comments_user ON community_comments(user_id);
CREATE INDEX idx_comments_status ON community_comments(status);
CREATE INDEX idx_comments_pending ON community_comments(status) WHERE status = 'pending';

-- ============================================
-- COMMUNITY REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'open' 
    CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  
  -- Reporter
  reporter_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Reported item
  reported_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  reported_item_type VARCHAR(50) NOT NULL 
    CHECK (reported_item_type IN ('profile', 'comment', 'user')),
  reported_item_id UUID NOT NULL,
  
  -- Report details
  reason VARCHAR(50) NOT NULL 
    CHECK (reason IN ('spam', 'inappropriate', 'copyright', 'harassment', 'misinformation', 'other')),
  details TEXT,
  
  -- Resolution
  resolved_by UUID REFERENCES directus_users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  action_taken VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_status ON community_reports(status);
CREATE INDEX idx_reports_open ON community_reports(status) WHERE status = 'open';
CREATE INDEX idx_reports_user ON community_reports(reported_user_id);
CREATE INDEX idx_reports_reporter ON community_reports(reporter_id);

-- ============================================
-- USER WARNINGS
-- ============================================
CREATE TABLE IF NOT EXISTS user_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'active' 
    CHECK (status IN ('active', 'acknowledged', 'expired', 'revoked')),
  
  -- User
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Warning details
  warning_type VARCHAR(50) NOT NULL 
    CHECK (warning_type IN ('content', 'behavior', 'spam', 'copyright', 'harassment')),
  severity VARCHAR(20) DEFAULT 'warning' 
    CHECK (severity IN ('notice', 'warning', 'strike', 'final')),
  message TEXT NOT NULL,
  
  -- Related report
  report_id UUID REFERENCES community_reports(id),
  
  -- Admin
  issued_by UUID NOT NULL REFERENCES directus_users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warnings_user ON user_warnings(user_id);
CREATE INDEX idx_warnings_active ON user_warnings(status) WHERE status = 'active';

-- ============================================
-- ANALYTICS - DAILY METRICS
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_daily (
  date DATE PRIMARY KEY,
  
  -- User metrics
  new_users INT DEFAULT 0,
  active_users INT DEFAULT 0,
  returning_users INT DEFAULT 0,
  
  -- Generation metrics
  generations INT DEFAULT 0,
  credits_used INT DEFAULT 0,
  avg_confidence_score DECIMAL(5,2),
  
  -- Subscription metrics
  new_subscriptions INT DEFAULT 0,
  churned_subscriptions INT DEFAULT 0,
  upgrades INT DEFAULT 0,
  downgrades INT DEFAULT 0,
  
  -- Revenue (in cents to avoid floating point)
  revenue_cents INT DEFAULT 0,
  mrr_cents INT DEFAULT 0,
  
  -- Content metrics
  new_profiles INT DEFAULT 0,
  new_comments INT DEFAULT 0,
  
  -- Moderation metrics
  reports_opened INT DEFAULT 0,
  reports_resolved INT DEFAULT 0,
  users_banned INT DEFAULT 0,
  warnings_issued INT DEFAULT 0,
  
  -- System metrics
  api_requests INT DEFAULT 0,
  api_errors INT DEFAULT 0,
  avg_response_time_ms INT,
  
  -- Computed at
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_date ON analytics_daily(date DESC);

-- ============================================
-- ANALYTICS - EVENTS LOG
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event info
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL 
    CHECK (event_category IN ('user', 'generation', 'subscription', 'content', 'moderation', 'system')),
  
  -- User (optional)
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  -- Event data
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_category ON analytics_events(event_category);
CREATE INDEX idx_events_user ON analytics_events(user_id);
CREATE INDEX idx_events_timestamp ON analytics_events(timestamp DESC);
-- Partition-friendly index for time-based queries
CREATE INDEX idx_events_time_category ON analytics_events(timestamp DESC, event_category);

-- ============================================
-- ADMIN ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Admin user
  admin_id UUID NOT NULL REFERENCES directus_users(id),
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50), -- 'user', 'profile', 'comment', etc.
  target_id UUID,
  
  -- Details
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_log_admin ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_log_action ON admin_activity_log(action);
CREATE INDEX idx_admin_log_target ON admin_activity_log(target_type, target_id);
CREATE INDEX idx_admin_log_date ON admin_activity_log(created_at DESC);

-- ============================================
-- FEATURE FLAGS (for A/B testing, rollouts)
-- ============================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  
  -- Flag info
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- State
  enabled BOOLEAN DEFAULT FALSE,
  
  -- Targeting
  rollout_percentage INT DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  user_ids UUID[], -- Specific users to include
  subscription_tiers VARCHAR(20)[], -- Tiers to include
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled) WHERE enabled = TRUE;

-- ============================================
-- SYSTEM CONFIGURATION
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES directus_users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config values
INSERT INTO system_config (key, value, description) VALUES
  ('credits_per_tier', '{"free": 10, "maker": 50, "pro": 200, "unlimited": -1}', 'Daily credits per subscription tier'),
  ('credit_reset_time', '"00:00"', 'Time to reset daily credits (UTC)'),
  ('moderation_auto_approve', 'false', 'Auto-approve community content'),
  ('max_warnings_before_ban', '3', 'Number of warnings before auto-ban'),
  ('maintenance_mode', 'false', 'Enable maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update app_users.updated_at
CREATE OR REPLACE FUNCTION update_app_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for app_users
DROP TRIGGER IF EXISTS trigger_app_users_updated ON app_users;
CREATE TRIGGER trigger_app_users_updated
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_app_users_updated_at();

-- Function to increment warning count when warning is issued
CREATE OR REPLACE FUNCTION increment_user_warning_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_users 
  SET warning_count = warning_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_warnings
DROP TRIGGER IF EXISTS trigger_warning_count ON user_warnings;
CREATE TRIGGER trigger_warning_count
  AFTER INSERT ON user_warnings
  FOR EACH ROW
  EXECUTE FUNCTION increment_user_warning_count();

-- ============================================
-- VIEWS FOR DASHBOARDS
-- ============================================

-- Moderation queue view
CREATE OR REPLACE VIEW moderation_queue AS
SELECT 
  'comment' as item_type,
  cc.id,
  cc.content as preview,
  cc.user_id,
  au.email as user_email,
  au.display_name as user_name,
  cc.created_at,
  NULL as reason
FROM community_comments cc
JOIN app_users au ON cc.user_id = au.id
WHERE cc.status = 'pending'

UNION ALL

SELECT 
  'report' as item_type,
  cr.id,
  cr.details as preview,
  cr.reporter_id as user_id,
  au.email as user_email,
  au.display_name as user_name,
  cr.created_at,
  cr.reason
FROM community_reports cr
JOIN app_users au ON cr.reporter_id = au.id
WHERE cr.status = 'open'

ORDER BY created_at ASC;

-- User overview view
CREATE OR REPLACE VIEW user_overview AS
SELECT 
  au.id,
  au.email,
  au.display_name,
  au.subscription_tier,
  au.subscription_status,
  au.credits_remaining,
  au.is_banned,
  au.warning_count,
  au.created_at,
  au.last_login_at,
  au.total_generations,
  COUNT(DISTINCT cc.id) as comment_count,
  COUNT(DISTINCT pp.id) as profile_count
FROM app_users au
LEFT JOIN community_comments cc ON au.id = cc.user_id AND cc.status != 'deleted'
LEFT JOIN print_profiles pp ON au.id = pp.user_id AND pp.is_public = TRUE
GROUP BY au.id;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
  END IF;
END $$;

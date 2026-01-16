-- Newsletter & Advanced Analytics Migration
-- Comprehensive newsletter management and analytics infrastructure

-- ============================================
-- NEWSLETTER SUBSCRIBERS
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'active'
    CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained', 'cleaned')),
  
  -- Subscriber info
  email VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  -- Profile data
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  
  -- Subscription preferences
  subscription_tier VARCHAR(20),
  interests TEXT[],
  preferences JSONB DEFAULT '{}',
  
  -- Provider sync
  mailerlite_id VARCHAR(100),
  mailchimp_id VARCHAR(100),
  brevo_id VARCHAR(100),
  provider_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'synced', 'error')),
  sync_error TEXT,
  
  -- Engagement metrics
  emails_received INT DEFAULT 0,
  emails_opened INT DEFAULT 0,
  emails_clicked INT DEFAULT 0,
  last_email_at TIMESTAMP WITH TIME ZONE,
  last_opened_at TIMESTAMP WITH TIME ZONE,
  last_clicked_at TIMESTAMP WITH TIME ZONE,
  engagement_score DECIMAL(5,2) DEFAULT 0,
  
  -- Source tracking
  source VARCHAR(100),
  source_campaign VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(255),
  
  -- Consent
  double_optin BOOLEAN DEFAULT FALSE,
  double_optin_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  
  -- Timestamps
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_user ON newsletter_subscribers(user_id);
CREATE INDEX idx_newsletter_status ON newsletter_subscribers(status);
CREATE INDEX idx_newsletter_tier ON newsletter_subscribers(subscription_tier);
CREATE INDEX idx_newsletter_engagement ON newsletter_subscribers(engagement_score DESC);

-- ============================================
-- NEWSLETTER SEGMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  
  -- Segment info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Criteria (JSON query)
  criteria JSONB NOT NULL DEFAULT '{}',
  -- Example: {"subscription_tier": ["pro", "unlimited"], "engagement_score": {"$gte": 50}}
  
  -- Provider IDs
  mailerlite_group_id VARCHAR(100),
  mailchimp_segment_id VARCHAR(100),
  brevo_list_id VARCHAR(100),
  
  -- Stats
  subscriber_count INT DEFAULT 0,
  last_computed_at TIMESTAMP WITH TIME ZONE,
  
  -- Auto-update
  is_dynamic BOOLEAN DEFAULT TRUE, -- Recalculate membership automatically
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES directus_users(id)
);

CREATE INDEX idx_segments_slug ON newsletter_segments(slug);

-- ============================================
-- SEGMENT MEMBERSHIPS (for dynamic segments)
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter_segment_members (
  segment_id UUID NOT NULL REFERENCES newsletter_segments(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (segment_id, subscriber_id)
);

CREATE INDEX idx_segment_members_subscriber ON newsletter_segment_members(subscriber_id);

-- ============================================
-- NEWSLETTER CAMPAIGNS
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed')),
  
  -- Campaign info
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(500),
  
  -- Content
  content_html TEXT,
  content_text TEXT,
  template_id UUID,
  
  -- Targeting
  segment_id UUID REFERENCES newsletter_segments(id),
  recipient_count INT DEFAULT 0,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Provider
  provider VARCHAR(50),
  provider_campaign_id VARCHAR(255),
  
  -- Stats
  emails_sent INT DEFAULT 0,
  emails_delivered INT DEFAULT 0,
  emails_opened INT DEFAULT 0,
  emails_clicked INT DEFAULT 0,
  emails_bounced INT DEFAULT 0,
  emails_complained INT DEFAULT 0,
  emails_unsubscribed INT DEFAULT 0,
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES directus_users(id)
);

CREATE INDEX idx_campaigns_status ON newsletter_campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON newsletter_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_campaigns_sent ON newsletter_campaigns(sent_at DESC);

-- ============================================
-- NEWSLETTER SEQUENCES (Automation)
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  
  -- Sequence info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Trigger
  trigger_type VARCHAR(50) NOT NULL
    CHECK (trigger_type IN ('signup', 'tag_added', 'segment_joined', 'event', 'date_field', 'manual')),
  trigger_config JSONB DEFAULT '{}',
  -- Example: {"event": "subscription_created", "segment_id": "..."}
  
  -- Target segment (optional filter)
  segment_id UUID REFERENCES newsletter_segments(id),
  
  -- Stats
  total_enrolled INT DEFAULT 0,
  total_completed INT DEFAULT 0,
  active_enrollments INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES directus_users(id)
);

CREATE INDEX idx_sequences_slug ON newsletter_sequences(slug);
CREATE INDEX idx_sequences_trigger ON newsletter_sequences(trigger_type);

-- ============================================
-- SEQUENCE STEPS
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter_sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES newsletter_sequences(id) ON DELETE CASCADE,
  
  -- Step info
  step_order INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Delay
  delay_value INT NOT NULL DEFAULT 1,
  delay_unit VARCHAR(20) NOT NULL DEFAULT 'days'
    CHECK (delay_unit IN ('minutes', 'hours', 'days', 'weeks')),
  
  -- Action
  action_type VARCHAR(50) NOT NULL DEFAULT 'email'
    CHECK (action_type IN ('email', 'tag', 'segment', 'webhook', 'wait_until')),
  
  -- Email content (if action_type = 'email')
  subject VARCHAR(500),
  content_html TEXT,
  content_text TEXT,
  template_id UUID,
  
  -- Action config (for non-email actions)
  action_config JSONB DEFAULT '{}',
  
  -- Stats
  emails_sent INT DEFAULT 0,
  emails_opened INT DEFAULT 0,
  emails_clicked INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(sequence_id, step_order)
);

CREATE INDEX idx_sequence_steps_sequence ON newsletter_sequence_steps(sequence_id);

-- ============================================
-- SEQUENCE ENROLLMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  sequence_id UUID NOT NULL REFERENCES newsletter_sequences(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  
  -- Progress
  current_step INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused', 'cancelled', 'failed')),
  
  -- Timing
  next_step_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(sequence_id, subscriber_id)
);

CREATE INDEX idx_enrollments_next ON newsletter_sequence_enrollments(next_step_at) WHERE status = 'active';
CREATE INDEX idx_enrollments_subscriber ON newsletter_sequence_enrollments(subscriber_id);

-- ============================================
-- EMAIL EVENTS (Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  subscriber_id UUID REFERENCES newsletter_subscribers(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES newsletter_campaigns(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES newsletter_sequences(id) ON DELETE SET NULL,
  step_id UUID REFERENCES newsletter_sequence_steps(id) ON DELETE SET NULL,
  
  -- Event
  event_type VARCHAR(50) NOT NULL
    CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  
  -- Details
  email VARCHAR(255),
  link_url TEXT,
  user_agent TEXT,
  ip_address INET,
  
  -- Provider info
  provider VARCHAR(50),
  provider_event_id VARCHAR(255),
  
  -- Timestamp
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_events_subscriber ON email_events(subscriber_id);
CREATE INDEX idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_time ON email_events(occurred_at DESC);

-- ============================================
-- NEWSLETTER PROVIDER SYNC LOG
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Sync info
  provider VARCHAR(50) NOT NULL,
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('push', 'pull', 'bidirectional')),
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('full', 'incremental', 'single')),
  
  -- Results
  status VARCHAR(50) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'partial')),
  records_processed INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sync_log_provider ON newsletter_sync_log(provider);
CREATE INDEX idx_sync_log_status ON newsletter_sync_log(status);
CREATE INDEX idx_sync_log_time ON newsletter_sync_log(started_at DESC);

-- ============================================
-- ANALYTICS FUNNELS
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_funnels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  
  -- Funnel info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Steps definition
  steps JSONB NOT NULL,
  -- Example: [{"name": "Visit", "event": "page_view"}, {"name": "Signup", "event": "user_created"}]
  
  -- Time window
  window_days INT DEFAULT 30,
  
  -- Computed metrics
  total_entered INT DEFAULT 0,
  total_completed INT DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  avg_time_to_complete INTERVAL,
  step_metrics JSONB DEFAULT '[]',
  last_computed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES directus_users(id)
);

CREATE INDEX idx_funnels_slug ON analytics_funnels(slug);

-- ============================================
-- ANALYTICS FUNNEL PROGRESS (User tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_funnel_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  funnel_id UUID NOT NULL REFERENCES analytics_funnels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  
  -- Progress
  current_step INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  
  -- Step timestamps
  step_timestamps JSONB DEFAULT '[]',
  -- Example: [{"step": 0, "at": "2024-01-01T00:00:00Z"}, ...]
  
  -- Timing
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_to_complete INTERVAL
);

CREATE INDEX idx_funnel_progress_funnel ON analytics_funnel_progress(funnel_id);
CREATE INDEX idx_funnel_progress_user ON analytics_funnel_progress(user_id);
CREATE INDEX idx_funnel_progress_entered ON analytics_funnel_progress(entered_at DESC);

-- ============================================
-- ANALYTICS COHORTS
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_cohorts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  
  -- Cohort info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Cohort definition
  cohort_type VARCHAR(50) NOT NULL DEFAULT 'signup_date'
    CHECK (cohort_type IN ('signup_date', 'first_purchase', 'subscription_start', 'custom')),
  granularity VARCHAR(20) NOT NULL DEFAULT 'week'
    CHECK (granularity IN ('day', 'week', 'month')),
  
  -- Metric to track
  metric VARCHAR(100) NOT NULL DEFAULT 'retention',
  -- Options: retention, revenue, generations, engagement
  
  -- Filters
  filters JSONB DEFAULT '{}',
  
  -- Date range
  start_date DATE,
  end_date DATE,
  
  -- Computed data
  cohort_data JSONB DEFAULT '{}',
  -- Example: {"2024-W01": {"size": 100, "periods": [100, 80, 60, ...]}}
  last_computed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES directus_users(id)
);

CREATE INDEX idx_cohorts_slug ON analytics_cohorts(slug);
CREATE INDEX idx_cohorts_type ON analytics_cohorts(cohort_type);

-- ============================================
-- ANALYTICS CUSTOM REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  
  -- Report info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Query definition
  report_type VARCHAR(50) NOT NULL DEFAULT 'table'
    CHECK (report_type IN ('table', 'chart', 'kpi', 'funnel', 'cohort')),
  
  -- SQL or query config
  query_type VARCHAR(20) NOT NULL DEFAULT 'builder'
    CHECK (query_type IN ('builder', 'sql')),
  query_config JSONB DEFAULT '{}',
  -- Builder example: {"table": "analytics_events", "columns": [...], "filters": [...]}
  raw_sql TEXT,
  
  -- Visualization
  chart_type VARCHAR(50),
  chart_config JSONB DEFAULT '{}',
  
  -- Scheduling
  is_scheduled BOOLEAN DEFAULT FALSE,
  schedule_cron VARCHAR(100),
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  
  -- Cached results
  cached_data JSONB,
  cached_at TIMESTAMP WITH TIME ZONE,
  cache_ttl_seconds INT DEFAULT 3600,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES directus_users(id)
);

CREATE INDEX idx_reports_slug ON analytics_reports(slug);
CREATE INDEX idx_reports_scheduled ON analytics_reports(next_run_at) WHERE is_scheduled = TRUE;

-- ============================================
-- ANALYTICS EXPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Export info
  name VARCHAR(255) NOT NULL,
  export_type VARCHAR(50) NOT NULL DEFAULT 'csv'
    CHECK (export_type IN ('csv', 'json', 'xlsx')),
  
  -- Source
  source_type VARCHAR(50) NOT NULL
    CHECK (source_type IN ('report', 'events', 'users', 'custom')),
  source_id UUID,
  query_config JSONB,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  
  -- File
  file_url TEXT,
  file_size_bytes BIGINT,
  row_count INT,
  
  -- Timing
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Error
  error TEXT,
  
  -- Requester
  requested_by UUID REFERENCES directus_users(id)
);

CREATE INDEX idx_exports_status ON analytics_exports(status);
CREATE INDEX idx_exports_expires ON analytics_exports(expires_at) WHERE status = 'completed';

-- ============================================
-- ENHANCED ANALYTICS EVENTS
-- ============================================
-- Add session and conversion tracking to existing events table
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS page_url TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS country VARCHAR(2),
ADD COLUMN IF NOT EXISTS device_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_properties ON analytics_events USING GIN(properties);

-- ============================================
-- ENHANCED ANALYTICS DAILY
-- ============================================
-- Add more metrics to daily analytics
ALTER TABLE analytics_daily
ADD COLUMN IF NOT EXISTS unique_visitors INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS page_views INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_session_duration_seconds INT,
ADD COLUMN IF NOT EXISTS bounce_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS newsletter_signups INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS newsletter_unsubscribes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_sent INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_opened INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_clicked INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS revenue_by_tier JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS top_events JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS top_pages JSONB DEFAULT '[]';

-- ============================================
-- ANALYTICS HOURLY (for real-time dashboards)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_hourly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hour TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metrics
  active_users INT DEFAULT 0,
  page_views INT DEFAULT 0,
  api_requests INT DEFAULT 0,
  generations INT DEFAULT 0,
  credits_used INT DEFAULT 0,
  signups INT DEFAULT 0,
  
  -- Errors
  api_errors INT DEFAULT 0,
  avg_response_time_ms INT,
  
  -- Timestamps
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(hour)
);

CREATE INDEX idx_hourly_hour ON analytics_hourly(hour DESC);

-- ============================================
-- DEFAULT SEGMENTS
-- ============================================
INSERT INTO newsletter_segments (name, slug, description, criteria, is_dynamic) VALUES
('All Active Subscribers', 'all-active', 'All subscribers with active status', '{"status": "active"}', TRUE),
('Free Tier Users', 'free-tier', 'Subscribers on free plan', '{"subscription_tier": "free", "status": "active"}', TRUE),
('Paid Subscribers', 'paid', 'Subscribers on any paid plan', '{"subscription_tier": {"$in": ["maker", "pro", "unlimited"]}, "status": "active"}', TRUE),
('Pro & Unlimited', 'pro-unlimited', 'High-value subscribers', '{"subscription_tier": {"$in": ["pro", "unlimited"]}, "status": "active"}', TRUE),
('Highly Engaged', 'highly-engaged', 'Subscribers with high engagement', '{"engagement_score": {"$gte": 70}, "status": "active"}', TRUE),
('At Risk', 'at-risk', 'Low engagement subscribers', '{"engagement_score": {"$lt": 30}, "status": "active"}', TRUE),
('New Subscribers', 'new-subscribers', 'Subscribed in last 7 days', '{"subscribed_at": {"$gte": "NOW() - INTERVAL 7 DAY"}, "status": "active"}', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- DEFAULT SEQUENCES
-- ============================================
INSERT INTO newsletter_sequences (name, slug, description, trigger_type, trigger_config, status) VALUES
('Welcome Series', 'welcome', 'Onboarding emails for new subscribers', 'signup', '{}', 'active'),
('Trial Ending', 'trial-ending', 'Reminders before trial expires', 'event', '{"event": "trial_will_end"}', 'active'),
('Upgrade Prompt', 'upgrade-prompt', 'Encourage free users to upgrade', 'segment_joined', '{"segment": "free-tier", "delay_days": 14}', 'draft'),
('Re-engagement', 're-engagement', 'Win back inactive users', 'segment_joined', '{"segment": "at-risk", "delay_days": 7}', 'draft')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- DEFAULT FUNNELS
-- ============================================
INSERT INTO analytics_funnels (name, slug, description, steps, window_days) VALUES
('Signup to First Generation', 'signup-to-generation', 'Track user activation', 
  '[{"name": "Signup", "event": "user_created"}, {"name": "First Generation", "event": "generation_completed"}]', 7),
('Free to Paid', 'free-to-paid', 'Track conversion to paid plans',
  '[{"name": "Active User", "event": "generation_completed"}, {"name": "View Pricing", "event": "pricing_viewed"}, {"name": "Subscribe", "event": "subscription_created"}]', 30),
('Trial Conversion', 'trial-conversion', 'Track trial to paid conversion',
  '[{"name": "Trial Start", "event": "trial_started"}, {"name": "Active Usage", "event": "generation_completed"}, {"name": "Subscribe", "event": "subscription_created"}]', 14)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- DEFAULT COHORTS
-- ============================================
INSERT INTO analytics_cohorts (name, slug, description, cohort_type, granularity, metric) VALUES
('Weekly Retention', 'weekly-retention', 'User retention by signup week', 'signup_date', 'week', 'retention'),
('Monthly Revenue', 'monthly-revenue', 'Revenue cohorts by signup month', 'signup_date', 'month', 'revenue'),
('Subscription Retention', 'subscription-retention', 'Retention by subscription start', 'subscription_start', 'week', 'retention')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update subscriber updated_at
CREATE OR REPLACE FUNCTION update_newsletter_subscriber_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_newsletter_subscriber_updated ON newsletter_subscribers;
CREATE TRIGGER trigger_newsletter_subscriber_updated
  BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_subscriber_updated_at();

-- Calculate engagement score on email events
CREATE OR REPLACE FUNCTION update_subscriber_engagement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE newsletter_subscribers SET
    emails_received = emails_received + CASE WHEN NEW.event_type = 'delivered' THEN 1 ELSE 0 END,
    emails_opened = emails_opened + CASE WHEN NEW.event_type = 'opened' THEN 1 ELSE 0 END,
    emails_clicked = emails_clicked + CASE WHEN NEW.event_type = 'clicked' THEN 1 ELSE 0 END,
    last_email_at = CASE WHEN NEW.event_type = 'delivered' THEN NEW.occurred_at ELSE last_email_at END,
    last_opened_at = CASE WHEN NEW.event_type = 'opened' THEN NEW.occurred_at ELSE last_opened_at END,
    last_clicked_at = CASE WHEN NEW.event_type = 'clicked' THEN NEW.occurred_at ELSE last_clicked_at END,
    engagement_score = LEAST(100, (
      (emails_opened::DECIMAL / NULLIF(emails_received, 0) * 50) +
      (emails_clicked::DECIMAL / NULLIF(emails_opened, 0) * 50)
    ))
  WHERE id = NEW.subscriber_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_engagement ON email_events;
CREATE TRIGGER trigger_update_engagement
  AFTER INSERT ON email_events
  FOR EACH ROW
  WHEN (NEW.subscriber_id IS NOT NULL)
  EXECUTE FUNCTION update_subscriber_engagement();

-- ============================================
-- VIEWS
-- ============================================

-- Newsletter dashboard view
CREATE OR REPLACE VIEW newsletter_dashboard AS
SELECT 
  (SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active') as total_subscribers,
  (SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active' AND subscribed_at >= NOW() - INTERVAL '7 days') as new_last_7_days,
  (SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'unsubscribed' AND unsubscribed_at >= NOW() - INTERVAL '7 days') as unsubscribed_last_7_days,
  (SELECT AVG(engagement_score) FROM newsletter_subscribers WHERE status = 'active') as avg_engagement,
  (SELECT COUNT(*) FROM newsletter_campaigns WHERE status = 'sent' AND sent_at >= NOW() - INTERVAL '30 days') as campaigns_last_30_days,
  (SELECT COUNT(*) FROM newsletter_sequence_enrollments WHERE status = 'active') as active_automations;

-- Analytics KPI view
CREATE OR REPLACE VIEW analytics_kpis AS
SELECT 
  (SELECT COUNT(*) FROM app_users WHERE created_at >= DATE_TRUNC('day', NOW())) as signups_today,
  (SELECT COUNT(*) FROM app_users WHERE created_at >= DATE_TRUNC('day', NOW() - INTERVAL '1 day') AND created_at < DATE_TRUNC('day', NOW())) as signups_yesterday,
  (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE timestamp >= DATE_TRUNC('day', NOW())) as active_today,
  (SELECT SUM(amount_cents) FROM invoice_cache WHERE status = 'paid' AND paid_at >= DATE_TRUNC('month', NOW())) as revenue_mtd,
  (SELECT COUNT(*) FROM app_users WHERE subscription_tier != 'free') as paying_customers,
  (SELECT COUNT(*) FROM app_users WHERE subscription_status = 'canceled' AND updated_at >= DATE_TRUNC('month', NOW())) as churned_mtd;

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

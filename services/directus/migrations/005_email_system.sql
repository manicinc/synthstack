-- Email System Migration
-- Comprehensive email queue, logs, templates, and delivery tracking

-- ============================================
-- EMAIL TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  
  -- Template identity
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'transactional'
    CHECK (category IN ('transactional', 'marketing', 'system', 'notification')),
  
  -- Content
  subject VARCHAR(500) NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  
  -- Template engine
  engine VARCHAR(20) DEFAULT 'ejs'
    CHECK (engine IN ('ejs', 'handlebars', 'html')),
  
  -- Variables/schema
  variables JSONB DEFAULT '[]',
  -- Example: [{"name": "userName", "type": "string", "required": true}]
  
  -- Attachments
  default_attachments JSONB DEFAULT '[]',
  
  -- Sender (can override defaults)
  from_email VARCHAR(255),
  from_name VARCHAR(100),
  reply_to VARCHAR(255),
  
  -- Metadata
  tags TEXT[],
  preview_data JSONB DEFAULT '{}', -- Sample data for preview
  
  -- Stats
  sent_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES directus_users(id),
  
  -- Version control
  version INT DEFAULT 1,
  parent_version UUID REFERENCES email_templates(id)
);

CREATE INDEX idx_email_templates_slug ON email_templates(slug);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_status ON email_templates(status);

-- ============================================
-- EMAIL QUEUE
-- ============================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled', 'scheduled')),
  
  -- Priority
  priority INT DEFAULT 0, -- Higher = more priority
  
  -- Recipient
  to_email VARCHAR(255) NOT NULL,
  to_name VARCHAR(255),
  cc_emails TEXT[], -- Array of CC addresses
  bcc_emails TEXT[], -- Array of BCC addresses
  
  -- Sender
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(100),
  reply_to VARCHAR(255),
  
  -- Content
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  
  -- Template reference (if templated)
  template_id UUID REFERENCES email_templates(id),
  template_data JSONB,
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  -- Example: [{"filename": "invoice.pdf", "path": "/tmp/invoice.pdf", "contentType": "application/pdf"}]
  
  -- Tracking
  message_id VARCHAR(255), -- SMTP Message-ID
  tracking_enabled BOOLEAN DEFAULT TRUE,
  tracking_data JSONB DEFAULT '{}',
  
  -- References
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  reference_type VARCHAR(50), -- 'subscription', 'generation', 'newsletter', etc.
  reference_id UUID,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  
  -- Retry logic
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  error TEXT,
  error_code VARCHAR(100),
  
  -- Delivery
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  complained_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_priority ON email_queue(priority DESC, created_at ASC);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_email_queue_pending ON email_queue(status, priority DESC) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_email_queue_user ON email_queue(user_id);
CREATE INDEX idx_email_queue_reference ON email_queue(reference_type, reference_id);
CREATE INDEX idx_email_queue_created ON email_queue(created_at DESC);

-- ============================================
-- EMAIL DELIVERY LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Email reference
  queue_id UUID REFERENCES email_queue(id) ON DELETE SET NULL,
  message_id VARCHAR(255),
  
  -- Recipient
  to_email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  -- Template
  template_slug VARCHAR(100),
  subject VARCHAR(500) NOT NULL,
  
  -- Status
  status VARCHAR(50) NOT NULL
    CHECK (status IN ('sent', 'delivered', 'bounced', 'complained', 'opened', 'clicked', 'failed')),
  
  -- SMTP response
  smtp_response TEXT,
  smtp_code INT,
  
  -- Tracking
  opened_count INT DEFAULT 0,
  clicked_count INT DEFAULT 0,
  first_opened_at TIMESTAMP WITH TIME ZONE,
  last_clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Device/location
  user_agent TEXT,
  ip_address INET,
  country VARCHAR(2),
  device_type VARCHAR(20),
  
  -- Error details
  error TEXT,
  bounce_type VARCHAR(50), -- 'hard', 'soft', 'block'
  bounce_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_email_logs_queue ON email_logs(queue_id);
CREATE INDEX idx_email_logs_to ON email_logs(to_email);
CREATE INDEX idx_email_logs_user ON email_logs(user_id);
CREATE INDEX idx_email_logs_template ON email_logs(template_slug);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_message ON email_logs(message_id);

-- ============================================
-- EMAIL TRACKING EVENTS (Click/Open tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS email_tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Email reference
  log_id UUID REFERENCES email_logs(id) ON DELETE CASCADE,
  queue_id UUID REFERENCES email_queue(id) ON DELETE SET NULL,
  
  -- Event type
  event_type VARCHAR(50) NOT NULL
    CHECK (event_type IN ('opened', 'clicked', 'unsubscribed', 'complained', 'bounced')),
  
  -- Click details (if clicked)
  link_url TEXT,
  link_index INT,
  
  -- Device/location
  ip_address INET,
  user_agent TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  
  -- Timestamp
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_tracking_log ON email_tracking_events(log_id);
CREATE INDEX idx_email_tracking_queue ON email_tracking_events(queue_id);
CREATE INDEX idx_email_tracking_type ON email_tracking_events(event_type);
CREATE INDEX idx_email_tracking_occurred ON email_tracking_events(occurred_at DESC);

-- ============================================
-- EMAIL RATE LIMITS (Per domain/user)
-- ============================================
CREATE TABLE IF NOT EXISTS email_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Target
  limit_type VARCHAR(20) NOT NULL
    CHECK (limit_type IN ('domain', 'user', 'global')),
  target_value VARCHAR(255), -- domain name or user_id
  
  -- Limits
  hourly_limit INT DEFAULT 100,
  daily_limit INT DEFAULT 500,
  monthly_limit INT DEFAULT 10000,
  
  -- Current usage
  hourly_sent INT DEFAULT 0,
  daily_sent INT DEFAULT 0,
  monthly_sent INT DEFAULT 0,
  
  -- Reset timestamps
  hourly_reset_at TIMESTAMP WITH TIME ZONE,
  daily_reset_at TIMESTAMP WITH TIME ZONE,
  monthly_reset_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_rate_limits_type ON email_rate_limits(limit_type, target_value);
CREATE INDEX idx_email_rate_limits_blocked ON email_rate_limits(is_blocked) WHERE is_blocked = TRUE;

-- ============================================
-- EMAIL BOUNCE LIST (Suppress bounced emails)
-- ============================================
CREATE TABLE IF NOT EXISTS email_bounce_list (
  email VARCHAR(255) PRIMARY KEY,
  
  -- Bounce details
  bounce_type VARCHAR(50) NOT NULL
    CHECK (bounce_type IN ('hard', 'soft', 'block', 'complaint', 'unsubscribe')),
  bounce_reason TEXT,
  bounce_count INT DEFAULT 1,
  
  -- Status
  is_suppressed BOOLEAN DEFAULT TRUE,
  
  -- First and last bounce
  first_bounced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_bounced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Related
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  -- Notes
  notes TEXT,
  
  -- Auto-expire soft bounces after 30 days
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_email_bounce_type ON email_bounce_list(bounce_type);
CREATE INDEX idx_email_bounce_suppressed ON email_bounce_list(is_suppressed) WHERE is_suppressed = TRUE;

-- ============================================
-- DEFAULT EMAIL TEMPLATES
-- ============================================
INSERT INTO email_templates (slug, name, category, subject, html_template, text_template, variables) VALUES
(
  'welcome',
  'Welcome Email',
  'transactional',
  'Welcome to SynthStack, <%= userName %>!',
  '<!DOCTYPE html><html><body><h1>Welcome <%= userName %>!</h1><p>Thanks for joining SynthStack. Here''s how to get started...</p></body></html>',
  'Welcome <%= userName %>! Thanks for joining SynthStack...',
  '[{"name": "userName", "type": "string", "required": true}, {"name": "userEmail", "type": "string", "required": true}]'
),
(
  'email-verification',
  'Email Verification',
  'transactional',
  'Verify your email address',
  '<!DOCTYPE html><html><body><h1>Verify Your Email</h1><p>Click here to verify: <a href="<%= verificationLink %>">Verify Email</a></p></body></html>',
  'Verify your email: <%= verificationLink %>',
  '[{"name": "verificationLink", "type": "string", "required": true}]'
),
(
  'password-reset',
  'Password Reset',
  'transactional',
  'Reset your password',
  '<!DOCTYPE html><html><body><h1>Reset Password</h1><p>Click here to reset: <a href="<%= resetLink %>">Reset Password</a></p><p>Expires in 1 hour.</p></body></html>',
  'Reset your password: <%= resetLink %>',
  '[{"name": "resetLink", "type": "string", "required": true}]'
),
(
  'subscription-confirmed',
  'Subscription Confirmed',
  'transactional',
  'Your <%= planName %> subscription is active!',
  '<!DOCTYPE html><html><body><h1>Subscription Active!</h1><p>Thank you for subscribing to <%= planName %>. Your benefits: <%= credits %> credits/day.</p></body></html>',
  'Subscription active: <%= planName %>. <%= credits %> credits/day.',
  '[{"name": "planName", "type": "string"}, {"name": "credits", "type": "number"}]'
),
(
  'payment-receipt',
  'Payment Receipt',
  'transactional',
  'Receipt for $<%= amount %> payment',
  '<!DOCTYPE html><html><body><h1>Payment Receipt</h1><p>Amount: $<%= amount %></p><p>Invoice: <a href="<%= invoiceUrl %>">View Invoice</a></p></body></html>',
  'Payment receipt: $<%= amount %>. Invoice: <%= invoiceUrl %>',
  '[{"name": "amount", "type": "number"}, {"name": "invoiceUrl", "type": "string"}]'
),
(
  'payment-failed',
  'Payment Failed',
  'notification',
  'We couldn''t process your payment',
  '<!DOCTYPE html><html><body><h1>Payment Failed</h1><p>We had trouble processing your payment. Please update your payment method.</p></body></html>',
  'Payment failed. Please update your payment method.',
  '[{"name": "retryUrl", "type": "string"}]'
),
(
  'trial-ending',
  'Trial Ending Soon',
  'notification',
  'Your trial ends in <%= daysLeft %> days',
  '<!DOCTYPE html><html><body><h1>Trial Ending</h1><p>Your trial ends in <%= daysLeft %> days. Upgrade to keep access!</p></body></html>',
  'Trial ends in <%= daysLeft %> days.',
  '[{"name": "daysLeft", "type": "number"}]'
),
(
  'subscription-canceled',
  'Subscription Canceled',
  'notification',
  'Your subscription has been canceled',
  '<!DOCTYPE html><html><body><h1>Subscription Canceled</h1><p>Your subscription will end on <%= endDate %>. We''d love to have you back!</p></body></html>',
  'Subscription canceled. Ends: <%= endDate %>',
  '[{"name": "endDate", "type": "string"}]'
),
(
  'credit-low',
  'Credits Running Low',
  'notification',
  'Only <%= creditsLeft %> credits remaining',
  '<!DOCTYPE html><html><body><h1>Credits Low</h1><p>You have <%= creditsLeft %> credits left. Purchase more or upgrade your plan.</p></body></html>',
  'Only <%= creditsLeft %> credits remaining.',
  '[{"name": "creditsLeft", "type": "number"}]'
),
(
  'credit-purchased',
  'Credits Purchased',
  'transactional',
  '<%= credits %> credits added to your account',
  '<!DOCTYPE html><html><body><h1>Credits Added</h1><p>We''ve added <%= credits %> credits to your account. New balance: <%= newBalance %>.</p></body></html>',
  '<%= credits %> credits added. New balance: <%= newBalance %>',
  '[{"name": "credits", "type": "number"}, {"name": "newBalance", "type": "number"}]'
),
(
  'moderation-action',
  'Content Moderation Notice',
  'notification',
  'Action taken on your content',
  '<!DOCTYPE html><html><body><h1>Moderation Notice</h1><p>Action: <%= action %>. Reason: <%= reason %></p></body></html>',
  'Moderation action: <%= action %>',
  '[{"name": "action", "type": "string"}, {"name": "reason", "type": "string"}]'
),
(
  'admin-report',
  'New Report to Review',
  'system',
  'New moderation report from <%= reporterEmail %>',
  '<!DOCTYPE html><html><body><h1>New Report</h1><p>Type: <%= reportType %><br>Details: <%= details %></p><p><a href="<%= reviewUrl %>">Review Report</a></p></body></html>',
  'New report: <%= reportType %>',
  '[{"name": "reporterEmail", "type": "string"}, {"name": "reportType", "type": "string"}, {"name": "details", "type": "string"}, {"name": "reviewUrl", "type": "string"}]'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  variables = EXCLUDED.variables,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update email_templates updated_at
CREATE OR REPLACE FUNCTION update_email_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_email_template_updated ON email_templates;
CREATE TRIGGER trigger_email_template_updated
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_template_updated_at();

-- Auto-update email_queue updated_at
DROP TRIGGER IF EXISTS trigger_email_queue_updated ON email_queue;
CREATE TRIGGER trigger_email_queue_updated
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_template_updated_at();

-- Increment template sent_count when email is sent
CREATE OR REPLACE FUNCTION increment_template_sent_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' AND NEW.template_id IS NOT NULL THEN
    UPDATE email_templates 
    SET sent_count = sent_count + 1
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_template_sent ON email_queue;
CREATE TRIGGER trigger_increment_template_sent
  AFTER UPDATE ON email_queue
  FOR EACH ROW
  WHEN (NEW.status = 'sent' AND OLD.status IS DISTINCT FROM 'sent')
  EXECUTE FUNCTION increment_template_sent_count();

-- Log email delivery
CREATE OR REPLACE FUNCTION log_email_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
    INSERT INTO email_logs (
      queue_id, message_id, to_email, user_id, template_slug,
      subject, status, smtp_code, sent_at
    )
    SELECT 
      NEW.id,
      NEW.message_id,
      NEW.to_email,
      NEW.user_id,
      et.slug,
      NEW.subject,
      'sent',
      200,
      NEW.sent_at
    FROM email_templates et
    WHERE et.id = NEW.template_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_email_delivery ON email_queue;
CREATE TRIGGER trigger_log_email_delivery
  AFTER UPDATE ON email_queue
  FOR EACH ROW
  WHEN (NEW.status = 'sent')
  EXECUTE FUNCTION log_email_delivery();

-- ============================================
-- VIEWS
-- ============================================

-- Email dashboard view
CREATE OR REPLACE VIEW email_dashboard AS
SELECT 
  (SELECT COUNT(*) FROM email_queue WHERE status = 'sent' AND sent_at >= NOW() - INTERVAL '24 hours') as sent_24h,
  (SELECT COUNT(*) FROM email_queue WHERE status = 'failed') as failed_total,
  (SELECT COUNT(*) FROM email_queue WHERE status = 'pending') as pending_total,
  (SELECT COUNT(*) FROM email_logs WHERE status = 'bounced' AND bounced_at >= NOW() - INTERVAL '7 days') as bounced_7d,
  (SELECT COUNT(*) FROM email_logs WHERE opened_count > 0 AND sent_at >= NOW() - INTERVAL '7 days') as opened_7d,
  (SELECT COUNT(*) FROM email_logs WHERE clicked_count > 0 AND sent_at >= NOW() - INTERVAL '7 days') as clicked_7d,
  (SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) FROM email_logs WHERE delivered_at IS NOT NULL AND sent_at >= NOW() - INTERVAL '24 hours') as avg_delivery_time_seconds;

-- Template performance view
CREATE OR REPLACE VIEW email_template_performance AS
SELECT 
  et.id,
  et.slug,
  et.name,
  et.sent_count,
  et.open_count,
  et.click_count,
  CASE WHEN et.sent_count > 0 
    THEN (et.open_count::DECIMAL / et.sent_count * 100) 
    ELSE 0 
  END as open_rate,
  CASE WHEN et.open_count > 0 
    THEN (et.click_count::DECIMAL / et.open_count * 100) 
    ELSE 0 
  END as click_through_rate,
  (SELECT COUNT(*) FROM email_queue WHERE template_id = et.id AND status = 'failed') as failed_count,
  (SELECT MAX(sent_at) FROM email_queue WHERE template_id = et.id AND status = 'sent') as last_sent_at
FROM email_templates et
WHERE et.status = 'published';

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

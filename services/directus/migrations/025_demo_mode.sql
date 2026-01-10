-- SynthStack Demo Mode System
-- Migration 025: Demo tier, session tracking, and demo-specific rate limiting
--
-- Allows unauthenticated users to try the app with limited credits
-- Tracks demo sessions, referrals, and enforces severe rate limits

-- ============================================
-- Add Demo Tier to Rate Limits
-- ============================================
INSERT INTO rate_limits (
  tier,
  requests_per_minute, requests_per_hour, requests_per_day,
  max_tokens_per_request, tokens_per_day,
  max_documents, max_storage_mb,
  max_concurrent_requests,
  max_agents, agent_memory_enabled
) VALUES
  -- Demo: Severely limited, encourages sign-up
  ('demo', 2, 10, 20, 1000, 5000, 0, 0, 1, 0, false)
ON CONFLICT (tier) DO UPDATE SET
  requests_per_minute = EXCLUDED.requests_per_minute,
  requests_per_hour = EXCLUDED.requests_per_hour,
  requests_per_day = EXCLUDED.requests_per_day,
  max_tokens_per_request = EXCLUDED.max_tokens_per_request,
  tokens_per_day = EXCLUDED.tokens_per_day,
  max_documents = EXCLUDED.max_documents,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_concurrent_requests = EXCLUDED.max_concurrent_requests,
  max_agents = EXCLUDED.max_agents,
  agent_memory_enabled = EXCLUDED.agent_memory_enabled,
  updated_at = NOW();

-- ============================================
-- Demo Sessions Table
-- ============================================
-- Tracks demo user sessions for referral credits and rate limiting
-- Note: Primary session data is stored in sessionStorage (client-side)
-- This table is for server-side referral tracking and abuse prevention

CREATE TABLE IF NOT EXISTS demo_sessions (
  session_id VARCHAR(64) PRIMARY KEY,

  -- Credits tracking
  credits_remaining INTEGER DEFAULT 5,
  credits_used INTEGER DEFAULT 0,

  -- Referral tracking
  referral_code VARCHAR(20) UNIQUE,
  referral_credits_earned INTEGER DEFAULT 0,
  referred_by VARCHAR(20),  -- Referral code that brought this user

  -- Rate limiting
  requests_today INTEGER DEFAULT 0,
  requests_this_hour INTEGER DEFAULT 0,
  requests_this_minute INTEGER DEFAULT 0,
  last_request_at TIMESTAMP WITH TIME ZONE,

  -- Session metadata
  ip_address INET,
  user_agent TEXT,
  fingerprint VARCHAR(64),  -- Browser fingerprint for abuse prevention

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- ============================================
-- Demo Referral Tracking Table
-- ============================================
-- Tracks referral clicks and conversions for demo users
CREATE TABLE IF NOT EXISTS demo_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referral info
  referrer_session_id VARCHAR(64) NOT NULL REFERENCES demo_sessions(session_id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,

  -- Click info
  clicked_ip INET,
  clicked_fingerprint VARCHAR(64),

  -- Conversion tracking
  converted_to_signup BOOLEAN DEFAULT false,
  converted_user_id UUID,  -- Links to app_users if they sign up

  -- Credits awarded
  credits_awarded INTEGER DEFAULT 0,

  -- Timestamps
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Demo Feature Limits Table
-- ============================================
-- Specific feature limits for demo mode
CREATE TABLE IF NOT EXISTS demo_limits (
  feature VARCHAR(50) PRIMARY KEY,
  max_count INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed demo feature limits
INSERT INTO demo_limits (feature, max_count, description) VALUES
  ('chat_messages', 5, 'Maximum AI chat messages per session'),
  ('projects', 1, 'Maximum projects demo user can create'),
  ('todos', 5, 'Maximum todos per project'),
  ('milestones', 2, 'Maximum milestones per project'),
  ('ai_suggestions', 3, 'Maximum AI suggestion requests'),
  ('marketing_plans', 0, 'Marketing plans locked in demo'),
  ('ai_agents', 0, 'AI agents locked in demo')
ON CONFLICT (feature) DO UPDATE SET
  max_count = EXCLUDED.max_count,
  description = EXCLUDED.description;

-- ============================================
-- Demo Rate Limit Tracking
-- ============================================
-- Separate from user_rate_tracking since demo sessions don't have user_id
CREATE TABLE IF NOT EXISTS demo_rate_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(64) NOT NULL REFERENCES demo_sessions(session_id) ON DELETE CASCADE,

  -- Time window
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_type VARCHAR(20) NOT NULL,  -- 'minute', 'hour', 'day'

  -- Counters
  request_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique per session per window
  UNIQUE(session_id, window_start, window_type)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_demo_sessions_referral_code ON demo_sessions(referral_code);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_referred_by ON demo_sessions(referred_by);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_created ON demo_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON demo_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_ip ON demo_sessions(ip_address);

CREATE INDEX IF NOT EXISTS idx_demo_referrals_code ON demo_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_demo_referrals_referrer ON demo_referrals(referrer_session_id);
CREATE INDEX IF NOT EXISTS idx_demo_referrals_clicked ON demo_referrals(clicked_at);

CREATE INDEX IF NOT EXISTS idx_demo_rate_tracking_session ON demo_rate_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_demo_rate_tracking_window ON demo_rate_tracking(window_start, window_type);

-- ============================================
-- Helper Functions
-- ============================================

-- Generate unique referral code for demo session
CREATE OR REPLACE FUNCTION generate_demo_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  v_code VARCHAR(20);
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-char alphanumeric code prefixed with 'D' for demo
    v_code := 'D' || upper(substring(md5(random()::text) from 1 for 7));

    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM demo_sessions WHERE referral_code = v_code) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Award referral credits to demo session
CREATE OR REPLACE FUNCTION award_demo_referral_credits(
  p_referral_code VARCHAR(20),
  p_credits INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_id VARCHAR(64);
BEGIN
  -- Find session with this referral code
  SELECT session_id INTO v_session_id
  FROM demo_sessions
  WHERE referral_code = p_referral_code;

  IF v_session_id IS NULL THEN
    RETURN false;
  END IF;

  -- Award credits
  UPDATE demo_sessions
  SET
    credits_remaining = credits_remaining + p_credits,
    referral_credits_earned = referral_credits_earned + p_credits,
    last_activity = NOW()
  WHERE session_id = v_session_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Check if demo session is rate limited
CREATE OR REPLACE FUNCTION check_demo_rate_limit(p_session_id VARCHAR(64))
RETURNS TABLE(
  is_limited BOOLEAN,
  limit_type VARCHAR(50),
  current_count INTEGER,
  max_count INTEGER,
  resets_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_limits RECORD;
  v_minute_count INTEGER;
  v_hour_count INTEGER;
  v_day_count INTEGER;
  v_minute_start TIMESTAMP WITH TIME ZONE;
  v_hour_start TIMESTAMP WITH TIME ZONE;
  v_day_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get demo tier limits
  SELECT * INTO v_limits FROM rate_limits WHERE tier = 'demo';

  -- Calculate window starts
  v_minute_start := date_trunc('minute', NOW());
  v_hour_start := date_trunc('hour', NOW());
  v_day_start := date_trunc('day', NOW());

  -- Get current counts
  SELECT COALESCE(SUM(request_count), 0) INTO v_minute_count
  FROM demo_rate_tracking
  WHERE session_id = p_session_id
    AND window_type = 'minute'
    AND window_start >= v_minute_start;

  SELECT COALESCE(SUM(request_count), 0) INTO v_hour_count
  FROM demo_rate_tracking
  WHERE session_id = p_session_id
    AND window_type = 'hour'
    AND window_start >= v_hour_start;

  SELECT COALESCE(SUM(request_count), 0) INTO v_day_count
  FROM demo_rate_tracking
  WHERE session_id = p_session_id
    AND window_type = 'day'
    AND window_start >= v_day_start;

  -- Check minute limit
  IF v_minute_count >= v_limits.requests_per_minute THEN
    RETURN QUERY SELECT
      true,
      'requests_per_minute'::VARCHAR(50),
      v_minute_count,
      v_limits.requests_per_minute,
      v_minute_start + INTERVAL '1 minute';
    RETURN;
  END IF;

  -- Check hour limit
  IF v_hour_count >= v_limits.requests_per_hour THEN
    RETURN QUERY SELECT
      true,
      'requests_per_hour'::VARCHAR(50),
      v_hour_count,
      v_limits.requests_per_hour,
      v_hour_start + INTERVAL '1 hour';
    RETURN;
  END IF;

  -- Check day limit
  IF v_day_count >= v_limits.requests_per_day THEN
    RETURN QUERY SELECT
      true,
      'requests_per_day'::VARCHAR(50),
      v_day_count,
      v_limits.requests_per_day,
      v_day_start + INTERVAL '1 day';
    RETURN;
  END IF;

  -- Not limited
  RETURN QUERY SELECT false, NULL::VARCHAR(50), 0, 0, NULL::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired demo sessions
CREATE OR REPLACE FUNCTION cleanup_expired_demo_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM demo_sessions
  WHERE expires_at < NOW()
  RETURNING COUNT(*) INTO v_deleted;

  -- Also cleanup old rate tracking
  DELETE FROM demo_rate_tracking
  WHERE window_start < NOW() - INTERVAL '7 days';

  RETURN COALESCE(v_deleted, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT ON rate_limits TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON demo_sessions TO synthstack;
GRANT SELECT, INSERT, UPDATE ON demo_referrals TO synthstack;
GRANT SELECT ON demo_limits TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON demo_rate_tracking TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE demo_sessions IS 'Tracks demo user sessions for credits and referrals';
COMMENT ON TABLE demo_referrals IS 'Tracks referral clicks and conversions from demo users';
COMMENT ON TABLE demo_limits IS 'Feature-specific limits for demo mode';
COMMENT ON TABLE demo_rate_tracking IS 'Rate limit tracking for demo sessions';
COMMENT ON FUNCTION generate_demo_referral_code IS 'Generates unique referral code for demo users';
COMMENT ON FUNCTION award_demo_referral_credits IS 'Awards credits to demo user from referral';
COMMENT ON FUNCTION check_demo_rate_limit IS 'Checks if demo session is rate limited';

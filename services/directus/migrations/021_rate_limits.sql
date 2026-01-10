-- SynthStack Rate Limiting System
-- Migration 021: Tier-based rate limits for API access
--
-- Controls request limits, token limits, and storage quotas per subscription tier

-- ============================================
-- Rate Limits Table
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limits (
  tier VARCHAR(50) PRIMARY KEY,

  -- Request limits
  requests_per_minute INTEGER,      -- NULL = unlimited
  requests_per_hour INTEGER,
  requests_per_day INTEGER,

  -- Token limits (for AI endpoints)
  max_tokens_per_request INTEGER,   -- Max tokens in single request
  tokens_per_day INTEGER,           -- Total tokens per day

  -- Storage limits
  max_documents INTEGER,            -- Max docs for RAG
  max_storage_mb INTEGER,           -- Max storage in MB

  -- Concurrent limits
  max_concurrent_requests INTEGER DEFAULT 3,

  -- Feature limits
  max_agents INTEGER,               -- How many AI agents can use
  agent_memory_enabled BOOLEAN DEFAULT false,  -- Can agents remember context

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Seed Rate Limits by Tier
-- ============================================
INSERT INTO rate_limits (
  tier,
  requests_per_minute, requests_per_hour, requests_per_day,
  max_tokens_per_request, tokens_per_day,
  max_documents, max_storage_mb,
  max_concurrent_requests,
  max_agents, agent_memory_enabled
) VALUES
  -- Community: Very limited, just for trying out
  ('community', 5, 50, 100, 2000, 10000, 0, 0, 1, 0, false),

  -- Subscriber ($2-4/mo): Basic AI access with limits
  ('subscriber', 20, 200, 500, 4000, 50000, 10, 100, 2, 1, false),

  -- Premium ($297 lifetime): Full access with generous limits
  ('premium', 60, 600, 2000, 8000, 200000, 100, 1000, 5, 6, true),

  -- Lifetime (same as premium, for explicit tier)
  ('lifetime', 60, 600, 2000, 8000, 200000, 100, 1000, 5, 6, true),

  -- BYOK: User pays their own API costs, very high limits
  ('byok', 120, 1200, 10000, 16000, NULL, 500, 5000, 10, 6, true),

  -- Admin: Unlimited
  ('admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 20, 6, true)

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
-- User Rate Limit Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS user_rate_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Time window
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_type VARCHAR(20) NOT NULL,  -- 'minute', 'hour', 'day'

  -- Counters
  request_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique per user per window
  UNIQUE(user_id, window_start, window_type)
);

-- ============================================
-- Rate Limit Exceeded Log
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  -- Event details
  limit_type VARCHAR(50) NOT NULL,  -- 'requests_per_minute', 'tokens_per_day', etc.
  limit_value INTEGER,              -- What the limit was
  current_value INTEGER,            -- What the user was at
  tier VARCHAR(50),                 -- User's tier at time of event

  -- Request context
  endpoint VARCHAR(200),
  ip_address INET,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_rate_tracking_user ON user_rate_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rate_tracking_window ON user_rate_tracking(window_start, window_type);
CREATE INDEX IF NOT EXISTS idx_user_rate_tracking_cleanup ON user_rate_tracking(window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_user ON rate_limit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_date ON rate_limit_events(created_at);

-- ============================================
-- Cleanup old rate tracking data (keep 7 days)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_rate_tracking()
RETURNS void AS $$
BEGIN
  DELETE FROM user_rate_tracking
  WHERE window_start < NOW() - INTERVAL '7 days';

  DELETE FROM rate_limit_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper function to get user's effective tier
-- ============================================
CREATE OR REPLACE FUNCTION get_effective_tier(p_user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_tier VARCHAR(50);
  v_has_byok BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Get user's base tier and admin status
  SELECT subscription_tier, is_admin
  INTO v_tier, v_is_admin
  FROM app_users
  WHERE id = p_user_id;

  -- Admin overrides everything
  IF v_is_admin THEN
    RETURN 'admin';
  END IF;

  -- Check if user has active BYOK keys
  SELECT EXISTS(
    SELECT 1 FROM user_api_keys
    WHERE user_id = p_user_id AND is_active = true AND is_valid = true
  ) INTO v_has_byok;

  -- BYOK users get byok tier limits
  IF v_has_byok THEN
    RETURN 'byok';
  END IF;

  -- Return base tier (default to community if null)
  RETURN COALESCE(v_tier, 'community');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT ON rate_limits TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_rate_tracking TO synthstack;
GRANT SELECT, INSERT ON rate_limit_events TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE rate_limits IS 'Rate limits configuration per subscription tier';
COMMENT ON TABLE user_rate_tracking IS 'Real-time rate limit tracking per user';
COMMENT ON TABLE rate_limit_events IS 'Log of rate limit exceeded events';
COMMENT ON FUNCTION get_effective_tier IS 'Returns user effective tier considering admin status and BYOK';

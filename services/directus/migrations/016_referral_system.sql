-- Migration: 016_referral_system.sql
-- Description: Full referral system with seasons, tiers, rewards, and discount codes
-- Created: 2024-12-14

-- =====================================================
-- REFERRAL SEASONS
-- Configurable campaigns with time periods
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{
    "allow_self_referral": false,
    "require_conversion": true,
    "conversion_window_days": 30,
    "min_purchase_for_conversion": 0,
    "max_referrals_per_user": null,
    "referral_code_prefix": "REF"
  }',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- REFERRAL TIERS
-- Reward thresholds based on referral count
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES referral_seasons(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  referrals_required INT NOT NULL,
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('discount_code', 'credits', 'free_month', 'tier_upgrade', 'custom')),
  reward_value JSONB NOT NULL,
  -- Examples:
  -- discount_code: {"percent": 50, "code_prefix": "SAVE50", "max_uses": 1, "expires_days": 30}
  -- credits: {"amount": 500}
  -- free_month: {"months": 1, "tier": "pro"}
  -- tier_upgrade: {"from": "free", "to": "pro", "duration_days": 30}
  badge_icon VARCHAR(50),
  badge_color VARCHAR(20),
  is_stackable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- REFERRAL CODES
-- Unique codes per user per season
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  season_id UUID REFERENCES referral_seasons(id) ON DELETE SET NULL,
  custom_code VARCHAR(50), -- User-requested custom code (optional)
  clicks INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_click_at TIMESTAMP
);

-- =====================================================
-- REFERRALS
-- Track each referral relationship
-- =====================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_user_id UUID,
  referred_email VARCHAR(255), -- Store email before signup
  referral_code_id UUID REFERENCES referral_codes(id) ON DELETE SET NULL,
  season_id UUID REFERENCES referral_seasons(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'clicked' CHECK (status IN ('clicked', 'signed_up', 'converted', 'expired', 'rejected')),
  click_date TIMESTAMP DEFAULT NOW(),
  signup_date TIMESTAMP,
  conversion_date TIMESTAMP,
  conversion_type VARCHAR(50), -- 'subscription', 'lifetime', 'credits', 'other'
  conversion_value DECIMAL(10,2),
  conversion_product VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- REFERRAL REWARDS
-- Earned rewards from reaching tiers
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier_id UUID REFERENCES referral_tiers(id) ON DELETE SET NULL,
  season_id UUID REFERENCES referral_seasons(id) ON DELETE SET NULL,
  reward_type VARCHAR(50) NOT NULL,
  reward_data JSONB NOT NULL,
  discount_code_id UUID, -- Reference to generated discount code
  is_unlocked BOOLEAN DEFAULT true,
  is_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  expires_at TIMESTAMP,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DISCOUNT CODES
-- Generated discount codes (from referrals or admin)
-- =====================================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100),
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('percent', 'fixed', 'free_month', 'free_trial')),
  value DECIMAL(10,2) NOT NULL, -- 50 for 50%, or fixed dollar amount
  applies_to VARCHAR(50) DEFAULT 'all' CHECK (applies_to IN ('lifetime', 'subscription', 'credits', 'all')),
  applies_to_products JSONB, -- Specific product IDs if restricted
  max_uses INT,
  max_uses_per_user INT DEFAULT 1,
  current_uses INT DEFAULT 0,
  min_purchase DECIMAL(10,2),
  max_discount DECIMAL(10,2), -- Cap on discount amount
  referral_reward_id UUID REFERENCES referral_rewards(id) ON DELETE SET NULL,
  created_by UUID,
  source VARCHAR(50) DEFAULT 'referral' CHECK (source IN ('referral', 'admin', 'campaign', 'partner')),
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- Show on pricing page
  starts_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DISCOUNT CODE USAGE
-- Track each use of a discount code
-- =====================================================
CREATE TABLE IF NOT EXISTS discount_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id VARCHAR(100), -- Stripe payment intent or order ID
  original_amount DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  final_amount DECIMAL(10,2),
  product_type VARCHAR(50),
  product_id VARCHAR(100),
  used_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- REFERRAL STATS
-- Denormalized stats for performance
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  season_id UUID REFERENCES referral_seasons(id) ON DELETE SET NULL,
  total_clicks INT DEFAULT 0,
  total_referrals INT DEFAULT 0,
  successful_referrals INT DEFAULT 0,
  pending_referrals INT DEFAULT 0,
  expired_referrals INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  total_conversion_value DECIMAL(10,2) DEFAULT 0,
  total_rewards_earned INT DEFAULT 0,
  total_rewards_claimed INT DEFAULT 0,
  total_credits_earned INT DEFAULT 0,
  current_tier_id UUID REFERENCES referral_tiers(id) ON DELETE SET NULL,
  next_tier_id UUID REFERENCES referral_tiers(id) ON DELETE SET NULL,
  referrals_to_next_tier INT,
  leaderboard_rank INT,
  last_referral_at TIMESTAMP,
  last_conversion_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- REFERRAL LEADERBOARD HISTORY
-- Historical snapshots for leaderboards
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_leaderboard_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES referral_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rank INT NOT NULL,
  successful_referrals INT NOT NULL,
  total_conversion_value DECIMAL(10,2) DEFAULT 0,
  snapshot_date DATE NOT NULL,
  snapshot_type VARCHAR(20) DEFAULT 'daily' CHECK (snapshot_type IN ('daily', 'weekly', 'monthly', 'final')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_season ON referral_codes(season_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_season ON referrals(season_id);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_tier ON referral_rewards(tier_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_claimed ON referral_rewards(is_claimed);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_codes_source ON discount_codes(source);

CREATE INDEX IF NOT EXISTS idx_discount_usage_code ON discount_code_usage(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_user ON discount_code_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_referral_stats_user ON referral_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_stats_rank ON referral_stats(leaderboard_rank);

CREATE INDEX IF NOT EXISTS idx_leaderboard_history_season ON referral_leaderboard_history(season_id, snapshot_date);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_referral_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referral_seasons_updated_at
  BEFORE UPDATE ON referral_seasons
  FOR EACH ROW EXECUTE FUNCTION update_referral_timestamp();

CREATE TRIGGER referral_tiers_updated_at
  BEFORE UPDATE ON referral_tiers
  FOR EACH ROW EXECUTE FUNCTION update_referral_timestamp();

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_referral_timestamp();

CREATE TRIGGER referral_rewards_updated_at
  BEFORE UPDATE ON referral_rewards
  FOR EACH ROW EXECUTE FUNCTION update_referral_timestamp();

CREATE TRIGGER discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION update_referral_timestamp();

CREATE TRIGGER referral_stats_updated_at
  BEFORE UPDATE ON referral_stats
  FOR EACH ROW EXECUTE FUNCTION update_referral_timestamp();

-- =====================================================
-- SEED DATA: Default Season & Tiers
-- =====================================================

-- Insert default season
INSERT INTO referral_seasons (name, slug, description, start_date, is_active, is_default, config)
VALUES (
  'Launch Season',
  'launch-2024',
  'SynthStack launch referral program - earn rewards for every friend you bring!',
  NOW(),
  true,
  true,
  '{
    "allow_self_referral": false,
    "require_conversion": true,
    "conversion_window_days": 30,
    "min_purchase_for_conversion": 0,
    "max_referrals_per_user": null,
    "referral_code_prefix": "SYNTH"
  }'
) ON CONFLICT (slug) DO NOTHING;

-- Insert default tiers
INSERT INTO referral_tiers (season_id, name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, sort_order)
SELECT
  s.id,
  tier.name,
  tier.description,
  tier.referrals_required,
  tier.reward_type,
  tier.reward_value::jsonb,
  tier.badge_icon,
  tier.badge_color,
  tier.sort_order
FROM referral_seasons s
CROSS JOIN (VALUES
  ('Starter', 'Get your first referral', 1, 'credits', '{"amount": 100}', 'star', '#6366f1', 1),
  ('Bronze', 'Refer 3 friends', 3, 'discount_code', '{"percent": 25, "code_prefix": "BRONZE25", "max_uses": 1, "expires_days": 60}', 'military_tech', '#cd7f32', 2),
  ('Silver', 'Refer 5 friends', 5, 'discount_code', '{"percent": 50, "code_prefix": "SILVER50", "max_uses": 1, "expires_days": 60}', 'workspace_premium', '#c0c0c0', 3),
  ('Gold', 'Refer 10 friends', 10, 'free_month', '{"months": 1, "tier": "pro"}', 'emoji_events', '#ffd700', 4),
  ('Platinum', 'Refer 25 friends', 25, 'tier_upgrade', '{"from": "any", "to": "pro", "duration_days": 365}', 'diamond', '#e5e4e2', 5),
  ('Ambassador', 'Refer 50 friends', 50, 'custom', '{"reward": "Lifetime Pro + Revenue Share", "contact_required": true}', 'verified', '#00d4aa', 6)
) AS tier(name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, sort_order)
WHERE s.slug = 'launch-2024'
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANTS
-- =====================================================
GRANT ALL ON referral_seasons TO synthstack;
GRANT ALL ON referral_tiers TO synthstack;
GRANT ALL ON referral_codes TO synthstack;
GRANT ALL ON referrals TO synthstack;
GRANT ALL ON referral_rewards TO synthstack;
GRANT ALL ON discount_codes TO synthstack;
GRANT ALL ON discount_code_usage TO synthstack;
GRANT ALL ON referral_stats TO synthstack;
GRANT ALL ON referral_leaderboard_history TO synthstack;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE referral_seasons IS 'Referral campaign seasons with configurable time periods and rules';
COMMENT ON TABLE referral_tiers IS 'Reward tiers based on number of successful referrals';
COMMENT ON TABLE referral_codes IS 'Unique referral codes generated for each user';
COMMENT ON TABLE referrals IS 'Individual referral tracking from click to conversion';
COMMENT ON TABLE referral_rewards IS 'Rewards earned by users for reaching referral tiers';
COMMENT ON TABLE discount_codes IS 'Discount codes generated from referral rewards or created by admin';
COMMENT ON TABLE discount_code_usage IS 'Track each use of a discount code';
COMMENT ON TABLE referral_stats IS 'Denormalized referral statistics per user for fast queries';
COMMENT ON TABLE referral_leaderboard_history IS 'Historical leaderboard snapshots for seasons';

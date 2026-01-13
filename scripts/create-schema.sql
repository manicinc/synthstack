-- SynthStack Database Schema
-- Comprehensive schema with pricing, credits, community features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- USERS & AUTHENTICATION
-- =========================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  
  -- Subscription & Credits
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  subscription_provider VARCHAR(20), -- 'stripe', 'lemonsqueezy', etc.
  subscription_id VARCHAR(255),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Credit System
  credits_remaining INT DEFAULT 10,
  credits_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day'),
  lifetime_credits_used INT DEFAULT 0,
  
  -- Public Sharing Consent
  public_share_consent BOOLEAN DEFAULT FALSE,
  public_share_consent_at TIMESTAMP WITH TIME ZONE,
  
  -- Moderation
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  is_moderator BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- =========================================
-- SUBSCRIPTION PLANS
-- =========================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
  
  -- Pricing
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Credits
  credits_per_day INT DEFAULT 10,
  credits_per_month INT,
  
  -- Features
  max_model_size_mb INT DEFAULT 50,
  ai_model_tier VARCHAR(20) DEFAULT 'basic', -- 'basic', 'advanced', 'premium'
  can_use_premium_models BOOLEAN DEFAULT FALSE,
  can_keep_private BOOLEAN DEFAULT FALSE,
  can_download_unlimited BOOLEAN DEFAULT FALSE,
  can_use_api BOOLEAN DEFAULT FALSE,
  priority_processing BOOLEAN DEFAULT FALSE,
  custom_profiles BOOLEAN DEFAULT FALSE,
  
  -- Payment Integration
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  lemonsqueezy_variant_id_monthly VARCHAR(255),
  lemonsqueezy_variant_id_yearly VARCHAR(255),
  
  -- Display
  is_popular BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default plans
INSERT INTO subscription_plans (name, tier, price_monthly, price_yearly, credits_per_day, credits_per_month, max_model_size_mb, ai_model_tier, can_use_premium_models, can_keep_private, can_download_unlimited, sort_order) VALUES
('Free (Public)', 'free', 0, 0, 5, NULL, 25, 'basic', TRUE, FALSE, FALSE, 0),
('Free (Limited)', 'free', 0, 0, 3, NULL, 10, 'basic', FALSE, TRUE, FALSE, 1),
('Basic', 'basic', 7, 70, 50, NULL, 100, 'advanced', TRUE, TRUE, TRUE, 2),
('Pro', 'pro', 19, 190, 200, NULL, 500, 'premium', TRUE, TRUE, TRUE, 3),
('Enterprise', 'enterprise', 49, 490, NULL, NULL, 1000, 'premium', TRUE, TRUE, TRUE, 4)
ON CONFLICT DO NOTHING;

-- =========================================
-- CREDIT TRANSACTIONS
-- =========================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  amount INT NOT NULL, -- Positive = added, Negative = used
  balance_after INT NOT NULL,
  
  transaction_type VARCHAR(50) NOT NULL, -- 'generation', 'daily_reset', 'subscription', 'bonus', 'refund'
  description TEXT,
  
  -- Related entities
  generation_id UUID,
  subscription_id VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at);

-- =========================================
-- PRINTERS DATABASE
-- =========================================

CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manufacturer VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  
  -- Specs
  technology VARCHAR(50) DEFAULT 'FDM',
  build_volume_x DECIMAL(10,2) NOT NULL,
  build_volume_y DECIMAL(10,2) NOT NULL,
  build_volume_z DECIMAL(10,2) NOT NULL,
  max_nozzle_temp INT NOT NULL DEFAULT 260,
  max_bed_temp INT NOT NULL DEFAULT 110,
  heated_bed BOOLEAN DEFAULT TRUE,
  enclosure BOOLEAN DEFAULT FALSE,
  extruder_type VARCHAR(50) DEFAULT 'direct_drive',
  nozzle_diameter DECIMAL(5,2) DEFAULT 0.4,
  
  -- Features
  firmware VARCHAR(100),
  features TEXT[],
  slicer_support TEXT[],
  image_url VARCHAR(500),
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  community_submitted BOOLEAN DEFAULT FALSE,
  submitted_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(manufacturer, model)
);

-- =========================================
-- FILAMENTS DATABASE
-- =========================================

CREATE TABLE IF NOT EXISTS filaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  material VARCHAR(50) NOT NULL,
  
  -- Colors
  color_name VARCHAR(100),
  color_hex VARCHAR(7),
  
  -- Temperature Settings
  nozzle_temp_min INT,
  nozzle_temp_max INT,
  nozzle_temp_optimal INT,
  bed_temp_min INT,
  bed_temp_max INT,
  bed_temp_optimal INT,
  
  -- Print Settings
  print_speed_min INT,
  print_speed_max INT,
  print_speed_optimal INT,
  cooling_fan_min INT DEFAULT 0,
  cooling_fan_max INT DEFAULT 100,
  retraction_distance DECIMAL(5,2),
  retraction_speed INT,
  
  -- Properties
  diameter DECIMAL(5,2) DEFAULT 1.75,
  density DECIMAL(5,3),
  price_per_kg DECIMAL(10,2),
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  community_submitted BOOLEAN DEFAULT FALSE,
  submitted_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(brand, name, material, color_name)
);

-- =========================================
-- UPLOADED MODELS (STL Analysis)
-- =========================================

CREATE TABLE IF NOT EXISTS uploaded_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- File Info
  original_filename VARCHAR(500) NOT NULL,
  file_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  file_size_bytes BIGINT NOT NULL,
  file_type VARCHAR(10) NOT NULL, -- 'stl', 'obj', '3mf'
  storage_path VARCHAR(500),
  
  -- Analysis Results
  dimensions_x DECIMAL(10,2),
  dimensions_y DECIMAL(10,2),
  dimensions_z DECIMAL(10,2),
  volume_cm3 DECIMAL(15,4),
  triangle_count INT,
  is_watertight BOOLEAN,
  has_overhangs BOOLEAN,
  complexity_score INT, -- 1-10
  estimated_print_time_minutes INT,
  
  -- Privacy
  is_public BOOLEAN DEFAULT FALSE,
  public_consent_acknowledged BOOLEAN DEFAULT FALSE,
  
  -- Thumbnail
  thumbnail_url VARCHAR(500),
  
  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  is_approved BOOLEAN DEFAULT TRUE,
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_models_user ON uploaded_models(user_id);
CREATE INDEX idx_models_public ON uploaded_models(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_models_hash ON uploaded_models(file_hash);

-- =========================================
-- GENERATED PROFILES
-- =========================================

CREATE TABLE IF NOT EXISTS generated_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Source
  model_id UUID REFERENCES uploaded_models(id) ON DELETE SET NULL,
  printer_id UUID REFERENCES printers(id),
  filament_id UUID REFERENCES filaments(id),
  
  -- Configuration
  quality_preset VARCHAR(20), -- 'draft', 'standard', 'quality', 'ultra', 'custom'
  target_slicer VARCHAR(50) NOT NULL,
  ai_model_used VARCHAR(50), -- 'basic', 'advanced', 'premium'
  
  -- Priorities
  priority_speed INT DEFAULT 50,
  priority_quality INT DEFAULT 50,
  priority_strength INT DEFAULT 50,
  
  -- Generated Settings
  layer_height DECIMAL(5,3),
  nozzle_temp INT,
  bed_temp INT,
  print_speed INT,
  infill_percentage INT,
  wall_count INT,
  retraction_distance DECIMAL(5,2),
  retraction_speed INT,
  fan_speed INT,
  support_type VARCHAR(20),
  adhesion_type VARCHAR(20),
  
  -- Full Profile Data
  profile_data JSONB,
  profile_code TEXT, -- The actual .ini/.json file content
  
  -- Credits
  credits_used INT DEFAULT 1,
  
  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,
  title VARCHAR(255),
  description TEXT,
  
  -- Stats
  download_count INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_user ON generated_profiles(user_id);
CREATE INDEX idx_profiles_public ON generated_profiles(is_public) WHERE is_public = TRUE;

-- =========================================
-- COMMUNITY: VOTES (Thumbs Up Only)
-- =========================================

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Target (only one should be set)
  profile_id UUID REFERENCES generated_profiles(id) ON DELETE CASCADE,
  model_id UUID REFERENCES uploaded_models(id) ON DELETE CASCADE,
  comment_id UUID, -- Will reference comments table
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one vote per user per item
  UNIQUE(user_id, profile_id),
  UNIQUE(user_id, model_id),
  UNIQUE(user_id, comment_id)
);

CREATE INDEX idx_votes_profile ON votes(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_votes_model ON votes(model_id) WHERE model_id IS NOT NULL;

-- =========================================
-- COMMUNITY: COMMENTS
-- =========================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Target (only one should be set)
  profile_id UUID REFERENCES generated_profiles(id) ON DELETE CASCADE,
  model_id UUID REFERENCES uploaded_models(id) ON DELETE CASCADE,
  
  -- Parent for replies
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  flagged_by UUID REFERENCES users(id),
  is_hidden BOOLEAN DEFAULT FALSE,
  hidden_by UUID REFERENCES users(id),
  hidden_at TIMESTAMP WITH TIME ZONE,
  
  -- Edit tracking
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  
  -- Vote count (denormalized for performance)
  vote_count INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_profile ON comments(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_comments_model ON comments(model_id) WHERE model_id IS NOT NULL;
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- Add foreign key for votes.comment_id
ALTER TABLE votes ADD CONSTRAINT fk_votes_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;

-- =========================================
-- MODERATION: FLAGS & REPORTS
-- =========================================

CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Target
  profile_id UUID REFERENCES generated_profiles(id) ON DELETE CASCADE,
  model_id UUID REFERENCES uploaded_models(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Report Details
  reason VARCHAR(100) NOT NULL, -- 'spam', 'inappropriate', 'copyright', 'harassment', 'other'
  description TEXT,
  
  -- Resolution
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  action_taken VARCHAR(50), -- 'none', 'warning', 'content_removed', 'user_banned'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_status ON moderation_reports(status) WHERE status = 'pending';

-- =========================================
-- MODERATION: AUDIT LOG
-- =========================================

CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id UUID NOT NULL REFERENCES users(id),
  
  action VARCHAR(100) NOT NULL, -- 'approve_model', 'hide_comment', 'ban_user', etc.
  target_type VARCHAR(50) NOT NULL, -- 'model', 'profile', 'comment', 'user'
  target_id UUID NOT NULL,
  
  reason TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mod_log_moderator ON moderation_log(moderator_id);
CREATE INDEX idx_mod_log_target ON moderation_log(target_type, target_id);

-- =========================================
-- PAYMENT WEBHOOKS LOG
-- =========================================

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL, -- 'stripe', 'lemonsqueezy'
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  
  payload JSONB NOT NULL,
  
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(provider, event_id)
);

-- =========================================
-- FUNCTIONS & TRIGGERS
-- =========================================

-- Function to update vote count on comments
CREATE OR REPLACE FUNCTION update_comment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.comment_id IS NOT NULL THEN
    UPDATE comments SET vote_count = vote_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.comment_id IS NOT NULL THEN
    UPDATE comments SET vote_count = vote_count - 1 WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comment_vote_count
AFTER INSERT OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_comment_vote_count();

-- Function to update download count
CREATE OR REPLACE FUNCTION increment_download_count(profile_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE generated_profiles SET download_count = download_count + 1 WHERE id = profile_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to check and reset daily credits
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET 
    credits_remaining = COALESCE(
      (SELECT credits_per_day FROM subscription_plans WHERE tier = users.subscription_tier LIMIT 1),
      10
    ),
    credits_reset_at = NOW() + INTERVAL '1 day'
  WHERE credits_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- COMMUNITY MODEL METADATA
-- =========================================

CREATE TABLE IF NOT EXISTS community_model_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES uploaded_models(id) ON DELETE CASCADE,
  
  -- Basic Info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  tags TEXT[],
  version VARCHAR(20) DEFAULT '1.0.0',
  
  -- License & Copyright
  license VARCHAR(50) NOT NULL DEFAULT 'cc-by-sa',
  copyright_holder VARCHAR(255),
  copyright_year INT,
  is_original BOOLEAN DEFAULT TRUE,
  original_creator VARCHAR(255),
  original_source VARCHAR(500),
  
  -- Print Settings
  recommended_material VARCHAR(50),
  supported_materials TEXT[],
  layer_height_min DECIMAL(5,3),
  layer_height_max DECIMAL(5,3),
  infill_min INT,
  infill_max INT,
  supports_required VARCHAR(20) DEFAULT 'none',
  bed_adhesion VARCHAR(20) DEFAULT 'skirt',
  print_notes TEXT,
  
  -- Metadata
  tested_printers UUID[],
  featured BOOLEAN DEFAULT FALSE,
  featured_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(model_id)
);

CREATE INDEX idx_cmm_category ON community_model_metadata(category);
CREATE INDEX idx_cmm_material ON community_model_metadata(recommended_material);
CREATE INDEX idx_cmm_license ON community_model_metadata(license);

-- =========================================
-- CREATOR PROFILES
-- =========================================

CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Profile
  bio TEXT,
  website VARCHAR(500),
  github VARCHAR(100),
  twitter VARCHAR(100),
  youtube VARCHAR(100),
  
  -- Open Source Art Program
  join_program BOOLEAN DEFAULT FALSE,
  join_program_at TIMESTAMP WITH TIME ZONE,
  allow_tips BOOLEAN DEFAULT FALSE,
  revenue_share BOOLEAN DEFAULT FALSE,
  payment_email VARCHAR(255),
  
  -- Stats (denormalized for performance)
  total_models INT DEFAULT 0,
  total_votes INT DEFAULT 0,
  total_downloads INT DEFAULT 0,
  follower_count INT DEFAULT 0,
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id)
);

-- =========================================
-- CREATOR FOLLOWERS
-- =========================================

CREATE TABLE IF NOT EXISTS creator_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(follower_id, creator_id)
);

CREATE INDEX idx_followers_creator ON creator_followers(creator_id);

-- =========================================
-- TIPS (Future feature)
-- =========================================

CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_id UUID REFERENCES uploaded_models(id) ON DELETE SET NULL,
  
  amount_cents INT NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  payment_provider VARCHAR(50),
  payment_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  
  message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- VIEWS
-- =========================================

-- Public profiles with vote counts
CREATE OR REPLACE VIEW public_profiles_with_stats AS
SELECT 
  gp.*,
  p.manufacturer AS printer_manufacturer,
  p.model AS printer_model,
  f.brand AS filament_brand,
  f.name AS filament_name,
  f.material AS filament_material,
  u.display_name AS author_name,
  u.avatar_url AS author_avatar,
  COALESCE(v.vote_count, 0) AS vote_count,
  COALESCE(c.comment_count, 0) AS comment_count
FROM generated_profiles gp
LEFT JOIN printers p ON gp.printer_id = p.id
LEFT JOIN filaments f ON gp.filament_id = f.id
LEFT JOIN users u ON gp.user_id = u.id
LEFT JOIN (
  SELECT profile_id, COUNT(*) AS vote_count 
  FROM votes WHERE profile_id IS NOT NULL 
  GROUP BY profile_id
) v ON gp.id = v.profile_id
LEFT JOIN (
  SELECT profile_id, COUNT(*) AS comment_count 
  FROM comments WHERE profile_id IS NOT NULL AND is_hidden = FALSE 
  GROUP BY profile_id
) c ON gp.id = c.profile_id
WHERE gp.is_public = TRUE;

-- Pending moderation items
CREATE OR REPLACE VIEW pending_moderation AS
SELECT 
  'report' AS item_type,
  mr.id,
  mr.reason,
  mr.description,
  mr.created_at,
  u.display_name AS reporter_name,
  CASE 
    WHEN mr.profile_id IS NOT NULL THEN 'profile'
    WHEN mr.model_id IS NOT NULL THEN 'model'
    WHEN mr.comment_id IS NOT NULL THEN 'comment'
    WHEN mr.user_id IS NOT NULL THEN 'user'
  END AS target_type,
  COALESCE(mr.profile_id, mr.model_id, mr.comment_id, mr.user_id) AS target_id
FROM moderation_reports mr
LEFT JOIN users u ON mr.reporter_id = u.id
WHERE mr.status = 'pending'
ORDER BY mr.created_at ASC;

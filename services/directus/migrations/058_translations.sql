-- SynthStack Translations System
-- Migration 058: i18n Translation Overrides from CMS
--
-- This migration creates tables for managing translations from Directus CMS:
-- - CMS-managed translation overrides (for non-developer editing)
-- - Locale configuration (enable/disable languages)
-- - User locale preferences

-- ============================================
-- Supported Locales Configuration
-- ============================================
CREATE TABLE IF NOT EXISTS supported_locales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Locale identification
  code VARCHAR(10) UNIQUE NOT NULL,  -- e.g., 'en-US', 'es', 'fr', 'de', 'zh-CN', 'ja'
  name VARCHAR(100) NOT NULL,  -- Native name: 'English', 'Español', 'Français'
  english_name VARCHAR(100) NOT NULL,  -- English name for admin display
  flag VARCHAR(10),  -- Flag emoji: '🇺🇸', '🇪🇸', etc.

  -- Configuration
  direction VARCHAR(3) DEFAULT 'ltr' CHECK (direction IN ('ltr', 'rtl')),
  date_format VARCHAR(50) DEFAULT 'MM/dd/yyyy',
  number_format VARCHAR(50) DEFAULT '1,234.56',
  quasar_lang VARCHAR(20),  -- Quasar lang pack: 'en-US', 'es', etc.

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Translation Overrides (CMS-managed)
-- ============================================
CREATE TABLE IF NOT EXISTS translation_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Translation key
  locale_code VARCHAR(10) NOT NULL REFERENCES supported_locales(code) ON DELETE CASCADE,
  translation_key VARCHAR(255) NOT NULL,  -- e.g., 'landing.hero.title', 'nav.home'

  -- Content
  value TEXT NOT NULL,  -- The translated string
  original_value TEXT,  -- Original value from JSON (for reference)

  -- Context
  context TEXT,  -- Helper text for translators
  max_length INTEGER,  -- Character limit hint
  category VARCHAR(50) DEFAULT 'general',  -- 'landing', 'auth', 'nav', 'dashboard', etc.

  -- Approval workflow
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(locale_code, translation_key)
);

-- ============================================
-- Translation Categories (for organization)
-- ============================================
CREATE TABLE IF NOT EXISTS translation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Category info
  key VARCHAR(50) UNIQUE NOT NULL,  -- 'landing', 'auth', 'nav', 'dashboard'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),  -- Material icon name

  -- Hierarchy
  parent_key VARCHAR(50) REFERENCES translation_categories(key),

  -- Organization
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- User Locale Preferences
-- ============================================
-- Note: This extends app_users rather than creating a new table
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(10) REFERENCES supported_locales(code);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_supported_locales_enabled ON supported_locales(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_supported_locales_default ON supported_locales(is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_translation_overrides_locale ON translation_overrides(locale_code);
CREATE INDEX IF NOT EXISTS idx_translation_overrides_key ON translation_overrides(translation_key);
CREATE INDEX IF NOT EXISTS idx_translation_overrides_category ON translation_overrides(category);
CREATE INDEX IF NOT EXISTS idx_translation_overrides_status ON translation_overrides(status);
CREATE INDEX IF NOT EXISTS idx_translation_overrides_lookup ON translation_overrides(locale_code, status)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_app_users_locale ON app_users(preferred_locale);

-- ============================================
-- Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_translations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supported_locales_updated_at
  BEFORE UPDATE ON supported_locales
  FOR EACH ROW EXECUTE FUNCTION update_translations_timestamp();

CREATE TRIGGER translation_overrides_updated_at
  BEFORE UPDATE ON translation_overrides
  FOR EACH ROW EXECUTE FUNCTION update_translations_timestamp();

-- Ensure only one default locale
CREATE OR REPLACE FUNCTION ensure_single_default_locale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE supported_locales SET is_default = false WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER single_default_locale
  AFTER INSERT OR UPDATE OF is_default ON supported_locales
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_locale();

-- ============================================
-- Seed Data: Supported Locales
-- ============================================
INSERT INTO supported_locales (code, name, english_name, flag, direction, date_format, quasar_lang, is_enabled, is_default, sort_order) VALUES
('en-US', 'English', 'English (US)', '🇺🇸', 'ltr', 'MM/dd/yyyy', 'en-US', true, true, 1),
('es', 'Español', 'Spanish', '🇪🇸', 'ltr', 'dd/MM/yyyy', 'es', true, false, 2),
('fr', 'Français', 'French', '🇫🇷', 'ltr', 'dd/MM/yyyy', 'fr', true, false, 3),
('de', 'Deutsch', 'German', '🇩🇪', 'ltr', 'dd.MM.yyyy', 'de', true, false, 4),
('zh-CN', '简体中文', 'Chinese (Simplified)', '🇨🇳', 'ltr', 'yyyy/MM/dd', 'zh-CN', true, false, 5),
('ja', '日本語', 'Japanese', '🇯🇵', 'ltr', 'yyyy/MM/dd', 'ja', true, false, 6)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  english_name = EXCLUDED.english_name,
  flag = EXCLUDED.flag,
  direction = EXCLUDED.direction,
  date_format = EXCLUDED.date_format,
  quasar_lang = EXCLUDED.quasar_lang,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================
-- Seed Data: Translation Categories
-- ============================================
INSERT INTO translation_categories (key, name, description, icon, sort_order) VALUES
('app', 'Application', 'Core application strings', 'apps', 1),
('nav', 'Navigation', 'Menu and navigation items', 'menu', 2),
('landing', 'Landing Page', 'Marketing and landing page content', 'web', 3),
('auth', 'Authentication', 'Login, signup, and password forms', 'lock', 4),
('dashboard', 'Dashboard', 'Dashboard and app pages', 'dashboard', 5),
('generate', 'Generation', 'Profile generation flow', 'auto_awesome', 6),
('pricing', 'Pricing', 'Pricing page content', 'payments', 7),
('common', 'Common', 'Shared UI elements and buttons', 'widgets', 8),
('errors', 'Errors', 'Error messages and notifications', 'error', 9),
('language', 'Language', 'Language selection UI', 'translate', 10)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- Add language_switching feature flag
-- ============================================
INSERT INTO feature_flags (key, name, description, category, is_premium, min_tier, is_enabled, sort_order)
VALUES (
  'language_switching',
  'Language Switching',
  'Enable language/locale selection in the UI',
  'general',
  false,
  'community',
  true,
  102
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

-- ============================================
-- Permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON supported_locales TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON translation_overrides TO synthstack;
GRANT SELECT, INSERT, UPDATE, DELETE ON translation_categories TO synthstack;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE supported_locales IS 'Available locales with configuration for the i18n system';
COMMENT ON TABLE translation_overrides IS 'CMS-managed translation overrides that take precedence over JSON files';
COMMENT ON TABLE translation_categories IS 'Categories for organizing translation keys in Directus admin';
COMMENT ON COLUMN translation_overrides.status IS 'Approval workflow: draft -> pending_review -> approved/rejected';
COMMENT ON COLUMN app_users.preferred_locale IS 'User''s preferred language for the application';

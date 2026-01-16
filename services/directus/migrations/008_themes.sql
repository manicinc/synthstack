-- SynthStack Theme Management System
-- Supports multiple themes with light/dark mode variants

-- ============================================
-- Themes Collection
-- ============================================
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    sort INTEGER,

    -- Theme Identity
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    preview_image UUID REFERENCES directus_files(id),

    -- Theme Metadata
    author VARCHAR(100),
    version VARCHAR(20) DEFAULT '1.0.0',
    is_default BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,

    -- Color Palette - Light Mode
    light_bg_base VARCHAR(20) DEFAULT '#FFFFFF',
    light_bg_subtle VARCHAR(20) DEFAULT '#F8FAFC',
    light_bg_muted VARCHAR(20) DEFAULT '#F1F5F9',
    light_bg_elevated VARCHAR(20) DEFAULT '#FFFFFF',
    light_text_primary VARCHAR(20) DEFAULT '#0F172A',
    light_text_secondary VARCHAR(20) DEFAULT '#475569',
    light_text_tertiary VARCHAR(20) DEFAULT '#94A3B8',
    light_border_default VARCHAR(20) DEFAULT '#E2E8F0',
    light_border_subtle VARCHAR(20) DEFAULT '#F1F5F9',

    -- Color Palette - Dark Mode
    dark_bg_base VARCHAR(20) DEFAULT '#09090B',
    dark_bg_subtle VARCHAR(20) DEFAULT '#18181B',
    dark_bg_muted VARCHAR(20) DEFAULT '#27272A',
    dark_bg_elevated VARCHAR(20) DEFAULT '#3F3F46',
    dark_text_primary VARCHAR(20) DEFAULT '#FAFAFA',
    dark_text_secondary VARCHAR(20) DEFAULT '#A1A1AA',
    dark_text_tertiary VARCHAR(20) DEFAULT '#71717A',
    dark_border_default VARCHAR(20) DEFAULT '#27272A',
    dark_border_subtle VARCHAR(20) DEFAULT '#18181B',

    -- Accent Colors (same for both modes)
    color_primary VARCHAR(20) DEFAULT '#6366F1',
    color_primary_hover VARCHAR(20) DEFAULT '#4F46E5',
    color_secondary VARCHAR(20) DEFAULT '#00D4AA',
    color_secondary_hover VARCHAR(20) DEFAULT '#00B894',
    color_accent VARCHAR(20) DEFAULT '#8B5CF6',
    color_accent_hover VARCHAR(20) DEFAULT '#7C3AED',

    -- Semantic Colors
    color_success VARCHAR(20) DEFAULT '#22C55E',
    color_warning VARCHAR(20) DEFAULT '#EAB308',
    color_error VARCHAR(20) DEFAULT '#EF4444',
    color_info VARCHAR(20) DEFAULT '#0EA5E9',

    -- Typography
    font_family_sans VARCHAR(200) DEFAULT '''Inter'', -apple-system, BlinkMacSystemFont, ''Segoe UI'', sans-serif',
    font_family_mono VARCHAR(200) DEFAULT '''JetBrains Mono'', ''Fira Code'', monospace',
    font_family_display VARCHAR(200),
    font_size_base VARCHAR(10) DEFAULT '16px',
    font_weight_normal INTEGER DEFAULT 400,
    font_weight_medium INTEGER DEFAULT 500,
    font_weight_semibold INTEGER DEFAULT 600,
    font_weight_bold INTEGER DEFAULT 700,
    line_height_tight DECIMAL(3,2) DEFAULT 1.25,
    line_height_normal DECIMAL(3,2) DEFAULT 1.5,
    line_height_relaxed DECIMAL(3,2) DEFAULT 1.75,

    -- Spacing & Layout
    spacing_unit VARCHAR(10) DEFAULT '4px',
    border_radius_sm VARCHAR(10) DEFAULT '4px',
    border_radius_md VARCHAR(10) DEFAULT '8px',
    border_radius_lg VARCHAR(10) DEFAULT '12px',
    border_radius_xl VARCHAR(10) DEFAULT '16px',
    border_radius_full VARCHAR(10) DEFAULT '9999px',

    -- Shadows - Light Mode
    light_shadow_sm VARCHAR(200) DEFAULT '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    light_shadow_md VARCHAR(200) DEFAULT '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    light_shadow_lg VARCHAR(200) DEFAULT '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    light_shadow_xl VARCHAR(200) DEFAULT '0 20px 25px -5px rgb(0 0 0 / 0.1)',

    -- Shadows - Dark Mode
    dark_shadow_sm VARCHAR(200) DEFAULT '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    dark_shadow_md VARCHAR(200) DEFAULT '0 4px 6px -1px rgb(0 0 0 / 0.4)',
    dark_shadow_lg VARCHAR(200) DEFAULT '0 10px 15px -3px rgb(0 0 0 / 0.5)',
    dark_shadow_xl VARCHAR(200) DEFAULT '0 20px 25px -5px rgb(0 0 0 / 0.6)',

    -- Effects
    blur_sm VARCHAR(20) DEFAULT '4px',
    blur_md VARCHAR(20) DEFAULT '8px',
    blur_lg VARCHAR(20) DEFAULT '16px',
    glass_opacity DECIMAL(3,2) DEFAULT 0.8,

    -- Animation
    transition_fast VARCHAR(20) DEFAULT '150ms',
    transition_normal VARCHAR(20) DEFAULT '250ms',
    transition_slow VARCHAR(20) DEFAULT '350ms',
    easing_default VARCHAR(100) DEFAULT 'cubic-bezier(0.4, 0, 0.2, 1)',
    easing_bounce VARCHAR(100) DEFAULT 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

    -- Component Specific
    button_padding_x VARCHAR(10) DEFAULT '16px',
    button_padding_y VARCHAR(10) DEFAULT '8px',
    input_padding_x VARCHAR(10) DEFAULT '12px',
    input_padding_y VARCHAR(10) DEFAULT '10px',
    card_padding VARCHAR(10) DEFAULT '24px',

    -- Custom CSS (for advanced users)
    custom_css_light TEXT,
    custom_css_dark TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES directus_users(id),
    updated_by UUID REFERENCES directus_users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_themes_slug ON themes(slug);
CREATE INDEX IF NOT EXISTS idx_themes_status ON themes(status);
CREATE INDEX IF NOT EXISTS idx_themes_is_default ON themes(is_default);

-- ============================================
-- User Theme Preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_theme_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES directus_users(id) ON DELETE CASCADE,
    theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,
    mode VARCHAR(10) DEFAULT 'system' CHECK (mode IN ('light', 'dark', 'system')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- Site Theme Settings (global defaults)
-- ============================================
CREATE TABLE IF NOT EXISTS site_theme_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_theme_id UUID REFERENCES themes(id),
    default_mode VARCHAR(10) DEFAULT 'system' CHECK (default_mode IN ('light', 'dark', 'system')),
    allow_user_themes BOOLEAN DEFAULT true,
    allow_mode_toggle BOOLEAN DEFAULT true,
    show_theme_selector BOOLEAN DEFAULT true,
    available_themes UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SynthStack theme
INSERT INTO themes (
    name, slug, description, is_default, status,
    -- Light mode
    light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
    light_text_primary, light_text_secondary, light_text_tertiary,
    light_border_default, light_border_subtle,
    -- Dark mode
    dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
    dark_text_primary, dark_text_secondary, dark_text_tertiary,
    dark_border_default, dark_border_subtle,
    -- Colors
    color_primary, color_primary_hover, color_secondary, color_secondary_hover,
    color_accent, color_accent_hover,
    -- Typography
    font_family_display
) VALUES (
    'SynthStack', 'synthstack', 'The default SynthStack theme with indigo primary and teal accents', true, 'published',
    -- Light mode
    '#FFFFFF', '#F8FAFC', '#F1F5F9', '#FFFFFF',
    '#0F172A', '#475569', '#94A3B8',
    '#E2E8F0', '#F1F5F9',
    -- Dark mode
    '#09090B', '#0F0F12', '#18181B', '#27272A',
    '#FAFAFA', '#A1A1AA', '#71717A',
    '#27272A', '#18181B',
    -- Colors
    '#6366F1', '#4F46E5', '#00D4AA', '#00B894',
    '#8B5CF6', '#7C3AED',
    -- Typography
    '''Cal Sans'', ''Inter'', sans-serif'
) ON CONFLICT (slug) DO NOTHING;

-- Register collections in Directus
INSERT INTO directus_collections (collection, icon, note, color, sort, accountability, hidden)
VALUES
    ('themes', 'palette', 'Application themes with light/dark variants', '#6366F1', 10, 'all', false),
    ('user_theme_preferences', 'person', 'User theme preferences', '#8B5CF6', 11, 'all', true),
    ('site_theme_settings', 'settings', 'Global theme settings', '#00D4AA', 12, 'all', false)
ON CONFLICT (collection) DO NOTHING;

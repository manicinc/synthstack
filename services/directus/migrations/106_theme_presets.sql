-- ============================================
-- Theme Presets Migration
-- Seeds the themes table with all code-defined presets
-- ============================================

-- First, ensure the themes table exists (from migration 008)
-- This migration just seeds additional theme presets

-- Clear existing presets (keep custom user themes)
DELETE FROM themes WHERE slug IN (
  'synthstack', 'minimal', 'brutalist', 'oceanic', 'cyberpunk',
  'terminal', 'warm-sepia', 'forest', 'sunset', 'neumorphic'
);

-- ============================================
-- SynthStack (Default)
-- Modern tech aesthetic with indigo and teal
-- ============================================
INSERT INTO themes (
  name, slug, description, status, is_default, is_premium, version,
  -- Light Mode
  light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
  light_text_primary, light_text_secondary, light_text_tertiary,
  light_border_default, light_border_subtle,
  light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
  -- Dark Mode
  dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
  dark_text_primary, dark_text_secondary, dark_text_tertiary,
  dark_border_default, dark_border_subtle,
  dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
  -- Colors
  color_primary, color_primary_hover, color_secondary, color_secondary_hover,
  color_accent, color_accent_hover, color_success, color_warning, color_error, color_info,
  -- Typography
  font_family_sans, font_family_mono, font_family_display, font_size_base,
  font_weight_normal, font_weight_medium, font_weight_semibold, font_weight_bold,
  line_height_tight, line_height_normal, line_height_relaxed,
  -- Spacing & Style
  spacing_unit, border_radius_sm, border_radius_md, border_radius_lg, border_radius_xl, border_radius_full,
  -- Effects
  blur_sm, blur_md, blur_lg, glass_opacity,
  -- Animation
  transition_fast, transition_normal, transition_slow, easing_default, easing_bounce,
  -- Components
  button_padding_x, button_padding_y, input_padding_x, input_padding_y, card_padding
) VALUES (
  'SynthStack', 'synthstack', 'Modern tech aesthetic with indigo and teal accents', 'published', true, false, '1.0.0',
  -- Light Mode
  '#FFFFFF', '#F8FAFC', '#F1F5F9', '#FFFFFF',
  '#0F172A', '#475569', '#94A3B8',
  '#E2E8F0', '#F1F5F9',
  '0 1px 2px 0 rgb(0 0 0 / 0.05)', '0 4px 6px -1px rgb(0 0 0 / 0.1)', '0 10px 15px -3px rgb(0 0 0 / 0.1)', '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  -- Dark Mode
  '#09090B', '#0F0F12', '#18181B', '#27272A',
  '#FAFAFA', '#A1A1AA', '#71717A',
  '#27272A', '#18181B',
  '0 1px 2px 0 rgb(0 0 0 / 0.3)', '0 4px 6px -1px rgb(0 0 0 / 0.4)', '0 10px 15px -3px rgb(0 0 0 / 0.5)', '0 20px 25px -5px rgb(0 0 0 / 0.6)',
  -- Colors
  '#6366F1', '#4F46E5', '#00D4AA', '#00B894',
  '#8B5CF6', '#7C3AED', '#22C55E', '#EAB308', '#EF4444', '#0EA5E9',
  -- Typography
  '''Inter'', -apple-system, BlinkMacSystemFont, ''Segoe UI'', sans-serif',
  '''JetBrains Mono'', ''Fira Code'', monospace',
  '''Cal Sans'', ''Inter'', sans-serif',
  '16px', 400, 500, 600, 700, 1.25, 1.5, 1.75,
  -- Spacing & Style
  '4px', '4px', '8px', '12px', '16px', '9999px',
  -- Effects
  '4px', '8px', '16px', 0.8,
  -- Animation
  '150ms', '250ms', '350ms', 'cubic-bezier(0.4, 0, 0.2, 1)', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  -- Components
  '16px', '8px', '12px', '10px', '24px'
);

-- ============================================
-- Minimal
-- Clean and airy with generous whitespace
-- ============================================
INSERT INTO themes (
  name, slug, description, status, is_default, is_premium, version,
  light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
  light_text_primary, light_text_secondary, light_text_tertiary,
  light_border_default, light_border_subtle,
  light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
  dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
  dark_text_primary, dark_text_secondary, dark_text_tertiary,
  dark_border_default, dark_border_subtle,
  dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
  color_primary, color_primary_hover, color_secondary, color_secondary_hover,
  color_accent, color_accent_hover, color_success, color_warning, color_error, color_info,
  font_family_sans, font_family_mono, font_family_display, font_size_base,
  font_weight_normal, font_weight_medium, font_weight_semibold, font_weight_bold,
  line_height_tight, line_height_normal, line_height_relaxed,
  spacing_unit, border_radius_sm, border_radius_md, border_radius_lg, border_radius_xl, border_radius_full,
  blur_sm, blur_md, blur_lg, glass_opacity,
  transition_fast, transition_normal, transition_slow, easing_default, easing_bounce,
  button_padding_x, button_padding_y, input_padding_x, input_padding_y, card_padding
) VALUES (
  'Minimal', 'minimal', 'Clean and airy with generous whitespace', 'published', false, false, '1.0.0',
  '#FFFFFF', '#FAFAFA', '#F5F5F5', '#FFFFFF',
  '#18181B', '#52525B', '#A1A1AA',
  '#E4E4E7', '#F4F4F5',
  '0 1px 2px rgb(0 0 0 / 0.03)', '0 2px 4px rgb(0 0 0 / 0.04)', '0 4px 8px rgb(0 0 0 / 0.05)', '0 8px 16px rgb(0 0 0 / 0.06)',
  '#0A0A0A', '#0F0F0F', '#171717', '#1F1F1F',
  '#FAFAFA', '#A3A3A3', '#737373',
  '#262626', '#1A1A1A',
  '0 1px 2px rgb(0 0 0 / 0.2)', '0 2px 4px rgb(0 0 0 / 0.25)', '0 4px 8px rgb(0 0 0 / 0.3)', '0 8px 16px rgb(0 0 0 / 0.35)',
  '#71717A', '#52525B', '#A1A1AA', '#71717A',
  '#3F3F46', '#27272A', '#22C55E', '#F59E0B', '#EF4444', '#6366F1',
  '''Inter'', -apple-system, BlinkMacSystemFont, sans-serif',
  '''SF Mono'', ''Monaco'', monospace',
  '''Inter'', sans-serif',
  '15px', 400, 500, 600, 700, 1.25, 1.5, 1.75,
  '4px', '8px', '12px', '16px', '24px', '9999px',
  '8px', '16px', '24px', 0.9,
  '100ms', '200ms', '300ms', 'cubic-bezier(0.25, 0.1, 0.25, 1)', 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  '20px', '10px', '16px', '12px', '32px'
);

-- ============================================
-- Brutalist
-- Raw and bold with high contrast and hard edges
-- ============================================
INSERT INTO themes (
  name, slug, description, status, is_default, is_premium, version,
  light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
  light_text_primary, light_text_secondary, light_text_tertiary,
  light_border_default, light_border_subtle,
  light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
  dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
  dark_text_primary, dark_text_secondary, dark_text_tertiary,
  dark_border_default, dark_border_subtle,
  dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
  color_primary, color_primary_hover, color_secondary, color_secondary_hover,
  color_accent, color_accent_hover, color_success, color_warning, color_error, color_info,
  font_family_sans, font_family_mono, font_family_display, font_size_base,
  font_weight_normal, font_weight_medium, font_weight_semibold, font_weight_bold,
  line_height_tight, line_height_normal, line_height_relaxed,
  spacing_unit, border_radius_sm, border_radius_md, border_radius_lg, border_radius_xl, border_radius_full,
  blur_sm, blur_md, blur_lg, glass_opacity,
  transition_fast, transition_normal, transition_slow, easing_default, easing_bounce,
  button_padding_x, button_padding_y, input_padding_x, input_padding_y, card_padding
) VALUES (
  'Brutalist', 'brutalist', 'Raw and bold with high contrast and hard edges', 'published', false, false, '1.0.0',
  '#FFFFFF', '#F0F0F0', '#E0E0E0', '#FFFFFF',
  '#000000', '#333333', '#666666',
  '#000000', '#333333',
  '2px 2px 0 #000000', '4px 4px 0 #000000', '6px 6px 0 #000000', '8px 8px 0 #000000',
  '#000000', '#0A0A0A', '#141414', '#1A1A1A',
  '#FFFFFF', '#CCCCCC', '#999999',
  '#FFFFFF', '#666666',
  '2px 2px 0 #FFFFFF', '4px 4px 0 #FFFFFF', '6px 6px 0 #FFFFFF', '8px 8px 0 #FFFFFF',
  '#000000', '#333333', '#FF0000', '#CC0000',
  '#FFFF00', '#CCCC00', '#00FF00', '#FFFF00', '#FF0000', '#0000FF',
  '''Arial Black'', ''Helvetica Neue'', sans-serif',
  '''Courier New'', Courier, monospace',
  '''Impact'', ''Arial Black'', sans-serif',
  '16px', 400, 500, 600, 700, 1.25, 1.5, 1.75,
  '4px', '0px', '0px', '0px', '0px', '0px',
  '0px', '0px', '0px', 1,
  '0ms', '100ms', '150ms', 'linear', 'linear',
  '16px', '12px', '12px', '12px', '20px'
);

-- ============================================
-- Oceanic
-- Calm and serene with deep blues and teals
-- ============================================
INSERT INTO themes (
  name, slug, description, status, is_default, is_premium, version,
  light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
  light_text_primary, light_text_secondary, light_text_tertiary,
  light_border_default, light_border_subtle,
  light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
  dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
  dark_text_primary, dark_text_secondary, dark_text_tertiary,
  dark_border_default, dark_border_subtle,
  dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
  color_primary, color_primary_hover, color_secondary, color_secondary_hover,
  color_accent, color_accent_hover, color_success, color_warning, color_error, color_info,
  font_family_sans, font_family_mono, font_family_display, font_size_base,
  font_weight_normal, font_weight_medium, font_weight_semibold, font_weight_bold,
  line_height_tight, line_height_normal, line_height_relaxed,
  spacing_unit, border_radius_sm, border_radius_md, border_radius_lg, border_radius_xl, border_radius_full,
  blur_sm, blur_md, blur_lg, glass_opacity,
  transition_fast, transition_normal, transition_slow, easing_default, easing_bounce,
  button_padding_x, button_padding_y, input_padding_x, input_padding_y, card_padding
) VALUES (
  'Oceanic', 'oceanic', 'Calm and serene with deep blues and teals', 'published', false, false, '1.0.0',
  '#F0F9FF', '#E0F2FE', '#BAE6FD', '#FFFFFF',
  '#0C4A6E', '#0369A1', '#0284C7',
  '#7DD3FC', '#BAE6FD',
  '0 1px 3px rgb(0 119 182 / 0.1)', '0 4px 6px rgb(0 119 182 / 0.12)', '0 10px 15px rgb(0 119 182 / 0.15)', '0 20px 25px rgb(0 119 182 / 0.18)',
  '#03045E', '#023E8A', '#0077B6', '#0096C7',
  '#CAF0F8', '#90E0EF', '#48CAE4',
  '#0096C7', '#0077B6',
  '0 1px 3px rgb(0 0 0 / 0.3)', '0 4px 6px rgb(0 0 0 / 0.35)', '0 10px 15px rgb(0 0 0 / 0.4)', '0 20px 25px rgb(0 0 0 / 0.45)',
  '#0077B6', '#0096C7', '#00B4D8', '#48CAE4',
  '#90E0EF', '#ADE8F4', '#06D6A0', '#FFD166', '#EF476F', '#118AB2',
  '''Nunito'', ''Segoe UI'', sans-serif',
  '''Source Code Pro'', monospace',
  '''Poppins'', ''Nunito'', sans-serif',
  '16px', 400, 500, 600, 700, 1.25, 1.5, 1.75,
  '4px', '6px', '10px', '14px', '20px', '9999px',
  '6px', '12px', '20px', 0.75,
  '150ms', '300ms', '450ms', 'cubic-bezier(0.4, 0, 0.2, 1)', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  '18px', '10px', '14px', '12px', '24px'
);

-- ============================================
-- Cyberpunk (Premium)
-- Futuristic neon aesthetic with glowing accents
-- ============================================
INSERT INTO themes (
  name, slug, description, status, is_default, is_premium, version,
  light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
  light_text_primary, light_text_secondary, light_text_tertiary,
  light_border_default, light_border_subtle,
  light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
  dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
  dark_text_primary, dark_text_secondary, dark_text_tertiary,
  dark_border_default, dark_border_subtle,
  dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
  color_primary, color_primary_hover, color_secondary, color_secondary_hover,
  color_accent, color_accent_hover, color_success, color_warning, color_error, color_info,
  font_family_sans, font_family_mono, font_family_display, font_size_base,
  font_weight_normal, font_weight_medium, font_weight_semibold, font_weight_bold,
  line_height_tight, line_height_normal, line_height_relaxed,
  spacing_unit, border_radius_sm, border_radius_md, border_radius_lg, border_radius_xl, border_radius_full,
  blur_sm, blur_md, blur_lg, glass_opacity,
  transition_fast, transition_normal, transition_slow, easing_default, easing_bounce,
  button_padding_x, button_padding_y, input_padding_x, input_padding_y, card_padding,
  custom_css_light, custom_css_dark
) VALUES (
  'Cyberpunk', 'cyberpunk', 'Futuristic neon aesthetic with glowing accents', 'published', false, true, '1.0.0',
  '#1A1A2E', '#16213E', '#0F3460', '#1A1A2E',
  '#EAEAEA', '#B8B8B8', '#888888',
  'rgba(255, 0, 255, 0.4)', 'rgba(255, 0, 255, 0.2)',
  '0 0 10px rgb(255 0 255 / 0.3)', '0 0 20px rgb(255 0 255 / 0.4)', '0 0 30px rgb(255 0 255 / 0.5)', '0 0 50px rgb(255 0 255 / 0.6)',
  '#0D0D0D', '#1A1A2E', '#16213E', '#0F3460',
  '#FFFFFF', '#E0E0E0', '#A0A0A0',
  'rgba(255, 0, 255, 0.6)', 'rgba(255, 0, 255, 0.3)',
  '0 0 10px rgb(255 0 255 / 0.4)', '0 0 20px rgb(255 0 255 / 0.5)', '0 0 40px rgb(255 0 255 / 0.6)', '0 0 60px rgb(255 0 255 / 0.7)',
  '#FF00FF', '#FF44FF', '#00FFFF', '#44FFFF',
  '#FFFF00', '#FFFF44', '#00FF88', '#FFAA00', '#FF0044', '#00AAFF',
  '''Rajdhani'', ''Orbitron'', sans-serif',
  '''Share Tech Mono'', ''Fira Code'', monospace',
  '''Orbitron'', ''Rajdhani'', sans-serif',
  '15px', 400, 500, 600, 700, 1.25, 1.5, 1.75,
  '4px', '2px', '4px', '6px', '8px', '9999px',
  '4px', '8px', '12px', 0.6,
  '100ms', '200ms', '300ms', 'cubic-bezier(0.25, 0.8, 0.25, 1)', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  '20px', '10px', '14px', '10px', '20px',
  '.btn-primary { text-shadow: 0 0 10px currentColor; }
.card { border: 1px solid rgba(255, 0, 255, 0.3); }',
  '.btn-primary { text-shadow: 0 0 15px currentColor; box-shadow: 0 0 20px rgba(255, 0, 255, 0.4); }
.card { border: 1px solid rgba(255, 0, 255, 0.4); box-shadow: 0 0 30px rgba(255, 0, 255, 0.2); }'
);

-- ============================================
-- Terminal
-- Retro hacker aesthetic with phosphor green
-- ============================================
INSERT INTO themes (
  name, slug, description, status, is_default, is_premium, version,
  light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
  light_text_primary, light_text_secondary, light_text_tertiary,
  light_border_default, light_border_subtle,
  light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
  dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
  dark_text_primary, dark_text_secondary, dark_text_tertiary,
  dark_border_default, dark_border_subtle,
  dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
  color_primary, color_primary_hover, color_secondary, color_secondary_hover,
  color_accent, color_accent_hover, color_success, color_warning, color_error, color_info,
  font_family_sans, font_family_mono, font_family_display, font_size_base,
  font_weight_normal, font_weight_medium, font_weight_semibold, font_weight_bold,
  line_height_tight, line_height_normal, line_height_relaxed,
  spacing_unit, border_radius_sm, border_radius_md, border_radius_lg, border_radius_xl, border_radius_full,
  blur_sm, blur_md, blur_lg, glass_opacity,
  transition_fast, transition_normal, transition_slow, easing_default, easing_bounce,
  button_padding_x, button_padding_y, input_padding_x, input_padding_y, card_padding,
  custom_css_light, custom_css_dark
) VALUES (
  'Terminal', 'terminal', 'Retro hacker aesthetic with phosphor green', 'published', false, false, '1.0.0',
  '#0A0A0A', '#0F0F0F', '#1A1A1A', '#222222',
  '#00FF00', '#00CC00', '#009900',
  'rgba(0, 255, 0, 0.4)', 'rgba(0, 255, 0, 0.2)',
  '0 0 5px rgb(0 255 0 / 0.2)', '0 0 10px rgb(0 255 0 / 0.3)', '0 0 20px rgb(0 255 0 / 0.4)', '0 0 30px rgb(0 255 0 / 0.5)',
  '#000000', '#050505', '#0A0A0A', '#111111',
  '#00FF00', '#00DD00', '#00AA00',
  'rgba(0, 255, 0, 0.5)', 'rgba(0, 255, 0, 0.3)',
  '0 0 5px rgb(0 255 0 / 0.3)', '0 0 15px rgb(0 255 0 / 0.4)', '0 0 25px rgb(0 255 0 / 0.5)', '0 0 40px rgb(0 255 0 / 0.6)',
  '#00FF00', '#33FF33', '#00CC00', '#00EE00',
  '#FFAA00', '#FFCC00', '#00FF00', '#FFAA00', '#FF3333', '#00AAFF',
  '''IBM Plex Mono'', ''Courier New'', monospace',
  '''IBM Plex Mono'', ''Courier New'', monospace',
  '''IBM Plex Mono'', monospace',
  '14px', 400, 500, 600, 700, 1.25, 1.5, 1.75,
  '4px', '0px', '0px', '0px', '0px', '0px',
  '0px', '0px', '0px', 0.9,
  '50ms', '100ms', '150ms', 'linear', 'linear',
  '12px', '8px', '8px', '8px', '16px',
  '* { text-shadow: 0 0 2px currentColor; }
body { background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px); }',
  '* { text-shadow: 0 0 3px currentColor; }
body { background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.05) 2px, rgba(0, 255, 0, 0.05) 4px); }'
);

-- ============================================
-- Warm Sepia
-- Paper-like warmth with cozy earth tones
-- ============================================
INSERT INTO themes (
  name, slug, description, status, is_default, is_premium, version,
  light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
  light_text_primary, light_text_secondary, light_text_tertiary,
  light_border_default, light_border_subtle,
  light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
  dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
  dark_text_primary, dark_text_secondary, dark_text_tertiary,
  dark_border_default, dark_border_subtle,
  dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
  color_primary, color_primary_hover, color_secondary, color_secondary_hover,
  color_accent, color_accent_hover, color_success, color_warning, color_error, color_info,
  font_family_sans, font_family_mono, font_family_display, font_size_base,
  font_weight_normal, font_weight_medium, font_weight_semibold, font_weight_bold,
  line_height_tight, line_height_normal, line_height_relaxed,
  spacing_unit, border_radius_sm, border_radius_md, border_radius_lg, border_radius_xl, border_radius_full,
  blur_sm, blur_md, blur_lg, glass_opacity,
  transition_fast, transition_normal, transition_slow, easing_default, easing_bounce,
  button_padding_x, button_padding_y, input_padding_x, input_padding_y, card_padding
) VALUES (
  'Warm Sepia', 'warm-sepia', 'Paper-like warmth with cozy earth tones', 'published', false, false, '1.0.0',
  '#FDF8F3', '#F5EDE4', '#EDE3D7', '#FFFFFF',
  '#3D2914', '#5C4033', '#8B7355',
  '#D4C4B0', '#E8DFD3',
  '0 1px 2px rgb(61 41 20 / 0.08)', '0 4px 6px rgb(61 41 20 / 0.1)', '0 10px 15px rgb(61 41 20 / 0.12)', '0 20px 25px rgb(61 41 20 / 0.15)',
  '#1C1410', '#2A1F18', '#3D2E24', '#4A3B30',
  '#F5EDE4', '#D4C4B0', '#A89078',
  '#5C4A3D', '#4A3B30',
  '0 1px 2px rgb(0 0 0 / 0.3)', '0 4px 6px rgb(0 0 0 / 0.35)', '0 10px 15px rgb(0 0 0 / 0.4)', '0 20px 25px rgb(0 0 0 / 0.45)',
  '#8B4513', '#A0522D', '#D2691E', '#E07830',
  '#CD853F', '#DEB887', '#6B8E23', '#DAA520', '#B22222', '#4682B4',
  '''Merriweather Sans'', ''Georgia'', serif',
  '''Courier Prime'', ''Courier New'', monospace',
  '''Playfair Display'', ''Georgia'', serif',
  '17px', 400, 500, 600, 700, 1.25, 1.5, 1.75,
  '4px', '4px', '6px', '8px', '12px', '9999px',
  '4px', '8px', '12px', 0.85,
  '150ms', '250ms', '400ms', 'cubic-bezier(0.4, 0, 0.2, 1)', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  '18px', '10px', '14px', '12px', '28px'
);

-- ============================================
-- Forest
-- Natural greens and earthy organic tones
-- ============================================
INSERT INTO themes (
  name, slug, description, status, is_default, is_premium, version,
  light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
  light_text_primary, light_text_secondary, light_text_tertiary,
  light_border_default, light_border_subtle,
  light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
  dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
  dark_text_primary, dark_text_secondary, dark_text_tertiary,
  dark_border_default, dark_border_subtle,
  dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
  color_primary, color_primary_hover, color_secondary, color_secondary_hover,
  color_accent, color_accent_hover, color_success, color_warning, color_error, color_info,
  font_family_sans, font_family_mono, font_family_display, font_size_base,
  font_weight_normal, font_weight_medium, font_weight_semibold, font_weight_bold,
  line_height_tight, line_height_normal, line_height_relaxed,
  spacing_unit, border_radius_sm, border_radius_md, border_radius_lg, border_radius_xl, border_radius_full,
  blur_sm, blur_md, blur_lg, glass_opacity,
  transition_fast, transition_normal, transition_slow, easing_default, easing_bounce,
  button_padding_x, button_padding_y, input_padding_x, input_padding_y, card_padding
) VALUES (
  'Forest', 'forest', 'Natural greens and earthy organic tones', 'published', false, false, '1.0.0',
  '#F5F9F5', '#E8F0E8', '#D4E5D4', '#FFFFFF',
  '#1A3A1A', '#2D5A2D', '#4A7A4A',
  '#A8C8A8', '#C8DCC8',
  '0 1px 2px rgb(26 58 26 / 0.08)', '0 4px 6px rgb(26 58 26 / 0.1)', '0 10px 15px rgb(26 58 26 / 0.12)', '0 20px 25px rgb(26 58 26 / 0.15)',
  '#0D1A0D', '#142814', '#1E3A1E', '#2A4A2A',
  '#E8F0E8', '#B8D4B8', '#88B088',
  '#3A5A3A', '#2A4A2A',
  '0 1px 2px rgb(0 0 0 / 0.3)', '0 4px 6px rgb(0 0 0 / 0.35)', '0 10px 15px rgb(0 0 0 / 0.4)', '0 20px 25px rgb(0 0 0 / 0.45)',
  '#228B22', '#2E9B2E', '#2E8B57', '#3CB371',
  '#6B8E23', '#7BA428', '#32CD32', '#DAA520', '#CD5C5C', '#4682B4',
  '''Source Sans Pro'', ''Trebuchet MS'', sans-serif',
  '''Source Code Pro'', monospace',
  '''Lora'', ''Georgia'', serif',
  '16px', 400, 500, 600, 700, 1.25, 1.5, 1.75,
  '4px', '6px', '10px', '16px', '24px', '9999px',
  '6px', '10px', '16px', 0.8,
  '150ms', '300ms', '450ms', 'cubic-bezier(0.4, 0, 0.2, 1)', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  '16px', '10px', '14px', '12px', '24px'
);

-- ============================================
-- Sunset (Premium)
-- Warm gradient accents with orange and purple
-- ============================================
INSERT INTO themes (
  name, slug, description, status, is_default, is_premium, version,
  light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
  light_text_primary, light_text_secondary, light_text_tertiary,
  light_border_default, light_border_subtle,
  light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
  dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
  dark_text_primary, dark_text_secondary, dark_text_tertiary,
  dark_border_default, dark_border_subtle,
  dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
  color_primary, color_primary_hover, color_secondary, color_secondary_hover,
  color_accent, color_accent_hover, color_success, color_warning, color_error, color_info,
  font_family_sans, font_family_mono, font_family_display, font_size_base,
  font_weight_normal, font_weight_medium, font_weight_semibold, font_weight_bold,
  line_height_tight, line_height_normal, line_height_relaxed,
  spacing_unit, border_radius_sm, border_radius_md, border_radius_lg, border_radius_xl, border_radius_full,
  blur_sm, blur_md, blur_lg, glass_opacity,
  transition_fast, transition_normal, transition_slow, easing_default, easing_bounce,
  button_padding_x, button_padding_y, input_padding_x, input_padding_y, card_padding,
  custom_css_light, custom_css_dark
) VALUES (
  'Sunset', 'sunset', 'Warm gradient accents with orange and purple', 'published', false, true, '1.0.0',
  '#FFFAF5', '#FFF5EB', '#FFEEDD', '#FFFFFF',
  '#2D1810', '#5C3D2E', '#8B6B5C',
  '#F5D5C0', '#FAE8DD',
  '0 1px 3px rgb(255 107 53 / 0.1)', '0 4px 6px rgb(255 107 53 / 0.12)', '0 10px 15px rgb(255 107 53 / 0.15)', '0 20px 25px rgb(255 107 53 / 0.18)',
  '#1A0F0A', '#2D1810', '#3D2820', '#4D3830',
  '#FFF5EB', '#F5D5C0', '#D4A88C',
  '#5C3D2E', '#4D3830',
  '0 1px 3px rgb(0 0 0 / 0.3)', '0 4px 6px rgb(0 0 0 / 0.35)', '0 10px 15px rgb(0 0 0 / 0.4)', '0 20px 25px rgb(0 0 0 / 0.45)',
  '#FF6B35', '#FF8555', '#9B59B6', '#B370CC',
  '#F39C12', '#F5B041', '#27AE60', '#F39C12', '#E74C3C', '#3498DB',
  '''Poppins'', ''Segoe UI'', sans-serif',
  '''Fira Code'', monospace',
  '''Montserrat'', ''Poppins'', sans-serif',
  '16px', 400, 500, 600, 700, 1.25, 1.5, 1.75,
  '4px', '6px', '10px', '14px', '20px', '9999px',
  '6px', '12px', '20px', 0.75,
  '150ms', '250ms', '400ms', 'cubic-bezier(0.4, 0, 0.2, 1)', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  '18px', '10px', '14px', '11px', '24px',
  '.btn-primary { background: linear-gradient(135deg, #FF6B35 0%, #9B59B6 100%); }',
  '.btn-primary { background: linear-gradient(135deg, #FF6B35 0%, #9B59B6 100%); }'
);

-- ============================================
-- Neumorphic (Premium)
-- Soft UI with embossed, tactile elements
-- ============================================
INSERT INTO themes (
  name, slug, description, status, is_default, is_premium, version,
  light_bg_base, light_bg_subtle, light_bg_muted, light_bg_elevated,
  light_text_primary, light_text_secondary, light_text_tertiary,
  light_border_default, light_border_subtle,
  light_shadow_sm, light_shadow_md, light_shadow_lg, light_shadow_xl,
  dark_bg_base, dark_bg_subtle, dark_bg_muted, dark_bg_elevated,
  dark_text_primary, dark_text_secondary, dark_text_tertiary,
  dark_border_default, dark_border_subtle,
  dark_shadow_sm, dark_shadow_md, dark_shadow_lg, dark_shadow_xl,
  color_primary, color_primary_hover, color_secondary, color_secondary_hover,
  color_accent, color_accent_hover, color_success, color_warning, color_error, color_info,
  font_family_sans, font_family_mono, font_family_display, font_size_base,
  font_weight_normal, font_weight_medium, font_weight_semibold, font_weight_bold,
  line_height_tight, line_height_normal, line_height_relaxed,
  spacing_unit, border_radius_sm, border_radius_md, border_radius_lg, border_radius_xl, border_radius_full,
  blur_sm, blur_md, blur_lg, glass_opacity,
  transition_fast, transition_normal, transition_slow, easing_default, easing_bounce,
  button_padding_x, button_padding_y, input_padding_x, input_padding_y, card_padding,
  custom_css_light, custom_css_dark
) VALUES (
  'Neumorphic', 'neumorphic', 'Soft UI with embossed, tactile elements', 'published', false, true, '1.0.0',
  '#E8EDF2', '#E0E5EC', '#D1D9E6', '#E8EDF2',
  '#31344B', '#5A5D7A', '#8A8DAA',
  'transparent', 'transparent',
  '3px 3px 6px #C5CBD3, -3px -3px 6px #FFFFFF', '5px 5px 10px #C5CBD3, -5px -5px 10px #FFFFFF', '8px 8px 16px #C5CBD3, -8px -8px 16px #FFFFFF', '12px 12px 24px #C5CBD3, -12px -12px 24px #FFFFFF',
  '#2D2D3A', '#262633', '#1F1F2B', '#2D2D3A',
  '#E8EDF2', '#B8BDD0', '#8A8DAA',
  'transparent', 'transparent',
  '3px 3px 6px #1A1A24, -3px -3px 6px #404050', '5px 5px 10px #1A1A24, -5px -5px 10px #404050', '8px 8px 16px #1A1A24, -8px -8px 16px #404050', '12px 12px 24px #1A1A24, -12px -12px 24px #404050',
  '#6C63FF', '#7B73FF', '#00C9A7', '#00E0BB',
  '#FF6B9D', '#FF85AD', '#00C9A7', '#FFB347', '#FF6B6B', '#4ECDC4',
  '''DM Sans'', ''Inter'', sans-serif',
  '''JetBrains Mono'', monospace',
  '''DM Sans'', sans-serif',
  '16px', 400, 500, 600, 700, 1.25, 1.5, 1.75,
  '4px', '10px', '16px', '24px', '32px', '9999px',
  '8px', '16px', '24px', 0.9,
  '150ms', '250ms', '400ms', 'cubic-bezier(0.4, 0, 0.2, 1)', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  '20px', '12px', '16px', '14px', '28px',
  '.card { box-shadow: 8px 8px 16px #C5CBD3, -8px -8px 16px #FFFFFF; border: none; }
.btn { box-shadow: 4px 4px 8px #C5CBD3, -4px -4px 8px #FFFFFF; }
.btn:active { box-shadow: inset 4px 4px 8px #C5CBD3, inset -4px -4px 8px #FFFFFF; }
.input { box-shadow: inset 3px 3px 6px #C5CBD3, inset -3px -3px 6px #FFFFFF; border: none; }',
  '.card { box-shadow: 8px 8px 16px #1A1A24, -8px -8px 16px #404050; border: none; }
.btn { box-shadow: 4px 4px 8px #1A1A24, -4px -4px 8px #404050; }
.btn:active { box-shadow: inset 4px 4px 8px #1A1A24, inset -4px -4px 8px #404050; }
.input { box-shadow: inset 3px 3px 6px #1A1A24, inset -3px -3px 6px #404050; border: none; }'
);

-- Add metadata columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'themes' AND column_name = 'category'
  ) THEN
    ALTER TABLE themes ADD COLUMN category VARCHAR(50) DEFAULT 'modern';
  END IF;
END $$;

-- Update categories for all themes
UPDATE themes SET category = 'modern' WHERE slug IN ('synthstack', 'minimal', 'neumorphic');
UPDATE themes SET category = 'bold' WHERE slug IN ('brutalist', 'cyberpunk');
UPDATE themes SET category = 'nature' WHERE slug IN ('oceanic', 'forest');
UPDATE themes SET category = 'retro' WHERE slug = 'terminal';
UPDATE themes SET category = 'classic' WHERE slug = 'warm-sepia';
UPDATE themes SET category = 'warm' WHERE slug = 'sunset';

-- Ensure sort order
UPDATE themes SET sort = 1 WHERE slug = 'synthstack';
UPDATE themes SET sort = 2 WHERE slug = 'minimal';
UPDATE themes SET sort = 3 WHERE slug = 'brutalist';
UPDATE themes SET sort = 4 WHERE slug = 'oceanic';
UPDATE themes SET sort = 5 WHERE slug = 'cyberpunk';
UPDATE themes SET sort = 6 WHERE slug = 'terminal';
UPDATE themes SET sort = 7 WHERE slug = 'warm-sepia';
UPDATE themes SET sort = 8 WHERE slug = 'forest';
UPDATE themes SET sort = 9 WHERE slug = 'sunset';
UPDATE themes SET sort = 10 WHERE slug = 'neumorphic';



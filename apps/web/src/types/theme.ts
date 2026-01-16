/**
 * Theme System Types
 *
 * Comprehensive type definitions for the SynthStack theme management system.
 * Supports multiple themes with light/dark mode variants.
 */

/** Color mode options */
export type ColorMode = 'light' | 'dark' | 'system'

/** Theme status in Directus */
export type ThemeStatus = 'draft' | 'published' | 'archived'

/** Theme category for filtering */
export type ThemeCategory = 'all' | 'modern' | 'bold' | 'nature' | 'retro' | 'classic' | 'warm'

// ============================================
// Theme Preset Types (Code-defined themes)
// ============================================

/**
 * Mode-specific colors (light or dark)
 */
export interface ThemeModeColors {
  bg: {
    base: string
    subtle: string
    muted: string
    elevated: string
  }
  text: {
    primary: string
    secondary: string
    tertiary: string
  }
  border: {
    default: string
    subtle: string
  }
  shadow: {
    sm: string
    md: string
    lg: string
    xl: string
  }
}

/**
 * Accent/semantic colors (shared between modes)
 */
export interface ThemeAccentColors {
  primary: string
  primaryHover: string
  secondary: string
  secondaryHover: string
  accent: string
  accentHover: string
  success: string
  warning: string
  error: string
  info: string
}

/**
 * Typography settings
 */
export interface ThemeTypography {
  fontSans: string
  fontMono: string
  fontDisplay: string
  fontSizeBase: string
}

/**
 * Style characteristics (border radius, effects)
 */
export interface ThemeStyle {
  borderRadius: {
    sm: string
    md: string
    lg: string
    xl: string
    full: string
  }
  glassOpacity: number
  blur: {
    sm: string
    md: string
    lg: string
  }
}

/**
 * Transition/animation settings
 */
export interface ThemeTransitions {
  fast: string
  normal: string
  slow: string
  easing: string
  easingBounce: string
}

/**
 * Component-specific settings
 */
export interface ThemeComponents {
  buttonPaddingX: string
  buttonPaddingY: string
  inputPaddingX: string
  inputPaddingY: string
  cardPadding: string
}

/**
 * Preview colors for theme selector UI
 */
export interface ThemePreviewColors {
  primary: string
  secondary: string
  accent: string
}

/**
 * Custom CSS for special effects
 */
export interface ThemeCustomCSS {
  light?: string
  dark?: string
}

/**
 * Complete theme preset definition (code-defined)
 * This is the primary type for theme presets defined in themePresets.ts
 */
export interface ThemePreset {
  // Identity
  id: string
  slug: string
  name: string
  description: string
  category: ThemeCategory
  isDefault: boolean
  isPremium: boolean

  // Preview for selector UI
  previewColors: ThemePreviewColors

  // Mode-specific colors
  light: ThemeModeColors
  dark: ThemeModeColors

  // Shared colors
  colors: ThemeAccentColors

  // Typography
  typography: ThemeTypography

  // Style characteristics
  style: ThemeStyle

  // Transitions
  transitions: ThemeTransitions

  // Components
  components: ThemeComponents

  // Optional custom CSS
  customCSS?: ThemeCustomCSS
}

/**
 * Complete theme definition from Directus
 */
export interface Theme {
  id: string
  status: ThemeStatus
  sort?: number

  // Identity
  name: string
  slug: string
  description?: string
  preview_image?: string

  // Metadata
  author?: string
  version: string
  is_default: boolean
  is_premium: boolean

  // Light Mode Colors
  light_bg_base: string
  light_bg_subtle: string
  light_bg_muted: string
  light_bg_elevated: string
  light_text_primary: string
  light_text_secondary: string
  light_text_tertiary: string
  light_border_default: string
  light_border_subtle: string

  // Dark Mode Colors
  dark_bg_base: string
  dark_bg_subtle: string
  dark_bg_muted: string
  dark_bg_elevated: string
  dark_text_primary: string
  dark_text_secondary: string
  dark_text_tertiary: string
  dark_border_default: string
  dark_border_subtle: string

  // Accent Colors
  color_primary: string
  color_primary_hover: string
  color_secondary: string
  color_secondary_hover: string
  color_accent: string
  color_accent_hover: string

  // Semantic Colors
  color_success: string
  color_warning: string
  color_error: string
  color_info: string

  // Typography
  font_family_sans: string
  font_family_mono: string
  font_family_display?: string
  font_size_base: string
  font_weight_normal: number
  font_weight_medium: number
  font_weight_semibold: number
  font_weight_bold: number
  line_height_tight: number
  line_height_normal: number
  line_height_relaxed: number

  // Spacing & Layout
  spacing_unit: string
  border_radius_sm: string
  border_radius_md: string
  border_radius_lg: string
  border_radius_xl: string
  border_radius_full: string

  // Shadows - Light
  light_shadow_sm: string
  light_shadow_md: string
  light_shadow_lg: string
  light_shadow_xl: string

  // Shadows - Dark
  dark_shadow_sm: string
  dark_shadow_md: string
  dark_shadow_lg: string
  dark_shadow_xl: string

  // Effects
  blur_sm: string
  blur_md: string
  blur_lg: string
  glass_opacity: number

  // Animation
  transition_fast: string
  transition_normal: string
  transition_slow: string
  easing_default: string
  easing_bounce: string

  // Component Specific
  button_padding_x: string
  button_padding_y: string
  input_padding_x: string
  input_padding_y: string
  card_padding: string

  // Custom CSS
  custom_css_light?: string
  custom_css_dark?: string

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Simplified theme for UI selection
 */
export interface ThemePreview {
  id: string
  name: string
  slug: string
  description?: string
  preview_image?: string
  color_primary: string
  color_secondary: string
  is_premium: boolean
}

/**
 * User's theme preferences
 */
export interface UserThemePreferences {
  theme_id: string | null
  mode: ColorMode
}

/**
 * Site-wide theme settings
 */
export interface SiteThemeSettings {
  default_theme_id: string | null
  default_mode: ColorMode
  allow_user_themes: boolean
  allow_mode_toggle: boolean
  show_theme_selector: boolean
  available_themes: string[]
}

/**
 * CSS variables generated from a theme
 */
export interface ThemeCSSVariables {
  // Backgrounds
  '--bg-base': string
  '--bg-subtle': string
  '--bg-muted': string
  '--bg-elevated': string

  // Text
  '--text-primary': string
  '--text-secondary': string
  '--text-tertiary': string

  // Borders
  '--border-default': string
  '--border-subtle': string

  // Colors
  '--color-primary': string
  '--color-primary-hover': string
  '--color-secondary': string
  '--color-secondary-hover': string
  '--color-accent': string
  '--color-accent-hover': string
  '--color-success': string
  '--color-warning': string
  '--color-error': string
  '--color-info': string

  // Typography
  '--font-sans': string
  '--font-mono': string
  '--font-display': string
  '--font-size-base': string

  // Spacing
  '--spacing-unit': string
  '--radius-sm': string
  '--radius-md': string
  '--radius-lg': string
  '--radius-xl': string
  '--radius-full': string

  // Shadows
  '--shadow-sm': string
  '--shadow-md': string
  '--shadow-lg': string
  '--shadow-xl': string

  // Effects
  '--blur-sm': string
  '--blur-md': string
  '--blur-lg': string
  '--glass-opacity': string

  // Animation
  '--transition-fast': string
  '--transition-normal': string
  '--transition-slow': string
  '--easing-default': string
  '--easing-bounce': string

  // Components
  '--button-px': string
  '--button-py': string
  '--input-px': string
  '--input-py': string
  '--card-padding': string
}

/**
 * Theme store state
 */
export interface ThemeState {
  // Current selections
  currentThemeId: string | null
  currentPresetSlug: string // Current theme preset slug
  currentMode: ColorMode
  resolvedMode: 'light' | 'dark' // Actual mode after resolving 'system'

  // Available themes
  themes: Theme[]
  presets: ThemePreset[] // Code-defined presets
  isLoading: boolean
  error: string | null

  // Settings
  settings: SiteThemeSettings | null
}

/**
 * Convert a ThemePreset to the Directus Theme format
 * Useful for API compatibility
 */
export function presetToTheme(preset: ThemePreset): Theme {
  return {
    id: preset.id,
    status: 'published',
    name: preset.name,
    slug: preset.slug,
    description: preset.description,
    version: '1.0.0',
    is_default: preset.isDefault,
    is_premium: preset.isPremium,

    // Light mode
    light_bg_base: preset.light.bg.base,
    light_bg_subtle: preset.light.bg.subtle,
    light_bg_muted: preset.light.bg.muted,
    light_bg_elevated: preset.light.bg.elevated,
    light_text_primary: preset.light.text.primary,
    light_text_secondary: preset.light.text.secondary,
    light_text_tertiary: preset.light.text.tertiary,
    light_border_default: preset.light.border.default,
    light_border_subtle: preset.light.border.subtle,
    light_shadow_sm: preset.light.shadow.sm,
    light_shadow_md: preset.light.shadow.md,
    light_shadow_lg: preset.light.shadow.lg,
    light_shadow_xl: preset.light.shadow.xl,

    // Dark mode
    dark_bg_base: preset.dark.bg.base,
    dark_bg_subtle: preset.dark.bg.subtle,
    dark_bg_muted: preset.dark.bg.muted,
    dark_bg_elevated: preset.dark.bg.elevated,
    dark_text_primary: preset.dark.text.primary,
    dark_text_secondary: preset.dark.text.secondary,
    dark_text_tertiary: preset.dark.text.tertiary,
    dark_border_default: preset.dark.border.default,
    dark_border_subtle: preset.dark.border.subtle,
    dark_shadow_sm: preset.dark.shadow.sm,
    dark_shadow_md: preset.dark.shadow.md,
    dark_shadow_lg: preset.dark.shadow.lg,
    dark_shadow_xl: preset.dark.shadow.xl,

    // Colors
    color_primary: preset.colors.primary,
    color_primary_hover: preset.colors.primaryHover,
    color_secondary: preset.colors.secondary,
    color_secondary_hover: preset.colors.secondaryHover,
    color_accent: preset.colors.accent,
    color_accent_hover: preset.colors.accentHover,
    color_success: preset.colors.success,
    color_warning: preset.colors.warning,
    color_error: preset.colors.error,
    color_info: preset.colors.info,

    // Typography
    font_family_sans: preset.typography.fontSans,
    font_family_mono: preset.typography.fontMono,
    font_family_display: preset.typography.fontDisplay,
    font_size_base: preset.typography.fontSizeBase,
    font_weight_normal: 400,
    font_weight_medium: 500,
    font_weight_semibold: 600,
    font_weight_bold: 700,
    line_height_tight: 1.25,
    line_height_normal: 1.5,
    line_height_relaxed: 1.75,

    // Spacing & Style
    spacing_unit: '4px',
    border_radius_sm: preset.style.borderRadius.sm,
    border_radius_md: preset.style.borderRadius.md,
    border_radius_lg: preset.style.borderRadius.lg,
    border_radius_xl: preset.style.borderRadius.xl,
    border_radius_full: preset.style.borderRadius.full,

    // Effects
    blur_sm: preset.style.blur.sm,
    blur_md: preset.style.blur.md,
    blur_lg: preset.style.blur.lg,
    glass_opacity: preset.style.glassOpacity,

    // Animation
    transition_fast: preset.transitions.fast,
    transition_normal: preset.transitions.normal,
    transition_slow: preset.transitions.slow,
    easing_default: preset.transitions.easing,
    easing_bounce: preset.transitions.easingBounce,

    // Components
    button_padding_x: preset.components.buttonPaddingX,
    button_padding_y: preset.components.buttonPaddingY,
    input_padding_x: preset.components.inputPaddingX,
    input_padding_y: preset.components.inputPaddingY,
    card_padding: preset.components.cardPadding,

    // Custom CSS
    custom_css_light: preset.customCSS?.light,
    custom_css_dark: preset.customCSS?.dark,

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Default fallback theme (SynthStack)
 */
export const DEFAULT_THEME: Theme = {
  id: 'default',
  status: 'published',
  name: 'SynthStack',
  slug: 'synthstack',
  description: 'The default SynthStack theme',
  version: '1.0.0',
  is_default: true,
  is_premium: false,

  // Light
  light_bg_base: '#FFFFFF',
  light_bg_subtle: '#F8FAFC',
  light_bg_muted: '#F1F5F9',
  light_bg_elevated: '#FFFFFF',
  light_text_primary: '#0F172A',
  light_text_secondary: '#475569',
  light_text_tertiary: '#94A3B8',
  light_border_default: '#E2E8F0',
  light_border_subtle: '#F1F5F9',

  // Dark
  dark_bg_base: '#09090B',
  dark_bg_subtle: '#0F0F12',
  dark_bg_muted: '#18181B',
  dark_bg_elevated: '#27272A',
  dark_text_primary: '#FAFAFA',
  dark_text_secondary: '#A1A1AA',
  dark_text_tertiary: '#71717A',
  dark_border_default: '#27272A',
  dark_border_subtle: '#18181B',

  // Colors
  color_primary: '#6366F1',
  color_primary_hover: '#4F46E5',
  color_secondary: '#00D4AA',
  color_secondary_hover: '#00B894',
  color_accent: '#8B5CF6',
  color_accent_hover: '#7C3AED',
  color_success: '#22C55E',
  color_warning: '#EAB308',
  color_error: '#EF4444',
  color_info: '#0EA5E9',

  // Typography
  font_family_sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  font_family_mono: "'JetBrains Mono', 'Fira Code', monospace",
  font_family_display: "'Cal Sans', 'Inter', sans-serif",
  font_size_base: '16px',
  font_weight_normal: 400,
  font_weight_medium: 500,
  font_weight_semibold: 600,
  font_weight_bold: 700,
  line_height_tight: 1.25,
  line_height_normal: 1.5,
  line_height_relaxed: 1.75,

  // Spacing
  spacing_unit: '4px',
  border_radius_sm: '4px',
  border_radius_md: '8px',
  border_radius_lg: '12px',
  border_radius_xl: '16px',
  border_radius_full: '9999px',

  // Shadows
  light_shadow_sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  light_shadow_md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  light_shadow_lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  light_shadow_xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  dark_shadow_sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  dark_shadow_md: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
  dark_shadow_lg: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
  dark_shadow_xl: '0 20px 25px -5px rgb(0 0 0 / 0.6)',

  // Effects
  blur_sm: '4px',
  blur_md: '8px',
  blur_lg: '16px',
  glass_opacity: 0.8,

  // Animation
  transition_fast: '150ms',
  transition_normal: '250ms',
  transition_slow: '350ms',
  easing_default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easing_bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Components
  button_padding_x: '16px',
  button_padding_y: '8px',
  input_padding_x: '12px',
  input_padding_y: '10px',
  card_padding: '24px',

  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

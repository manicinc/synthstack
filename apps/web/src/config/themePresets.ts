/**
 * SynthStack Theme Presets
 *
 * Complete theme preset definitions with light/dark mode variants.
 * Each preset is a complete aesthetic package including colors, typography,
 * border radius, shadows, and special effects.
 */

import type { ThemePreset } from '@/types/theme'

/**
 * Light Mode - Clean, bright, simple
 */
export const lightModePreset: ThemePreset = {
  id: 'light-mode',
  slug: 'light-mode',
  name: 'Light Mode',
  description: 'Clean and bright with excellent readability',
  category: 'modern',
  isDefault: false,
  isPremium: false,

  previewColors: {
    primary: '#3B82F6',
    secondary: '#6366F1',
    accent: '#8B5CF6',
  },

  light: {
    bg: {
      base: '#FFFFFF',
      subtle: '#F8FAFC',
      muted: '#F1F5F9',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      tertiary: '#94A3B8',
    },
    border: {
      default: '#E2E8F0',
      subtle: '#F1F5F9',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    },
  },

  dark: {
    bg: {
      base: '#FFFFFF',
      subtle: '#F8FAFC',
      muted: '#F1F5F9',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      tertiary: '#94A3B8',
    },
    border: {
      default: '#E2E8F0',
      subtle: '#F1F5F9',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    },
  },

  colors: {
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    secondary: '#6366F1',
    secondaryHover: '#4F46E5',
    accent: '#8B5CF6',
    accentHover: '#7C3AED',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#0EA5E9',
  },

  typography: {
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    fontDisplay: "'Inter', sans-serif",
    fontSizeBase: '16px',
  },

  style: {
    borderRadius: {
      sm: '6px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    glassOpacity: 0.9,
    blur: {
      sm: '8px',
      md: '12px',
      lg: '16px',
    },
  },

  transitions: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  components: {
    buttonPaddingX: '16px',
    buttonPaddingY: '10px',
    inputPaddingX: '14px',
    inputPaddingY: '12px',
    cardPadding: '24px',
  },
}

/**
 * Dark Mode - Sleek, modern dark theme
 */
export const darkModePreset: ThemePreset = {
  id: 'dark-mode',
  slug: 'dark-mode',
  name: 'Dark Mode',
  description: 'Sleek and modern with easy-on-the-eyes contrast',
  category: 'modern',
  isDefault: false,
  isPremium: false,

  previewColors: {
    primary: '#60A5FA',
    secondary: '#818CF8',
    accent: '#A78BFA',
  },

  light: {
    bg: {
      base: '#0F172A',
      subtle: '#1E293B',
      muted: '#334155',
      elevated: '#1E293B',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
    },
    border: {
      default: '#334155',
      subtle: '#1E293B',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.6)',
    },
  },

  dark: {
    bg: {
      base: '#0F172A',
      subtle: '#1E293B',
      muted: '#334155',
      elevated: '#1E293B',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
    },
    border: {
      default: '#334155',
      subtle: '#1E293B',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.6)',
    },
  },

  colors: {
    primary: '#60A5FA',
    primaryHover: '#3B82F6',
    secondary: '#818CF8',
    secondaryHover: '#6366F1',
    accent: '#A78BFA',
    accentHover: '#8B5CF6',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#38BDF8',
  },

  typography: {
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    fontDisplay: "'Inter', sans-serif",
    fontSizeBase: '16px',
  },

  style: {
    borderRadius: {
      sm: '6px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    glassOpacity: 0.8,
    blur: {
      sm: '8px',
      md: '12px',
      lg: '16px',
    },
  },

  transitions: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  components: {
    buttonPaddingX: '16px',
    buttonPaddingY: '10px',
    inputPaddingX: '14px',
    inputPaddingY: '12px',
    cardPadding: '24px',
  },
}

/**
 * SynthStack - Default modern tech aesthetic
 * Enhanced for Premium Feel
 */
export const synthstackPreset: ThemePreset = {
  id: 'synthstack',
  slug: 'synthstack',
  name: 'SynthStack',
  description: 'Modern premium tech aesthetic with deep indigo and vibrant teal accents',
  category: 'modern',
  isDefault: true,
  isPremium: false,

  // Preview colors for theme selector
  previewColors: {
    primary: '#6366F1',
    secondary: '#14B8A6',
    accent: '#8B5CF6',
  },

  // Light Mode - Crisp, Clean, High Contrast
  light: {
    bg: {
      base: '#FFFFFF',
      subtle: '#F8FAFC',
      muted: '#F1F5F9',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      tertiary: '#94A3B8',
    },
    border: {
      default: '#E2E8F0',
      subtle: '#F1F5F9',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(99 102 241 / 0.1), 0 2px 4px -1px rgb(99 102 241 / 0.06)', // Hint of indigo
      lg: '0 10px 15px -3px rgb(99 102 241 / 0.1), 0 4px 6px -2px rgb(99 102 241 / 0.05)',
      xl: '0 20px 25px -5px rgb(99 102 241 / 0.1), 0 10px 10px -5px rgb(99 102 241 / 0.04)',
    },
  },

  // Dark Mode - Deep, Rich, Sophisticated
  dark: {
    bg: {
      base: '#0B0C15', // Deep Indigo-Black, not just grey
      subtle: '#111322', // Slightly lighter indigo-black
      muted: '#1A1D33',
      elevated: '#16192C',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      tertiary: '#64748B',
    },
    border: {
      default: '#1E293B',
      subtle: '#0F172A',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.6)',
    },
  },

  // Accent Colors (shared between modes)
  colors: {
    primary: '#6366F1', // Indigo 500
    primaryHover: '#4F46E5', // Indigo 600
    secondary: '#14B8A6', // Teal 500
    secondaryHover: '#0D9488', // Teal 600
    accent: '#8B5CF6', // Violet 500
    accentHover: '#7C3AED', // Violet 600
    success: '#10B981', // Emerald 500
    warning: '#F59E0B', // Amber 500
    error: '#EF4444', // Red 500
    info: '#0EA5E9', // Sky 500
  },

  // Typography
  typography: {
    fontSans: "'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    fontDisplay: "'Plus Jakarta Sans', 'Inter', sans-serif",
    fontSizeBase: '16px',
  },

  // Style characteristics
  style: {
    borderRadius: {
      sm: '6px',
      md: '12px', // Modern generous radius
      lg: '16px',
      xl: '24px',
      full: '9999px',
    },
    glassOpacity: 0.7, // Frosted glass effect
    blur: {
      sm: '8px',
      md: '16px', // Heavy blur for premium glass
      lg: '24px',
    },
  },

  // Transitions
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy and alive
  },

  // Component specific
  components: {
    buttonPaddingX: '20px',
    buttonPaddingY: '10px',
    inputPaddingX: '16px',
    inputPaddingY: '12px',
    cardPadding: '32px', // Spacious cards
  },

  // Custom CSS for advanced effects
  customCSS: {
    light: `
      .q-btn.bg-primary { box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39); }
      .text-gradient { background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    `,
    dark: `
      .q-btn.bg-primary { box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39); }
      .glass-panel { background: rgba(22, 25, 44, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.05); }
      .text-gradient { background: linear-gradient(135deg, #818CF8 0%, #A78BFA 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    `,
  },
}

/**
 * Minimal - Clean, airy, lots of whitespace
 */
export const minimalPreset: ThemePreset = {
  id: 'minimal',
  slug: 'minimal',
  name: 'Minimal',
  description: 'Clean and airy with generous whitespace',
  category: 'modern',
  isDefault: false,
  isPremium: false,

  previewColors: {
    primary: '#71717A',
    secondary: '#A1A1AA',
    accent: '#52525B',
  },

  light: {
    bg: {
      base: '#FFFFFF',
      subtle: '#FAFAFA',
      muted: '#F5F5F5',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#18181B',
      secondary: '#52525B',
      tertiary: '#A1A1AA',
    },
    border: {
      default: '#E4E4E7',
      subtle: '#F4F4F5',
    },
    shadow: {
      sm: '0 1px 2px rgb(0 0 0 / 0.03)',
      md: '0 2px 4px rgb(0 0 0 / 0.04)',
      lg: '0 4px 8px rgb(0 0 0 / 0.05)',
      xl: '0 8px 16px rgb(0 0 0 / 0.06)',
    },
  },

  dark: {
    bg: {
      base: '#0A0A0A',
      subtle: '#0F0F0F',
      muted: '#171717',
      elevated: '#1F1F1F',
    },
    text: {
      primary: '#FAFAFA',
      secondary: '#A3A3A3',
      tertiary: '#737373',
    },
    border: {
      default: '#262626',
      subtle: '#1A1A1A',
    },
    shadow: {
      sm: '0 1px 2px rgb(0 0 0 / 0.2)',
      md: '0 2px 4px rgb(0 0 0 / 0.25)',
      lg: '0 4px 8px rgb(0 0 0 / 0.3)',
      xl: '0 8px 16px rgb(0 0 0 / 0.35)',
    },
  },

  colors: {
    primary: '#71717A',
    primaryHover: '#52525B',
    secondary: '#A1A1AA',
    secondaryHover: '#71717A',
    accent: '#3F3F46',
    accentHover: '#27272A',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#6366F1',
  },

  typography: {
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontMono: "'SF Mono', 'Monaco', monospace",
    fontDisplay: "'Inter', sans-serif",
    fontSizeBase: '15px',
  },

  style: {
    borderRadius: {
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      full: '9999px',
    },
    glassOpacity: 0.9,
    blur: {
      sm: '8px',
      md: '16px',
      lg: '24px',
    },
  },

  transitions: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    easingBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  components: {
    buttonPaddingX: '20px',
    buttonPaddingY: '10px',
    inputPaddingX: '16px',
    inputPaddingY: '12px',
    cardPadding: '32px',
  },
}

/**
 * Brutalist - Raw, bold, high contrast
 */
export const brutalistPreset: ThemePreset = {
  id: 'brutalist',
  slug: 'brutalist',
  name: 'Brutalist',
  description: 'Raw and bold with high contrast and hard edges',
  category: 'bold',
  isDefault: false,
  isPremium: false,

  previewColors: {
    primary: '#000000',
    secondary: '#FF0000',
    accent: '#FFFF00',
  },

  light: {
    bg: {
      base: '#FFFFFF',
      subtle: '#F0F0F0',
      muted: '#E0E0E0',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#000000',
      secondary: '#333333',
      tertiary: '#666666',
    },
    border: {
      default: '#000000',
      subtle: '#333333',
    },
    shadow: {
      sm: '2px 2px 0 #000000',
      md: '4px 4px 0 #000000',
      lg: '6px 6px 0 #000000',
      xl: '8px 8px 0 #000000',
    },
  },

  dark: {
    bg: {
      base: '#000000',
      subtle: '#0A0A0A',
      muted: '#141414',
      elevated: '#1A1A1A',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      tertiary: '#999999',
    },
    border: {
      default: '#FFFFFF',
      subtle: '#666666',
    },
    shadow: {
      sm: '2px 2px 0 #FFFFFF',
      md: '4px 4px 0 #FFFFFF',
      lg: '6px 6px 0 #FFFFFF',
      xl: '8px 8px 0 #FFFFFF',
    },
  },

  colors: {
    primary: '#000000',
    primaryHover: '#333333',
    secondary: '#FF0000',
    secondaryHover: '#CC0000',
    accent: '#FFFF00',
    accentHover: '#CCCC00',
    success: '#00FF00',
    warning: '#FFFF00',
    error: '#FF0000',
    info: '#0000FF',
  },

  typography: {
    fontSans: "'Arial Black', 'Helvetica Neue', sans-serif",
    fontMono: "'Courier New', Courier, monospace",
    fontDisplay: "'Impact', 'Arial Black', sans-serif",
    fontSizeBase: '16px',
  },

  style: {
    borderRadius: {
      sm: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      full: '0px',
    },
    glassOpacity: 1,
    blur: {
      sm: '0px',
      md: '0px',
      lg: '0px',
    },
  },

  transitions: {
    fast: '0ms',
    normal: '100ms',
    slow: '150ms',
    easing: 'linear',
    easingBounce: 'linear',
  },

  components: {
    buttonPaddingX: '16px',
    buttonPaddingY: '12px',
    inputPaddingX: '12px',
    inputPaddingY: '12px',
    cardPadding: '20px',
  },
}

/**
 * Oceanic - Calm blues and teals
 */
export const oceanicPreset: ThemePreset = {
  id: 'oceanic',
  slug: 'oceanic',
  name: 'Oceanic',
  description: 'Calm and serene with deep blues and teals',
  category: 'nature',
  isDefault: false,
  isPremium: false,

  previewColors: {
    primary: '#0077B6',
    secondary: '#00B4D8',
    accent: '#90E0EF',
  },

  light: {
    bg: {
      base: '#F0F9FF',
      subtle: '#E0F2FE',
      muted: '#BAE6FD',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#0C4A6E',
      secondary: '#0369A1',
      tertiary: '#0284C7',
    },
    border: {
      default: '#7DD3FC',
      subtle: '#BAE6FD',
    },
    shadow: {
      sm: '0 1px 3px rgb(0 119 182 / 0.1)',
      md: '0 4px 6px rgb(0 119 182 / 0.12)',
      lg: '0 10px 15px rgb(0 119 182 / 0.15)',
      xl: '0 20px 25px rgb(0 119 182 / 0.18)',
    },
  },

  dark: {
    bg: {
      base: '#03045E',
      subtle: '#023E8A',
      muted: '#0077B6',
      elevated: '#0096C7',
    },
    text: {
      primary: '#CAF0F8',
      secondary: '#90E0EF',
      tertiary: '#48CAE4',
    },
    border: {
      default: '#0096C7',
      subtle: '#0077B6',
    },
    shadow: {
      sm: '0 1px 3px rgb(0 0 0 / 0.3)',
      md: '0 4px 6px rgb(0 0 0 / 0.35)',
      lg: '0 10px 15px rgb(0 0 0 / 0.4)',
      xl: '0 20px 25px rgb(0 0 0 / 0.45)',
    },
  },

  colors: {
    primary: '#0077B6',
    primaryHover: '#0096C7',
    secondary: '#00B4D8',
    secondaryHover: '#48CAE4',
    accent: '#90E0EF',
    accentHover: '#ADE8F4',
    success: '#06D6A0',
    warning: '#FFD166',
    error: '#EF476F',
    info: '#118AB2',
  },

  typography: {
    fontSans: "'Nunito', 'Segoe UI', sans-serif",
    fontMono: "'Source Code Pro', monospace",
    fontDisplay: "'Poppins', 'Nunito', sans-serif",
    fontSizeBase: '16px',
  },

  style: {
    borderRadius: {
      sm: '6px',
      md: '10px',
      lg: '14px',
      xl: '20px',
      full: '9999px',
    },
    glassOpacity: 0.75,
    blur: {
      sm: '6px',
      md: '12px',
      lg: '20px',
    },
  },

  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '450ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  components: {
    buttonPaddingX: '18px',
    buttonPaddingY: '10px',
    inputPaddingX: '14px',
    inputPaddingY: '12px',
    cardPadding: '24px',
  },
}

/**
 * Cyberpunk - Neon on dark, futuristic
 */
export const cyberpunkPreset: ThemePreset = {
  id: 'cyberpunk',
  slug: 'cyberpunk',
  name: 'Cyberpunk',
  description: 'Futuristic neon aesthetic with glowing accents',
  category: 'bold',
  isDefault: false,
  isPremium: true,

  previewColors: {
    primary: '#FF00FF',
    secondary: '#00FFFF',
    accent: '#FFFF00',
  },

  light: {
    bg: {
      base: '#1A1A2E',
      subtle: '#16213E',
      muted: '#0F3460',
      elevated: '#1A1A2E',
    },
    text: {
      primary: '#EAEAEA',
      secondary: '#B8B8B8',
      tertiary: '#888888',
    },
    border: {
      default: '#FF00FF40',
      subtle: '#FF00FF20',
    },
    shadow: {
      sm: '0 0 10px rgb(255 0 255 / 0.3)',
      md: '0 0 20px rgb(255 0 255 / 0.4)',
      lg: '0 0 30px rgb(255 0 255 / 0.5)',
      xl: '0 0 50px rgb(255 0 255 / 0.6)',
    },
  },

  dark: {
    bg: {
      base: '#0D0D0D',
      subtle: '#1A1A2E',
      muted: '#16213E',
      elevated: '#0F3460',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#E0E0E0',
      tertiary: '#A0A0A0',
    },
    border: {
      default: '#FF00FF60',
      subtle: '#FF00FF30',
    },
    shadow: {
      sm: '0 0 10px rgb(255 0 255 / 0.4)',
      md: '0 0 20px rgb(255 0 255 / 0.5)',
      lg: '0 0 40px rgb(255 0 255 / 0.6)',
      xl: '0 0 60px rgb(255 0 255 / 0.7)',
    },
  },

  colors: {
    primary: '#FF00FF',
    primaryHover: '#FF44FF',
    secondary: '#00FFFF',
    secondaryHover: '#44FFFF',
    accent: '#FFFF00',
    accentHover: '#FFFF44',
    success: '#00FF88',
    warning: '#FFAA00',
    error: '#FF0044',
    info: '#00AAFF',
  },

  typography: {
    fontSans: "'Rajdhani', 'Orbitron', sans-serif",
    fontMono: "'Share Tech Mono', 'Fira Code', monospace",
    fontDisplay: "'Orbitron', 'Rajdhani', sans-serif",
    fontSizeBase: '15px',
  },

  style: {
    borderRadius: {
      sm: '2px',
      md: '4px',
      lg: '6px',
      xl: '8px',
      full: '9999px',
    },
    glassOpacity: 0.6,
    blur: {
      sm: '4px',
      md: '8px',
      lg: '12px',
    },
  },

  transitions: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  components: {
    buttonPaddingX: '20px',
    buttonPaddingY: '10px',
    inputPaddingX: '14px',
    inputPaddingY: '10px',
    cardPadding: '20px',
  },

  // Special effects for cyberpunk
  customCSS: {
    light: `
      .btn-primary { text-shadow: 0 0 10px currentColor; }
      .card { border: 1px solid rgba(255, 0, 255, 0.3); }
    `,
    dark: `
      .btn-primary { text-shadow: 0 0 15px currentColor; box-shadow: 0 0 20px rgba(255, 0, 255, 0.4); }
      .card { border: 1px solid rgba(255, 0, 255, 0.4); box-shadow: 0 0 30px rgba(255, 0, 255, 0.2); }
    `,
  },
}

/**
 * Terminal - Retro hacker aesthetic
 */
export const terminalPreset: ThemePreset = {
  id: 'terminal',
  slug: 'terminal',
  name: 'Terminal',
  description: 'Retro hacker aesthetic with phosphor green',
  category: 'retro',
  isDefault: false,
  isPremium: false,

  previewColors: {
    primary: '#00FF00',
    secondary: '#00CC00',
    accent: '#FFAA00',
  },

  light: {
    bg: {
      base: '#0A0A0A',
      subtle: '#0F0F0F',
      muted: '#1A1A1A',
      elevated: '#222222',
    },
    text: {
      primary: '#00FF00',
      secondary: '#00CC00',
      tertiary: '#009900',
    },
    border: {
      default: '#00FF0040',
      subtle: '#00FF0020',
    },
    shadow: {
      sm: '0 0 5px rgb(0 255 0 / 0.2)',
      md: '0 0 10px rgb(0 255 0 / 0.3)',
      lg: '0 0 20px rgb(0 255 0 / 0.4)',
      xl: '0 0 30px rgb(0 255 0 / 0.5)',
    },
  },

  dark: {
    bg: {
      base: '#000000',
      subtle: '#050505',
      muted: '#0A0A0A',
      elevated: '#111111',
    },
    text: {
      primary: '#00FF00',
      secondary: '#00DD00',
      tertiary: '#00AA00',
    },
    border: {
      default: '#00FF0050',
      subtle: '#00FF0030',
    },
    shadow: {
      sm: '0 0 5px rgb(0 255 0 / 0.3)',
      md: '0 0 15px rgb(0 255 0 / 0.4)',
      lg: '0 0 25px rgb(0 255 0 / 0.5)',
      xl: '0 0 40px rgb(0 255 0 / 0.6)',
    },
  },

  colors: {
    primary: '#00FF00',
    primaryHover: '#33FF33',
    secondary: '#00CC00',
    secondaryHover: '#00EE00',
    accent: '#FFAA00',
    accentHover: '#FFCC00',
    success: '#00FF00',
    warning: '#FFAA00',
    error: '#FF3333',
    info: '#00AAFF',
  },

  typography: {
    fontSans: "'IBM Plex Mono', 'Courier New', monospace",
    fontMono: "'IBM Plex Mono', 'Courier New', monospace",
    fontDisplay: "'IBM Plex Mono', monospace",
    fontSizeBase: '14px',
  },

  style: {
    borderRadius: {
      sm: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      full: '0px',
    },
    glassOpacity: 0.9,
    blur: {
      sm: '0px',
      md: '0px',
      lg: '0px',
    },
  },

  transitions: {
    fast: '50ms',
    normal: '100ms',
    slow: '150ms',
    easing: 'linear',
    easingBounce: 'linear',
  },

  components: {
    buttonPaddingX: '12px',
    buttonPaddingY: '8px',
    inputPaddingX: '8px',
    inputPaddingY: '8px',
    cardPadding: '16px',
  },

  customCSS: {
    light: `
      * { text-shadow: 0 0 2px currentColor; }
      body { background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px); }
    `,
    dark: `
      * { text-shadow: 0 0 3px currentColor; }
      body { background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.05) 2px, rgba(0, 255, 0, 0.05) 4px); }
    `,
  },
}

/**
 * Warm Sepia - Paper-like, cozy
 */
export const warmSepiaPreset: ThemePreset = {
  id: 'warm-sepia',
  slug: 'warm-sepia',
  name: 'Warm Sepia',
  description: 'Paper-like warmth with cozy earth tones',
  category: 'classic',
  isDefault: false,
  isPremium: false,

  previewColors: {
    primary: '#8B4513',
    secondary: '#D2691E',
    accent: '#CD853F',
  },

  light: {
    bg: {
      base: '#FDF8F3',
      subtle: '#F5EDE4',
      muted: '#EDE3D7',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#3D2914',
      secondary: '#5C4033',
      tertiary: '#8B7355',
    },
    border: {
      default: '#D4C4B0',
      subtle: '#E8DFD3',
    },
    shadow: {
      sm: '0 1px 2px rgb(61 41 20 / 0.08)',
      md: '0 4px 6px rgb(61 41 20 / 0.1)',
      lg: '0 10px 15px rgb(61 41 20 / 0.12)',
      xl: '0 20px 25px rgb(61 41 20 / 0.15)',
    },
  },

  dark: {
    bg: {
      base: '#1C1410',
      subtle: '#2A1F18',
      muted: '#3D2E24',
      elevated: '#4A3B30',
    },
    text: {
      primary: '#F5EDE4',
      secondary: '#D4C4B0',
      tertiary: '#A89078',
    },
    border: {
      default: '#5C4A3D',
      subtle: '#4A3B30',
    },
    shadow: {
      sm: '0 1px 2px rgb(0 0 0 / 0.3)',
      md: '0 4px 6px rgb(0 0 0 / 0.35)',
      lg: '0 10px 15px rgb(0 0 0 / 0.4)',
      xl: '0 20px 25px rgb(0 0 0 / 0.45)',
    },
  },

  colors: {
    primary: '#8B4513',
    primaryHover: '#A0522D',
    secondary: '#D2691E',
    secondaryHover: '#E07830',
    accent: '#CD853F',
    accentHover: '#DEB887',
    success: '#6B8E23',
    warning: '#DAA520',
    error: '#B22222',
    info: '#4682B4',
  },

  typography: {
    fontSans: "'Merriweather Sans', 'Georgia', serif",
    fontMono: "'Courier Prime', 'Courier New', monospace",
    fontDisplay: "'Playfair Display', 'Georgia', serif",
    fontSizeBase: '17px',
  },

  style: {
    borderRadius: {
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px',
      full: '9999px',
    },
    glassOpacity: 0.85,
    blur: {
      sm: '4px',
      md: '8px',
      lg: '12px',
    },
  },

  transitions: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  components: {
    buttonPaddingX: '18px',
    buttonPaddingY: '10px',
    inputPaddingX: '14px',
    inputPaddingY: '12px',
    cardPadding: '28px',
  },
}

/**
 * Forest - Natural greens
 */
export const forestPreset: ThemePreset = {
  id: 'forest',
  slug: 'forest',
  name: 'Forest',
  description: 'Natural greens and earthy organic tones',
  category: 'nature',
  isDefault: false,
  isPremium: false,

  previewColors: {
    primary: '#228B22',
    secondary: '#2E8B57',
    accent: '#6B8E23',
  },

  light: {
    bg: {
      base: '#F5F9F5',
      subtle: '#E8F0E8',
      muted: '#D4E5D4',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#1A3A1A',
      secondary: '#2D5A2D',
      tertiary: '#4A7A4A',
    },
    border: {
      default: '#A8C8A8',
      subtle: '#C8DCC8',
    },
    shadow: {
      sm: '0 1px 2px rgb(26 58 26 / 0.08)',
      md: '0 4px 6px rgb(26 58 26 / 0.1)',
      lg: '0 10px 15px rgb(26 58 26 / 0.12)',
      xl: '0 20px 25px rgb(26 58 26 / 0.15)',
    },
  },

  dark: {
    bg: {
      base: '#0D1A0D',
      subtle: '#142814',
      muted: '#1E3A1E',
      elevated: '#2A4A2A',
    },
    text: {
      primary: '#E8F0E8',
      secondary: '#B8D4B8',
      tertiary: '#88B088',
    },
    border: {
      default: '#3A5A3A',
      subtle: '#2A4A2A',
    },
    shadow: {
      sm: '0 1px 2px rgb(0 0 0 / 0.3)',
      md: '0 4px 6px rgb(0 0 0 / 0.35)',
      lg: '0 10px 15px rgb(0 0 0 / 0.4)',
      xl: '0 20px 25px rgb(0 0 0 / 0.45)',
    },
  },

  colors: {
    primary: '#228B22',
    primaryHover: '#2E9B2E',
    secondary: '#2E8B57',
    secondaryHover: '#3CB371',
    accent: '#6B8E23',
    accentHover: '#7BA428',
    success: '#32CD32',
    warning: '#DAA520',
    error: '#CD5C5C',
    info: '#4682B4',
  },

  typography: {
    fontSans: "'Source Sans Pro', 'Trebuchet MS', sans-serif",
    fontMono: "'Source Code Pro', monospace",
    fontDisplay: "'Lora', 'Georgia', serif",
    fontSizeBase: '16px',
  },

  style: {
    borderRadius: {
      sm: '6px',
      md: '10px',
      lg: '16px',
      xl: '24px',
      full: '9999px',
    },
    glassOpacity: 0.8,
    blur: {
      sm: '6px',
      md: '10px',
      lg: '16px',
    },
  },

  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '450ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  components: {
    buttonPaddingX: '16px',
    buttonPaddingY: '10px',
    inputPaddingX: '14px',
    inputPaddingY: '12px',
    cardPadding: '24px',
  },
}

/**
 * Sunset - Warm gradients
 */
export const sunsetPreset: ThemePreset = {
  id: 'sunset',
  slug: 'sunset',
  name: 'Sunset',
  description: 'Warm gradient accents with orange and purple',
  category: 'warm',
  isDefault: false,
  isPremium: true,

  previewColors: {
    primary: '#FF6B35',
    secondary: '#9B59B6',
    accent: '#F39C12',
  },

  light: {
    bg: {
      base: '#FFFAF5',
      subtle: '#FFF5EB',
      muted: '#FFEEDD',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#2D1810',
      secondary: '#5C3D2E',
      tertiary: '#8B6B5C',
    },
    border: {
      default: '#F5D5C0',
      subtle: '#FAE8DD',
    },
    shadow: {
      sm: '0 1px 3px rgb(255 107 53 / 0.1)',
      md: '0 4px 6px rgb(255 107 53 / 0.12)',
      lg: '0 10px 15px rgb(255 107 53 / 0.15)',
      xl: '0 20px 25px rgb(255 107 53 / 0.18)',
    },
  },

  dark: {
    bg: {
      base: '#1A0F0A',
      subtle: '#2D1810',
      muted: '#3D2820',
      elevated: '#4D3830',
    },
    text: {
      primary: '#FFF5EB',
      secondary: '#F5D5C0',
      tertiary: '#D4A88C',
    },
    border: {
      default: '#5C3D2E',
      subtle: '#4D3830',
    },
    shadow: {
      sm: '0 1px 3px rgb(0 0 0 / 0.3)',
      md: '0 4px 6px rgb(0 0 0 / 0.35)',
      lg: '0 10px 15px rgb(0 0 0 / 0.4)',
      xl: '0 20px 25px rgb(0 0 0 / 0.45)',
    },
  },

  colors: {
    primary: '#FF6B35',
    primaryHover: '#FF8555',
    secondary: '#9B59B6',
    secondaryHover: '#B370CC',
    accent: '#F39C12',
    accentHover: '#F5B041',
    success: '#27AE60',
    warning: '#F39C12',
    error: '#E74C3C',
    info: '#3498DB',
  },

  typography: {
    fontSans: "'Poppins', 'Segoe UI', sans-serif",
    fontMono: "'Fira Code', monospace",
    fontDisplay: "'Montserrat', 'Poppins', sans-serif",
    fontSizeBase: '16px',
  },

  style: {
    borderRadius: {
      sm: '6px',
      md: '10px',
      lg: '14px',
      xl: '20px',
      full: '9999px',
    },
    glassOpacity: 0.75,
    blur: {
      sm: '6px',
      md: '12px',
      lg: '20px',
    },
  },

  transitions: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  components: {
    buttonPaddingX: '18px',
    buttonPaddingY: '10px',
    inputPaddingX: '14px',
    inputPaddingY: '11px',
    cardPadding: '24px',
  },

  customCSS: {
    light: `
      .btn-primary { background: linear-gradient(135deg, #FF6B35 0%, #9B59B6 100%); }
    `,
    dark: `
      .btn-primary { background: linear-gradient(135deg, #FF6B35 0%, #9B59B6 100%); }
    `,
  },
}

/**
 * Neumorphic - Soft UI, embossed look
 */
export const neumorphicPreset: ThemePreset = {
  id: 'neumorphic',
  slug: 'neumorphic',
  name: 'Neumorphic',
  description: 'Soft UI with embossed, tactile elements',
  category: 'modern',
  isDefault: false,
  isPremium: true,

  previewColors: {
    primary: '#6C63FF',
    secondary: '#00C9A7',
    accent: '#FF6B9D',
  },

  light: {
    bg: {
      base: '#E8EDF2',
      subtle: '#E0E5EC',
      muted: '#D1D9E6',
      elevated: '#E8EDF2',
    },
    text: {
      primary: '#31344B',
      secondary: '#5A5D7A',
      tertiary: '#8A8DAA',
    },
    border: {
      default: 'transparent',
      subtle: 'transparent',
    },
    shadow: {
      sm: '3px 3px 6px #C5CBD3, -3px -3px 6px #FFFFFF',
      md: '5px 5px 10px #C5CBD3, -5px -5px 10px #FFFFFF',
      lg: '8px 8px 16px #C5CBD3, -8px -8px 16px #FFFFFF',
      xl: '12px 12px 24px #C5CBD3, -12px -12px 24px #FFFFFF',
    },
  },

  dark: {
    bg: {
      base: '#2D2D3A',
      subtle: '#262633',
      muted: '#1F1F2B',
      elevated: '#2D2D3A',
    },
    text: {
      primary: '#E8EDF2',
      secondary: '#B8BDD0',
      tertiary: '#8A8DAA',
    },
    border: {
      default: 'transparent',
      subtle: 'transparent',
    },
    shadow: {
      sm: '3px 3px 6px #1A1A24, -3px -3px 6px #404050',
      md: '5px 5px 10px #1A1A24, -5px -5px 10px #404050',
      lg: '8px 8px 16px #1A1A24, -8px -8px 16px #404050',
      xl: '12px 12px 24px #1A1A24, -12px -12px 24px #404050',
    },
  },

  colors: {
    primary: '#6C63FF',
    primaryHover: '#7B73FF',
    secondary: '#00C9A7',
    secondaryHover: '#00E0BB',
    accent: '#FF6B9D',
    accentHover: '#FF85AD',
    success: '#00C9A7',
    warning: '#FFB347',
    error: '#FF6B6B',
    info: '#4ECDC4',
  },

  typography: {
    fontSans: "'DM Sans', 'Inter', sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    fontDisplay: "'DM Sans', sans-serif",
    fontSizeBase: '16px',
  },

  style: {
    borderRadius: {
      sm: '10px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      full: '9999px',
    },
    glassOpacity: 0.9,
    blur: {
      sm: '8px',
      md: '16px',
      lg: '24px',
    },
  },

  transitions: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  components: {
    buttonPaddingX: '20px',
    buttonPaddingY: '12px',
    inputPaddingX: '16px',
    inputPaddingY: '14px',
    cardPadding: '28px',
  },

  customCSS: {
    light: `
      .card { box-shadow: 8px 8px 16px #C5CBD3, -8px -8px 16px #FFFFFF; border: none; }
      .btn { box-shadow: 4px 4px 8px #C5CBD3, -4px -4px 8px #FFFFFF; }
      .btn:active { box-shadow: inset 4px 4px 8px #C5CBD3, inset -4px -4px 8px #FFFFFF; }
      .input { box-shadow: inset 3px 3px 6px #C5CBD3, inset -3px -3px 6px #FFFFFF; border: none; }
    `,
    dark: `
      .card { box-shadow: 8px 8px 16px #1A1A24, -8px -8px 16px #404050; border: none; }
      .btn { box-shadow: 4px 4px 8px #1A1A24, -4px -4px 8px #404050; }
      .btn:active { box-shadow: inset 4px 4px 8px #1A1A24, inset -4px -4px 8px #404050; }
      .input { box-shadow: inset 3px 3px 6px #1A1A24, inset -3px -3px 6px #404050; border: none; }
    `,
  },
}

/**
 * All theme presets registry
 */
export const themePresets: Record<string, ThemePreset> = {
  'light-mode': lightModePreset,
  'dark-mode': darkModePreset,
  synthstack: synthstackPreset,
  minimal: minimalPreset,
  brutalist: brutalistPreset,
  oceanic: oceanicPreset,
  cyberpunk: cyberpunkPreset,
  terminal: terminalPreset,
  'warm-sepia': warmSepiaPreset,
  forest: forestPreset,
  sunset: sunsetPreset,
  neumorphic: neumorphicPreset,
}

/**
 * Get all presets as an array
 */
export const themePresetsList = Object.values(themePresets)

/**
 * Get preset by slug
 */
export function getPresetBySlug(slug: string): ThemePreset | undefined {
  return themePresets[slug]
}

/**
 * Get default preset
 */
export function getDefaultPreset(): ThemePreset {
  return synthstackPreset
}

/**
 * Theme categories for filtering
 */
export const themeCategories = [
  { id: 'all', name: 'All Themes' },
  { id: 'modern', name: 'Modern' },
  { id: 'bold', name: 'Bold' },
  { id: 'nature', name: 'Nature' },
  { id: 'retro', name: 'Retro' },
  { id: 'classic', name: 'Classic' },
  { id: 'warm', name: 'Warm' },
] as const

export type ThemeCategory = typeof themeCategories[number]['id']



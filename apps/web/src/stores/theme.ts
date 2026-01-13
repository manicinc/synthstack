/**
 * SynthStack Theme Store
 *
 * Advanced theme management with:
 * - Multiple theme presets (aesthetic/style)
 * - Independent light/dark mode toggle per preset
 * - System preference detection
 * - Code-defined presets + Directus custom themes
 * - CSS variable generation
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { devWarn, logError } from '@/utils/devLogger'
import type { Theme, ColorMode, ThemePreset, SiteThemeSettings, ThemeCategory } from '@/types/theme'
import { DEFAULT_THEME, presetToTheme } from '@/types/theme'
import { themePresetsList, getPresetBySlug, getDefaultPreset } from '@/config/themePresets'
import { getApiBaseUrl } from '@/utils/apiUrl'

const STORAGE_KEY = 'synthstack-theme'
const API_BASE = getApiBaseUrl()

export const useThemeStore = defineStore('theme', () => {
  // ============================================
  // State
  // ============================================

  /** Current preset slug */
  const currentPresetSlug = ref<string>('synthstack')

  /** Currently active theme (converted from preset) */
  const currentTheme = ref<Theme>(DEFAULT_THEME)

  /** Current color mode preference (independent of preset) */
  const colorMode = ref<ColorMode>('system')

  /** Resolved mode after applying system preference */
  const resolvedMode = ref<'light' | 'dark'>('dark')

  /** Available presets (code-defined) */
  const presets = ref<ThemePreset[]>(themePresetsList)

  /** Custom themes from Directus (merged with presets) */
  const customThemes = ref<Theme[]>([])

  /** Site-wide theme settings */
  const settings = ref<SiteThemeSettings | null>(null)

  /** Loading state */
  const isLoading = ref(false)

  /** Error state */
  const error = ref<string | null>(null)

  // ============================================
  // Computed
  // ============================================

  /** Current preset object */
  const currentPreset = computed(() =>
    getPresetBySlug(currentPresetSlug.value) || getDefaultPreset()
  )

  /** Whether dark mode is active */
  const isDark = computed(() => resolvedMode.value === 'dark')

  /** Current theme slug (alias for preset slug) */
  const themeSlug = computed(() => currentPresetSlug.value)

  /** All available presets (code-defined) */
  const availablePresets = computed(() => presets.value)

  /** All themes (presets converted to Theme format + custom) */
  const themes = computed(() => {
    const presetThemes = presets.value.map(p => presetToTheme(p))
    return [...presetThemes, ...customThemes.value]
  })

  /** Available published themes */
  const availableThemes = computed(() =>
    themes.value.filter(t => t.status === 'published')
  )

  /** Default preset */
  const defaultPreset = computed(() =>
    presets.value.find(p => p.isDefault) || getDefaultPreset()
  )

  /** Default theme */
  const defaultTheme = computed(() =>
    presetToTheme(defaultPreset.value)
  )

  /** Free presets only */
  const freePresets = computed(() =>
    presets.value.filter(p => !p.isPremium)
  )

  /** Premium presets only */
  const premiumPresets = computed(() =>
    presets.value.filter(p => p.isPremium)
  )

  /** Get presets by category */
  function getPresetsByCategory(category: ThemeCategory): ThemePreset[] {
    if (category === 'all') return presets.value
    return presets.value.filter(p => p.category === category)
  }

  // ============================================
  // Actions
  // ============================================

  /**
   * Initialize theme system
   * - Load saved preferences
   * - Apply theme immediately
   * - Fetch custom themes from API (non-blocking)
   */
  async function initialize() {
    if (typeof window === 'undefined') return

    // Load saved preferences first
    loadSavedPreferences()

    // Resolve system preference
    resolveColorMode()

    // Apply theme immediately with saved/default
    applyTheme()

    // Then fetch custom themes from API (non-blocking)
    fetchCustomThemes().catch(logError)

    // Listen for system color scheme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', (e) => {
        if (colorMode.value === 'system') {
          resolvedMode.value = e.matches ? 'dark' : 'light'
          applyTheme()
        }
      })
    }
  }

  /**
   * Load saved preferences from localStorage
   */
  function loadSavedPreferences() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return

      // Handle legacy format (just 'light' or 'dark')
      if (saved === 'light' || saved === 'dark') {
        colorMode.value = saved as ColorMode
        return
      }

      const prefs = JSON.parse(saved)

      // Load color mode
      if (prefs.colorMode) {
        colorMode.value = prefs.colorMode
      }

      // Load preset slug
      if (prefs.presetSlug || prefs.themeSlug) {
        const slug = prefs.presetSlug || prefs.themeSlug
        // Verify preset exists
        if (getPresetBySlug(slug)) {
          currentPresetSlug.value = slug
        }
      }
    } catch (e) {
      devWarn('Failed to load theme preferences:', e)
    }
  }

  /**
   * Save preferences to localStorage
   */
  function savePreferences() {
    if (typeof localStorage === 'undefined') return

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      presetSlug: currentPresetSlug.value,
      colorMode: colorMode.value,
    }))
  }

  /**
   * Resolve 'system' mode to actual light/dark
   */
  function resolveColorMode() {
    if (colorMode.value === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        resolvedMode.value = prefersDark ? 'dark' : 'light'
      } else {
        resolvedMode.value = 'dark' // Default fallback
      }
    } else {
      resolvedMode.value = colorMode.value
    }
  }

  /**
   * Fetch custom themes from Directus API
   */
  async function fetchCustomThemes() {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/api/v1/themes`)
      if (!response.ok) throw new Error('Failed to fetch themes')

      const data = await response.json()
      if (data.data && Array.isArray(data.data)) {
        // Filter out themes that match preset slugs (presets take precedence)
        const presetSlugs = new Set(presets.value.map(p => p.slug))
        customThemes.value = data.data.filter((t: Theme) => !presetSlugs.has(t.slug))
      }
    } catch (e) {
      devWarn('Could not fetch custom themes, using presets only:', e)
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Set the active preset by slug
   */
  function setPreset(presetSlug: string) {
    const preset = getPresetBySlug(presetSlug)
    if (!preset) {
      devWarn(`Preset "${presetSlug}" not found, using default`)
      currentPresetSlug.value = 'synthstack'
    } else {
      currentPresetSlug.value = presetSlug
    }

    // Update current theme
    currentTheme.value = presetToTheme(currentPreset.value)

    applyTheme()
    savePreferences()
  }

  /**
   * Set the active theme (legacy compatibility)
   * Accepts Theme object or slug string
   */
  function setTheme(themeOrSlug: Theme | string) {
    const slug = typeof themeOrSlug === 'string' ? themeOrSlug : themeOrSlug.slug
    setPreset(slug)
  }

  /**
   * Set color mode (light/dark/system)
   * This is INDEPENDENT of the preset selection
   */
  function setColorMode(mode: ColorMode) {
    colorMode.value = mode
    resolveColorMode()
    applyTheme()
    savePreferences()
  }

  /**
   * Toggle between light and dark mode
   */
  function toggleDarkMode() {
    // If on system, switch to explicit mode
    if (colorMode.value === 'system') {
      colorMode.value = resolvedMode.value === 'dark' ? 'light' : 'dark'
    } else {
      colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
    }
    resolveColorMode()
    applyTheme()
    savePreferences()
  }

  /**
   * Legacy compatibility
   */
  function setDarkMode(value: boolean) {
    setColorMode(value ? 'dark' : 'light')
  }

  /**
   * Apply current theme to DOM
   */
  function applyTheme() {
    if (typeof document === 'undefined') return

    try {
      const root = document.documentElement
      const body = document.body
      const preset = currentPreset.value

      // Safety check - ensure preset exists
      if (!preset) {
        devWarn('No preset found, skipping theme application')
        return
      }

      const isDarkMode = resolvedMode.value === 'dark'

      // Update current theme ref
      currentTheme.value = presetToTheme(preset)

      // Toggle body classes for mode
      body.classList.toggle('body--dark', isDarkMode)
      body.classList.toggle('body--light', !isDarkMode)
      // Toggle root (html) classes - BOTH dark AND light needed for CSS selectors
      root.classList.toggle('dark', isDarkMode)
      root.classList.toggle('light', !isDarkMode)

      // Set theme/preset class
      root.setAttribute('data-theme', preset.slug)
      root.setAttribute('data-preset', preset.slug)

      // Generate and apply CSS variables
      const vars = generateCSSVariables(preset, isDarkMode)
      Object.entries(vars).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          root.style.setProperty(key, value)
        }
      })

      // Light mode is handled by CSS variables and app.scss
      // No additional JavaScript-based overrides needed

      // Apply custom CSS if present
      applyCustomCSS(preset, isDarkMode)

      // Update meta theme-color
      const bgColor = isDarkMode ? preset.dark?.bg?.base : preset.light?.bg?.base
      if (bgColor) {
        const metaTheme = document.querySelector('meta[name="theme-color"]')
        if (metaTheme) {
          metaTheme.setAttribute('content', bgColor)
        }
      }
    } catch (error) {
      devWarn('Error applying theme:', error)
    }
  }

  /**
   * Generate CSS variables from preset
   */
  function generateCSSVariables(preset: ThemePreset, isDark: boolean): Record<string, string> {
    const mode = isDark ? preset.dark : preset.light

    // Fallback values if mode is completely missing
    const fallbackBg = {
      base: isDark ? '#09090B' : '#FFFFFF',
      subtle: isDark ? '#18181B' : '#FAFAFA',
      muted: isDark ? '#27272A' : '#F5F5F5',
      elevated: isDark ? '#09090B' : '#FFFFFF',
    }
    const fallbackText = {
      primary: isDark ? '#FAFAFA' : '#111111',
      secondary: isDark ? '#A1A1AA' : '#4A4A4A',
      tertiary: isDark ? '#71717A' : '#8A8A8A',
    }
    const fallbackBorder = {
      default: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      subtle: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    }
    const fallbackShadow = {
      sm: '0 1px 2px rgba(0,0,0,0.05)',
      md: '0 4px 6px rgba(0,0,0,0.1)',
      lg: '0 10px 15px rgba(0,0,0,0.1)',
      xl: '0 20px 25px rgba(0,0,0,0.15)',
    }

    // Use mode values with fallbacks
    const bg = mode?.bg || fallbackBg
    const text = mode?.text || fallbackText
    const border = mode?.border || fallbackBorder
    const shadow = mode?.shadow || fallbackShadow

    if (!mode) {
      devWarn(`Missing ${isDark ? 'dark' : 'light'} mode for preset ${preset.slug}, using fallbacks`)
    }

    return {
      // Backgrounds (using fallback-aware variables)
      '--bg-base': bg.base,
      '--bg-subtle': bg.subtle,
      '--bg-muted': bg.muted,
      '--bg-elevated': bg.elevated,

      // Text (using fallback-aware variables)
      '--text-primary': text.primary,
      '--text-secondary': text.secondary,
      '--text-tertiary': text.tertiary,

      // Borders (using fallback-aware variables)
      '--border-default': border.default,
      '--border-subtle': border.subtle,

      // Shadows (using fallback-aware variables)
      '--shadow-sm': shadow.sm,
      '--shadow-md': shadow.md,
      '--shadow-lg': shadow.lg,
      '--shadow-xl': shadow.xl,

      // Colors (same for both modes)
      '--color-primary': preset.colors.primary,
      '--color-primary-hover': preset.colors.primaryHover,
      '--color-secondary': preset.colors.secondary,
      '--color-secondary-hover': preset.colors.secondaryHover,
      '--color-accent': preset.colors.accent,
      '--color-accent-hover': preset.colors.accentHover,
      '--color-success': preset.colors.success,
      '--color-warning': preset.colors.warning,
      '--color-error': preset.colors.error,
      '--color-info': preset.colors.info,

      // Quasar compatibility
      '--q-primary': preset.colors.primary,
      '--q-secondary': preset.colors.secondary,
      '--q-accent': preset.colors.accent,
      '--q-positive': preset.colors.success,
      '--q-negative': preset.colors.error,
      '--q-info': preset.colors.info,
      '--q-warning': preset.colors.warning,

      // Typography
      '--font-sans': preset.typography.fontSans,
      '--font-mono': preset.typography.fontMono,
      '--font-display': preset.typography.fontDisplay,
      '--font-size-base': preset.typography.fontSizeBase,

      // Border Radius
      '--radius-sm': preset.style.borderRadius.sm,
      '--radius-md': preset.style.borderRadius.md,
      '--radius-lg': preset.style.borderRadius.lg,
      '--radius-xl': preset.style.borderRadius.xl,
      '--radius-full': preset.style.borderRadius.full,

      // Effects
      '--blur-sm': preset.style.blur.sm,
      '--blur-md': preset.style.blur.md,
      '--blur-lg': preset.style.blur.lg,
      '--glass-opacity': String(preset.style.glassOpacity),

      // Animation
      '--transition-fast': preset.transitions.fast,
      '--transition-normal': preset.transitions.normal,
      '--transition-slow': preset.transitions.slow,
      '--easing-default': preset.transitions.easing,
      '--easing-bounce': preset.transitions.easingBounce,

      // Components
      '--button-px': preset.components.buttonPaddingX,
      '--button-py': preset.components.buttonPaddingY,
      '--input-px': preset.components.inputPaddingX,
      '--input-py': preset.components.inputPaddingY,
      '--card-padding': preset.components.cardPadding,

      // Legacy compatibility
      '--spacing-unit': '4px',
    }
  }

  /**
   * Apply custom CSS from preset
   */
  function applyCustomCSS(preset: ThemePreset, isDark: boolean) {
    const styleId = 'theme-custom-css'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null

    const customCSS = isDark ? preset.customCSS?.dark : preset.customCSS?.light

    if (!customCSS) {
      if (styleEl) styleEl.remove()
      return
    }

    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    styleEl.textContent = customCSS
  }

  /**
   * Fetch themes from API (legacy compatibility)
   */
  async function fetchThemes() {
    return fetchCustomThemes()
  }

  // ============================================
  // Exports
  // ============================================

  return {
    // State
    currentPresetSlug,
    currentPreset,
    currentTheme,
    colorMode,
    resolvedMode,
    presets,
    customThemes,
    settings,
    isLoading,
    error,

    // Computed
    isDark,
    themeSlug,
    themes,
    availablePresets,
    availableThemes,
    defaultPreset,
    defaultTheme,
    freePresets,
    premiumPresets,

    // Actions
    initialize,
    setPreset,
    setTheme,
    setColorMode,
    setDarkMode,
    toggleDarkMode,
    fetchThemes,
    fetchCustomThemes,
    applyTheme,
    getPresetsByCategory,
  }
})

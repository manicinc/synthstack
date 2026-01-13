import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import {
  branding,
  getThemedLogo,
  getThemedMark,
  getThemedFavicon,
  getSubdomainUrl,
  type BrandingConfig,
} from '@/config/branding'

/**
 * Composable for accessing branding configuration with theme awareness
 *
 * @example
 * ```vue
 * <script setup>
 * import { useBranding } from '@/composables/useBranding'
 *
 * const { name, logo, mark, colors } = useBranding()
 * </script>
 *
 * <template>
 *   <img :src="logo" :alt="name" />
 * </template>
 * ```
 */
export function useBranding() {
  const themeStore = useThemeStore()

  /** Current logo based on theme */
  const logo = computed(() => getThemedLogo(themeStore.isDark))

  /** Current mark/icon based on theme */
  const mark = computed(() => getThemedMark(themeStore.isDark))

  /** Current favicon based on theme */
  const favicon = computed(() => getThemedFavicon(themeStore.isDark))

  /** Check if dark mode is active */
  const isDark = computed(() => themeStore.isDark)

  /** Demo config with dynamic adminUrl that detects localhost */
  const demo = computed(() => {
    const isLocalhost = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

    return {
      ...branding.demo,
      // Use local Directus URL when running on localhost
      adminUrl: import.meta.env.VITE_ADMIN_URL ||
        (isLocalhost ? 'http://localhost:8056' : getSubdomainUrl('admin'))
    }
  })

  return {
    // Static config
    ...branding,

    // Theme-aware computed values
    logo,
    mark,
    favicon,
    isDark,

    // Override demo with dynamic adminUrl
    demo,

    // Raw config access
    config: branding as BrandingConfig,

    // Utility functions
    getThemedLogo,
    getThemedMark,
    getThemedFavicon,
  }
}

export default useBranding

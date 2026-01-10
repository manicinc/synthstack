import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import {
  branding,
  getThemedLogo,
  getThemedMark,
  getThemedFavicon,
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

  return {
    // Static config
    ...branding,

    // Theme-aware computed values
    logo,
    mark,
    favicon,
    isDark,

    // Raw config access
    config: branding as BrandingConfig,

    // Utility functions
    getThemedLogo,
    getThemedMark,
    getThemedFavicon,
  }
}

export default useBranding

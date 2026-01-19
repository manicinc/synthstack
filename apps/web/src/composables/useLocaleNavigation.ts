/**
 * Locale-aware Navigation Composable
 *
 * Provides utilities for building routes that preserve the current locale prefix.
 * Used for navigation in app layouts and components.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

export function useLocaleNavigation() {
  const route = useRoute()

  // Get the current locale prefix from route params
  // Safety check: route may be undefined if called before router is ready
  const currentLocalePrefix = computed(() => {
    if (!route) return ''
    const locale = route.params?.locale as string
    return locale || ''
  })

  // Check if route name matches (with or without -locale suffix)
  function isRouteName(name: string): boolean {
    if (!route) return false
    const routeName = route.name?.toString() || ''
    return routeName === name || routeName === `${name}-locale`
  }

  // Build locale-aware route object for named routes
  function buildRoute(name: string, params?: Record<string, string>): RouteLocationRaw {
    const localePrefix = currentLocalePrefix.value
    const routeName = localePrefix ? `${name}-locale` : name
    return {
      name: routeName,
      params: localePrefix ? { ...params, locale: localePrefix } : params
    }
  }

  // Build locale-aware path for direct path navigation
  function buildPath(path: string): string {
    const localePrefix = currentLocalePrefix.value
    if (!localePrefix) return path
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `/${localePrefix}${normalizedPath}`
  }

  // Check if currently on a locale-prefixed route
  const isLocaleRoute = computed(() => {
    return !!currentLocalePrefix.value
  })

  return {
    currentLocalePrefix,
    isRouteName,
    buildRoute,
    buildPath,
    isLocaleRoute
  }
}

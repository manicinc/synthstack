/**
 * Localized Router Composable
 *
 * Provides navigation methods that automatically handle locale prefixes.
 * Use this instead of the standard useRouter() for programmatic navigation.
 */
import { useRouter, useRoute } from 'vue-router';
import type { RouteLocationRaw, NavigationFailure } from 'vue-router';
import { getShortLocale, DEFAULT_LOCALE, isValidLocalePrefix } from '@/router/locale-routes';
import { useI18nStore } from '@/stores/i18n';

export function useLocalizedRouter() {
  const router = useRouter();
  const route = useRoute();
  const i18nStore = useI18nStore();

  /**
   * Get the current locale prefix from the route
   * @returns Short locale code (e.g., 'en', 'es')
   */
  function getCurrentLocalePrefix(): string {
    const localeParam = route.params.locale as string;
    if (localeParam && isValidLocalePrefix(localeParam)) {
      return localeParam;
    }
    // Fallback to store's current locale
    return getShortLocale(i18nStore.currentLocale || DEFAULT_LOCALE);
  }

  /**
   * Add locale prefix to a path string (only for non-English locales)
   * English routes are at / without prefix, other locales at /:locale/
   * @param path - Path to localize (e.g., '/pricing')
   * @returns Localized path (e.g., '/pricing' for English, '/es/pricing' for Spanish)
   */
  function localizePath(path: string): string {
    const locale = getCurrentLocalePrefix();

    // Already has locale prefix - remove /en/ prefix if present
    if (path.match(/^\/en\//)) {
      return path.replace(/^\/en/, '');
    }
    if (path.match(/^\/(es|fr|de|zh|ja)\//)) {
      return path;
    }

    // English routes don't need prefix
    if (locale === 'en') {
      return path;
    }

    // Add locale prefix for non-English if path starts with /
    if (path.startsWith('/')) {
      return `/${locale}${path}`;
    }

    // Relative path, return as-is
    return path;
  }

  /**
   * Add locale prefix to a route location (only for non-English locales)
   * @param to - Route location to localize
   * @returns Localized route location
   */
  function localizeRoute(to: RouteLocationRaw): RouteLocationRaw {
    const locale = getCurrentLocalePrefix();

    // String path
    if (typeof to === 'string') {
      return localizePath(to);
    }

    // Object with path property
    if ('path' in to && typeof to.path === 'string') {
      return {
        ...to,
        path: localizePath(to.path),
      };
    }

    // Named route - add locale param only for non-English
    if ('name' in to) {
      if (locale === 'en') {
        // English routes don't use locale param
        return to;
      }
      return {
        ...to,
        params: {
          ...('params' in to ? to.params : {}),
          locale,
        },
      };
    }

    return to;
  }

  /**
   * Navigate to a route with automatic locale prefixing
   * @param to - Route location
   * @returns Promise that resolves when navigation completes
   */
  async function push(to: RouteLocationRaw): Promise<NavigationFailure | void | undefined> {
    return router.push(localizeRoute(to));
  }

  /**
   * Replace current route with automatic locale prefixing
   * @param to - Route location
   * @returns Promise that resolves when navigation completes
   */
  async function replace(to: RouteLocationRaw): Promise<NavigationFailure | void | undefined> {
    return router.replace(localizeRoute(to));
  }

  /**
   * Go back in history
   */
  function back(): void {
    router.back();
  }

  /**
   * Go forward in history
   */
  function forward(): void {
    router.forward();
  }

  /**
   * Go to a specific position in history
   * @param delta - Position delta
   */
  function go(delta: number): void {
    router.go(delta);
  }

  return {
    // Localized navigation methods
    push,
    replace,
    back,
    forward,
    go,

    // Utility methods
    localizePath,
    localizeRoute,
    getCurrentLocalePrefix,

    // Access to underlying router if needed
    router,
  };
}

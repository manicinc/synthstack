/**
 * Locale Route Helpers
 *
 * Utilities for handling language-prefixed routes in the application.
 * Maps full locale codes (en-US) to URL-friendly short codes (en).
 */
import type { RouteRecordRaw } from 'vue-router';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/i18n';

// Re-export for consumers that import from this module
export { DEFAULT_LOCALE };

/**
 * Short codes for URL-friendly paths
 * Maps full locale code to short URL code
 */
export const LOCALE_SHORT_CODES: Record<string, string> = {
  'en-US': 'en',
  'es': 'es',
  'fr': 'fr',
  'de': 'de',
  'zh-CN': 'zh',
  'ja': 'ja',
};

/**
 * Reverse mapping: short code -> full locale code
 */
export const SHORT_TO_FULL_LOCALE: Record<string, string> = {
  'en': 'en-US',
  'es': 'es',
  'fr': 'fr',
  'de': 'de',
  'zh': 'zh-CN',
  'ja': 'ja',
};

/**
 * Valid locale pattern for route params (en|es|fr|de|zh|ja)
 */
export const VALID_LOCALE_PATTERN = Object.keys(SHORT_TO_FULL_LOCALE).join('|');

/**
 * Non-English locale pattern for routes (es|fr|de|zh|ja)
 * English routes are served at / without prefix
 */
export const NON_ENGLISH_LOCALE_PATTERN = Object.keys(SHORT_TO_FULL_LOCALE)
  .filter(code => code !== 'en')
  .join('|');

/**
 * Convert full locale code to short URL-friendly code
 * @param fullLocale - Full locale code (e.g., 'en-US', 'zh-CN')
 * @returns Short locale code (e.g., 'en', 'zh')
 */
export function getShortLocale(fullLocale: string): string {
  return LOCALE_SHORT_CODES[fullLocale] || 'en';
}

/**
 * Convert short URL code to full locale code
 * @param shortLocale - Short locale code (e.g., 'en', 'zh')
 * @returns Full locale code (e.g., 'en-US', 'zh-CN')
 */
export function getFullLocale(shortLocale: string): string {
  return SHORT_TO_FULL_LOCALE[shortLocale] || DEFAULT_LOCALE;
}

/**
 * Check if a string is a valid locale prefix
 * @param prefix - String to check
 * @returns True if the prefix is a valid locale code
 */
export function isValidLocalePrefix(prefix: string): boolean {
  return prefix in SHORT_TO_FULL_LOCALE;
}

/**
 * Wrap routes with a locale prefix parameter
 * Adds /:locale(en|es|fr|de|zh|ja) prefix to all top-level routes
 *
 * @param routes - Array of route records to wrap
 * @returns Routes with locale parameter added
 */
export function wrapWithLocale(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.map(route => {
    // Only wrap routes with absolute paths (top-level routes)
    if (route.path.startsWith('/')) {
      return {
        ...route,
        path: `/:locale(${VALID_LOCALE_PATTERN})${route.path}`,
      };
    }
    // Keep relative paths unchanged (child routes)
    return route;
  });
}

/**
 * Wrap routes with non-English locale prefix only
 * English is served at / without prefix, other locales use /:locale/
 *
 * @param routes - Array of route records to wrap
 * @returns Routes with locale parameter added (non-English only)
 */
export function wrapWithNonEnglishLocale(routes: RouteRecordRaw[]): RouteRecordRaw[] {
  return routes.map(route => {
    if (route.path.startsWith('/')) {
      return {
        ...route,
        path: `/:locale(${NON_ENGLISH_LOCALE_PATTERN})${route.path}`,
      };
    }
    return route;
  });
}

/**
 * Get the default short locale code
 */
export function getDefaultShortLocale(): string {
  return getShortLocale(DEFAULT_LOCALE);
}

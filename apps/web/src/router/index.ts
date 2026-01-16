/**
 * SynthStack Vue Router Configuration
 */
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import routes from './routes';
import { isValidLocalePrefix, getFullLocale, getShortLocale } from './locale-routes';
import { DEFAULT_LOCALE, getBrowserLocale } from '@/i18n';

export default function createAppRouter(ssrContext?: any) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : createWebHistory;

  // Disable browser's native scroll restoration to prevent conflicts
  if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  const Router = createRouter({
    scrollBehavior: (to, from, savedPosition) => {
      // Always scroll to top for landing page
      if (to.path === '/' || to.path === '') {
        return { top: 0, left: 0, behavior: 'instant' };
      }
      if (savedPosition) {
        return savedPosition;
      }
      if (to.hash) {
        return { el: to.hash, behavior: 'smooth' };
      }
      return { top: 0, behavior: 'smooth' };
    },
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // =========================================
  // Navigation Guards for Locale Handling
  // =========================================

  /**
   * Before each navigation: handle locale detection and validation
   * English routes are at / (no prefix), other locales at /:locale/
   */
  Router.beforeEach(async (to, from, next) => {
    const localeParam = to.params.locale as string | undefined;

    // Root path (/) serves English - check if user prefers another language
    if (to.path === '/') {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('synthstack-locale');
        if (saved) {
          const shortLocale = getShortLocale(saved);
          // Only redirect if user prefers a non-English locale
          if (shortLocale !== 'en') {
            return next({
              path: `/${shortLocale}`,
              query: to.query,
              hash: to.hash,
              replace: true
            });
          }
        }
      }
      // English or no preference - stay at /, set lang to English
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('synthstack-locale', 'en-US');
        } catch (e) {
          // localStorage might be disabled
        }
      }
      return next();
    }

    // Validate locale parameter if present (non-English routes)
    if (localeParam) {
      if (!isValidLocalePrefix(localeParam)) {
        // Invalid locale - redirect to English path (no prefix)
        const pathWithoutLocale = to.path.replace(`/${localeParam}`, '') || '/';
        return next({
          path: pathWithoutLocale,
          query: to.query,
          hash: to.hash,
          replace: true
        });
      }

      // Valid locale - sync with store
      const fullLocale = getFullLocale(localeParam);

      // Store locale in localStorage for future visits
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('synthstack-locale', fullLocale);
        } catch (e) {
          // localStorage might be disabled
        }
      }
    } else {
      // No locale param means English route
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('synthstack-locale', 'en-US');
        } catch (e) {
          // localStorage might be disabled
        }
      }
    }

    next();
  });

  /**
   * After each navigation: update document attributes
   */
  Router.afterEach((to) => {
    const localeParam = to.params.locale as string;

    // Determine locale: from param or default to English
    const fullLocale = localeParam && isValidLocalePrefix(localeParam)
      ? getFullLocale(localeParam)
      : 'en-US';
    const langCode = fullLocale.split('-')[0]; // 'en-US' -> 'en'

    // Update document lang attribute for accessibility and SEO
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', langCode);
      document.documentElement.setAttribute('data-locale', fullLocale);

      // Set text direction (all current locales are LTR, but future-proof)
      const isRTL = false; // Could check locale definition if RTL languages added
      document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    }
  });

  return Router;
}

export { routes };

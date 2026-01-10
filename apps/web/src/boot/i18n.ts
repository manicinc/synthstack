/**
 * SynthStack i18n Boot File
 *
 * Initializes vue-i18n with multi-locale support including:
 * - 6 languages (en-US, es, fr, de, zh-CN, ja)
 * - Quasar lang pack integration
 * - Store-based locale management
 * - Dynamic locale switching
 * - Router integration for URL-based locale detection
 */
import { boot } from 'quasar/wrappers';
import { createI18n } from 'vue-i18n';
import { Quasar } from 'quasar';
import { watch } from 'vue';
import { messages, DEFAULT_LOCALE, FALLBACK_LOCALE, loadQuasarLang } from '@/i18n';
import { useI18nStore } from '@/stores/i18n';
import { getFullLocale, isValidLocalePrefix } from '@/router/locale-routes';
import type { LocaleMessages } from '@/i18n/types';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

// Type helpers
export type MessageLanguages = keyof typeof messages;
export type MessageSchema = LocaleMessages;

// Create i18n instance
// Note: Type safety is provided via DefineLocaleMessage augmentation in src/types/vue-i18n.d.ts
// This allows t() to work with just a key argument while still being type-safe
const i18n = createI18n({
  locale: DEFAULT_LOCALE,
  fallbackLocale: FALLBACK_LOCALE,
  legacy: false,
  globalInjection: true,
  messages,
  missingWarn: import.meta.env.DEV,
  fallbackWarn: import.meta.env.DEV,
});

export default boot(async ({ app, router }): Promise<void> => {
  // Register i18n plugin
  app.use(i18n);

  // Initialize store after router is ready
  // The router guard will handle initial locale detection
  router.isReady().then(async () => {
    try {
      const i18nStore = useI18nStore();

      // Get initial locale from route
      const currentRoute = router.currentRoute.value;
      const localeParam = currentRoute.params.locale as string;

      if (localeParam && isValidLocalePrefix(localeParam)) {
        // Route has valid locale - use it
        const fullLocale = getFullLocale(localeParam);
        await i18nStore.setLocale(fullLocale);
      } else {
        // No valid locale in route (shouldn't happen with our setup)
        // Initialize normally from localStorage/browser
        await i18nStore.initialize();
      }

      // Watch for locale changes from the store
      // This keeps vue-i18n and Quasar in sync when locale changes
      watch(
        () => i18nStore.currentLocale,
        async (newLocale) => {
          // Update vue-i18n locale
          if (i18n.global.locale) {
            i18n.global.locale.value = newLocale;
          }

          // Load and apply Quasar lang pack
          try {
            const langPack = await loadQuasarLang(newLocale);
            if (langPack) {
              Quasar.lang.set(langPack as Parameters<typeof Quasar.lang.set>[0]);
            }
          } catch (e) {
            devWarn('Failed to load Quasar lang pack:', e);
          }
        },
        { immediate: true }
      );
    } catch (e) {
      devWarn('Failed to initialize i18n store:', e);
    }
  });
});

export { i18n };

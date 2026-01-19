/**
 * SynthStack i18n Configuration
 *
 * Supports lazy loading of locale files and dynamic locale switching.
 */

import type { LocaleDefinition, LocaleMessages } from './types';

// Import all locale files
import enUS from './locales/en-US.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zhCN from './locales/zh-CN.json';
import ja from './locales/ja.json';

/**
 * Supported locales with metadata
 */
export const SUPPORTED_LOCALES: LocaleDefinition[] = [
  {
    code: 'en-US',
    name: 'English',
    englishName: 'English',
    flag: '🇺🇸',
    direction: 'ltr',
    quasarLang: 'en-US',
    dateFormat: 'MM/dd/yyyy',
    enabled: true,
  },
  {
    code: 'es',
    name: 'Español',
    englishName: 'Spanish',
    flag: '🇪🇸',
    direction: 'ltr',
    quasarLang: 'es',
    dateFormat: 'dd/MM/yyyy',
    enabled: true,
  },
  {
    code: 'fr',
    name: 'Français',
    englishName: 'French',
    flag: '🇫🇷',
    direction: 'ltr',
    quasarLang: 'fr',
    dateFormat: 'dd/MM/yyyy',
    enabled: true,
  },
  {
    code: 'de',
    name: 'Deutsch',
    englishName: 'German',
    flag: '🇩🇪',
    direction: 'ltr',
    quasarLang: 'de',
    dateFormat: 'dd.MM.yyyy',
    enabled: true,
  },
  {
    code: 'zh-CN',
    name: '中文简体',
    englishName: 'Chinese (Simplified)',
    flag: '🇨🇳',
    direction: 'ltr',
    quasarLang: 'zh-CN',
    dateFormat: 'yyyy/MM/dd',
    enabled: true,
  },
  {
    code: 'ja',
    name: '日本語',
    englishName: 'Japanese',
    flag: '🇯🇵',
    direction: 'ltr',
    quasarLang: 'ja',
    dateFormat: 'yyyy/MM/dd',
    enabled: true,
  },
];

/**
 * Default locale code
 */
export const DEFAULT_LOCALE = 'en-US';

/**
 * Fallback locale code
 */
export const FALLBACK_LOCALE = 'en-US';

/**
 * All messages mapped by locale code
 */
export const messages: Record<string, LocaleMessages> = {
  'en-US': enUS as LocaleMessages,
  en: enUS as LocaleMessages, // Alias for browsers that use 'en' without region
  es: es as LocaleMessages,
  fr: fr as LocaleMessages,
  de: de as LocaleMessages,
  'zh-CN': zhCN as LocaleMessages,
  ja: ja as LocaleMessages,
};

/**
 * Get enabled locales only
 */
export function getEnabledLocales(): LocaleDefinition[] {
  return SUPPORTED_LOCALES.filter((locale) => locale.enabled);
}

/**
 * Get locale definition by code
 */
export function getLocaleDefinition(code: string): LocaleDefinition | undefined {
  return SUPPORTED_LOCALES.find((locale) => locale.code === code);
}

/**
 * Check if a locale code is supported
 */
export function isLocaleSupported(code: string): boolean {
  return SUPPORTED_LOCALES.some((locale) => locale.code === code && locale.enabled);
}

/**
 * Get the best matching locale for a browser language
 */
export function getBrowserLocale(): string {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage;

  if (!browserLang) {
    return DEFAULT_LOCALE;
  }

  // Exact match
  if (isLocaleSupported(browserLang)) {
    return browserLang;
  }

  // Match by language code only (e.g., 'en' matches 'en-US')
  const langCode = browserLang.split('-')[0];
  const matchedLocale = SUPPORTED_LOCALES.find(
    (locale) => locale.enabled && locale.code.startsWith(langCode)
  );

  return matchedLocale?.code || DEFAULT_LOCALE;
}

/**
 * Quasar lang pack mapping for dynamic imports
 */
export const QUASAR_LANG_IMPORTS: Record<string, () => Promise<unknown>> = {
  'en-US': () => import('quasar/lang/en-US'),
  es: () => import('quasar/lang/es'),
  fr: () => import('quasar/lang/fr'),
  de: () => import('quasar/lang/de'),
  'zh-CN': () => import('quasar/lang/zh-CN'),
  ja: () => import('quasar/lang/ja'),
};

/**
 * Load Quasar language pack for a locale
 */
export async function loadQuasarLang(locale: string): Promise<unknown> {
  const importFn = QUASAR_LANG_IMPORTS[locale];
  if (importFn) {
    const lang = await importFn();
    return (lang as { default: unknown }).default;
  }
  // Fallback to en-US
  const fallback = await import('quasar/lang/en-US');
  return fallback.default;
}

// Re-export types
export type { LocaleDefinition, LocaleMessages } from './types';

// Default export for backwards compatibility
export default messages;


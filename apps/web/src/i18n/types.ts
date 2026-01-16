/**
 * i18n Type Definitions
 */

export interface LocaleDefinition {
  /** ISO locale code: 'en-US', 'es', 'zh-CN' */
  code: string;
  /** Native name: 'English', 'Español', '中文' */
  name: string;
  /** English name for fallback display */
  englishName: string;
  /** Flag emoji or icon identifier */
  flag: string;
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Quasar lang pack name */
  quasarLang: string;
  /** date-fns format pattern */
  dateFormat: string;
  /** Whether this locale is enabled */
  enabled: boolean;
}

/**
 * LocaleMessages - Flexible type to support evolving locale JSON files
 * Uses index signatures for sections that vary between locales
 */
export interface LocaleMessages {
  app: {
    name: string;
    tagline: string;
  };
  nav: Record<string, string>;
  landing: Record<string, unknown>;
  auth: Record<string, unknown>;
  dashboard: Record<string, unknown>;
  generate: Record<string, unknown>;
  pricing: Record<string, unknown>;
  common: Record<string, string>;
  errors: Record<string, string>;
  language: {
    select: string;
    current: string;
  };
  // Allow additional top-level sections
  [key: string]: unknown;
}

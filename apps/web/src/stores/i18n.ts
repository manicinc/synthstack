/**
 * SynthStack i18n Store
 *
 * Internationalization state management with:
 * - Multi-locale support (6 languages)
 * - localStorage persistence
 * - Browser language detection
 * - Quasar lang pack integration
 * - User profile sync (when authenticated)
 */
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  getEnabledLocales,
  getLocaleDefinition,
  isLocaleSupported,
  getBrowserLocale,
  loadQuasarLang,
} from '@/i18n';
import type { LocaleDefinition } from '@/i18n/types';

const STORAGE_KEY = 'synthstack-locale';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3003';

export const useI18nStore = defineStore('i18n', () => {
  // ============================================
  // State
  // ============================================

  /** Currently active locale code */
  const currentLocale = ref<string>(DEFAULT_LOCALE);

  /** All available locales */
  const availableLocales = ref<LocaleDefinition[]>(SUPPORTED_LOCALES);

  /** Loading state */
  const isLoading = ref(false);

  /** Error state */
  const error = ref<string | null>(null);

  /** Whether i18n has been initialized */
  const isInitialized = ref(false);

  /** CMS translation overrides */
  const directusOverrides = ref<Record<string, string>>({});

  // ============================================
  // Computed
  // ============================================

  /** Current locale definition with metadata */
  const localeDefinition = computed<LocaleDefinition | undefined>(() =>
    getLocaleDefinition(currentLocale.value)
  );

  /** Whether current locale is RTL */
  const isRTL = computed(() => localeDefinition.value?.direction === 'rtl');

  /** Enabled locales only */
  const enabledLocales = computed(() => getEnabledLocales());

  /** Current locale flag emoji */
  const currentFlag = computed(() => localeDefinition.value?.flag || '🌐');

  /** Current locale native name */
  const currentLocaleName = computed(() => localeDefinition.value?.name || 'English');

  /** Date format for current locale */
  const dateFormat = computed(() => localeDefinition.value?.dateFormat || 'MM/dd/yyyy');

  // ============================================
  // Actions
  // ============================================

  /**
   * Initialize i18n system
   * - Load saved preference from localStorage
   * - Detect browser language
   * - Apply locale
   */
  async function initialize() {
    if (isInitialized.value) return;
    if (typeof window === 'undefined') return;

    isLoading.value = true;
    error.value = null;

    try {
      // 1. Check localStorage first
      const savedLocale = loadSavedLocale();

      // 2. If no saved locale, detect from browser
      const detectedLocale = savedLocale || getBrowserLocale();

      // 3. Set and apply locale
      await setLocale(detectedLocale, { skipSave: !!savedLocale });

      isInitialized.value = true;
    } catch (e) {
      logError('Failed to initialize i18n:', e);
      error.value = e instanceof Error ? e.message : 'Unknown error';
      // Fall back to default locale
      currentLocale.value = DEFAULT_LOCALE;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Load saved locale from localStorage
   */
  function loadSavedLocale(): string | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isLocaleSupported(saved)) {
        return saved;
      }
    } catch (e) {
      devWarn('Failed to load saved locale:', e);
    }
    return null;
  }

  /**
   * Save locale to localStorage
   */
  function saveLocale(locale: string) {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch (e) {
      devWarn('Failed to save locale:', e);
    }
  }

  /**
   * Set the active locale
   */
  async function setLocale(
    locale: string,
    options: { skipSave?: boolean } = {}
  ): Promise<void> {
    if (!isLocaleSupported(locale)) {
      devWarn(`Locale "${locale}" not supported, falling back to ${FALLBACK_LOCALE}`);
      locale = FALLBACK_LOCALE;
    }

    isLoading.value = true;

    try {
      // Update state
      currentLocale.value = locale;

      // Update vue-i18n locale (if available)
      updateVueI18nLocale(locale);

      // Load and apply Quasar lang pack
      await applyQuasarLang(locale);

      // Update document lang attribute
      updateDocumentLang(locale);

      // Update document direction
      updateDocumentDirection();

      // Fetch CMS overrides (optional, non-blocking)
      fetchDirectusOverrides(locale).catch(devWarn);

      // Save to localStorage
      if (!options.skipSave) {
        saveLocale(locale);
      }
    } catch (e) {
      logError('Failed to set locale:', e);
      error.value = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Update vue-i18n locale
   */
  function updateVueI18nLocale(locale: string) {
    // This will be called from the component that has access to useI18n()
    // The boot file sets up a watcher to handle this
  }

  /**
   * Load and apply Quasar language pack
   */
  async function applyQuasarLang(locale: string) {
    try {
      const langPack = await loadQuasarLang(locale);
      // The Quasar instance will be available in components
      // We'll emit an event or use a reactive value for this
      return langPack;
    } catch (e) {
      devWarn('Failed to load Quasar lang pack:', e);
    }
  }

  /**
   * Update document lang attribute
   */
  function updateDocumentLang(locale: string) {
    if (typeof document === 'undefined') return;

    // Set the lang attribute (e.g., 'en', 'es', 'zh')
    const langCode = locale.split('-')[0];
    document.documentElement.setAttribute('lang', langCode);

    // Also set the full locale for compatibility
    document.documentElement.setAttribute('data-locale', locale);
  }

  /**
   * Update document direction for RTL support
   */
  function updateDocumentDirection() {
    if (typeof document === 'undefined') return;

    const direction = isRTL.value ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
    document.body.setAttribute('dir', direction);
  }

  /**
   * Fetch translation overrides from Directus CMS
   */
  async function fetchDirectusOverrides(locale: string) {
    try {
      const response = await fetch(`${API_BASE}/api/v1/i18n/translations/${locale}`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.data) {
        directusOverrides.value = data.data;
      }
    } catch {
      // Non-critical, silently fail
    }
  }

  /**
   * Sync locale preference with user profile
   */
  async function syncWithUser(userId: string, accessToken: string) {
    try {
      // First, try to get user's saved preference
      const response = await fetch(`${API_BASE}/api/v1/users/${userId}/preferences`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferred_locale && isLocaleSupported(data.preferred_locale)) {
          await setLocale(data.preferred_locale);
          return;
        }
      }

      // If no preference found, save current locale to user profile
      await saveUserPreference(userId, accessToken, currentLocale.value);
    } catch (e) {
      devWarn('Failed to sync locale with user:', e);
    }
  }

  /**
   * Save locale preference to user profile
   */
  async function saveUserPreference(userId: string, accessToken: string, locale: string) {
    try {
      await fetch(`${API_BASE}/api/v1/users/${userId}/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ preferred_locale: locale }),
      });
    } catch {
      // Non-critical
    }
  }

  /**
   * Get translation with optional CMS override
   */
  function getTranslation(key: string, fallback?: string): string | undefined {
    // Check CMS overrides first
    if (directusOverrides.value[key]) {
      return directusOverrides.value[key];
    }
    return fallback;
  }

  // ============================================
  // Exports
  // ============================================

  return {
    // State
    currentLocale,
    availableLocales,
    isLoading,
    error,
    isInitialized,
    directusOverrides,

    // Computed
    localeDefinition,
    isRTL,
    enabledLocales,
    currentFlag,
    currentLocaleName,
    dateFormat,

    // Actions
    initialize,
    setLocale,
    syncWithUser,
    getTranslation,
    loadSavedLocale,
    saveLocale,
  };
});

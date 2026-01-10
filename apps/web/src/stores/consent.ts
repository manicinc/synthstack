/**
 * Cookie Consent Store
 * 
 * Centralized state management for cookie consent preferences.
 * Integrates with Google Analytics 4 and Microsoft Clarity.
 * 
 * @module stores/consent
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import Clarity from '@microsoft/clarity'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

// Constants
const CONSENT_KEY = 'synthstack_cookie_consent'
const CONSENT_VERSION = '2.0'

// Google Analytics 4 Measurement ID
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''

// Microsoft Clarity Project ID
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || ''

// Google Ads ID (for conversion tracking)
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID || ''

export interface ConsentPreferences {
  essential: boolean      // Always true - required for site function
  functional: boolean     // Preferences, chat history, etc.
  analytics: boolean      // GA4, Clarity, error tracking
  marketing: boolean      // Ads, retargeting, social pixels
}

export interface StoredConsent {
  version: string
  consents: ConsentPreferences
  timestamp: string
}

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

export const useConsentStore = defineStore('consent', () => {
  // State
  const hasConsented = ref(false)
  const showBanner = ref(false)
  const analyticsInitialized = ref(false)
  const clarityInitialized = ref(false)
  
  const preferences = ref<ConsentPreferences>({
    essential: true,
    functional: true,
    analytics: false,
    marketing: false
  })

  // Computed
  const isAnalyticsAllowed = computed(() => preferences.value.analytics)
  const isMarketingAllowed = computed(() => preferences.value.marketing)
  const isFunctionalAllowed = computed(() => preferences.value.functional)

  // Initialize from localStorage
  function initialize(): void {
    const saved = localStorage.getItem(CONSENT_KEY)
    
    if (saved) {
      try {
        const parsed: StoredConsent = JSON.parse(saved)
        if (parsed.version === CONSENT_VERSION) {
          preferences.value = { ...preferences.value, ...parsed.consents }
          hasConsented.value = true
          applyConsents()
        } else {
          // Version mismatch - show banner again
          showBanner.value = true
        }
      } catch {
        showBanner.value = true
      }
    } else {
      showBanner.value = true
    }
  }

  // Save consent to localStorage
  function saveConsent(): void {
    const data: StoredConsent = {
      version: CONSENT_VERSION,
      consents: { ...preferences.value },
      timestamp: new Date().toISOString()
    }
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data))
    hasConsented.value = true
    showBanner.value = false
    applyConsents()
  }

  // Accept all cookies
  function acceptAll(): void {
    preferences.value.functional = true
    preferences.value.analytics = true
    preferences.value.marketing = true
    saveConsent()
  }

  // Reject all non-essential cookies
  function rejectAll(): void {
    preferences.value.functional = false
    preferences.value.analytics = false
    preferences.value.marketing = false
    saveConsent()
  }

  // Update specific consent category
  function updateConsent(category: keyof ConsentPreferences, value: boolean): void {
    if (category === 'essential') return // Cannot disable essential
    preferences.value[category] = value
  }

  // Apply consent settings to analytics providers
  function applyConsents(): void {
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', {
      detail: { ...preferences.value }
    }))

    // Google Analytics / gtag consent update
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: preferences.value.analytics ? 'granted' : 'denied',
        ad_storage: preferences.value.marketing ? 'granted' : 'denied',
        ad_user_data: preferences.value.marketing ? 'granted' : 'denied',
        ad_personalization: preferences.value.marketing ? 'granted' : 'denied',
        functionality_storage: preferences.value.functional ? 'granted' : 'denied'
      })
    }

    // Microsoft Clarity consent update
    if (clarityInitialized.value) {
      Clarity.consent(preferences.value.analytics)
    }
  }

  // Initialize Google Analytics
  function initGoogleAnalytics(): void {
    if (!GA_MEASUREMENT_ID || analyticsInitialized.value) {
      if (!GA_MEASUREMENT_ID) {
        devLog('[Analytics] Google Analytics not configured')
      }
      return
    }

    // Load gtag.js
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    document.head.appendChild(script)

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || []
    window.gtag = function(...args: unknown[]) {
      window.dataLayer.push(args)
    }

    // Default consent mode (GDPR compliant - denied by default)
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      wait_for_update: 500
    })

    window.gtag('js', new Date())
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // We'll send page views manually on route change
      anonymize_ip: true
    })

    // Configure Google Ads if available
    if (GOOGLE_ADS_ID) {
      window.gtag('config', GOOGLE_ADS_ID)
    }

    analyticsInitialized.value = true
    devLog('[Analytics] Google Analytics initialized with ID:', GA_MEASUREMENT_ID)
  }

  // Initialize Microsoft Clarity
  function initMicrosoftClarity(): void {
    if (!CLARITY_PROJECT_ID || clarityInitialized.value) {
      if (!CLARITY_PROJECT_ID) {
        devLog('[Analytics] Microsoft Clarity not configured')
      }
      return
    }

    // Initialize Clarity using NPM package
    Clarity.init(CLARITY_PROJECT_ID)
    clarityInitialized.value = true
    devLog('[Analytics] Microsoft Clarity initialized with ID:', CLARITY_PROJECT_ID)

    // Apply initial consent state
    if (hasConsented.value) {
      Clarity.consent(preferences.value.analytics)
    }
  }

  // Identify user in Clarity (call after authentication)
  function identifyUser(userId: string, sessionId?: string, pageId?: string, friendlyName?: string): void {
    if (clarityInitialized.value && preferences.value.analytics) {
      Clarity.identify(userId, sessionId, pageId, friendlyName)
    }
  }

  // Set custom tag in Clarity
  function setTag(key: string, value: string | string[]): void {
    if (clarityInitialized.value && preferences.value.analytics) {
      Clarity.setTag(key, value)
    }
  }

  // Track custom event in Clarity
  function trackClarityEvent(eventName: string): void {
    if (clarityInitialized.value && preferences.value.analytics) {
      Clarity.event(eventName)
    }
  }

  // Upgrade session priority in Clarity
  function upgradeSession(reason: string): void {
    if (clarityInitialized.value && preferences.value.analytics) {
      Clarity.upgrade(reason)
    }
  }

  // Track page view
  function trackPageView(path: string, title: string): void {
    if (typeof window.gtag === 'function' && preferences.value.analytics) {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: title
      })
    }
  }

  // Track custom event
  function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
    if (typeof window.gtag === 'function' && preferences.value.analytics) {
      window.gtag('event', eventName, params)
    }
  }

  // Open settings modal
  function openSettings(): void {
    showBanner.value = true
    window.dispatchEvent(new CustomEvent('open-cookie-settings'))
  }

  return {
    // State
    hasConsented,
    showBanner,
    preferences,
    analyticsInitialized,
    clarityInitialized,
    
    // Computed
    isAnalyticsAllowed,
    isMarketingAllowed,
    isFunctionalAllowed,
    
    // Actions
    initialize,
    saveConsent,
    acceptAll,
    rejectAll,
    updateConsent,
    applyConsents,
    initGoogleAnalytics,
    initMicrosoftClarity,
    identifyUser,
    setTag,
    trackClarityEvent,
    upgradeSession,
    trackPageView,
    trackEvent,
    openSettings,
    
    // Constants (exposed for reference)
    GA_MEASUREMENT_ID,
    CLARITY_PROJECT_ID,
    GOOGLE_ADS_ID
  }
})



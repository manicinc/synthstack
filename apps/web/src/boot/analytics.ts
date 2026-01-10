/**
 * Analytics Boot File
 * 
 * Initializes Google Analytics 4 and Microsoft Clarity with GDPR-compliant
 * consent mode. Uses the consent store for centralized state management.
 * 
 * Analytics IDs:
 * - Google Analytics: G-GF2XVP9RXB (via VITE_GA_MEASUREMENT_ID)
 * - Microsoft Clarity: uxkn6j9d8a (via VITE_CLARITY_PROJECT_ID)
 * 
 * @module boot/analytics
 */
import { boot } from 'quasar/wrappers'
import type { Router } from 'vue-router'
import { useConsentStore } from '@/stores/consent'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

// Google Analytics 4 Measurement ID
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''

// Microsoft Clarity Project ID  
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || ''

// Google Ads ID (for conversion tracking)
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID || ''

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

/**
 * Track page view in Google Analytics
 */
function trackPageView(path: string, title: string): void {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title
    })
  }
}

/**
 * Track custom event in Google Analytics
 */
function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params)
  }
}

/**
 * SynthStack Analytics Events
 * Pre-defined event tracking for common user actions
 */
export const analyticsEvents = {
  // AI Copilot Events
  copilotMessage: (agentType: string, messageLength: number) => {
    trackEvent('copilot_message', {
      agent_type: agentType,
      message_length: messageLength,
      event_category: 'engagement'
    })
  },

  copilotResponse: (agentType: string, responseTime: number) => {
    trackEvent('copilot_response', {
      agent_type: agentType,
      response_time_ms: responseTime,
      event_category: 'engagement'
    })
  },

  // Project Events
  createProject: (projectType: string) => {
    trackEvent('create_project', {
      project_type: projectType,
      event_category: 'engagement'
    })
  },

  viewProject: (projectId: string) => {
    trackEvent('view_item', {
      item_id: projectId,
      item_category: 'project',
      event_category: 'engagement'
    })
  },

  // Generation Events (legacy support)
  generateProfile: (printer: string, filament: string, slicer: string) => {
    trackEvent('generate_profile', {
      printer,
      filament,
      slicer,
      event_category: 'engagement'
    })
  },

  downloadProfile: (slicer: string) => {
    trackEvent('download_profile', {
      slicer,
      event_category: 'engagement'
    })
  },

  uploadModel: (fileType: string, fileSize: number) => {
    trackEvent('upload_model', {
      file_type: fileType,
      file_size: fileSize,
      event_category: 'engagement'
    })
  },

  // Auth Events
  signUp: (method: string) => {
    trackEvent('sign_up', {
      method,
      event_category: 'engagement'
    })
  },

  signIn: (method: string) => {
    trackEvent('login', {
      method,
      event_category: 'engagement'
    })
  },

  // Subscription Events
  viewPricing: () => {
    trackEvent('view_pricing', {
      event_category: 'engagement'
    })
  },

  selectPlan: (planName: string, planPrice: number) => {
    trackEvent('select_item', {
      item_name: planName,
      price: planPrice,
      event_category: 'ecommerce'
    })
  },

  beginCheckout: (planName: string, planPrice: number) => {
    trackEvent('begin_checkout', {
      currency: 'USD',
      value: planPrice,
      items: [{
        item_name: planName,
        price: planPrice
      }]
    })
  },

  purchase: (planName: string, planPrice: number, transactionId: string) => {
    trackEvent('purchase', {
      transaction_id: transactionId,
      currency: 'USD',
      value: planPrice,
      items: [{
        item_name: planName,
        price: planPrice
      }]
    })
  },

  // Content Events
  viewItem: (itemName: string, itemCategory: string) => {
    trackEvent('view_item', {
      item_name: itemName,
      item_category: itemCategory,
      event_category: 'engagement'
    })
  },

  selectContent: (contentType: string, contentId: string) => {
    trackEvent('select_content', {
      content_type: contentType,
      content_id: contentId
    })
  },

  share: (contentType: string, method?: string) => {
    trackEvent('share', {
      content_type: contentType,
      method: method || 'unknown',
      event_category: 'engagement'
    })
  },

  // Error Events
  error: (errorType: string, errorMessage: string) => {
    trackEvent('exception', {
      description: `${errorType}: ${errorMessage}`,
      fatal: false
    })
  },

  // Feature Usage
  toggleFeature: (featureName: string, enabled: boolean) => {
    trackEvent('toggle_feature', {
      feature_name: featureName,
      enabled,
      event_category: 'engagement'
    })
  }
}

/**
 * Google Ads Conversion Tracking
 */
export const adConversions = {
  signUpComplete: () => {
    if (GOOGLE_ADS_ID && typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_ADS_ID}/signup_complete`
      })
    }
  },

  premiumSubscription: (value: number) => {
    if (GOOGLE_ADS_ID && typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_ADS_ID}/premium_subscription`,
        value,
        currency: 'USD'
      })
    }
  },

  trialStarted: () => {
    if (GOOGLE_ADS_ID && typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_ADS_ID}/trial_started`
      })
    }
  }
}

export default boot(({ router }: { router: Router }): void => {
  // Only initialize analytics in production or if explicitly enabled
  const shouldInitialize = import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
  
  if (!shouldInitialize) {
    devLog('[Analytics] Analytics disabled in development mode')
    devLog('[Analytics] Set VITE_ENABLE_ANALYTICS=true to enable in development')
    return
  }

  // Get consent store (will be initialized by CookieConsent component)
  const consentStore = useConsentStore()

  // Initialize analytics providers
  consentStore.initGoogleAnalytics()
  consentStore.initMicrosoftClarity()

  // Initialize consent state from localStorage
  consentStore.initialize()

  // Track page views on route change
  router.afterEach((to) => {
    const title = typeof to.meta.title === 'string' 
      ? to.meta.title 
      : 'SynthStack'
    
    // Only track if analytics consent is granted
    if (consentStore.isAnalyticsAllowed) {
      trackPageView(to.path, title)
    }
  })

  // Listen for consent updates
  window.addEventListener('cookie-consent-updated', ((event: CustomEvent) => {
    const consents = event.detail
    devLog('[Analytics] Consent updated:', consents)
    
    // If user grants analytics, track the current page
    if (consents.analytics && router.currentRoute.value) {
      const title = typeof router.currentRoute.value.meta.title === 'string'
        ? router.currentRoute.value.meta.title
        : 'SynthStack'
      trackPageView(router.currentRoute.value.path, title)
    }
  }) as EventListener)

  devLog('[Analytics] Boot complete')
  devLog('[Analytics] GA4 ID:', GA_MEASUREMENT_ID || 'Not configured')
  devLog('[Analytics] Clarity ID:', CLARITY_PROJECT_ID || 'Not configured')
})

export { trackEvent, trackPageView }

/**
 * SynthStack Branding Configuration
 *
 * Centralized configuration for all branding assets and settings.
 * Values are loaded from config.json with environment variable overrides.
 *
 * To rebrand for your own SaaS:
 * 1. Edit config.json in the project root
 * 2. Optionally override with environment variables (VITE_*)
 * 3. Replace logo files in /public/logo/
 * 4. Replace favicon files in /public/
 *
 * See docs/REBRANDING_GUIDE.md for complete instructions.
 *
 * @example
 * import { branding } from '@/config/branding'
 * console.log(branding.name) // 'SynthStack' or your custom name
 */

// Import centralized config (loaded at build time via Vite)
import configJson from '../../../../config.json'

// ============================================
// Types
// ============================================

export interface BrandingConfig {
  /** Company/Product name */
  name: string

  /** Tagline displayed in hero sections */
  tagline: string

  /** Short description for meta tags */
  description: string

  /** Full description for about pages */
  fullDescription: string

  /** Support email */
  supportEmail: string

  /** Sales email */
  salesEmail: string

  /** General contact email */
  contactEmail: string

  /** Logo paths */
  logo: {
    /** Light theme logo (dark text) */
    light: string
    /** Dark theme logo (light text) */
    dark: string
    /** Square mark/icon for light backgrounds */
    mark: string
    /** Square mark/icon for dark backgrounds */
    markDark: string
  }

  /** Favicon paths */
  favicon: {
    /** Standard favicon */
    default: string
    /** Dark mode favicon */
    dark: string
    /** Apple touch icon */
    apple: string
  }

  /** Social media links */
  social: {
    github?: string
    twitter?: string
    discord?: string
    linkedin?: string
    youtube?: string
  }

  /** External links */
  links: {
    docs: string
    changelog?: string
    status?: string
    roadmap?: string
    apiDocs?: string
  }

  /** Demo/Admin access */
  demo: {
    /** Directus admin URL */
    adminUrl: string
    /** Demo account email */
    email: string
    /** Demo account password */
    password: string
    /** API documentation URL */
    apiDocsUrl: string
  }

  /** Theme colors - used for meta tags, PWA, etc. */
  colors: {
    /** Primary brand color */
    primary: string
    /** Secondary accent color */
    accent: string
    /** Theme color for browser chrome */
    theme: string
    /** Background color */
    background: string
  }

  /** Open Graph / Social sharing */
  og: {
    image: string
    type: string
    siteName: string
  }

  /** Company info */
  company: {
    name: string
    founded?: string
    location?: string
  }

  /** Legal pages */
  legal: {
    privacyUrl: string
    termsUrl: string
    cookiesUrl: string
    securityUrl: string
    gdprUrl: string
  }

  /** Application domain */
  domain: string

  /** Feature flags */
  features: {
    copilot: boolean
    referrals: boolean
    analytics: boolean
    i18n: boolean
  }
}

// ============================================
// Config Loading with Environment Overrides
// ============================================

/**
 * Branding configuration loaded from config.json with env overrides.
 *
 * Priority: Environment variables > config.json defaults
 *
 * Environment variables available:
 * - VITE_APP_NAME: App name
 * - VITE_APP_TAGLINE: Tagline
 * - VITE_SUPPORT_EMAIL: Support email
 * - VITE_CONTACT_EMAIL: Contact/sales email
 * - VITE_API_URL: API URL (for apiDocs)
 * - VITE_ADMIN_URL: Admin URL (for demo.adminUrl)
 * - VITE_ENABLE_COPILOT: Enable AI Copilot
 * - VITE_ENABLE_REFERRALS: Enable referral system
 */
export const branding: BrandingConfig = {
  // Core Identity - env overrides config.json
  name: import.meta.env.VITE_APP_NAME || configJson.app.name,
  tagline: import.meta.env.VITE_APP_TAGLINE || configJson.app.tagline,
  description: import.meta.env.VITE_APP_DESCRIPTION || configJson.app.description,
  fullDescription: configJson.app.fullDescription,
  domain: import.meta.env.VITE_APP_DOMAIN || configJson.app.domain,

  // Contact - env overrides config.json
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || configJson.contact.support,
  salesEmail: import.meta.env.VITE_SALES_EMAIL || configJson.contact.sales,
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || configJson.contact.general,

  // Logo Assets - from config.json
  logo: {
    light: configJson.branding.logo.light,
    dark: configJson.branding.logo.dark,
    mark: configJson.branding.logo.mark,
    markDark: configJson.branding.logo.markDark,
  },

  // Favicon Assets - from config.json
  favicon: {
    default: configJson.branding.favicon.default,
    dark: configJson.branding.favicon.dark,
    apple: configJson.branding.favicon.apple,
  },

  // Social Media - from config.json with nulls filtered
  social: {
    github: configJson.social.github || undefined,
    twitter: configJson.social.twitter || undefined,
    discord: configJson.social.discord || undefined,
    linkedin: configJson.social.linkedin || undefined,
    youtube: configJson.social.youtube || undefined,
  },

  // External Links - from config.json
  links: {
    docs: configJson.links.docs,
    changelog: configJson.links.changelog || undefined,
    roadmap: configJson.links.roadmap || undefined,
    status: configJson.links.status || undefined,
    apiDocs: `${import.meta.env.VITE_API_URL || `https://api.${configJson.app.domain}`}/docs`,
  },

  // Demo Access - from config.json with env overrides
  demo: {
    adminUrl: import.meta.env.VITE_ADMIN_URL || `https://admin.${configJson.app.domain}`,
    email: configJson.demo.email,
    password: configJson.demo.password,
    apiDocsUrl: `${import.meta.env.VITE_API_URL || `https://api.${configJson.app.domain}`}/docs`,
  },

  // Brand Colors - from config.json
  colors: {
    primary: configJson.branding.colors.primary,
    accent: configJson.branding.colors.accent,
    theme: configJson.branding.colors.theme,
    background: configJson.branding.colors.background,
  },

  // Open Graph - from config.json
  og: {
    image: configJson.branding.og.image,
    type: configJson.branding.og.type,
    siteName: configJson.app.name,
  },

  // Company - from config.json
  company: {
    name: configJson.company.name,
    founded: configJson.company.founded || undefined,
    location: configJson.company.location || undefined,
  },

  // Legal - from config.json
  legal: {
    privacyUrl: configJson.legal.privacy,
    termsUrl: configJson.legal.terms,
    cookiesUrl: configJson.legal.cookies,
    securityUrl: configJson.legal.security,
    gdprUrl: configJson.legal.gdpr,
  },

  // Feature flags - env overrides config.json
  features: {
    copilot: import.meta.env.VITE_ENABLE_COPILOT === 'true' || configJson.features.copilot,
    referrals: import.meta.env.VITE_ENABLE_REFERRALS === 'true' || configJson.features.referrals,
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false' && configJson.features.analytics,
    i18n: import.meta.env.VITE_I18N_ENABLED !== 'false' && configJson.features.i18n,
  },
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get logo based on current theme
 */
export function getThemedLogo(isDark: boolean): string {
  return isDark ? branding.logo.dark : branding.logo.light
}

/**
 * Get mark/icon based on current theme
 */
export function getThemedMark(isDark: boolean): string {
  return isDark ? branding.logo.markDark : branding.logo.mark
}

/**
 * Get favicon based on current theme
 */
export function getThemedFavicon(isDark: boolean): string {
  return isDark ? branding.favicon.dark : branding.favicon.default
}

/**
 * Get full URL for a subdomain
 */
export function getSubdomainUrl(subdomain: string): string {
  const protocol = import.meta.env.DEV ? 'http' : 'https'
  const domain = branding.domain
  return `${protocol}://${subdomain}.${domain}`
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof BrandingConfig['features']): boolean {
  return branding.features[feature]
}

export default branding

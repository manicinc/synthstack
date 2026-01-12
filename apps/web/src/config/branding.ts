/**
 * SynthStack Branding Configuration
 *
 * Centralized configuration for all branding assets and settings.
 * Default values are inlined here; environment variables (VITE_*) can override.
 *
 * To rebrand for your own SaaS:
 * 1. Edit the DEFAULT_CONFIG below, or set environment variables
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

// ============================================
// Default Configuration (from config.json)
// ============================================
// These defaults match the values in config.json at the project root.
// Edit these values or use environment variables to customize.

const DEFAULT_CONFIG = {
  app: {
    name: 'SynthStack',
    tagline: 'Your AI Co-Founders',
    description: 'AI-native, cross-platform SaaS boilerplate built with Vue Quasar. Ships for web, iOS, Android, desktop, and PWA from a single codebase.',
    fullDescription: 'Meet your AI co-founders: 6 specialized agents (Researcher, Marketer, Developer, SEO Writer, Designer, General Assistant) with deep system integration, automatic RAG, proactive suggestions, and actionable capabilities like GitHub PRs, blog posts, and marketing content.',
    domain: 'synthstack.app',
  },
  branding: {
    logo: {
      light: '/logo/synthstack-logo.svg',
      dark: '/logo/synthstack-logo-dark.svg',
      mark: '/logo/synthstack-mark.svg',
      markDark: '/logo/synthstack-mark-dark.svg',
    },
    favicon: {
      default: '/favicon.svg',
      dark: '/favicon-dark.svg',
      apple: '/icons/icon-192x192.png',
    },
    colors: {
      primary: '#6366F1',
      accent: '#00D4AA',
      theme: '#6366F1',
      background: '#0D0D0D',
    },
    og: {
      image: '/og-image.svg',
      type: 'website',
    },
  },
  company: {
    name: 'SynthStack',
    legalName: 'Manic Inc.',
    founded: '2024',
    location: null,
  },
  contact: {
    support: 'team@manic.agency',
    sales: 'team@manic.agency',
    general: 'team@manic.agency',
    noreply: 'noreply@manic.agency',
  },
  social: {
    github: 'https://github.com/manicinc/synthstack',
    twitter: 'https://twitter.com/synthstack',
    discord: 'https://discord.gg/synthstack',
    linkedin: null,
    youtube: null,
  },
  links: {
    docs: '/docs',
    changelog: '/changelog',
    roadmap: '/roadmap',
    status: null,
  },
  legal: {
    privacy: '/privacy',
    terms: '/terms',
    cookies: '/cookies',
    security: '/security',
    gdpr: '/gdpr',
  },
  demo: {
    enabled: true,
    email: 'demo@synthstack.app',
    password: 'DemoUser2024!',
  },
  features: {
    copilot: false,
    referrals: false,
    analytics: true,
    i18n: true,
  },
}

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
 * Branding configuration with environment variable overrides.
 *
 * Priority: Environment variables > DEFAULT_CONFIG
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
  // Core Identity - env overrides defaults
  name: import.meta.env.VITE_APP_NAME || DEFAULT_CONFIG.app.name,
  tagline: import.meta.env.VITE_APP_TAGLINE || DEFAULT_CONFIG.app.tagline,
  description: import.meta.env.VITE_APP_DESCRIPTION || DEFAULT_CONFIG.app.description,
  fullDescription: DEFAULT_CONFIG.app.fullDescription,
  domain: import.meta.env.VITE_APP_DOMAIN || DEFAULT_CONFIG.app.domain,

  // Contact - env overrides defaults
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || DEFAULT_CONFIG.contact.support,
  salesEmail: import.meta.env.VITE_SALES_EMAIL || DEFAULT_CONFIG.contact.sales,
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || DEFAULT_CONFIG.contact.general,

  // Logo Assets
  logo: {
    light: DEFAULT_CONFIG.branding.logo.light,
    dark: DEFAULT_CONFIG.branding.logo.dark,
    mark: DEFAULT_CONFIG.branding.logo.mark,
    markDark: DEFAULT_CONFIG.branding.logo.markDark,
  },

  // Favicon Assets
  favicon: {
    default: DEFAULT_CONFIG.branding.favicon.default,
    dark: DEFAULT_CONFIG.branding.favicon.dark,
    apple: DEFAULT_CONFIG.branding.favicon.apple,
  },

  // Social Media - with nulls filtered
  social: {
    github: DEFAULT_CONFIG.social.github || undefined,
    twitter: DEFAULT_CONFIG.social.twitter || undefined,
    discord: DEFAULT_CONFIG.social.discord || undefined,
    linkedin: DEFAULT_CONFIG.social.linkedin || undefined,
    youtube: DEFAULT_CONFIG.social.youtube || undefined,
  },

  // External Links
  links: {
    docs: DEFAULT_CONFIG.links.docs,
    changelog: DEFAULT_CONFIG.links.changelog || undefined,
    status: DEFAULT_CONFIG.links.status || undefined,
    roadmap: DEFAULT_CONFIG.links.roadmap || undefined,
    apiDocs: `${import.meta.env.VITE_API_URL || 'http://localhost:3003'}/docs`,
  },

  // Demo Access
  demo: {
    adminUrl: import.meta.env.VITE_ADMIN_URL || `https://admin.${DEFAULT_CONFIG.app.domain}`,
    email: DEFAULT_CONFIG.demo.email,
    password: DEFAULT_CONFIG.demo.password,
    apiDocsUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:3003'}/docs`,
  },

  // Theme Colors
  colors: {
    primary: DEFAULT_CONFIG.branding.colors.primary,
    accent: DEFAULT_CONFIG.branding.colors.accent,
    theme: DEFAULT_CONFIG.branding.colors.theme,
    background: DEFAULT_CONFIG.branding.colors.background,
  },

  // Open Graph
  og: {
    image: DEFAULT_CONFIG.branding.og.image,
    type: DEFAULT_CONFIG.branding.og.type,
    siteName: import.meta.env.VITE_APP_NAME || DEFAULT_CONFIG.app.name,
  },

  // Company
  company: {
    name: DEFAULT_CONFIG.company.name,
    founded: DEFAULT_CONFIG.company.founded || undefined,
    location: DEFAULT_CONFIG.company.location || undefined,
  },

  // Legal URLs
  legal: {
    privacyUrl: DEFAULT_CONFIG.legal.privacy,
    termsUrl: DEFAULT_CONFIG.legal.terms,
    cookiesUrl: DEFAULT_CONFIG.legal.cookies,
    securityUrl: DEFAULT_CONFIG.legal.security,
    gdprUrl: DEFAULT_CONFIG.legal.gdpr,
  },

  // Feature flags - check env vars first
  features: {
    copilot: import.meta.env.VITE_ENABLE_COPILOT === 'true' || DEFAULT_CONFIG.features.copilot,
    referrals: import.meta.env.VITE_ENABLE_REFERRALS === 'true' || DEFAULT_CONFIG.features.referrals,
    analytics: DEFAULT_CONFIG.features.analytics,
    i18n: DEFAULT_CONFIG.features.i18n,
  },
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get logo path based on current theme
 */
export function getThemedLogo(isDark: boolean): string {
  return isDark ? branding.logo.dark : branding.logo.light
}

/**
 * Get favicon path based on current theme
 */
export function getThemedFavicon(isDark: boolean): string {
  return isDark ? branding.favicon.dark : branding.favicon.default
}

/**
 * Get a subdomain URL for the configured domain
 */
export function getSubdomainUrl(subdomain: string): string {
  const domain = branding.domain
  const protocol = domain.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${subdomain}.${domain}`
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof BrandingConfig['features']): boolean {
  return branding.features[feature] ?? false
}

// Export default config for reference
export { DEFAULT_CONFIG }

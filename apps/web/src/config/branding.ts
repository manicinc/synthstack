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

import { projectConfig } from '@/config/project-config'

// ============================================
// Default Configuration (from config.json)
// ============================================
// These defaults are loaded from config.json at the project root.
// Edit config.json or use environment variables (VITE_*) to customize.

const DEFAULT_CONFIG = projectConfig

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

  /** GitHub org/repo defaults (used across docs + onboarding) */
  github: {
    orgName: string
    proRepoName: string
    communityRepoName: string
    teamSlug?: string
    proRepoUrl: string
    communityRepoUrl: string
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

const githubOrgName = import.meta.env.VITE_GITHUB_ORG || DEFAULT_CONFIG.github.orgName
const githubProRepoName = import.meta.env.VITE_GITHUB_PRO_REPO || DEFAULT_CONFIG.github.proRepoName
const githubCommunityRepoName = import.meta.env.VITE_GITHUB_COMMUNITY_REPO || DEFAULT_CONFIG.github.communityRepoName

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
  fullDescription: import.meta.env.VITE_APP_FULL_DESCRIPTION || DEFAULT_CONFIG.app.fullDescription,
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
    github: import.meta.env.VITE_SOCIAL_GITHUB || DEFAULT_CONFIG.social.github || undefined,
    twitter: import.meta.env.VITE_SOCIAL_TWITTER || DEFAULT_CONFIG.social.twitter || undefined,
    discord: import.meta.env.VITE_SOCIAL_DISCORD || DEFAULT_CONFIG.social.discord || undefined,
    linkedin: import.meta.env.VITE_SOCIAL_LINKEDIN || DEFAULT_CONFIG.social.linkedin || undefined,
    youtube: import.meta.env.VITE_SOCIAL_YOUTUBE || DEFAULT_CONFIG.social.youtube || undefined,
  },

  // GitHub org/repo defaults
  github: {
    orgName: githubOrgName,
    proRepoName: githubProRepoName,
    communityRepoName: githubCommunityRepoName,
    teamSlug: import.meta.env.VITE_GITHUB_TEAM_SLUG || DEFAULT_CONFIG.github.teamSlug || undefined,
    proRepoUrl: `https://github.com/${githubOrgName}/${githubProRepoName}`,
    communityRepoUrl: `https://github.com/${githubOrgName}/${githubCommunityRepoName}`,
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
 * Get mark/icon path based on current theme
 */
export function getThemedMark(isDark: boolean): string {
  return isDark ? branding.logo.markDark : branding.logo.mark
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

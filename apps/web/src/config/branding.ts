/**
 * SynthStack Branding Configuration
 *
 * Centralized configuration for all branding assets and settings.
 * Update these values to customize your SaaS branding.
 *
 * @example
 * import { branding } from '@/config/branding'
 * console.log(branding.name) // 'SynthStack'
 */

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
}

/**
 * Default SynthStack branding configuration
 *
 * To customize for your own SaaS:
 * 1. Update the values below
 * 2. Replace logo files in /public/logo/
 * 3. Replace favicon files in /public/
 */
export const branding: BrandingConfig = {
  // Core Identity
  name: 'SynthStack',
  tagline: 'Your AI Co-Founders',
  description:
    'Not just a chatbot. A team of 6 specialized AI agents that know your business, access your data, and take action.',
  fullDescription:
    'Meet your AI co-founders: 6 specialized agents (Researcher, Marketer, Developer, SEO Writer, Designer, General Assistant) with deep system integration, automatic RAG, proactive suggestions, and actionable capabilities like GitHub PRs, blog posts, and marketing content.',

  // Contact (from environment variables)
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'team@manic.agency',
  salesEmail: import.meta.env.VITE_CONTACT_EMAIL || 'team@manic.agency',
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || 'team@manic.agency',

  // Logo Assets
  logo: {
    light: '/logo/synthstack-logo.svg',
    dark: '/logo/synthstack-logo-dark.svg',
    mark: '/logo/synthstack-mark.svg',
    markDark: '/logo/synthstack-mark-dark.svg',
  },

  // Favicon Assets
  favicon: {
    default: '/favicon.svg',
    dark: '/favicon-dark.svg',
    apple: '/icons/icon-192x192.png',
  },

  // Social Media
  social: {
    github: 'https://github.com/synthstack/synthstack',
    twitter: 'https://twitter.com/synthstack',
    discord: 'https://discord.gg/synthstack',
  },

  // External Links
  links: {
    docs: '/docs',
    changelog: '/changelog',
    roadmap: '/roadmap',
    apiDocs: `${import.meta.env.VITE_API_URL || 'https://api.synthstack.app'}/docs`,
  },

  // Demo Access (Guest Mode)
  demo: {
    adminUrl: import.meta.env.VITE_ADMIN_URL || 'https://admin.synthstack.app',
    email: 'team@manic.agency',
    password: 'DemoUser2024!',
    apiDocsUrl: `${import.meta.env.VITE_API_URL || 'https://api.synthstack.app'}/docs`,
  },

  // Brand Colors
  colors: {
    primary: '#6366F1', // Indigo
    accent: '#00D4AA', // Teal
    theme: '#6366F1',
    background: '#0D0D0D',
  },

  // Open Graph
  og: {
    image: '/og-image.svg',
    type: 'website',
    siteName: 'SynthStack',
  },

  // Company
  company: {
    name: 'SynthStack',
    founded: '2024',
  },

  // Legal
  legal: {
    privacyUrl: '/privacy',
    termsUrl: '/terms',
    cookiesUrl: '/cookies',
    securityUrl: '/security',
    gdprUrl: '/gdpr',
  },
}

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

export default branding

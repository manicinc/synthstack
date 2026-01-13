/**
 * Documentation Navigation Configuration
 *
 * Defines the sidebar structure for the docs page.
 * Supports both markdown files from /docs/ and Directus CMS content.
 */

import { FEATURES } from '@/config/features'

export interface DocNavItem {
  title: string
  slug: string
  icon?: string
  children?: DocNavItem[]
  source: 'markdown' | 'directus' | 'section'
  file?: string      // For markdown: filename in /docs/
  category?: string  // For directus: filter by category slug
  badge?: 'Pro' | 'Community' | 'Internal' | 'Coming Soon'
  hidden?: boolean
}

/**
 * Main documentation navigation structure (unfiltered)
 */
const ALL_DOCS_NAVIGATION: DocNavItem[] = [
  {
    title: 'Getting Started',
    slug: 'getting-started',
    icon: 'rocket_launch',
    source: 'section',
    children: [
      {
        title: 'Introduction',
        slug: 'introduction',
        source: 'markdown',
        file: 'README.md'
      },
      {
        title: 'Quick Start',
        slug: 'quick-start',
        source: 'markdown',
        file: 'QUICK_START.md'
      },
      {
        title: 'FAQ',
        slug: 'faq',
        source: 'markdown',
        file: 'FAQ.md'
      },
      {
        title: 'Troubleshooting',
        slug: 'troubleshooting',
        source: 'markdown',
        file: 'TROUBLESHOOTING.md'
      },
      {
        title: 'Onboarding',
        slug: 'onboarding',
        source: 'markdown',
        file: 'ONBOARDING.md'
      },
      {
        title: 'Environment Setup',
        slug: 'environment-setup',
        source: 'markdown',
        file: 'ENVIRONMENT_SETUP.md'
      },
      {
        title: 'Versions',
        slug: 'versions',
        source: 'markdown',
        file: 'VERSIONS.md'
      },
      {
        title: 'Branding & Theming',
        slug: 'branding-theming',
        source: 'markdown',
        file: 'customization/BRANDING.md'
      },
      {
        title: 'Configuration Guide',
        slug: 'configuration-guide',
        source: 'markdown',
        file: 'customization/CONFIGURATION.md'
      },
      {
        title: 'Lifetime License Setup',
        slug: 'lifetime-license-setup',
        icon: 'vpn_key',
        source: 'markdown',
        file: 'guides/LIFETIME_LICENSE_GETTING_STARTED.md',
        badge: 'Pro'
      },
      {
        title: 'Tutorials',
        slug: 'tutorials',
        source: 'directus',
        category: 'tutorial'
      }
    ]
  },
  {
    title: 'Platform',
    slug: 'platform',
    icon: 'hub',
    source: 'section',
    children: [
      {
        title: 'Admin CMS',
        slug: 'admin-cms',
        source: 'markdown',
        file: 'ADMIN_CMS.md'
      },
      {
        title: 'Authentication',
        slug: 'authentication',
        icon: 'lock',
        source: 'markdown',
        file: 'AUTHENTICATION.md'
      },
      {
        title: 'Auth Provider Wizard',
        slug: 'auth-provider-wizard',
        source: 'markdown',
        file: 'guides/AUTH_PROVIDER_WIZARD.md'
      },
      {
        title: 'Supabase Auth Setup',
        slug: 'supabase-auth-setup',
        source: 'markdown',
        file: 'guides/SUPABASE_AUTH_SETUP.md'
      },
      {
        title: 'Local Auth Setup',
        slug: 'local-auth-setup',
        source: 'markdown',
        file: 'guides/LOCAL_AUTH_SETUP.md'
      },
      {
        title: 'OAuth Setup (Supabase)',
        slug: 'oauth-setup',
        source: 'markdown',
        file: 'guides/OAUTH_SETUP.md'
      },
      {
        title: 'Email Service',
        slug: 'email-service',
        source: 'markdown',
        file: 'EMAIL_SERVICE.md'
      },
      {
        title: 'Stripe Integration',
        slug: 'stripe-integration',
        icon: 'payment',
        source: 'markdown',
        file: 'features/STRIPE_INTEGRATION.md'
      },
      {
        title: 'Cron Jobs',
        slug: 'cron-jobs',
        source: 'markdown',
        file: 'CRON_JOBS.md'
      },
      {
        title: 'Newsletter & Analytics',
        slug: 'newsletter-analytics',
        source: 'markdown',
        file: 'NEWSLETTER_ANALYTICS.md'
      }
    ]
  },
  {
    title: 'Design',
    slug: 'design',
    icon: 'palette',
    source: 'section',
    children: [
      {
        title: 'Design System',
        slug: 'design-system',
        source: 'markdown',
        file: 'DESIGN_SYSTEM.md'
      },
      {
        title: 'Pricing & Features',
        slug: 'pricing-features',
        source: 'markdown',
        file: 'PRICING_AND_FEATURES.md'
      }
    ]
  },
  {
    title: 'Deployment',
    slug: 'deployment',
    icon: 'cloud_upload',
    source: 'section',
    children: [
      {
        title: 'Deployment Quick Start',
        slug: 'deployment-quick-start',
        source: 'markdown',
        file: 'DEPLOYMENT_QUICK_START.md'
      },
      {
        title: 'Deployment Providers',
        slug: 'deployment-providers',
        source: 'markdown',
        file: 'DEPLOYMENT_PROVIDERS.md'
      },
      {
        title: 'AWS EC2 Deployment',
        slug: 'deployment-aws-ec2',
        source: 'markdown',
        file: 'deployment/providers/AWS_EC2.md'
      },
      {
        title: 'GCP Compute Engine Deployment',
        slug: 'deployment-gcp-compute-engine',
        source: 'markdown',
        file: 'deployment/providers/GCP_COMPUTE_ENGINE.md'
      },
      {
        title: 'Self Hosting Guide',
        slug: 'self-hosting',
        source: 'markdown',
        file: 'SELF_HOSTING.md'
      },
      {
        title: 'Setup Checklist',
        slug: 'setup-checklist',
        source: 'markdown',
        file: 'SETUP_CHECKLIST.md'
      },
      {
        title: 'Database Provider Wizard',
        slug: 'database-provider-wizard',
        source: 'markdown',
        file: 'guides/DATABASE_PROVIDER_WIZARD.md'
      },
      {
        title: 'Deployment Guide',
        slug: 'deployment-guide',
        source: 'markdown',
        file: 'DEPLOYMENT_GUIDE.md'
      },
      {
        title: 'GitHub Secrets (CI/CD)',
        slug: 'github-secrets',
        source: 'markdown',
        file: 'deployment/GITHUB_SECRETS.md'
      },
      {
        title: 'Production Checklist',
        slug: 'production-checklist',
        source: 'markdown',
        file: 'deployment/PRODUCTION_CHECKLIST.md'
      }
    ]
  },
  {
    title: 'Architecture',
    slug: 'architecture',
    icon: 'account_tree',
    source: 'section',
    children: [
      {
        title: 'Generator Redesign',
        slug: 'generator-redesign',
        source: 'markdown',
        file: 'GENERATOR_REDESIGN.md'
      },
      {
        title: 'Scraping System',
        slug: 'scraping-system',
        source: 'markdown',
        file: 'SCRAPING_PLAN.md'
      }
    ]
  },
  {
    title: 'Reference',
    slug: 'reference',
    icon: 'library_books',
    source: 'section',
    children: [
      {
        title: 'API Quick Reference',
        slug: 'api-quick-reference',
        source: 'markdown',
        file: 'reference/API_QUICK_REFERENCE.md'
      },
      {
        title: 'API Reference',
        slug: 'api-reference',
        source: 'markdown',
        file: 'reference/API_REFERENCE.md'
      },
      {
        title: 'Architecture Overview',
        slug: 'architecture-overview',
        source: 'markdown',
        file: 'reference/ARCHITECTURE_OVERVIEW.md'
      },
      {
        title: 'Tech Stack',
        slug: 'tech-stack',
        source: 'markdown',
        file: 'reference/TECH_STACK.md'
      }
    ]
  },
  {
    title: 'Legal',
    slug: 'legal',
    icon: 'gavel',
    source: 'section',
    children: [
      {
        title: 'License FAQ',
        slug: 'license-faq',
        source: 'markdown',
        file: 'LICENSE-FAQ.md'
      }
    ]
  },
  {
    title: 'Tutorials',
    slug: 'tutorials',
    icon: 'school',
    source: 'directus',
    category: 'tutorial'
  }
]

function isCommunityBuild(): boolean {
  const edition = (import.meta.env.VITE_SYNTHSTACK_EDITION as string | undefined)
  if (edition) return edition.toLowerCase() === 'community'

  // Fall back to feature flags (LITE/Community builds disable PRO modules).
  return !FEATURES.COPILOT && !FEATURES.REFERRALS
}

function filterNavigationForBuild(items: DocNavItem[]): DocNavItem[] {
  const community = isCommunityBuild()

  return items
    .map((item) => ({
      ...item,
      children: item.children ? filterNavigationForBuild(item.children) : undefined,
    }))
    .filter((item) => {
      if (item.hidden) return false
      if (item.badge === 'Internal') return false
      if (community && item.badge === 'Pro') return false

      if (item.source === 'section' && item.children && item.children.length === 0) return false

      // Avoid dead links in Community builds when those features are hard-disabled.
      if (community && !FEATURES.COPILOT && item.slug === 'copilot') return false
      if (community && !FEATURES.REFERRALS && item.slug === 'referral-system') return false

      return true
    })
}

/**
 * Navigation structure used by the docs UI (edition-aware)
 */
export const docsNavigation: DocNavItem[] = filterNavigationForBuild(ALL_DOCS_NAVIGATION)

/**
 * Flatten navigation for search
 */
export function flattenNavigation(items: DocNavItem[]): DocNavItem[] {
  const result: DocNavItem[] = []

  for (const item of items) {
    if (item.source !== 'section') {
      result.push(item)
    }
    if (item.children) {
      result.push(...flattenNavigation(item.children))
    }
  }

  return result
}

/**
 * Find doc by slug
 */
export function findDocBySlug(slug: string): DocNavItem | undefined {
  const flat = flattenNavigation(docsNavigation)
  return flat.find(item => item.slug === slug)
}

/**
 * Get previous and next docs for navigation
 */
export function getAdjacentDocs(currentSlug: string): { prev?: DocNavItem; next?: DocNavItem } {
  const flat = flattenNavigation(docsNavigation).filter(d => d.source !== 'section')
  const index = flat.findIndex(item => item.slug === currentSlug)

  return {
    prev: index > 0 ? flat[index - 1] : undefined,
    next: index < flat.length - 1 ? flat[index + 1] : undefined
  }
}

/**
 * Documentation Navigation Configuration
 *
 * Defines the sidebar structure for the docs page.
 * Supports both markdown files from /docs/ and Directus CMS content.
 */

export interface DocNavItem {
  title: string
  slug: string
  icon?: string
  children?: DocNavItem[]
  source: 'markdown' | 'directus' | 'section'
  file?: string      // For markdown: filename in /docs/
  category?: string  // For directus: filter by category slug
}

/**
 * Main documentation navigation structure
 */
export const docsNavigation: DocNavItem[] = [
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
        title: 'Lifetime License Setup',
        slug: 'lifetime-license-setup',
        icon: 'vpn_key',
        source: 'markdown',
        file: 'guides/LIFETIME_LICENSE_GETTING_STARTED.md'
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
        title: 'Deployment Providers',
        slug: 'deployment-providers',
        source: 'markdown',
        file: 'DEPLOYMENT_PROVIDERS.md'
      },
      {
        title: 'Self Hosting Guide',
        slug: 'self-hosting',
        source: 'markdown',
        file: 'SELF_HOSTING.md'
      },
      {
        title: 'Deployment Guide',
        slug: 'deployment-guide',
        source: 'markdown',
        file: 'DEPLOYMENT_GUIDE.md'
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
    title: 'Tutorials',
    slug: 'tutorials',
    icon: 'school',
    source: 'directus',
    category: 'tutorial'
  }
]

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

/**
 * @file useSeo.ts
 * @description Comprehensive SEO composable for managing meta tags, structured data,
 * Open Graph, Twitter Cards, and canonical URLs.
 * 
 * This composable provides:
 * - Dynamic meta tag management
 * - JSON-LD structured data injection
 * - Open Graph and Twitter Card support
 * - Canonical URL management
 * - Breadcrumb schema generation
 * - Article, Product, and Organization schema support
 * 
 * @usage
 * ```ts
 * import { useSeo } from '@/composables/useSeo'
 * 
 * const { setPageSeo, setArticleSeo, setProductSeo } = useSeo()
 * 
 * setPageSeo({
 *   title: 'AI-Native SaaS Boilerplate | SynthStack',
 *   description: 'AI-native, cross-platform SaaS boilerplate with Directus, Stripe billing, and AI copilots.',
 *   keywords: ['AI SaaS boilerplate', 'Vue Quasar', 'Directus CMS', 'Stripe billing']
 * })
 * ```
 */

import { ref, onMounted, onUnmounted } from 'vue'

/** Base URL for the site */
const BASE_URL = 'https://synthstack.app'

/** Default organization schema */
const ORGANIZATION_SCHEMA = {
  '@type': 'Organization',
  '@id': `${BASE_URL}/#organization`,
  name: 'SynthStack',
  url: BASE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE_URL}/icons/logo-512.png`,
    width: 512,
    height: 512
  },
  sameAs: [
    'https://twitter.com/synthstack',
    'https://github.com/manicinc/synthstack',
    'https://discord.gg/synthstack',
    'https://www.youtube.com/@synthstack',
    'https://www.reddit.com/r/synthstack',
    'https://manic.agency'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'team@manic.agency',
    contactType: 'customer support'
  },
  parentOrganization: {
    '@type': 'Organization',
    name: 'Manic Agency',
    url: 'https://manic.agency'
  }
}

/** Default website schema */
const WEBSITE_SCHEMA = {
  '@type': 'WebSite',
  '@id': `${BASE_URL}/#website`,
  url: BASE_URL,
  name: 'SynthStack',
  description: 'AI-native, cross-platform SaaS boilerplate with billing, CMS, workflows, and AI agents.',
  publisher: { '@id': `${BASE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/search?q={search_term_string}`
    },
    'query-input': 'required name=search_term_string'
  }
}

/** SEO page options interface */
export interface PageSeoOptions {
  /** Page title (will be appended with site name) */
  title: string
  /** Meta description (max 160 chars recommended) */
  description: string
  /** Focus keywords for the page */
  keywords?: string[]
  /** Canonical URL path (relative to base) */
  canonicalPath?: string
  /** Open Graph image URL */
  ogImage?: string
  /** Open Graph type */
  ogType?: 'website' | 'article' | 'product' | 'profile'
  /** Prevent indexing */
  noIndex?: boolean
  /** Prevent following links */
  noFollow?: boolean
  /** Breadcrumbs for schema */
  breadcrumbs?: Array<{ name: string; url: string }>
  /** Custom JSON-LD schemas to add */
  schemas?: object[]
}

/** Article SEO options */
export interface ArticleSeoOptions extends PageSeoOptions {
  /** Article publication date */
  publishedTime: string
  /** Article modification date */
  modifiedTime?: string
  /** Article author name */
  author: string
  /** Article section/category */
  section?: string
  /** Article tags */
  tags?: string[]
}

/** Product SEO options */
export interface ProductSeoOptions extends PageSeoOptions {
  /** Product price */
  price?: number
  /** Price currency */
  currency?: string
  /** Product availability */
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
  /** Product SKU */
  sku?: string
  /** Product brand */
  brand?: string
  /** Product rating */
  rating?: { value: number; count: number }
}

/**
 * Comprehensive SEO composable
 */
export function useSeo() {
  const currentSchemas = ref<HTMLScriptElement[]>([])
  
  /**
   * Sets or updates a meta tag
   */
  function setMeta(name: string, content: string, property = false) {
    const attr = property ? 'property' : 'name'
    let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement
    
    if (!element) {
      element = document.createElement('meta')
      element.setAttribute(attr, name)
      document.head.appendChild(element)
    }
    
    element.content = content
  }
  
  /**
   * Sets the page title
   */
  function setTitle(title: string) {
    document.title = title
    setMeta('og:title', title, true)
    setMeta('twitter:title', title)
  }
  
  /**
   * Sets the canonical URL
   */
  function setCanonical(path: string) {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    
    link.href = url
    setMeta('og:url', url, true)
  }
  
  /**
   * Adds JSON-LD structured data to the page
   */
  function addSchema(schema: object) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      ...schema
    })
    document.head.appendChild(script)
    currentSchemas.value.push(script)
  }
  
  /**
   * Clears all added schemas
   */
  function clearSchemas() {
    currentSchemas.value.forEach(script => script.remove())
    currentSchemas.value = []
  }
  
  /**
   * Generates breadcrumb schema
   */
  function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
    return {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url.startsWith('http') ? crumb.url : `${BASE_URL}${crumb.url}`
      }))
    }
  }

  /**
   * Sets comprehensive page SEO
   */
  function setPageSeo(options: PageSeoOptions) {
    // Clear previous schemas
    clearSchemas()

    // Set title
    const fullTitle = options.title.includes('SynthStack')
      ? options.title
      : `${options.title} | SynthStack`
    setTitle(fullTitle)

    // Set meta description
    setMeta('description', options.description)
    setMeta('og:description', options.description, true)
    setMeta('twitter:description', options.description)

    // Set keywords
    if (options.keywords?.length) {
      setMeta('keywords', options.keywords.join(', '))
    }

    // Set canonical
    if (options.canonicalPath) {
      setCanonical(options.canonicalPath)
    }

    // Set robots
    const robotsDirectives: string[] = []
    if (options.noIndex) robotsDirectives.push('noindex')
    if (options.noFollow) robotsDirectives.push('nofollow')
    if (robotsDirectives.length) {
      setMeta('robots', robotsDirectives.join(', '))
    } else {
      setMeta('robots', 'index, follow')
    }
    
    // Set Open Graph
    setMeta('og:type', options.ogType || 'website', true)
    setMeta('og:site_name', 'SynthStack', true)
    setMeta('og:locale', 'en_US', true)
    
    if (options.ogImage) {
      const imageUrl = options.ogImage.startsWith('http') 
        ? options.ogImage 
        : `${BASE_URL}${options.ogImage}`
      setMeta('og:image', imageUrl, true)
      setMeta('og:image:width', '1200', true)
      setMeta('og:image:height', '630', true)
      setMeta('twitter:image', imageUrl)
    }
    
    // Set Twitter Card
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:site', '@synthstack')
    setMeta('twitter:creator', '@synthstack')
    
    // Add base schemas
    addSchema(ORGANIZATION_SCHEMA)
    addSchema(WEBSITE_SCHEMA)
    
    // Add breadcrumb schema if provided
    if (options.breadcrumbs?.length) {
      addSchema(generateBreadcrumbSchema(options.breadcrumbs))
    }
    
    // Add custom schemas
    if (options.schemas?.length) {
      options.schemas.forEach(schema => addSchema(schema))
    }
  }
  
  /**
   * Sets SEO for article/blog pages
   */
  function setArticleSeo(options: ArticleSeoOptions) {
    setPageSeo({ ...options, ogType: 'article' })
    
    // Set article-specific meta
    setMeta('article:published_time', options.publishedTime, true)
    if (options.modifiedTime) {
      setMeta('article:modified_time', options.modifiedTime, true)
    }
    if (options.section) {
      setMeta('article:section', options.section, true)
    }
    options.tags?.forEach(tag => {
      setMeta('article:tag', tag, true)
    })
    
    // Add Article schema
    addSchema({
      '@type': 'Article',
      headline: options.title,
      description: options.description,
      image: options.ogImage ? `${BASE_URL}${options.ogImage}` : undefined,
      datePublished: options.publishedTime,
      dateModified: options.modifiedTime || options.publishedTime,
      author: {
        '@type': 'Person',
        name: options.author
      },
      publisher: { '@id': `${BASE_URL}/#organization` },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': options.canonicalPath ? `${BASE_URL}${options.canonicalPath}` : undefined
      }
    })
  }
  
  /**
   * Sets SEO for product pages (workflows, agents)
   */
  function setProductSeo(options: ProductSeoOptions) {
    setPageSeo({ ...options, ogType: 'product' })
    
    // Set product-specific meta
    if (options.price) {
      setMeta('product:price:amount', options.price.toString(), true)
      setMeta('product:price:currency', options.currency || 'USD', true)
    }
    if (options.availability) {
      setMeta('product:availability', options.availability, true)
    }
    
    // Add Product schema
    const productSchema: Record<string, unknown> = {
      '@type': 'Product',
      name: options.title,
      description: options.description,
      image: options.ogImage ? `${BASE_URL}${options.ogImage}` : undefined,
    }
    
    if (options.brand) {
      productSchema.brand = {
        '@type': 'Brand',
        name: options.brand
      }
    }
    
    if (options.sku) {
      productSchema.sku = options.sku
    }
    
    if (options.price) {
      productSchema.offers = {
        '@type': 'Offer',
        price: options.price,
        priceCurrency: options.currency || 'USD',
        availability: options.availability 
          ? `https://schema.org/${options.availability}` 
          : 'https://schema.org/InStock'
      }
    }
    
    if (options.rating) {
      productSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: options.rating.value,
        reviewCount: options.rating.count
      }
    }
    
    addSchema(productSchema)
  }
  
  /**
   * Sets SEO for FAQ pages
   */
  function setFaqSeo(faqs: Array<{ question: string; answer: string }>) {
    addSchema({
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    })
  }
  
  /**
   * Sets SEO for how-to/guide pages
   */
  function setHowToSeo(options: {
    name: string
    description: string
    steps: Array<{ name: string; text: string; image?: string }>
    totalTime?: string
  }) {
    addSchema({
      '@type': 'HowTo',
      name: options.name,
      description: options.description,
      totalTime: options.totalTime,
      step: options.steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
        image: step.image
      }))
    })
  }
  
  /**
   * Sets SEO for software application (the SynthStack app itself)
   */
  function setSoftwareAppSeo() {
    addSchema({
      '@type': 'SoftwareApplication',
      name: 'SynthStack',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '1250'
      }
    })
  }
  
  // Cleanup on unmount
  onUnmounted(() => {
    clearSchemas()
  })
  
  return {
    setPageSeo,
    setArticleSeo,
    setProductSeo,
    setFaqSeo,
    setHowToSeo,
    setSoftwareAppSeo,
    setMeta,
    setTitle,
    setCanonical,
    addSchema,
    clearSchemas
  }
}

/**
 * SynthStack-focused keywords for SEO optimization
 * Use these throughout content for domain authority
 */
export const SYNTHSTACK_KEYWORDS = {
  primary: [
    'AI SaaS boilerplate',
    'cross-platform SaaS',
    'Vue Quasar boilerplate',
    'Directus CMS',
    'Stripe billing',
    'AI agents',
  ],
  stack: [
    'Vue 3 Quasar',
    'TypeScript SaaS template',
    'Fastify API gateway',
    'Postgres CMS',
    'Docker Compose SaaS',
    'Supabase auth',
  ],
  ai: [
    'RAG pipeline',
    'vector search',
    'Qdrant',
    'OpenAI integration',
    'Anthropic integration',
    'multi-agent orchestration',
  ],
  workflows: [
    'workflow automation',
    'Node-RED workflows',
    'visual workflow builder',
    'webhooks',
    'background jobs',
    'cron jobs',
  ],
  marketing: [
    'SaaS onboarding',
    'referral program',
    'subscription management',
    'customer portal',
    'white-label SaaS',
  ],
  longTail: [
    'how to build a SaaS with Vue and Quasar',
    'Directus CMS with Postgres',
    'Stripe subscriptions with webhooks',
    'self host a SaaS boilerplate',
    'AI copilot with RAG',
    'multi-agent strategy debates',
  ],
}

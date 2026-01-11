/**
 * @file generate-sitemap.ts
 * @description Generates XML sitemap for SynthStack with all public routes
 *
 * Features:
 * - Static pages (landing, features, pricing, about, blog, docs)
 * - Blog posts with proper lastmod dates and images
 * - Image sitemap support (og-images, feature images)
 * - hreflang for internationalization
 * - Proper priority and changefreq values for SEO
 *
 * @usage pnpm generate:sitemap
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** Base URL for the production site */
const BASE_URL = 'https://synthstack.app'

/** Supported languages for hreflang */
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'zh'] as const
type Language = typeof SUPPORTED_LANGUAGES[number]

/** Whether i18n is enabled */
const I18N_ENABLED = process.env.VITE_I18N_ENABLED === 'true'

/** Sitemap URL entry interface */
interface SitemapEntry {
  /** URL path (without base URL) */
  loc: string
  /** Last modification date (ISO 8601) */
  lastmod: string
  /** Change frequency hint for crawlers */
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  /** Priority relative to other pages (0.0-1.0) */
  priority: number
  /** Optional image URLs for image sitemap */
  images?: Array<{
    loc: string
    title?: string
    caption?: string
  }>
  /** Whether to include hreflang alternates */
  includeHreflang?: boolean
}

/** Get today's date in ISO format */
const TODAY = new Date().toISOString().split('T')[0]

/**
 * Core static pages
 */
const STATIC_PAGES: SitemapEntry[] = [
  // Homepage - highest priority
  {
    loc: '/',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 1.0,
    includeHreflang: true,
    images: [
      {
        loc: `${BASE_URL}/og-image.png`,
        title: 'SynthStack - AI-Powered Development Platform',
        caption: 'Build faster with AI Cofounders'
      }
    ]
  },
  // Main navigation pages
  {
    loc: '/features',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.9,
    includeHreflang: true,
    images: [
      {
        loc: `${BASE_URL}/images/features-hero.png`,
        title: 'SynthStack Features',
        caption: 'AI Copilot, Workflows, Client Portal and more'
      }
    ]
  },
  {
    loc: '/pricing',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.9,
    includeHreflang: true,
    images: [
      {
        loc: `${BASE_URL}/images/pricing-comparison.png`,
        title: 'SynthStack Pricing Plans',
        caption: 'Free, Maker, Pro, and Agency tiers'
      }
    ]
  },
  {
    loc: '/about',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.7,
    includeHreflang: true
  },
  {
    loc: '/contact',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6,
    includeHreflang: true
  },
  // Blog index
  {
    loc: '/blog',
    lastmod: TODAY,
    changefreq: 'daily',
    priority: 0.8,
    includeHreflang: true
  },
  // Documentation
  {
    loc: '/docs',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.8,
    includeHreflang: true
  },
  {
    loc: '/docs/getting-started',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/docs/api-reference',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/docs/ai-copilot',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/docs/workflows',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/docs/client-portal',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/docs/byok',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/docs/self-hosting',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6
  },
  // Legal pages
  {
    loc: '/privacy',
    lastmod: '2024-01-01',
    changefreq: 'yearly',
    priority: 0.3,
    includeHreflang: true
  },
  {
    loc: '/terms',
    lastmod: '2024-01-01',
    changefreq: 'yearly',
    priority: 0.3,
    includeHreflang: true
  },
  // Feature-specific landing pages
  {
    loc: '/ai-copilot',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.8,
    includeHreflang: true,
    images: [
      {
        loc: `${BASE_URL}/images/ai-copilot-demo.png`,
        title: 'AI Copilot Chat Interface',
        caption: 'Chat with AI agents to accelerate development'
      }
    ]
  },
  {
    loc: '/ai-cofounders',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.8,
    includeHreflang: true,
    images: [
      {
        loc: `${BASE_URL}/images/ai-cofounders.png`,
        title: 'AI Cofounder Agents',
        caption: 'CEO, CTO, Designer, Developer, and more'
      }
    ]
  },
  {
    loc: '/workflows',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.8,
    includeHreflang: true,
    images: [
      {
        loc: `${BASE_URL}/images/workflow-builder.png`,
        title: 'Visual Workflow Builder',
        caption: 'Node-RED powered automation workflows'
      }
    ]
  },
  {
    loc: '/client-portal',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.7,
    includeHreflang: true
  },
  // Use case pages
  {
    loc: '/use-cases/agencies',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/use-cases/startups',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/use-cases/developers',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.7
  },
  // Integrations
  {
    loc: '/integrations',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/integrations/openai',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    loc: '/integrations/anthropic',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    loc: '/integrations/stripe',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    loc: '/integrations/supabase',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6
  },
  // Changelog
  {
    loc: '/changelog',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: 0.6
  },
  // FAQ
  {
    loc: '/faq',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: 0.6,
    includeHreflang: true
  },
]

/**
 * Blog posts - these should match what's in your CMS
 * Update this list when adding new blog posts
 */
const BLOG_POSTS: SitemapEntry[] = [
  {
    loc: '/blog/introducing-synthstack',
    lastmod: '2024-12-01',
    changefreq: 'monthly',
    priority: 0.7,
    images: [
      {
        loc: `${BASE_URL}/images/blog/introducing-synthstack.png`,
        title: 'Introducing SynthStack',
        caption: 'The AI-powered platform for modern development teams'
      }
    ]
  },
  {
    loc: '/blog/ai-copilot-best-practices',
    lastmod: '2024-12-15',
    changefreq: 'monthly',
    priority: 0.7,
    images: [
      {
        loc: `${BASE_URL}/images/blog/ai-copilot-tips.png`,
        title: 'AI Copilot Best Practices',
        caption: 'Get the most out of your AI assistant'
      }
    ]
  },
  {
    loc: '/blog/building-workflows-with-node-red',
    lastmod: '2024-12-20',
    changefreq: 'monthly',
    priority: 0.7,
    images: [
      {
        loc: `${BASE_URL}/images/blog/node-red-workflows.png`,
        title: 'Building Workflows with Node-RED',
        caption: 'Visual automation for your business processes'
      }
    ]
  },
  {
    loc: '/blog/byok-bring-your-own-keys',
    lastmod: '2025-01-05',
    changefreq: 'monthly',
    priority: 0.7,
    images: [
      {
        loc: `${BASE_URL}/images/blog/byok-guide.png`,
        title: 'BYOK - Bring Your Own Keys',
        caption: 'Use your own API keys for unlimited AI usage'
      }
    ]
  },
  {
    loc: '/blog/client-portal-for-agencies',
    lastmod: '2025-01-08',
    changefreq: 'monthly',
    priority: 0.7,
    images: [
      {
        loc: `${BASE_URL}/images/blog/client-portal.png`,
        title: 'Client Portal for Agencies',
        caption: 'White-label client collaboration made easy'
      }
    ]
  },
  {
    loc: '/blog/self-hosting-synthstack',
    lastmod: '2025-01-10',
    changefreq: 'monthly',
    priority: 0.7,
    images: [
      {
        loc: `${BASE_URL}/images/blog/self-hosting.png`,
        title: 'Self-Hosting SynthStack',
        caption: 'Deploy on your own infrastructure'
      }
    ]
  },
  {
    loc: '/blog/referral-program-launch',
    lastmod: '2025-01-10',
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    loc: '/blog/2024-year-in-review',
    lastmod: '2024-12-31',
    changefreq: 'yearly',
    priority: 0.6
  },
]

/**
 * Escapes special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generates hreflang links for a URL
 */
function generateHreflangLinks(path: string): string {
  if (!I18N_ENABLED) return ''

  let xml = ''
  for (const lang of SUPPORTED_LANGUAGES) {
    const href = lang === 'en'
      ? `${BASE_URL}${path}`
      : `${BASE_URL}/${lang}${path}`
    xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>\n`
  }
  // Add x-default for the main language
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}"/>\n`
  return xml
}

/**
 * Generates XML string for a single URL entry
 */
function generateUrlEntry(entry: SitemapEntry): string {
  let xml = `  <url>\n`
  xml += `    <loc>${BASE_URL}${entry.loc}</loc>\n`
  xml += `    <lastmod>${entry.lastmod}</lastmod>\n`
  xml += `    <changefreq>${entry.changefreq}</changefreq>\n`
  xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`

  // Add hreflang links if enabled
  if (entry.includeHreflang && I18N_ENABLED) {
    xml += generateHreflangLinks(entry.loc)
  }

  // Add image sitemap entries if present
  if (entry.images && entry.images.length > 0) {
    for (const image of entry.images) {
      xml += `    <image:image>\n`
      xml += `      <image:loc>${escapeXml(image.loc)}</image:loc>\n`
      if (image.title) {
        xml += `      <image:title>${escapeXml(image.title)}</image:title>\n`
      }
      if (image.caption) {
        xml += `      <image:caption>${escapeXml(image.caption)}</image:caption>\n`
      }
      xml += `    </image:image>\n`
    }
  }

  xml += `  </url>\n`
  return xml
}

/**
 * Generates the complete sitemap XML
 */
async function generateSitemap(): Promise<string> {
  const allEntries = [...STATIC_PAGES, ...BLOG_POSTS]

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n`
  xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`

  for (const entry of allEntries) {
    xml += generateUrlEntry(entry)
  }

  xml += `</urlset>`

  return xml
}

/**
 * Main execution
 */
async function main() {
  console.log('🗺️  Generating sitemap.xml for SynthStack...')

  try {
    const sitemap = await generateSitemap()
    const outputPath = resolve(__dirname, '../public/sitemap.xml')

    writeFileSync(outputPath, sitemap, 'utf-8')

    const urlCount = sitemap.match(/<url>/g)?.length || 0
    const imageCount = sitemap.match(/<image:image>/g)?.length || 0

    console.log(`✅ Sitemap generated successfully: ${outputPath}`)
    console.log(`📊 Total URLs: ${urlCount}`)
    console.log(`🖼️  Total Images: ${imageCount}`)
    console.log(`🌐 i18n hreflang: ${I18N_ENABLED ? 'enabled' : 'disabled'}`)
  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error)
    process.exit(1)
  }
}

main()

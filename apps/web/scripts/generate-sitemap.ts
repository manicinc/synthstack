/**
 * @file sitemap-generator.ts
 * @description Generates XML sitemap for Printverse with all public routes
 * 
 * This script generates a comprehensive sitemap.xml file that includes:
 * - Static pages (landing, about, contact, blog, privacy, terms)
 * - Dynamic pages (printers, filaments, profiles)
 * - Blog posts with proper lastmod dates
 * - Proper priority and changefreq values for SEO optimization
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

/** Sitemap URL entry interface */
interface SitemapEntry {
  /** Full URL path */
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
}

/**
 * Static pages that rarely change
 * These are the core SEO pages that establish domain authority
 */
const STATIC_PAGES: SitemapEntry[] = [
  {
    loc: '/',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 1.0
  },
  {
    loc: '/features',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.9
  },
  {
    loc: '/pricing',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.9
  },
  {
    loc: '/about',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/contact',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.6
  },
  {
    loc: '/blog',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: 0.8
  },
  {
    loc: '/privacy',
    lastmod: '2024-01-01',
    changefreq: 'yearly',
    priority: 0.3
  },
  {
    loc: '/terms',
    lastmod: '2024-01-01',
    changefreq: 'yearly',
    priority: 0.3
  },
  // 3D Printing specific SEO pages
  {
    loc: '/printers',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: 0.9
  },
  {
    loc: '/filaments',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: 0.9
  },
  {
    loc: '/profiles',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: 0.9
  },
  // Educational content for 3D printing keywords
  {
    loc: '/guides',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.8
  },
  {
    loc: '/guides/3d-printing-beginners',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/guides/pla-vs-petg-vs-abs',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/guides/best-slicer-settings',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/guides/how-to-calibrate-printer',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7
  },
  {
    loc: '/guides/troubleshooting-common-issues',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7
  },
  // Slicer-specific pages (high-value keywords)
  {
    loc: '/slicers/cura',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.8
  },
  {
    loc: '/slicers/prusaslicer',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.8
  },
  {
    loc: '/slicers/orcaslicer',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.8
  },
  {
    loc: '/slicers/bambu-studio',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.8
  },
  {
    loc: '/slicers/simplify3d',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.8
  },
  // Printer brand pages
  {
    loc: '/printers/brand/prusa',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/printers/brand/bambulab',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/printers/brand/creality',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/printers/brand/voron',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/printers/brand/elegoo',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
  // Filament type pages
  {
    loc: '/filaments/type/pla',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/filaments/type/petg',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/filaments/type/abs',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/filaments/type/tpu',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/filaments/type/nylon',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    loc: '/filaments/type/asa',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.7
  },
]

/**
 * Generates XML string for a single URL entry
 */
function generateUrlEntry(entry: SitemapEntry): string {
  let xml = `  <url>\n`
  xml += `    <loc>${BASE_URL}${entry.loc}</loc>\n`
  xml += `    <lastmod>${entry.lastmod}</lastmod>\n`
  xml += `    <changefreq>${entry.changefreq}</changefreq>\n`
  xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`
  
  // Add image sitemap entries if present
  if (entry.images && entry.images.length > 0) {
    for (const image of entry.images) {
      xml += `    <image:image>\n`
      xml += `      <image:loc>${image.loc}</image:loc>\n`
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
 * Fetches dynamic content from API (printers, filaments, profiles, blog posts)
 */
async function fetchDynamicEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = []
  
  // In production, these would be API calls
  // For now, generate placeholders that will be populated at build time
  
  // Example: Popular printer pages
  const popularPrinters = [
    'prusa-mk4',
    'bambu-lab-x1-carbon',
    'creality-ender-3-v3',
    'voron-2-4',
    'elegoo-neptune-4',
    'anycubic-kobra-3',
    'qidi-x-max-3',
    'flashforge-adventurer-5m',
  ]
  
  for (const printer of popularPrinters) {
    entries.push({
      loc: `/printers/${printer}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: 0.6,
    })
  }
  
  // Example: Popular filament pages
  const popularFilaments = [
    'polymaker-polylite-pla',
    'hatchbox-pla',
    'overture-petg',
    'esun-pla-pro',
    'prusament-petg',
    'bambu-lab-pla-basic',
    'sunlu-pla-plus',
  ]
  
  for (const filament of popularFilaments) {
    entries.push({
      loc: `/filaments/${filament}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: 0.6,
    })
  }
  
  return entries
}

/**
 * Generates the complete sitemap XML
 */
async function generateSitemap(): Promise<string> {
  const dynamicEntries = await fetchDynamicEntries()
  const allEntries = [...STATIC_PAGES, ...dynamicEntries]
  
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
  console.log('🗺️  Generating sitemap.xml...')
  
  try {
    const sitemap = await generateSitemap()
    const outputPath = resolve(__dirname, '../public/sitemap.xml')
    
    writeFileSync(outputPath, sitemap, 'utf-8')
    console.log(`✅ Sitemap generated successfully: ${outputPath}`)
    console.log(`📊 Total URLs: ${sitemap.match(/<url>/g)?.length || 0}`)
  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error)
    process.exit(1)
  }
}

main()



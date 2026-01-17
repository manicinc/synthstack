#!/usr/bin/env npx tsx
/**
 * @file generate-env.ts
 * @description Generates .env files from config.json
 *
 * This script reads the central config.json and generates environment files
 * with values derived from the configuration. It ensures config.json is the
 * single source of truth for domain, ports, app name, and infrastructure settings.
 *
 * Usage:
 *   pnpm generate:env                      # Interactive mode
 *   pnpm generate:env --edition lite       # Community edition
 *   pnpm generate:env --edition pro        # PRO edition
 *   pnpm generate:env --edition pro -o .env.pro  # Output to specific file
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { randomBytes } from 'crypto'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as readline from 'readline'

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============================================
// Types
// ============================================

interface ProjectConfig {
  app: {
    name: string
    tagline: string
    description: string
    fullDescription: string
    domain: string
    version?: string
  }
  branding: {
    logo: Record<string, string>
    favicon: Record<string, string>
    colors: Record<string, string>
    og: Record<string, string>
  }
  company: {
    name: string
    legalName?: string | null
    founded?: string | null
    location?: {
      address?: string
      city?: string
      state?: string
      zip?: string
      country?: string
    } | null
    phone?: string | null
    parentCompany?: string | null
  }
  contact: {
    support: string
    sales: string
    general: string
    noreply?: string
    phone?: string
  }
  social: {
    github?: string | null
    twitter?: string | null
    discord?: string | null
    linkedin?: string | null
    youtube?: string | null
  }
  links: {
    docs: string
    changelog?: string
    roadmap?: string
    status?: string | null
  }
  legal: {
    privacy: string
    terms: string
    cookies: string
    security: string
    gdpr: string
  }
  demo: {
    enabled: boolean
    email: string
    password: string
  }
  infrastructure: {
    containerPrefix: string
    networkName: string
    databaseName: string
    subdomains: Record<string, string>
    ports: Record<string, number>
  }
  github: {
    orgName: string
    proRepoName: string
    communityRepoName: string
    teamSlug?: string | null
  }
  features: {
    copilot: boolean
    referrals: boolean
    analytics: boolean
    i18n: boolean
  }
}

type Edition = 'lite' | 'pro'

interface CliArgs {
  edition?: Edition
  output?: string
  help?: boolean
  stdout?: boolean
}

// ============================================
// Utility Functions
// ============================================

function generateHex(bytes: number): string {
  return randomBytes(bytes).toString('hex')
}

function generateBase64(bytes: number): string {
  return randomBytes(bytes).toString('base64')
}

function loadConfig(): ProjectConfig {
  const configPath = resolve(__dirname, '../config.json')
  if (!existsSync(configPath)) {
    console.error('Error: config.json not found at', configPath)
    process.exit(1)
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'))
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--edition' || arg === '-e') {
      const value = args[++i]
      if (value === 'lite' || value === 'pro') {
        result.edition = value
      } else {
        console.error(`Invalid edition: ${value}. Must be 'lite' or 'pro'`)
        process.exit(1)
      }
    } else if (arg === '--output' || arg === '-o') {
      result.output = args[++i]
    } else if (arg === '--help' || arg === '-h') {
      result.help = true
    } else if (arg === '--stdout') {
      result.stdout = true
    }
  }

  return result
}

function showHelp(): void {
  console.log(`
Usage: pnpm generate:env [options]

Options:
  --edition, -e <lite|pro>  Edition to generate (lite = Community, pro = PRO)
  --output, -o <file>       Output file path (default: .env)
  --stdout                  Print to stdout instead of file
  --help, -h                Show this help message

Examples:
  pnpm generate:env                         # Interactive mode
  pnpm generate:env --edition lite          # Generate Community .env
  pnpm generate:env --edition pro           # Generate PRO .env
  pnpm generate:env -e pro -o .env.pro      # Generate PRO to specific file
  pnpm generate:env -e lite --stdout        # Print to console

The script reads config.json and generates environment variables with:
  - URLs derived from domain and port configuration
  - Feature flags based on edition
  - Auto-generated security keys (DIRECTUS_KEY, JWT_SECRET, etc.)
  - Placeholder values for API keys you need to fill in
`)
}

async function promptEdition(): Promise<Edition> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    console.log('\nSelect edition to generate:\n')
    console.log('  1. lite  - Community Edition (basic copilot, no RAG/agents/referrals)')
    console.log('  2. pro   - PRO Edition (all features enabled)\n')

    rl.question('Enter choice (1 or 2, or "lite"/"pro"): ', (answer) => {
      rl.close()
      const normalized = answer.trim().toLowerCase()
      if (normalized === '1' || normalized === 'lite') {
        resolve('lite')
      } else if (normalized === '2' || normalized === 'pro') {
        resolve('pro')
      } else {
        console.log('Invalid choice, defaulting to lite')
        resolve('lite')
      }
    })
  })
}

// ============================================
// Environment Generation
// ============================================

function generateEnvContent(config: ProjectConfig, edition: Edition): string {
  const isPro = edition === 'pro'
  const domain = config.app.domain
  const isProductionDomain = domain && domain !== 'your-domain.com'

  // Get ports from config
  const ports = config.infrastructure.ports
  const apiPort = ports.api || 3003
  const directusPort = ports.directus || 8099
  const postgresPort = ports.postgres || 5499
  const redisPort = ports.redis || 6399
  const qdrantPort = ports.qdrant || 6333
  const webPort = ports.web || 3050

  // Get subdomains
  const subdomains = config.infrastructure.subdomains
  const apiSubdomain = subdomains.api || 'api'
  const adminSubdomain = subdomains.admin || 'admin'

  // Database name
  const dbName = config.infrastructure.databaseName || 'synthstack'

  // Generate security keys
  const directusKey = generateHex(32)
  const directusSecret = generateHex(32)
  const jwtSecret = generateBase64(48)
  const encryptionKey = generateHex(32)
  const adminSecret = generateHex(32)

  // Contact emails
  const supportEmail = config.contact.support || 'support@your-domain.com'
  const generalEmail = config.contact.general || 'hello@your-domain.com'
  const noreplyEmail = config.contact.noreply || 'noreply@your-domain.com'

  // Social links
  const githubUrl = config.social.github || ''
  const twitterHandle = config.social.twitter || ''
  const discordUrl = config.social.discord || ''

  // Build the .env content
  const lines: string[] = []

  // Header
  lines.push(`# ============================================`)
  lines.push(`# SynthStack Environment Variables - ${isPro ? 'PRO' : 'LITE'} (${isPro ? 'Commercial' : 'Community'} Edition)`)
  lines.push(`# ============================================`)
  lines.push(`# Generated from config.json on ${new Date().toISOString()}`)
  lines.push(`# Run: pnpm generate:env --edition ${edition}`)
  lines.push(`#`)
  if (isPro) {
    lines.push(`# PRO Edition Features:`)
    lines.push(`# - Basic Copilot`)
    lines.push(`# - RAG (Retrieval Augmented Generation)`)
    lines.push(`# - AI Agents`)
    lines.push(`# - Referral System`)
  } else {
    lines.push(`# LITE Edition Features:`)
    lines.push(`# - Basic Copilot`)
    lines.push(`# - RAG: disabled`)
    lines.push(`# - AI Agents: disabled`)
    lines.push(`# - Referral System: disabled`)
  }
  lines.push(`# ============================================`)
  lines.push(``)

  // Feature Flags
  lines.push(`# ============================================`)
  lines.push(`# FEATURE FLAGS`)
  lines.push(`# ============================================`)
  lines.push(`CONTAINER_PREFIX=${config.infrastructure.containerPrefix}`)
  lines.push(`NETWORK_NAME=${config.infrastructure.networkName}`)
  lines.push(``)
  // Feature flags are determined by edition, not config.features
  // Lite edition: basic copilot only
  // Pro edition: all features enabled
  lines.push(`# Backend flags (api-gateway)`)
  lines.push(`ENABLE_COPILOT=true`)
  lines.push(`ENABLE_COPILOT_RAG=${isPro}`)
  lines.push(`ENABLE_AI_AGENTS=${isPro}`)
  lines.push(`ENABLE_REFERRALS=${isPro}`)
  if (isPro) {
    lines.push(`REFERRAL_DAILY_CONVERSION_CAP=500`)
  }
  lines.push(``)
  lines.push(`# Frontend flags (web app)`)
  lines.push(`VITE_ENABLE_COPILOT=true`)
  lines.push(`VITE_ENABLE_COPILOT_RAG=${isPro}`)
  lines.push(`VITE_ENABLE_AI_AGENTS=${isPro}`)
  lines.push(`VITE_ENABLE_REFERRALS=${isPro}`)
  lines.push(``)

  // Database
  lines.push(`# ============================================`)
  lines.push(`# DATABASE (PostgreSQL)`)
  lines.push(`# ============================================`)
  lines.push(`DB_DATABASE=${dbName}`)
  lines.push(`DB_USER=${dbName}`)
  lines.push(`DB_PASSWORD=change-this-password`)
  lines.push(``)
  lines.push(`# Docker Compose Variables`)
  lines.push(`POSTGRES_USER=${dbName}`)
  lines.push(`POSTGRES_PASSWORD=change-this-password`)
  lines.push(`POSTGRES_DB=${dbName}`)
  lines.push(``)
  lines.push(`# Full connection string`)
  lines.push(`DATABASE_URL=postgresql://${dbName}:change-this-password@localhost:${postgresPort}/${dbName}`)
  lines.push(``)

  // Directus CMS
  lines.push(`# ============================================`)
  lines.push(`# DIRECTUS CMS`)
  lines.push(`# ============================================`)
  lines.push(`DIRECTUS_KEY=${directusKey}`)
  lines.push(`DIRECTUS_SECRET=${directusSecret}`)
  lines.push(`DIRECTUS_ADMIN_EMAIL=admin@${isProductionDomain ? domain : 'yourdomain.com'}`)
  lines.push(`DIRECTUS_ADMIN_PASSWORD=ChangeThisPassword123!`)
  lines.push(`DIRECTUS_ADMIN_TOKEN=${generateHex(24)}`)
  lines.push(`DIRECTUS_PUBLIC_URL=http://localhost:${directusPort}`)
  lines.push(`DIRECTUS_URL=http://localhost:${directusPort}`)
  lines.push(``)

  // Authentication
  lines.push(`# ============================================`)
  lines.push(`# AUTHENTICATION`)
  lines.push(`# ============================================`)
  lines.push(`AUTH_PROVIDER=supabase`)
  lines.push(`JWT_SECRET=${jwtSecret}`)
  lines.push(`ADMIN_SECRET=${adminSecret}`)
  lines.push(``)

  // Supabase
  lines.push(`# ============================================`)
  lines.push(`# SUPABASE`)
  lines.push(`# ============================================`)
  lines.push(`# Get from: https://supabase.com/dashboard/project/_/settings/api`)
  lines.push(`SUPABASE_URL=https://your-project-id.supabase.co`)
  lines.push(`SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
  lines.push(`SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
  lines.push(``)

  // OAuth Providers
  lines.push(`# ============================================`)
  lines.push(`# OAUTH PROVIDERS`)
  lines.push(`# ============================================`)
  lines.push(`GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`)
  lines.push(`GOOGLE_CLIENT_SECRET=GOCSPX-your-secret`)
  lines.push(`GITHUB_CLIENT_ID=your-github-client-id`)
  lines.push(`GITHUB_CLIENT_SECRET=your-github-client-secret`)
  lines.push(`DISCORD_CLIENT_ID=`)
  lines.push(`DISCORD_CLIENT_SECRET=`)
  lines.push(``)

  // GitHub Organization (PRO only)
  if (isPro) {
    lines.push(`# ============================================`)
    lines.push(`# GITHUB ORGANIZATION MANAGEMENT (PRO only)`)
    lines.push(`# ============================================`)
    lines.push(`GITHUB_ORG_NAME=${config.github.orgName}`)
    lines.push(`GH_PAT=ghp_your-personal-access-token`)
    if (config.github.teamSlug) {
      lines.push(`GITHUB_TEAM_SLUG=${config.github.teamSlug}`)
    }
    lines.push(`GITHUB_PRO_REPO=${config.github.orgName}/${config.github.proRepoName}`)
    lines.push(``)
  }

  // Stripe Payments
  lines.push(`# ============================================`)
  lines.push(`# STRIPE PAYMENTS`)
  lines.push(`# ============================================`)
  lines.push(`STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key`)
  lines.push(`STRIPE_SECRET_KEY=sk_test_your_secret_key`)
  lines.push(`STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret`)
  lines.push(``)
  lines.push(`# Price IDs`)
  lines.push(`STRIPE_PRICE_MAKER=price_xxxxxxxxxxxxxxxx`)
  lines.push(`STRIPE_PRICE_PRO=price_xxxxxxxxxxxxxxxx`)
  lines.push(`STRIPE_PRICE_AGENCY=price_xxxxxxxxxxxxxxxx`)
  lines.push(`STRIPE_PRICE_MAKER_YEARLY=price_xxxxxxxxxxxxxxxx`)
  lines.push(`STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxxxxx`)
  lines.push(`STRIPE_PRICE_AGENCY_YEARLY=price_xxxxxxxxxxxxxxxx`)
  lines.push(`STRIPE_PRICE_LIFETIME=price_xxxxxxxxxxxxxxxx`)
  lines.push(`STRIPE_PROMO_EARLYCODE=EARLYCODE`)
  lines.push(``)

  // AI APIs
  lines.push(`# ============================================`)
  lines.push(`# AI APIS`)
  lines.push(`# ============================================`)
  lines.push(`OPENAI_API_KEY=sk-your-openai-api-key`)
  lines.push(`ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key`)
  lines.push(``)

  // LLM Router
  lines.push(`# ============================================`)
  lines.push(`# LLM ROUTER CONFIGURATION`)
  lines.push(`# ============================================`)
  lines.push(`OPENROUTER_API_KEY=`)
  lines.push(`LLM_USE_ROUTER=true`)
  lines.push(`LLM_DEFAULT_TIER=standard`)
  lines.push(`LLM_AUTO_ROUTE=true`)
  lines.push(`LLM_CHEAP_MODEL=gpt-4o-mini`)
  lines.push(`LLM_PREMIUM_MODEL=claude-3-opus-20240229`)
  lines.push(``)

  // SerpAPI (PRO only)
  if (isPro) {
    lines.push(`# ============================================`)
    lines.push(`# SERPAPI (PRO only - Web Search for AI Agents)`)
    lines.push(`# ============================================`)
    lines.push(`SERPAPI_KEY=your-serpapi-key-here`)
    lines.push(`SERPAPI_MONTHLY_LIMIT=250`)
    lines.push(``)
  }

  // Encryption
  lines.push(`# ============================================`)
  lines.push(`# ENCRYPTION (Required for BYOK)`)
  lines.push(`# ============================================`)
  lines.push(`ENCRYPTION_KEY=${encryptionKey}`)
  lines.push(``)

  // Email Service
  lines.push(`# ============================================`)
  lines.push(`# EMAIL SERVICE`)
  lines.push(`# ============================================`)
  lines.push(`RESEND_API_KEY=re_your_resend_api_key`)
  lines.push(`RESEND_FROM_EMAIL=${noreplyEmail}`)
  lines.push(`RESEND_FROM_NAME=${config.app.name}`)
  lines.push(`CONTACT_EMAIL=${generalEmail}`)
  lines.push(`NOREPLY_EMAIL=${noreplyEmail}`)
  lines.push(``)
  lines.push(`# SMTP (Alternative)`)
  lines.push(`SMTP_HOST=smtp.gmail.com`)
  lines.push(`SMTP_PORT=587`)
  lines.push(`SMTP_USER=`)
  lines.push(`SMTP_PASSWORD=`)
  lines.push(`SMTP_FROM_EMAIL=${noreplyEmail}`)
  lines.push(`SMTP_FROM_NAME=${config.app.name}`)
  lines.push(`SMTP_SECURE=false`)
  lines.push(``)

  // Newsletter
  lines.push(`# ============================================`)
  lines.push(`# NEWSLETTER SERVICE`)
  lines.push(`# ============================================`)
  lines.push(`EMAILOCTOPUS_API_KEY=`)
  lines.push(`EMAILOCTOPUS_LIST_ID=`)
  lines.push(`VITE_EMAILOCTOPUS_FORM_ID=`)
  lines.push(``)

  // Redis
  lines.push(`# ============================================`)
  lines.push(`# REDIS`)
  lines.push(`# ============================================`)
  lines.push(`REDIS_URL=redis://localhost:${redisPort}`)
  lines.push(``)

  // Qdrant (PRO only)
  if (isPro) {
    lines.push(`# ============================================`)
    lines.push(`# QDRANT (PRO only - Vector Database for RAG)`)
    lines.push(`# ============================================`)
    lines.push(`QDRANT_URL=http://localhost:${qdrantPort}`)
    lines.push(``)
  }

  // Application URLs
  lines.push(`# ============================================`)
  lines.push(`# APPLICATION URLS`)
  lines.push(`# ============================================`)
  lines.push(`NODE_ENV=development`)
  lines.push(`FRONTEND_URL=http://localhost:${webPort}`)
  lines.push(`VITE_APP_NAME=${config.app.name}`)
  lines.push(`VITE_APP_URL=http://localhost:${webPort}`)
  lines.push(`VITE_API_URL=http://localhost:${apiPort}`)
  lines.push(`VITE_DIRECTUS_URL=http://localhost:${directusPort}`)
  lines.push(`VITE_SUPABASE_URL=https://your-project-id.supabase.co`)
  lines.push(`VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
  lines.push(`VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key`)
  lines.push(``)

  // Social Links
  lines.push(`# ============================================`)
  lines.push(`# SOCIAL LINKS`)
  lines.push(`# ============================================`)
  lines.push(`VITE_SOCIAL_GITHUB=${githubUrl}`)
  lines.push(`VITE_SOCIAL_TWITTER=${twitterHandle}`)
  lines.push(`VITE_SOCIAL_DISCORD=${discordUrl}`)
  lines.push(`VITE_SOCIAL_LINKEDIN=${config.social.linkedin || ''}`)
  lines.push(`VITE_SOCIAL_YOUTUBE=${config.social.youtube || ''}`)
  lines.push(``)
  lines.push(`# Contact`)
  lines.push(`VITE_CONTACT_EMAIL=${generalEmail}`)
  lines.push(`VITE_SUPPORT_EMAIL=${supportEmail}`)
  lines.push(``)

  // Giscus Comments
  lines.push(`# ============================================`)
  lines.push(`# GISCUS COMMENTS`)
  lines.push(`# ============================================`)
  lines.push(`VITE_GISCUS_REPO=`)
  lines.push(`VITE_GISCUS_REPO_ID=`)
  lines.push(`VITE_GISCUS_CATEGORY=${isPro ? 'Pro Blog' : 'Community Blog'}`)
  lines.push(`VITE_GISCUS_CATEGORY_ID=`)
  lines.push(`VITE_GISCUS_MAPPING=pathname`)
  lines.push(`VITE_GISCUS_LANG=en`)
  lines.push(``)

  // Analytics
  lines.push(`# ============================================`)
  lines.push(`# ANALYTICS`)
  lines.push(`# ============================================`)
  lines.push(`VITE_ENABLE_ANALYTICS=${config.features.analytics}`)
  lines.push(`VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX`)
  lines.push(`VITE_CLARITY_PROJECT_ID=xxxxxxxxxx`)
  lines.push(`VITE_PLAUSIBLE_DOMAIN=`)
  lines.push(`VITE_GOOGLE_ADS_ID=`)
  lines.push(``)

  // Sentry
  lines.push(`# ============================================`)
  lines.push(`# SENTRY ERROR TRACKING`)
  lines.push(`# ============================================`)
  lines.push(`SENTRY_DSN=`)
  lines.push(`SENTRY_ENVIRONMENT=development`)
  lines.push(`SENTRY_TRACES_SAMPLE_RATE=0.1`)
  lines.push(`VITE_SENTRY_DSN=`)
  lines.push(`VITE_SENTRY_ENVIRONMENT=development`)
  lines.push(`VITE_SENTRY_TRACES_SAMPLE_RATE=0.1`)
  lines.push(``)

  // i18n
  lines.push(`# ============================================`)
  lines.push(`# INTERNATIONALIZATION`)
  lines.push(`# ============================================`)
  lines.push(`VITE_I18N_ENABLED=${config.features.i18n}`)
  lines.push(``)

  // Rate Limits
  lines.push(`# ============================================`)
  lines.push(`# RATE LIMITS (requests per minute)`)
  lines.push(`# ============================================`)
  lines.push(`RATE_LIMIT_FREE=10`)
  lines.push(`RATE_LIMIT_MAKER=30`)
  lines.push(`RATE_LIMIT_PRO=60`)
  lines.push(`RATE_LIMIT_AGENCY=100`)
  lines.push(``)

  return lines.join('\n')
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    showHelp()
    process.exit(0)
  }

  // Load config
  const config = loadConfig()
  console.log(`\nLoaded config.json for: ${config.app.name}`)
  console.log(`Domain: ${config.app.domain}`)

  // Get edition (interactive if not provided)
  let edition = args.edition
  if (!edition) {
    edition = await promptEdition()
  }

  console.log(`\nGenerating ${edition.toUpperCase()} edition environment file...`)

  // Generate content
  const content = generateEnvContent(config, edition)

  // Output
  if (args.stdout) {
    console.log('\n' + content)
  } else {
    const outputPath = args.output || resolve(__dirname, '../.env')
    writeFileSync(outputPath, content)
    console.log(`\nGenerated: ${outputPath}`)
    console.log(`\nNext steps:`)
    console.log(`  1. Fill in your API keys (search for placeholders)`)
    console.log(`  2. Update database password`)
    console.log(`  3. Configure Supabase credentials`)
    console.log(`  4. Run: pnpm dev`)
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})

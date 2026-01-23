import { z } from 'zod';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';

function findRepoRoot(startDir: string): string | undefined {
  let current = startDir;
  for (let i = 0; i < 10; i++) {
    const workspaceFile = resolve(current, 'pnpm-workspace.yaml');
    if (existsSync(workspaceFile)) return current;

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return undefined;
}

// Load env vars from the repo root `.env` (Docker / monorepo canonical),
// and do not load per-package `.env` files (avoid drift between packages).
const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST !== undefined ||
  process.env.JEST_WORKER_ID !== undefined;

if (!isTestEnv) {
  const repoRoot = findRepoRoot(process.cwd());
  if (repoRoot) {
    loadEnv({ path: resolve(repoRoot, '.env') });
  } else {
    // Fallback for unusual working dirs (should still behave like legacy behavior)
    loadEnv({ path: resolve(process.cwd(), '../../.env') });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3003'),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:3050,http://localhost:8099'),
  DIRECTUS_URL: z.string().default('http://localhost:8099'),
  DIRECTUS_TOKEN: z.string().optional(),
  // Back-compat: some deploy envs use DIRECTUS_ADMIN_TOKEN
  DIRECTUS_ADMIN_TOKEN: z.string().optional(),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OAUTH_GITHUB_CLIENT_ID: z.string().optional(),
  OAUTH_GITHUB_CLIENT_SECRET: z.string().optional(),
  OAUTH_DISCORD_CLIENT_ID: z.string().optional(),
  OAUTH_DISCORD_CLIENT_SECRET: z.string().optional(),
  ML_SERVICE_URL: z.string().default('http://localhost:8001'),
  // Optional: leave unset to disable Redis-dependent features in local test/dev.
  REDIS_URL: z.string().default(''),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_MAKER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_AGENCY: z.string().optional(),
  STRIPE_PRICE_MAKER_YEARLY: z.string().optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
  STRIPE_PRICE_AGENCY_YEARLY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  
  // LLM Router settings
  LLM_USE_ROUTER: z.string().default('true'),
  LLM_DEFAULT_TIER: z.enum(['cheap', 'standard', 'premium']).default('standard'),
  LLM_AUTO_ROUTE: z.string().default('true'),
  LLM_CHEAP_MODEL: z.string().default('gpt-4o-mini'),
  LLM_PREMIUM_MODEL: z.string().default('claude-3-opus-20240229'),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5450/synthstack'),
  // QDRANT removed - Community Edition
  COPILOT_ENABLED: z.string().default('true'),
  COPILOT_MODEL: z.string().default('gpt-4o'),
  COPILOT_FALLBACK_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  COPILOT_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  COPILOT_MAX_TOKENS: z.string().default('4000'),
  COPILOT_TEMPERATURE: z.string().default('0.7'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  ADMIN_SECRET: z.string().default('dev-admin-secret'),
  CRON_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3050'),
  RATE_LIMIT_FREE: z.string().optional(),
  RATE_LIMIT_MAKER: z.string().optional(),
  RATE_LIMIT_PRO: z.string().optional(),
  RATE_LIMIT_AGENCY: z.string().optional(),
  NEWSLETTER_PROVIDER: z.enum(['mailerlite', 'mailchimp', 'brevo']).optional(),
  MAILERLITE_API_KEY: z.string().optional(),
  MAILERLITE_GROUP_ID: z.string().optional(),
  MAILERLITE_WEBHOOK_SECRET: z.string().optional(),
  MAILCHIMP_API_KEY: z.string().optional(),
  MAILCHIMP_SERVER_PREFIX: z.string().optional(),
  MAILCHIMP_LIST_ID: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_LIST_ID: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().default('team@manic.agency'),
  SMTP_FROM_NAME: z.string().default('SynthStack'),
  SMTP_SECURE: z.string().optional(),
  STRIPE_PRICE_LIFETIME_MAKER: z.string().optional(),
  STRIPE_PRICE_LIFETIME_PRO: z.string().optional(),
  STRIPE_PRICE_LIFETIME_AGENCY: z.string().optional(),
  STRIPE_PRICE_FREE_DEMO: z.string().optional(),
  SERPAPI_KEY: z.string().optional(),
  SERPAPI_MONTHLY_LIMIT: z.string().default('250'),

  // Sentry Error Tracking (Optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().default('0.1'),
  SENTRY_PROFILES_SAMPLE_RATE: z.string().default('0.1'),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  host: env.HOST,
  logLevel: env.LOG_LEVEL,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  corsOrigins: env.CORS_ORIGIN.split(',').map(s => s.trim()),
  directusUrl: env.DIRECTUS_URL,
  directusToken: env.DIRECTUS_TOKEN || env.DIRECTUS_ADMIN_TOKEN,
  directus: { url: env.DIRECTUS_URL, token: env.DIRECTUS_TOKEN || env.DIRECTUS_ADMIN_TOKEN },
  supabaseUrl: env.SUPABASE_URL,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  supabase: { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY },
  oauth: {
    google: env.OAUTH_GOOGLE_CLIENT_ID && env.OAUTH_GOOGLE_CLIENT_SECRET
      ? { clientId: env.OAUTH_GOOGLE_CLIENT_ID, clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET }
      : undefined,
    github: env.OAUTH_GITHUB_CLIENT_ID && env.OAUTH_GITHUB_CLIENT_SECRET
      ? { clientId: env.OAUTH_GITHUB_CLIENT_ID, clientSecret: env.OAUTH_GITHUB_CLIENT_SECRET }
      : undefined,
    discord: env.OAUTH_DISCORD_CLIENT_ID && env.OAUTH_DISCORD_CLIENT_SECRET
      ? { clientId: env.OAUTH_DISCORD_CLIENT_ID, clientSecret: env.OAUTH_DISCORD_CLIENT_SECRET }
      : undefined,
  },
  mlServiceUrl: env.ML_SERVICE_URL,
  redisUrl: env.REDIS_URL,
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    prices: {
      maker: env.STRIPE_PRICE_MAKER,
      pro: env.STRIPE_PRICE_PRO,
      agency: env.STRIPE_PRICE_AGENCY,
      makerYearly: env.STRIPE_PRICE_MAKER_YEARLY,
      proYearly: env.STRIPE_PRICE_PRO_YEARLY,
      agencyYearly: env.STRIPE_PRICE_AGENCY_YEARLY,
      lifetimeMaker: env.STRIPE_PRICE_LIFETIME_MAKER,
      lifetimePro: env.STRIPE_PRICE_LIFETIME_PRO,
      lifetimeAgency: env.STRIPE_PRICE_LIFETIME_AGENCY,
      freeDemo: env.STRIPE_PRICE_FREE_DEMO,
    },
  },
  openaiApiKey: env.OPENAI_API_KEY,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  openrouterApiKey: env.OPENROUTER_API_KEY,
  
  // LLM Router configuration
  llm: {
    useRouter: env.LLM_USE_ROUTER === 'true',
    defaultTier: env.LLM_DEFAULT_TIER as 'cheap' | 'standard' | 'premium',
    autoRoute: env.LLM_AUTO_ROUTE === 'true',
    cheapModel: env.LLM_CHEAP_MODEL,
    premiumModel: env.LLM_PREMIUM_MODEL,
  },
  databaseUrl: env.DATABASE_URL,
  // Qdrant disabled in Community Edition - upgrade to Pro for vector search
  copilot: {
    enabled: env.COPILOT_ENABLED === 'true',
    model: env.COPILOT_MODEL,
    fallbackModel: env.COPILOT_FALLBACK_MODEL,
    embeddingModel: env.COPILOT_EMBEDDING_MODEL,
    maxTokens: parseInt(env.COPILOT_MAX_TOKENS, 10),
    temperature: parseFloat(env.COPILOT_TEMPERATURE),
  },
  jwtSecret: env.JWT_SECRET,
  adminSecret: env.ADMIN_SECRET,
  cronSecret: env.CRON_SECRET || env.ADMIN_SECRET,
  frontendUrl: env.FRONTEND_URL,
  creditsPerTier: { free: 10, maker: 30, pro: 100, agency: Infinity } as const,
  rateLimitsPerTier: {
    free: env.RATE_LIMIT_FREE ? parseInt(env.RATE_LIMIT_FREE) : 10,
    maker: env.RATE_LIMIT_MAKER ? parseInt(env.RATE_LIMIT_MAKER) : 30,
    pro: env.RATE_LIMIT_PRO ? parseInt(env.RATE_LIMIT_PRO) : 60,
    agency: env.RATE_LIMIT_AGENCY ? parseInt(env.RATE_LIMIT_AGENCY) : 100,
  } as const,
  newsletter: {
    provider: env.NEWSLETTER_PROVIDER,
    mailerlite: { apiKey: env.MAILERLITE_API_KEY, groupId: env.MAILERLITE_GROUP_ID, webhookSecret: env.MAILERLITE_WEBHOOK_SECRET },
    mailchimp: { apiKey: env.MAILCHIMP_API_KEY, serverPrefix: env.MAILCHIMP_SERVER_PREFIX, listId: env.MAILCHIMP_LIST_ID },
    brevo: { apiKey: env.BREVO_API_KEY, listId: env.BREVO_LIST_ID },
  },
  smtp: {
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT),
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromEmail: env.SMTP_FROM_EMAIL,
    fromName: env.SMTP_FROM_NAME,
    secure: env.SMTP_SECURE === 'true',
  },
  serpapi: {
    apiKey: env.SERPAPI_KEY,
    monthlyLimit: parseInt(env.SERPAPI_MONTHLY_LIMIT, 10),
  },
  sentry: {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    tracesSampleRate: parseFloat(env.SENTRY_TRACES_SAMPLE_RATE),
    profilesSampleRate: parseFloat(env.SENTRY_PROFILES_SAMPLE_RATE),
  },
} as const;

export type Config = typeof config;

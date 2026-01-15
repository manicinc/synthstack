-- SynthStack Blog Seed Data Migration
-- Seeds blog categories, authors, and initial posts with proper content

-- Seed blog categories
INSERT INTO blog_categories (name, slug, description, color, sort) VALUES
  ('Engineering', 'engineering', 'Technical deep-dives and code patterns', '#6366F1', 1),
  ('Architecture', 'architecture', 'System design and platform decisions', '#8B5CF6', 2),
  ('DevOps', 'devops', 'Deployment, infrastructure, and operations', '#14B8A6', 3),
  ('Product', 'product', 'Product development and agency insights', '#F59E0B', 4),
  ('Updates', 'updates', 'Product announcements and releases', '#10B981', 5)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  sort = EXCLUDED.sort;

-- Seed default author
INSERT INTO blog_authors (name, slug, bio, email, social_links) VALUES
  ('SynthStack Team', 'synthstack-team', 'The team behind SynthStack - building tools for modern agencies.', 'hello@synthstack.io', '{"twitter": "https://twitter.com/synthstack", "github": "https://github.com/synthstack"}')
ON CONFLICT (slug) DO NOTHING;

-- Get author and category IDs for posts
DO $$
DECLARE
  author_id UUID;
  cat_architecture UUID;
  cat_engineering UUID;
  cat_devops UUID;
  cat_product UUID;
  cat_updates UUID;
BEGIN
  SELECT id INTO author_id FROM blog_authors WHERE slug = 'synthstack-team';
  SELECT id INTO cat_architecture FROM blog_categories WHERE slug = 'architecture';
  SELECT id INTO cat_engineering FROM blog_categories WHERE slug = 'engineering';
  SELECT id INTO cat_devops FROM blog_categories WHERE slug = 'devops';
  SELECT id INTO cat_product FROM blog_categories WHERE slug = 'product';
  SELECT id INTO cat_updates FROM blog_categories WHERE slug = 'updates';

  -- Featured Post: Agency in a Box
  INSERT INTO blog_posts (
    status, title, slug, summary, body, featured, category_id, author_id,
    published_at, read_time, seo_title, seo_description
  ) VALUES (
    'published',
    'Building Your Agency in a Box: The SynthStack Architecture',
    'agency-in-a-box',
    'A deep dive into how SynthStack combines Vue 3, Fastify, and Directus into a production-ready platform.',
    E'# Building Your Agency in a Box: The SynthStack Architecture\n\nWhen we set out to build SynthStack, we had one goal: create a platform that lets agencies ship production-ready SaaS products in days, not months.\n\n## The Challenge\n\nModern agencies face a common problem: every new project requires rebuilding the same foundational pieces:\n- Authentication and user management\n- Subscription billing\n- Admin dashboards\n- API infrastructure\n- Email systems\n\n## Our Solution\n\nSynthStack combines three powerful technologies into a cohesive platform:\n\n### Vue 3 + Quasar Frontend\n```typescript\n// Composition API for clean, reusable logic\nexport function useAuth() {\n  const user = ref<User | null>(null)\n  const isAuthenticated = computed(() => !!user.value)\n  \n  async function login(credentials: LoginCredentials) {\n    const response = await api.post(''/auth/login'', credentials)\n    user.value = response.data.user\n  }\n  \n  return { user, isAuthenticated, login }\n}\n```\n\n### Fastify API Gateway\nOur API layer uses Fastify for its exceptional performance and developer experience:\n- Automatic request validation\n- OpenAPI documentation generation\n- Plugin-based architecture\n\n### Directus CMS\nContent management that adapts to your needs:\n- Visual data modeling\n- REST and GraphQL APIs out of the box\n- Granular permissions\n\n## The Result\n\nWith SynthStack, you get:\n- **Authentication** - JWT-based auth with refresh tokens\n- **Subscriptions** - Stripe integration with usage-based billing\n- **Admin Panel** - Full CMS for content and user management\n- **Email System** - Transactional emails with templates\n- **Documentation** - Self-documenting with RAG-powered search\n\n## Getting Started\n\n```bash\ngit clone https://github.com/manicinc/synthstack\ncd synthstack\npnpm install\ndocker compose up -d\npnpm dev\n```\n\nThat''s it. You''re running a full SaaS platform locally.\n\n---\n\n*Ready to build? Check out our [documentation](/docs) or [get started](/pricing) today.*',
    true,
    cat_architecture,
    author_id,
    NOW() - INTERVAL '2 days',
    12,
    'Building Your Agency in a Box | SynthStack Architecture',
    'Learn how SynthStack combines Vue 3, Fastify, and Directus into a production-ready platform for agencies.'
  ) ON CONFLICT (slug) DO UPDATE SET
    body = EXCLUDED.body,
    summary = EXCLUDED.summary;

  -- Post: Vue 3 Composition API
  INSERT INTO blog_posts (
    status, title, slug, summary, body, featured, category_id, author_id,
    published_at, read_time, seo_title, seo_description
  ) VALUES (
    'published',
    'Mastering Vue 3 Composition API: Patterns That Scale',
    'vue3-composition-patterns',
    'Explore advanced composition patterns, custom composables, and state management strategies for enterprise applications.',
    E'# Mastering Vue 3 Composition API: Patterns That Scale\n\nThe Composition API isn''t just a new way to write components - it''s a paradigm shift in how we organize and reuse logic in Vue applications.\n\n## Why Composition API?\n\nThe Options API served us well, but as applications grew, we encountered:\n- Logic scattered across lifecycle hooks\n- Difficulty extracting reusable logic\n- TypeScript integration challenges\n\n## Pattern 1: The Feature Composable\n\n```typescript\n// composables/useFeatureFlag.ts\nexport function useFeatureFlag(flagName: string) {\n  const isEnabled = ref(false)\n  const isLoading = ref(true)\n  \n  onMounted(async () => {\n    const flags = await fetchFeatureFlags()\n    isEnabled.value = flags[flagName] ?? false\n    isLoading.value = false\n  })\n  \n  return { isEnabled, isLoading }\n}\n```\n\n## Pattern 2: Async State Management\n\n```typescript\nexport function useAsync<T>(asyncFn: () => Promise<T>) {\n  const data = ref<T | null>(null)\n  const error = ref<Error | null>(null)\n  const loading = ref(false)\n  \n  async function execute() {\n    loading.value = true\n    error.value = null\n    try {\n      data.value = await asyncFn()\n    } catch (e) {\n      error.value = e as Error\n    } finally {\n      loading.value = false\n    }\n  }\n  \n  return { data, error, loading, execute }\n}\n```\n\n## Pattern 3: Dependency Injection\n\n```typescript\n// Provide at app level\nconst api = createApiClient()\napp.provide(''api'', api)\n\n// Inject in any component\nexport function useApi() {\n  const api = inject<ApiClient>(''api'')\n  if (!api) throw new Error(''API not provided'')\n  return api\n}\n```\n\n## Best Practices\n\n1. **Keep composables focused** - One responsibility per composable\n2. **Return refs, not reactive** - Better TypeScript inference\n3. **Use readonly for derived state** - Prevent accidental mutations\n4. **Document your composables** - Future you will thank you\n\n---\n\n*Building with SynthStack? Our composables follow these patterns out of the box.*',
    false,
    cat_engineering,
    author_id,
    NOW() - INTERVAL '4 days',
    8,
    'Vue 3 Composition API Patterns | SynthStack',
    'Advanced Vue 3 Composition API patterns for building scalable enterprise applications.'
  ) ON CONFLICT (slug) DO UPDATE SET
    body = EXCLUDED.body,
    summary = EXCLUDED.summary;

  -- Post: Directus CMS
  INSERT INTO blog_posts (
    status, title, slug, summary, body, featured, category_id, author_id,
    published_at, read_time, seo_title, seo_description
  ) VALUES (
    'published',
    'Why We Chose Directus as Our Headless CMS',
    'directus-headless-cms',
    'The decision framework behind selecting Directus, and how it enables rapid content modeling without vendor lock-in.',
    E'# Why We Chose Directus as Our Headless CMS\n\nChoosing a CMS is one of those decisions that echoes through your entire architecture. Here''s why Directus won for SynthStack.\n\n## The Evaluation Criteria\n\nWe needed a CMS that:\n1. Provides a great admin UI for non-technical users\n2. Generates REST and GraphQL APIs automatically\n3. Supports custom extensions\n4. Can be self-hosted\n5. Doesn''t lock us into a specific database\n\n## Why Not [Other CMS]?\n\n**Strapi**: Great, but the migration story between versions has been painful.\n\n**Sanity**: Excellent DX but hosted-only with usage-based pricing.\n\n**Contentful**: Enterprise pricing for enterprise features we didn''t need.\n\n**Payload**: Promising but younger ecosystem.\n\n## What Makes Directus Special\n\n### Database Mirroring\nDirectus wraps your existing database - it doesn''t create its own schema. This means:\n- Use any PostgreSQL features\n- Write raw SQL when needed\n- Migrate away easily if needed\n\n### The Admin App\n```\n+------------------+------------------------+\n|   Collections    |    Content Editor      |\n|                  |                        |\n|   - blog_posts   |   Title: [          ]  |\n|   - pages        |   Body:  [          ]  |\n|   - authors      |   Status: Published v  |\n|                  |                        |\n+------------------+------------------------+\n```\n\n### Extensions & Flows\nAutomate workflows without code:\n- Send emails on content publish\n- Sync to external services\n- Generate thumbnails\n\n## Our Setup\n\n```yaml\n# docker-compose.yml\ndirectus:\n  image: directus/directus:latest\n  environment:\n    DB_CLIENT: pg\n    DB_HOST: postgres\n    DB_DATABASE: synthstack\n  volumes:\n    - ./uploads:/directus/uploads\n    - ./extensions:/directus/extensions\n```\n\n---\n\n*Curious how we integrate Directus with our API? Check out our [architecture docs](/docs/architecture).*',
    false,
    cat_architecture,
    author_id,
    NOW() - INTERVAL '7 days',
    6,
    'Why Directus for Headless CMS | SynthStack',
    'How we evaluated headless CMS options and why Directus was the right choice for SynthStack.'
  ) ON CONFLICT (slug) DO UPDATE SET
    body = EXCLUDED.body,
    summary = EXCLUDED.summary;

  -- Post: Docker Compose Production
  INSERT INTO blog_posts (
    status, title, slug, summary, body, featured, category_id, author_id,
    published_at, read_time, seo_title, seo_description
  ) VALUES (
    'published',
    'Docker Compose to Production: A Practical Guide',
    'docker-compose-production',
    'From local development to production deployment using Docker Compose, with real-world patterns for scaling services.',
    E'# Docker Compose to Production: A Practical Guide\n\nDocker Compose is often dismissed as "just for development." We''ve been running it in production for years. Here''s how.\n\n## The Myth\n\n"Docker Compose doesn''t scale."\n\nThe reality: For most applications, a well-configured single-server deployment handles more traffic than you think.\n\n## Production-Ready Compose\n\n```yaml\nversion: ''3.8''\n\nservices:\n  api:\n    image: ghcr.io/synthstack/api:${VERSION}\n    deploy:\n      replicas: 2\n      resources:\n        limits:\n          cpus: ''1''\n          memory: 1G\n    healthcheck:\n      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:3000/health\"]\n      interval: 30s\n      timeout: 10s\n      retries: 3\n    environment:\n      - NODE_ENV=production\n      - DATABASE_URL=${DATABASE_URL}\n    networks:\n      - internal\n      - traefik\n\n  postgres:\n    image: postgres:16-alpine\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n    environment:\n      POSTGRES_DB: synthstack\n      POSTGRES_PASSWORD_FILE: /run/secrets/db_password\n    secrets:\n      - db_password\n    networks:\n      - internal\n\nnetworks:\n  internal:\n  traefik:\n    external: true\n\nvolumes:\n  postgres_data:\n\nsecrets:\n  db_password:\n    external: true\n```\n\n## Key Patterns\n\n### 1. Use Traefik for Routing\n```yaml\nlabels:\n  - \"traefik.enable=true\"\n  - \"traefik.http.routers.api.rule=Host(`api.example.com`)\"\n  - \"traefik.http.routers.api.tls.certresolver=letsencrypt\"\n```\n\n### 2. Health Checks Are Non-Negotiable\nWithout health checks, Docker won''t know when your service is actually ready.\n\n### 3. Resource Limits Prevent Cascade Failures\nOne runaway process shouldn''t take down your entire stack.\n\n### 4. Use Docker Secrets\nNever put credentials in environment variables in your compose file.\n\n## Deployment Script\n\n```bash\n#!/bin/bash\nexport VERSION=$(git rev-parse --short HEAD)\ndocker compose pull\ndocker compose up -d --remove-orphans\ndocker system prune -f\n```\n\n---\n\n*SynthStack uses this exact pattern. Clone our repo to see it in action.*',
    false,
    cat_devops,
    author_id,
    NOW() - INTERVAL '11 days',
    10,
    'Docker Compose Production Guide | SynthStack',
    'Practical patterns for running Docker Compose in production with health checks, secrets, and scaling.'
  ) ON CONFLICT (slug) DO UPDATE SET
    body = EXCLUDED.body,
    summary = EXCLUDED.summary;

  -- Post: Stripe Subscriptions
  INSERT INTO blog_posts (
    status, title, slug, summary, body, featured, category_id, author_id,
    published_at, read_time, seo_title, seo_description
  ) VALUES (
    'published',
    'Implementing Stripe Subscriptions the Right Way',
    'stripe-subscriptions-guide',
    'A complete guide to handling subscriptions, webhooks, and billing edge cases in SaaS applications.',
    E'# Implementing Stripe Subscriptions the Right Way\n\nStripe''s API is excellent. The documentation is thorough. Yet subscription billing still trips up most teams. Here''s what we learned.\n\n## The Architecture\n\n```\nUser -> Your App -> Stripe API\n                       |\n                       v\n              Stripe Webhooks -> Your App -> Database\n```\n\n**Critical insight**: Never trust client-side subscription status. Always verify via webhooks.\n\n## Setting Up Products\n\n```typescript\n// Create products and prices in Stripe Dashboard or via API\nconst product = await stripe.products.create({\n  name: ''Pro Plan'',\n  metadata: { tier: ''pro'' }\n})\n\nconst price = await stripe.prices.create({\n  product: product.id,\n  unit_amount: 2900, // $29.00\n  currency: ''usd'',\n  recurring: { interval: ''month'' }\n})\n```\n\n## The Checkout Flow\n\n```typescript\n// Create checkout session\napp.post(''/create-checkout'', async (req, reply) => {\n  const session = await stripe.checkout.sessions.create({\n    customer_email: req.user.email,\n    line_items: [{ price: req.body.priceId, quantity: 1 }],\n    mode: ''subscription'',\n    success_url: `${BASE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,\n    cancel_url: `${BASE_URL}/pricing`,\n    metadata: { userId: req.user.id }\n  })\n  \n  return { url: session.url }\n})\n```\n\n## Webhook Handling\n\n```typescript\napp.post(''/webhooks/stripe'', async (req, reply) => {\n  const sig = req.headers[''stripe-signature'']\n  const event = stripe.webhooks.constructEvent(\n    req.rawBody,\n    sig,\n    WEBHOOK_SECRET\n  )\n  \n  switch (event.type) {\n    case ''checkout.session.completed'':\n      await handleCheckoutComplete(event.data.object)\n      break\n    case ''customer.subscription.updated'':\n      await handleSubscriptionUpdate(event.data.object)\n      break\n    case ''customer.subscription.deleted'':\n      await handleSubscriptionCanceled(event.data.object)\n      break\n    case ''invoice.payment_failed'':\n      await handlePaymentFailed(event.data.object)\n      break\n  }\n  \n  return { received: true }\n})\n```\n\n## Edge Cases to Handle\n\n1. **Payment failures** - Grace period before downgrade\n2. **Plan changes** - Proration handling\n3. **Cancellations** - Access until period end\n4. **Refunds** - Partial vs full\n5. **Trials** - Converting to paid\n\n---\n\n*SynthStack includes a complete Stripe integration. See our [billing documentation](/docs/billing).*',
    false,
    cat_engineering,
    author_id,
    NOW() - INTERVAL '14 days',
    9,
    'Stripe Subscription Implementation Guide | SynthStack',
    'Complete guide to implementing Stripe subscriptions with webhooks and edge case handling.'
  ) ON CONFLICT (slug) DO UPDATE SET
    body = EXCLUDED.body,
    summary = EXCLUDED.summary;

  -- Post: Building for Agencies
  INSERT INTO blog_posts (
    status, title, slug, summary, body, featured, category_id, author_id,
    published_at, read_time, seo_title, seo_description
  ) VALUES (
    'published',
    'Building Products for Digital Agencies: Lessons Learned',
    'building-for-agencies',
    'Key insights from building tools that help agencies ship faster, from project structure to white-labeling.',
    E'# Building Products for Digital Agencies: Lessons Learned\n\nAfter years of building products for and with digital agencies, we''ve learned what actually matters.\n\n## What Agencies Actually Need\n\n1. **Speed to first deployment** - Not features, speed\n2. **White-labeling** - Their brand, not yours\n3. **Predictable costs** - No surprises on the invoice\n4. **Self-service when possible** - They''re busy\n5. **Expert support when needed** - Complex problems need humans\n\n## The Monorepo Advantage\n\n```\nsynthstack/\n├── apps/\n│   ├── web/          # Client-facing app\n│   └── admin/        # Admin dashboard\n├── packages/\n│   ├── api-gateway/  # Fastify API\n│   ├── types/        # Shared TypeScript types\n│   └── utils/        # Shared utilities\n└── services/\n    └── directus/     # CMS configuration\n```\n\nWhy this matters:\n- **Consistency** - Same patterns everywhere\n- **Code sharing** - Types, utils, components\n- **Deployment flexibility** - Deploy together or separately\n\n## White-Labeling Done Right\n\n```typescript\n// config/branding.ts\nexport const branding = {\n  name: process.env.BRAND_NAME || ''SynthStack'',\n  logo: process.env.BRAND_LOGO || ''/logo.svg'',\n  colors: {\n    primary: process.env.BRAND_PRIMARY || ''#6366f1'',\n    secondary: process.env.BRAND_SECONDARY || ''#8b5cf6''\n  },\n  domain: process.env.BRAND_DOMAIN || ''synthstack.io''\n}\n```\n\n## Pricing for Agencies\n\nWhat we learned about pricing:\n- **Flat monthly beats per-seat** - Agencies add contractors constantly\n- **Generous limits** - Don''t nickel-and-dime on API calls\n- **Annual discounts** - Cash flow matters for small agencies\n- **Partner tiers** - Reward loyalty, create advocates\n\n## Documentation Matters\n\nAgencies evaluate tools by:\n1. Can I get it running in 10 minutes?\n2. Can my junior dev understand it?\n3. Is there a clear upgrade path?\n\n---\n\n*SynthStack was built with agencies in mind. [See our pricing](/pricing) designed for agency workflows.*',
    false,
    cat_product,
    author_id,
    NOW() - INTERVAL '20 days',
    7,
    'Building Products for Digital Agencies | SynthStack',
    'Lessons learned building developer tools for digital agencies - from architecture to pricing.'
  ) ON CONFLICT (slug) DO UPDATE SET
    body = EXCLUDED.body,
    summary = EXCLUDED.summary;

  -- Post: Introducing SynthStack
  INSERT INTO blog_posts (
    status, title, slug, summary, body, featured, category_id, author_id,
    published_at, read_time, seo_title, seo_description
  ) VALUES (
    'published',
    'Introducing SynthStack: Your Agency in a Box',
    'introducing-synthstack',
    'We''re excited to announce SynthStack, a complete platform for building and launching SaaS products in record time.',
    E'# Introducing SynthStack: Your Agency in a Box\n\nToday, we''re launching SynthStack - a complete platform for building and launching SaaS products.\n\n## The Problem\n\nEvery new project starts the same way:\n- Set up authentication\n- Configure a database\n- Build an admin panel\n- Integrate payments\n- Set up email sending\n- Deploy somewhere\n\nThat''s weeks of work before you write a single line of business logic.\n\n## The Solution\n\nSynthStack gives you all of this out of the box:\n\n- **Authentication** - JWT-based with refresh tokens, OAuth ready\n- **Database** - PostgreSQL with migrations and seeding\n- **CMS** - Directus for content management\n- **Payments** - Stripe subscriptions with webhooks\n- **Email** - Transactional emails with templates\n- **Deployment** - Docker Compose for any cloud\n\n## What''s Included\n\n```\ngit clone https://github.com/manicinc/synthstack\ncd synthstack\npnpm install\ndocker compose up -d\npnpm dev\n```\n\nIn under 5 minutes, you have:\n- Vue 3 frontend with Quasar UI\n- Fastify API with OpenAPI docs\n- Directus admin panel\n- PostgreSQL database\n- Redis for caching\n- MinIO for file storage\n\n## Licensing\n\nSynthStack uses a dual-license model:\n- Community Edition: modified MIT (non-commercial) for learning/evaluation\n- Pro Edition: Commercial License for production and client work\n\n## What''s Next\n\nWe''re just getting started. Coming soon:\n- More authentication providers\n- Usage-based billing\n- Multi-tenancy support\n- Terraform modules\n\n---\n\n*Ready to build? [Get started](/docs/getting-started) or check out the [GitHub repo](https://github.com/manicinc/synthstack).*',
    false,
    cat_updates,
    author_id,
    NOW() - INTERVAL '27 days',
    4,
    'Introducing SynthStack | Your Agency in a Box',
    'Announcing SynthStack - a complete platform for building and launching SaaS products in record time.'
  ) ON CONFLICT (slug) DO UPDATE SET
    body = EXCLUDED.body,
    summary = EXCLUDED.summary;

  -- Post: SynthStack Complete Architecture 2026
  INSERT INTO blog_posts (
    status, title, slug, summary, body, featured, category_id, author_id,
    published_at, read_time, seo_title, seo_description
  ) VALUES (
    'published',
    'SynthStack Complete Architecture Guide 2026',
    'synthstack-complete-architecture-2026',
    'A comprehensive overview of SynthStack''s architecture: from Vue 3 frontend to Fastify API, Directus CMS, AI integrations, and production deployment.',
    E'# SynthStack Complete Architecture Guide 2026\n\nThis comprehensive guide covers the entire SynthStack architecture - every service, integration, and pattern you need to understand to build production-ready SaaS applications.\n\n## Architecture Overview\n\n```\n┌─────────────────────────────────────────────────────────────┐\n│                     Client Layer                             │\n│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │\n│  │  Vue 3 SPA   │  │  Mobile Apps │  │  CLI Tools   │      │\n│  │  (Quasar)    │  │  (Capacitor) │  │  (Node.js)   │      │\n│  └──────────────┘  └──────────────┘  └──────────────┘      │\n└─────────────────────────────────────────────────────────────┘\n                              │\n                              ▼\n┌─────────────────────────────────────────────────────────────┐\n│                     API Gateway                              │\n│  ┌──────────────────────────────────────────────────────┐  │\n│  │  Fastify + TypeScript                                  │  │\n│  │  - JWT Authentication                                  │  │\n│  │  - Rate Limiting                                       │  │\n│  │  - OpenAPI Documentation                              │  │\n│  │  - Request Validation                                 │  │\n│  └──────────────────────────────────────────────────────┘  │\n└─────────────────────────────────────────────────────────────┘\n                              │\n         ┌────────────────────┼────────────────────┐\n         ▼                    ▼                    ▼\n┌──────────────┐    ┌──────────────┐    ┌──────────────┐\n│  PostgreSQL  │    │   Directus   │    │  ML Service  │\n│  (Primary)   │    │   (CMS)      │    │  (Python)    │\n└──────────────┘    └──────────────┘    └──────────────┘\n         │                                      │\n         │                    ┌─────────────────┤\n         ▼                    ▼                 ▼\n┌──────────────┐    ┌──────────────┐    ┌──────────────┐\n│    Redis     │    │   Qdrant     │    │  AI Providers│\n│   (Cache)    │    │  (Vector DB) │    │ OpenAI/Claude│\n└──────────────┘    └──────────────┘    └──────────────┘\n```\n\n## Frontend Architecture\n\n### Vue 3 + Quasar Stack\n\nThe frontend uses Vue 3 with Composition API and Quasar for UI components:\n\n```typescript\n// Composition API pattern used throughout\nexport function useAuth() {\n  const user = ref<User | null>(null)\n  const isAuthenticated = computed(() => !!user.value)\n  const isAdmin = computed(() => user.value?.is_admin ?? false)\n  \n  async function login(credentials: LoginCredentials) {\n    const { data } = await api.post(''/api/v1/auth/login'', credentials)\n    user.value = data.user\n    localStorage.setItem(''token'', data.token)\n  }\n  \n  return { user, isAuthenticated, isAdmin, login, logout }\n}\n```\n\n### Key Frontend Features\n\n- **Pinia Stores**: Centralized state management\n- **Vue Router**: SPA routing with guards\n- **i18n**: Multi-language support\n- **Theme System**: Light/dark mode with CSS variables\n- **Responsive Design**: Mobile-first with Quasar breakpoints\n\n## API Gateway (Fastify)\n\n### Route Structure\n\n```typescript\n// packages/api-gateway/src/routes/\n├── auth.ts        // Authentication endpoints\n├── users.ts       // User management\n├── blog.ts        // Blog posts & categories\n├── copilot.ts     // AI chat assistant\n├── billing.ts     // Stripe subscriptions\n├── admin.ts       // Admin-only endpoints\n└── health.ts      // Health checks\n```\n\n### Request Flow\n\n```typescript\napp.post(''/api/v1/auth/login'', {\n  schema: {\n    body: LoginSchema,\n    response: { 200: LoginResponseSchema }\n  },\n  preHandler: [rateLimitMiddleware]\n}, async (request, reply) => {\n  const { email, password } = request.body\n  const user = await authService.validateCredentials(email, password)\n  const token = await authService.generateToken(user)\n  return { user, token }\n})\n```\n\n## Database Layer\n\n### PostgreSQL Schema\n\nCore tables:\n\n```sql\n-- Users and authentication\napp_users (id, email, password_hash, is_admin, created_at)\nuser_sessions (id, user_id, token, expires_at)\n\n-- Content\nblog_posts (id, title, slug, body, status, published_at)\nblog_categories (id, name, slug, color)\nblog_authors (id, name, bio, avatar)\n\n-- Billing\nsubscription_plans (id, name, price_monthly, features)\nuser_subscriptions (id, user_id, plan_id, stripe_subscription_id)\n\n-- AI\ncopilot_conversations (id, user_id, title, created_at)\ncopilot_messages (id, conversation_id, role, content)\nllm_usage_log (id, user_id, model, tokens, cost)\n```\n\n### Migrations\n\nMigrations are stored in `services/directus/migrations/` and run automatically:\n\n```bash\n# Apply pending migrations\ndocker compose up -d directus-migrate\n\n# Check migration status\ndocker compose logs directus-migrate\n```\n\n## AI Integration\n\n### Copilot Architecture\n\n```typescript\n// The copilot uses a RAG (Retrieval Augmented Generation) pattern\nconst copilotService = {\n  async chat(message: string, conversationId: string) {\n    // 1. Retrieve relevant context from Qdrant\n    const context = await vectorSearch(message, { limit: 5 })\n    \n    // 2. Build prompt with context\n    const systemPrompt = buildSystemPrompt(context)\n    \n    // 3. Stream response from LLM\n    const stream = await openai.chat.completions.create({\n      model: ''gpt-4o'',\n      messages: [{ role: ''system'', content: systemPrompt }, ...history],\n      stream: true\n    })\n    \n    // 4. Log usage for billing\n    await logUsage(conversationId, tokens)\n    \n    return stream\n  }\n}\n```\n\n### Supported Providers\n\n| Provider | Models | Use Case |\n|----------|--------|----------|\n| OpenAI | GPT-4o, GPT-4o-mini | Primary chat, embeddings |\n| Anthropic | Claude 3.5 Sonnet | Complex reasoning |\n| Local | Ollama | Development/testing |\n\n## Deployment\n\n### Docker Compose Production\n\n```yaml\n# deploy/docker-compose.yml\nservices:\n  web:\n    image: ghcr.io/manicinc/synthstack-web:latest\n    labels:\n      - traefik.http.routers.web.rule=Host(`app.example.com`)\n    \n  api:\n    image: ghcr.io/manicinc/synthstack-api:latest\n    environment:\n      - DATABASE_URL=postgresql://...\n      - REDIS_URL=redis://...\n    \n  traefik:\n    image: traefik:v2.10\n    ports:\n      - \"80:80\"\n      - \"443:443\"\n```\n\n### CI/CD Pipeline\n\n```yaml\n# .github/workflows/deploy.yml\non:\n  push:\n    branches: [master]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: docker compose build\n      - run: docker compose push\n      - uses: appleboy/ssh-action@master\n        with:\n          script: |\n            cd /opt/synthstack\n            docker compose pull\n            docker compose up -d\n```\n\n## Security\n\n### Authentication Flow\n\n1. **Login**: Email/password → JWT token (15min) + refresh token (7d)\n2. **Token Refresh**: Automatic via axios interceptor\n3. **Logout**: Invalidate refresh token, clear local storage\n\n### Authorization\n\n```typescript\n// Role-based access control\nconst authorize = (requiredRole: ''user'' | ''admin'') => {\n  return async (request: FastifyRequest) => {\n    const user = await validateToken(request.headers.authorization)\n    if (requiredRole === ''admin'' && !user.is_admin) {\n      throw new ForbiddenError(''Admin access required'')\n    }\n    request.user = user\n  }\n}\n```\n\n## Monitoring\n\n### Health Checks\n\n- `GET /health` - Basic liveness\n- `GET /health/ready` - Full readiness (DB, Redis, etc.)\n- `GET /api/v1/copilot/health` - AI service status\n\n### Logging\n\n```typescript\n// Structured logging with Pino\nlogger.info({ userId, action: ''login'', ip: request.ip }, ''User logged in'')\nlogger.error({ error, stack: error.stack }, ''Request failed'')\n```\n\n### Metrics\n\n- LLM usage tracking in `llm_usage_log`\n- Request latency via Fastify hooks\n- Error rates via Sentry integration\n\n## Next Steps\n\n- [Quick Start Guide](/docs/quick-start)\n- [Self-Hosting Guide](/docs/self-hosting)\n- [API Reference](/api/docs)\n- [GitHub Repository](https://github.com/manicinc/synthstack)\n\n---\n\n*This architecture guide is part of the SynthStack documentation. Have questions? Ask the AI Copilot or join our community.*',
    true,
    cat_architecture,
    author_id,
    NOW() - INTERVAL '1 day',
    25,
    'SynthStack Complete Architecture Guide 2026',
    'Comprehensive architecture overview: Vue 3 frontend, Fastify API, Directus CMS, AI integrations, and production deployment patterns.'
  ) ON CONFLICT (slug) DO UPDATE SET
    body = EXCLUDED.body,
    summary = EXCLUDED.summary,
    featured = EXCLUDED.featured;

  -- Post: Self-Hosting SynthStack
  INSERT INTO blog_posts (
    status, title, slug, summary, body, featured, category_id, author_id,
    published_at, read_time, seo_title, seo_description
  ) VALUES (
    'published',
    'Complete Guide to Self-Hosting SynthStack',
    'self-hosting-complete-guide',
    'Everything you need to deploy SynthStack on your own infrastructure: Docker setup, database configuration, SSL certificates, and production optimizations.',
    E'# Complete Guide to Self-Hosting SynthStack\n\nThis guide covers deploying SynthStack on your own infrastructure - from a single VPS to multi-node clusters.\n\n## Prerequisites\n\n- Linux server (Ubuntu 22.04+ recommended)\n- Docker and Docker Compose installed\n- Domain name with DNS access\n- 4GB+ RAM, 2+ CPU cores\n\n## Quick Deploy (Single Server)\n\n### 1. Clone and Configure\n\n```bash\n# On your server\ngit clone https://github.com/manicinc/synthstack-pro.git\ncd synthstack-pro\n\n# Copy environment template\ncp deploy/.env.example deploy/.env\n```\n\n### 2. Generate Security Keys\n\n```bash\n# Generate all required secrets\nnode -e \"console.log(''DIRECTUS_KEY='' + require(''crypto'').randomBytes(32).toString(''hex''))\"\nnode -e \"console.log(''DIRECTUS_SECRET='' + require(''crypto'').randomBytes(32).toString(''hex''))\"\nnode -e \"console.log(''JWT_SECRET='' + require(''crypto'').randomBytes(48).toString(''base64''))\"\nnode -e \"console.log(''ENCRYPTION_KEY='' + require(''crypto'').randomBytes(32).toString(''hex''))\"\n```\n\nAdd these to your `deploy/.env` file.\n\n### 3. Configure Domain\n\nEdit `deploy/.env`:\n\n```bash\nDOMAIN=app.yourdomain.com\nACME_EMAIL=your@email.com\n```\n\n### 4. Deploy\n\n```bash\ncd deploy\ndocker compose up -d\n```\n\n### 5. Initialize Database\n\n```bash\n# Run migrations\ndocker compose up -d directus-migrate\n\n# Seed sample content (optional)\ndocker compose exec postgres psql -U synthstack -d synthstack \\\n  -f /docker-entrypoint-initdb.d/seeds/001_sample_content.sql\n```\n\n## SSL Certificates\n\nTraefik handles SSL automatically via Let''s Encrypt:\n\n```yaml\n# Automatic HTTPS\ntraefik:\n  command:\n    - --certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}\n    - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json\n    - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web\n```\n\n## Database Backups\n\n### Automated Backups\n\n```bash\n# Add to crontab\n0 2 * * * /opt/synthstack/scripts/backup-db.sh\n```\n\n### Backup Script\n\n```bash\n#!/bin/bash\n# scripts/backup-db.sh\nTIMESTAMP=$(date +%Y%m%d_%H%M%S)\nBACKUP_DIR=/opt/synthstack/backups\n\ndocker compose exec -T postgres pg_dump -U synthstack synthstack \\\n  | gzip > $BACKUP_DIR/synthstack_$TIMESTAMP.sql.gz\n\n# Keep last 7 days\nfind $BACKUP_DIR -name \"*.sql.gz\" -mtime +7 -delete\n```\n\n## Monitoring\n\n### Health Checks\n\n```bash\n# Check all services\ncurl https://app.yourdomain.com/health\ncurl https://app.yourdomain.com/api/v1/health\n```\n\n### Logs\n\n```bash\n# View all logs\ndocker compose logs -f\n\n# Specific service\ndocker compose logs -f api-gateway\n```\n\n## Scaling\n\n### Horizontal Scaling\n\n```yaml\n# docker-compose.override.yml\nservices:\n  api:\n    deploy:\n      replicas: 3\n```\n\n### External Database\n\nPoint to managed PostgreSQL:\n\n```bash\nDATABASE_URL=postgresql://user:pass@rds.amazonaws.com:5432/synthstack\n```\n\n## Troubleshooting\n\n| Issue | Solution |\n|-------|----------|\n| 502 Bad Gateway | Check if api-gateway is running |\n| Database connection failed | Verify DATABASE_URL, check postgres logs |\n| SSL certificate errors | Ensure domain DNS points to server |\n| Out of memory | Increase server RAM or reduce replicas |\n\n---\n\n*Need help? Check our [Troubleshooting Guide](/docs/troubleshooting) or ask in our community.*',
    false,
    cat_devops,
    author_id,
    NOW() - INTERVAL '3 days',
    15,
    'Self-Hosting SynthStack Guide',
    'Complete guide to deploying SynthStack on your own infrastructure with Docker, SSL, backups, and monitoring.'
  ) ON CONFLICT (slug) DO UPDATE SET
    body = EXCLUDED.body,
    summary = EXCLUDED.summary;

  -- Post: AI Copilot Deep Dive
  INSERT INTO blog_posts (
    status, title, slug, summary, body, featured, category_id, author_id,
    published_at, read_time, seo_title, seo_description
  ) VALUES (
    'published',
    'Building an AI Copilot with RAG: SynthStack Deep Dive',
    'ai-copilot-rag-deep-dive',
    'How we built SynthStack''s AI Copilot using Retrieval Augmented Generation (RAG) with Qdrant vector database and streaming responses.',
    E'# Building an AI Copilot with RAG: SynthStack Deep Dive\n\nThe SynthStack AI Copilot is more than a chatbot - it''s a context-aware assistant that understands your codebase and documentation.\n\n## What is RAG?\n\nRetrieval Augmented Generation (RAG) enhances LLM responses by:\n\n1. **Retrieving** relevant documents from a vector database\n2. **Augmenting** the prompt with this context\n3. **Generating** responses grounded in your actual data\n\n## Architecture\n\n```\nUser Query\n    │\n    ▼\n┌──────────────┐\n│ Embed Query  │ ← OpenAI text-embedding-3-small\n└──────────────┘\n    │\n    ▼\n┌──────────────┐\n│ Vector Search│ ← Qdrant similarity search\n└──────────────┘\n    │\n    ▼\n┌──────────────┐\n│ Build Prompt │ ← System prompt + context + history\n└──────────────┘\n    │\n    ▼\n┌──────────────┐\n│ Stream LLM   │ ← GPT-4o or Claude 3.5\n└──────────────┘\n    │\n    ▼\nStreaming Response\n```\n\n## Implementation\n\n### Document Indexing\n\n```typescript\nasync function indexDocument(doc: Document) {\n  // 1. Chunk the document\n  const chunks = chunkText(doc.content, { maxTokens: 500, overlap: 50 })\n  \n  // 2. Generate embeddings\n  const embeddings = await openai.embeddings.create({\n    model: ''text-embedding-3-small'',\n    input: chunks.map(c => c.text)\n  })\n  \n  // 3. Store in Qdrant\n  await qdrant.upsert(''documents'', {\n    points: chunks.map((chunk, i) => ({\n      id: generateId(),\n      vector: embeddings.data[i].embedding,\n      payload: {\n        text: chunk.text,\n        source: doc.title,\n        url: doc.url\n      }\n    }))\n  })\n}\n```\n\n### Query Processing\n\n```typescript\nasync function chat(message: string, history: Message[]) {\n  // 1. Embed the query\n  const queryEmbedding = await openai.embeddings.create({\n    model: ''text-embedding-3-small'',\n    input: message\n  })\n  \n  // 2. Search for relevant context\n  const results = await qdrant.search(''documents'', {\n    vector: queryEmbedding.data[0].embedding,\n    limit: 5,\n    score_threshold: 0.7\n  })\n  \n  // 3. Build context-aware prompt\n  const context = results\n    .map(r => `Source: ${r.payload.source}\\n${r.payload.text}`)\n    .join(''\\n\\n'')\n  \n  const systemPrompt = `You are a helpful AI assistant for SynthStack.\n\nUse the following context to answer questions:\n\n${context}\n\nIf the context doesn''t contain relevant information, say so.`\n  \n  // 4. Stream response\n  return openai.chat.completions.create({\n    model: ''gpt-4o'',\n    messages: [\n      { role: ''system'', content: systemPrompt },\n      ...history,\n      { role: ''user'', content: message }\n    ],\n    stream: true\n  })\n}\n```\n\n### Streaming to Frontend\n\n```typescript\n// API endpoint\napp.post(''/api/v1/copilot/chat'', async (request, reply) => {\n  const stream = await copilotService.chat(\n    request.body.message,\n    request.body.history\n  )\n  \n  reply.header(''Content-Type'', ''text/event-stream'')\n  \n  for await (const chunk of stream) {\n    const content = chunk.choices[0]?.delta?.content\n    if (content) {\n      reply.raw.write(`data: ${JSON.stringify({ content })}\\n\\n`)\n    }\n  }\n  \n  reply.raw.end()\n})\n```\n\n```typescript\n// Frontend consumption\nconst response = await fetch(''/api/v1/copilot/chat'', {\n  method: ''POST'',\n  body: JSON.stringify({ message, history }),\n  headers: { ''Content-Type'': ''application/json'' }\n})\n\nconst reader = response.body.getReader()\nconst decoder = new TextDecoder()\n\nwhile (true) {\n  const { done, value } = await reader.read()\n  if (done) break\n  \n  const text = decoder.decode(value)\n  const data = JSON.parse(text.slice(6)) // Remove \"data: \" prefix\n  appendToResponse(data.content)\n}\n```\n\n## Performance Optimizations\n\n1. **Embedding caching**: Cache embeddings for repeated queries\n2. **Batch processing**: Index documents in batches of 100\n3. **Hybrid search**: Combine vector + keyword search\n4. **Response caching**: Cache common Q&A pairs\n\n## Cost Management\n\n```typescript\n// Track usage per request\nawait db.insert(llm_usage_log, {\n  user_id: request.user.id,\n  model: ''gpt-4o'',\n  input_tokens: response.usage.prompt_tokens,\n  output_tokens: response.usage.completion_tokens,\n  cost: calculateCost(response.usage)\n})\n```\n\n---\n\n*Try the Copilot yourself - press ⌘K anywhere in the app!*',
    false,
    cat_engineering,
    author_id,
    NOW() - INTERVAL '6 days',
    18,
    'Building an AI Copilot with RAG',
    'Deep dive into building SynthStack''s AI Copilot using RAG, vector search, and streaming responses.'
  ) ON CONFLICT (slug) DO UPDATE SET
    body = EXCLUDED.body,
    summary = EXCLUDED.summary;

END $$;

-- Update read_time based on body length (rough estimate: 200 words per minute)
UPDATE blog_posts
SET read_time = GREATEST(1, CEIL(LENGTH(body) / 1000.0))
WHERE read_time IS NULL OR read_time = 0;

COMMENT ON TABLE blog_posts IS 'Blog posts managed in Directus CMS with full markdown content';

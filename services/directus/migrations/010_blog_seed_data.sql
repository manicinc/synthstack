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
    E'# Building Your Agency in a Box: The SynthStack Architecture\n\nWhen we set out to build SynthStack, we had one goal: create a platform that lets agencies ship production-ready SaaS products in days, not months.\n\n## The Challenge\n\nModern agencies face a common problem: every new project requires rebuilding the same foundational pieces:\n- Authentication and user management\n- Subscription billing\n- Admin dashboards\n- API infrastructure\n- Email systems\n\n## Our Solution\n\nSynthStack combines three powerful technologies into a cohesive platform:\n\n### Vue 3 + Quasar Frontend\n```typescript\n// Composition API for clean, reusable logic\nexport function useAuth() {\n  const user = ref<User | null>(null)\n  const isAuthenticated = computed(() => !!user.value)\n  \n  async function login(credentials: LoginCredentials) {\n    const response = await api.post(''/auth/login'', credentials)\n    user.value = response.data.user\n  }\n  \n  return { user, isAuthenticated, login }\n}\n```\n\n### Fastify API Gateway\nOur API layer uses Fastify for its exceptional performance and developer experience:\n- Automatic request validation\n- OpenAPI documentation generation\n- Plugin-based architecture\n\n### Directus CMS\nContent management that adapts to your needs:\n- Visual data modeling\n- REST and GraphQL APIs out of the box\n- Granular permissions\n\n## The Result\n\nWith SynthStack, you get:\n- **Authentication** - JWT-based auth with refresh tokens\n- **Subscriptions** - Stripe integration with usage-based billing\n- **Admin Panel** - Full CMS for content and user management\n- **Email System** - Transactional emails with templates\n- **Documentation** - Self-documenting with RAG-powered search\n\n## Getting Started\n\n```bash\ngit clone https://github.com/synthstack/synthstack\ncd synthstack\npnpm install\ndocker compose up -d\npnpm dev\n```\n\nThat''s it. You''re running a full SaaS platform locally.\n\n---\n\n*Ready to build? Check out our [documentation](/docs) or [get started](/pricing) today.*',
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
    E'# Introducing SynthStack: Your Agency in a Box\n\nToday, we''re launching SynthStack - a complete platform for building and launching SaaS products.\n\n## The Problem\n\nEvery new project starts the same way:\n- Set up authentication\n- Configure a database\n- Build an admin panel\n- Integrate payments\n- Set up email sending\n- Deploy somewhere\n\nThat''s weeks of work before you write a single line of business logic.\n\n## The Solution\n\nSynthStack gives you all of this out of the box:\n\n- **Authentication** - JWT-based with refresh tokens, OAuth ready\n- **Database** - PostgreSQL with migrations and seeding\n- **CMS** - Directus for content management\n- **Payments** - Stripe subscriptions with webhooks\n- **Email** - Transactional emails with templates\n- **Deployment** - Docker Compose for any cloud\n\n## What''s Included\n\n```\ngit clone https://github.com/synthstack/synthstack\ncd synthstack\npnpm install\ndocker compose up -d\npnpm dev\n```\n\nIn under 5 minutes, you have:\n- Vue 3 frontend with Quasar UI\n- Fastify API with OpenAPI docs\n- Directus admin panel\n- PostgreSQL database\n- Redis for caching\n- MinIO for file storage\n\n## Open Source\n\nSynthStack is open source under the MIT license. Use it for:\n- Client projects\n- Your own SaaS\n- Internal tools\n- Learning\n\n## What''s Next\n\nWe''re just getting started. Coming soon:\n- More authentication providers\n- Usage-based billing\n- Multi-tenancy support\n- Terraform modules\n\n---\n\n*Ready to build? [Get started](/docs/getting-started) or check out the [GitHub repo](https://github.com/synthstack/synthstack).*',
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

END $$;

-- Update read_time based on body length (rough estimate: 200 words per minute)
UPDATE blog_posts
SET read_time = GREATEST(1, CEIL(LENGTH(body) / 1000.0))
WHERE read_time IS NULL OR read_time = 0;

COMMENT ON TABLE blog_posts IS 'Blog posts managed in Directus CMS with full markdown content';

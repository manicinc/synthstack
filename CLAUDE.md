# SynthStack Community Edition

> AI context file for Claude Code and other AI assistants.

## What This Is

Source-available SaaS boilerplate built with Vue 3 + Quasar. Ships for web, iOS, Android, desktop (Electron), and PWA from a single codebase. Includes Directus CMS, Stripe billing, authentication, analytics, and AI copilot capabilities.

**Repository:** https://github.com/manicinc/synthstack
**License:** Community License (modified MIT, non-commercial) - see LICENSE

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3, Quasar 2.x, TypeScript, Pinia |
| Backend | Fastify, Node.js 20+ |
| CMS | Directus 11.x |
| Database | PostgreSQL 15+ |
| Cache | Redis 7+ |
| Vectors | Qdrant (for RAG/semantic search) |
| Payments | Stripe |
| Auth | Supabase or Local PostgreSQL |
| AI | OpenAI/Anthropic SDKs (BYOK model) |

## Project Structure

```
synthstack/
├── apps/
│   └── web/                     # Vue 3 + Quasar frontend
│       ├── src/
│       │   ├── boot/            # App initialization (Supabase, Stripe, i18n)
│       │   ├── components/      # Reusable Vue components
│       │   ├── composables/     # Vue composition hooks (useApi, etc.)
│       │   ├── layouts/         # Page layouts (AppLayout, AuthLayout)
│       │   ├── pages/           # Route pages
│       │   ├── router/          # Vue Router config
│       │   ├── services/        # API clients & business logic
│       │   ├── stores/          # Pinia state management
│       │   └── types/           # TypeScript definitions
│       ├── e2e/                 # Playwright E2E tests
│       └── test/                # Vitest unit tests
├── packages/
│   ├── api-gateway/             # Fastify REST API
│   │   └── src/
│   │       ├── routes/          # API endpoints
│   │       ├── services/        # Business logic
│   │       └── plugins/         # Fastify plugins
│   ├── types/                   # Shared TypeScript types (@synthstack/types)
│   ├── ts-ml-service/           # TypeScript ML service (NestJS)
│   └── directus-extension-synthstack/  # CMS extensions
├── services/
│   └── directus/                # Directus CMS configuration
├── docs/                        # Documentation (60+ files)
├── deploy/                      # Deployment scripts and configs
├── config.json                  # Branding & infrastructure config
├── docker-compose.community.yml # Docker environment
└── turbo.json                   # Turborepo config
```

## Quick Commands

```bash
# Install dependencies
pnpm install

# Start Docker services (Postgres, Redis, Qdrant, Directus)
docker compose -f docker-compose.community.yml up -d

# Start frontend dev server (localhost:3050)
pnpm dev:web

# Start API dev server (localhost:3003)
pnpm dev:api

# Run all tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Lint and type check
pnpm lint && pnpm typecheck

# Build for production
pnpm build
```

## Key Patterns

### Vue Components

All components use `<script setup lang="ts">` with Composition API:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApi } from 'src/composables/useApi'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ update: [value: string] }>()

const { data, loading, error } = useApi(`/endpoint/${props.id}`)
</script>
```

### State Management (Pinia)

Stores in `apps/web/src/stores/` use composition API pattern:

```typescript
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!user.value)

  async function fetchUser() { /* ... */ }

  return { user, isLoggedIn, fetchUser }
})
```

### API Routes (Fastify)

Routes in `packages/api-gateway/src/routes/`:

```typescript
export default async function routes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { schema: { params: ParamsSchema, response: { 200: ResponseSchema } } },
    async (request, reply) => {
      // Handler
    }
  )
}
```

### Feature Flags

Features controlled via environment variables (`.env`):

```bash
ENABLE_COPILOT=true          # AI chat assistant
ENABLE_COPILOT_RAG=false     # Semantic document search (Pro)
ENABLE_AI_AGENTS=false       # LangGraph agents (Pro)
ENABLE_REFERRALS=false       # Referral system (Pro)
```

Check flags in code:

```typescript
import { useFeatureStore } from 'src/stores/features'
const features = useFeatureStore()
if (features.copilotEnabled) { /* ... */ }
```

## Environment Setup

1. Copy `.env.example` to `.env` (repo root is the single source of truth)
2. Required variables:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` - Auth (or use local auth)
   - `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` - Payments
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - AI features

See `docs/ENVIRONMENT_SETUP.md` for complete variable reference.

## Testing

| Type | Command | Location |
|------|---------|----------|
| Unit | `pnpm test` | `apps/web/src/**/__tests__/` |
| E2E | `pnpm test:e2e` | `apps/web/e2e/` |
| API | `pnpm test:api` | `packages/api-gateway/src/**/__tests__/` |

Test files are colocated with source files in `__tests__/` directories.

## Important Rules

1. **Always run `pnpm typecheck` before committing** - TypeScript strict mode is enabled
2. **Never commit `.env` files** - Only `.env.*.example` files are safe
3. **Feature flags control edition differences** - Check `ENABLE_*` vars before adding Pro features
4. **Tests are required for new features** - Both unit and E2E where applicable
5. **Use existing composables** - Check `src/composables/` before creating new patterns
6. **Follow Quasar conventions** - Use Quasar components over raw HTML

## Service URLs (Development)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3050 |
| API Gateway | http://localhost:3003 |
| API Docs (Swagger) | http://localhost:3003/docs |
| Directus CMS | http://localhost:8099/admin |
| Qdrant Dashboard | http://localhost:6333/dashboard |

## Documentation

Key docs to reference:

- `docs/QUICK_START.md` - Get running in 5 minutes
- `docs/ENVIRONMENT_SETUP.md` - All environment variables
- `docs/features/COPILOT.md` - AI copilot architecture
- `docs/features/STRIPE_INTEGRATION.md` - Billing setup
- `docs/AUTHENTICATION.md` - Auth provider configuration
- `docs/REBRANDING_GUIDE.md` - How to rebrand the app

## Rebranding

To rebrand for your SaaS:

1. Update `config.json` (app name, colors, company info)
2. Replace logos in `apps/web/public/logo/`
3. Update environment variables
4. See `docs/REBRANDING_GUIDE.md` for complete guide

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Web SPA   │  │  iOS/Android │  │   Electron  │             │
│  │  (Quasar)   │  │  (Capacitor) │  │  (Desktop)  │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         └────────────────┴────────────────┘                     │
│                          │                                      │
│         Vue 3 + Pinia + Vue Router + TypeScript                 │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP/WebSocket
┌──────────────────────────┼──────────────────────────────────────┐
│                     API GATEWAY                                 │
│  ┌───────────────────────┴───────────────────────┐              │
│  │              Fastify Server                    │              │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐         │              │
│  │  │ Routes  │ │ Services│ │Middleware│         │              │
│  │  └────┬────┘ └────┬────┘ └────┬────┘         │              │
│  │       └───────────┴───────────┘               │              │
│  └───────────────────────────────────────────────┘              │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    DATA LAYER                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Postgres │  │  Redis   │  │  Qdrant  │  │ Directus │        │
│  │   (DB)   │  │ (Cache)  │  │(Vectors) │  │  (CMS)   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Action → Vue Component → Pinia Store → API Service → API Gateway → Database
                                   ↑                            │
                                   └────────── Response ────────┘
```

**Example: User updates profile**
1. `ProfilePage.vue` calls `userStore.updateProfile(data)`
2. Store calls `api.patch('/users/me', data)`
3. API Gateway validates, updates DB, returns result
4. Store updates reactive state
5. Component re-renders automatically

## Anti-Patterns to Avoid

### DO NOT

1. **Import from node_modules paths directly**
   ```typescript
   // BAD
   import { something } from '../../../node_modules/package'
   // GOOD
   import { something } from 'package'
   ```

2. **Use Options API in new components**
   ```typescript
   // BAD - Options API
   export default { data() { return {} }, methods: {} }
   // GOOD - Composition API
   <script setup lang="ts">
   ```

3. **Duplicate API logic in components**
   ```typescript
   // BAD - API call in component
   const response = await fetch('/api/users')
   // GOOD - Use composable or service
   const { data } = useApi('/users')
   ```

4. **Hardcode feature availability**
   ```typescript
   // BAD
   if (true) { showProFeature() }
   // GOOD
   if (features.copilotEnabled) { showProFeature() }
   ```

5. **Store secrets in code**
   ```typescript
   // BAD
   const API_KEY = 'sk-12345...'
   // GOOD
   const API_KEY = import.meta.env.VITE_API_KEY
   ```

6. **Skip TypeScript types**
   ```typescript
   // BAD
   const data: any = await fetchData()
   // GOOD
   const data: UserProfile = await fetchData()
   ```

7. **Create new patterns when existing ones exist**
   - Check `src/composables/` before creating hooks
   - Check `src/services/` before creating API clients
   - Check `src/stores/` before creating global state

## Quick File Reference

| To find... | Look in... |
|------------|------------|
| Landing page | `apps/web/src/pages/LandingPage.vue` |
| Dashboard | `apps/web/src/pages/app/DashboardPage.vue` |
| Auth pages | `apps/web/src/pages/auth/` |
| API routes | `packages/api-gateway/src/routes/` |
| Pinia stores | `apps/web/src/stores/` |
| Composables | `apps/web/src/composables/` |
| API service | `apps/web/src/services/api.ts` |
| Auth service | `apps/web/src/services/auth.ts` |
| Feature flags | `apps/web/src/config/features.ts` |
| Branding config | `config.json` (root) |
| Environment vars | `.env.*.example` files |
| Shared types | `packages/types/src/` |
| Vue Router | `apps/web/src/router/routes.ts` |
| Layouts | `apps/web/src/layouts/` |
| i18n translations | `apps/web/src/i18n/` |

## Common Modification Scenarios

### Add a new page to the dashboard

1. Create `apps/web/src/pages/app/NewPage.vue`
2. Add route in `apps/web/src/router/routes.ts` under app routes
3. Add navigation link in relevant layout/menu

### Add a new API endpoint

1. Create route file in `packages/api-gateway/src/routes/`
2. Register in `packages/api-gateway/src/routes/index.ts`
3. Add types to `packages/types/src/api/` if needed
4. Call from frontend via `src/services/api.ts`

### Add a new feature flag

1. Add to `.env.example`
2. Add to `apps/web/src/config/features.ts`
3. Add to `apps/web/src/stores/features.ts`
4. Use via `useFeatureStore()` in components

### Modify branding

1. Update `config.json` (colors, names, URLs)
2. Replace logos in `apps/web/public/logo/`
3. Update favicons in `apps/web/public/`

### Add a new Pinia store

1. Create `apps/web/src/stores/newStore.ts`
2. Export from `apps/web/src/stores/index.ts`
3. Use via `useNewStore()` in components

## AI Assistant Tips

When working with this codebase:

1. **Always check existing patterns first** - This codebase has established patterns for components, stores, services, and API routes. Follow them.

2. **Run type checks frequently** - `pnpm typecheck` catches most issues early.

3. **Feature flags are critical** - Community vs Pro editions are controlled by feature flags. Always check if a feature should be gated.

4. **Quasar has many built-ins** - Before adding a new UI library, check if Quasar already has the component.

5. **Tests are colocated** - Look for `__tests__/` directories next to source files.

6. **Config is centralized** - `config.json` controls branding, `features.ts` controls feature flags.

7. **Environment is centralized** - use repo root `.env` (generated from `.env.example` or `pnpm generate:env`).

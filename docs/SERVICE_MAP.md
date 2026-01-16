# SynthStack Service Map

## Quick Reference

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              DEVELOPMENT URLS                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Frontend        http://localhost:3050      Vue 3 + Quasar                │
│  Directus CMS    http://localhost:8099      Admin panel & AI Dashboard    │
│  API Gateway     http://localhost:3003      Fastify REST API              │
│  API Docs        http://localhost:3003/docs Swagger UI                    │
│  ML Service      http://localhost:8001      Python AI/ML service          │
│  Qdrant UI       http://localhost:6333      Vector DB dashboard           │
│                                                                            │
│  PostgreSQL      localhost:5499             Primary database               │
│  Redis           localhost:6399             Cache & sessions               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Details

### Frontend (Vue 3 + Quasar)

**URL:** http://localhost:3050
**Container:** `synthstack-web`
**Source:** `apps/web/`

```bash
# Start locally
cd apps/web && pnpm dev

# Or via Docker
docker compose up web
```

**Key Routes:**
| Route | Description |
|-------|-------------|
| `/` | Landing page (AI Co-Founders) |
| `/app` | Main application |
| `/app/dashboard` | User dashboard |
| `/app/copilot` | AI chat interface |
| `/pricing` | Pricing page |
| `/docs` | Documentation |
| `/blog` | Blog listing |

---

### Directus CMS

**URL:** http://localhost:8099
**Container:** `synthstack-directus`
**Source:** `services/directus/`

**Login:**
- Admin: `admin@synthstack.app` / `Synthstackadmin!`
- Demo: `demo@synthstack.app` / `DemoUser2024!`

**Key Sections:**
| Section | Description |
|---------|-------------|
| Content | Blog posts, pages, docs |
| AI Copilot | Legacy chat widget |
| AI Co-Founders | Multi-agent dashboard |
| AI Suggestions | Proactive recommendations |
| Settings | System configuration |

**Custom Extensions:**
```
services/directus/extensions/
├── copilot-widget/      # Legacy AI chat panel
├── ai-cofounders/       # Multi-agent tabbed chat
├── ai-suggestions/      # Suggestions management
└── onboarding-wizard/   # User onboarding flow
```

---

### API Gateway (Fastify)

**URL:** http://localhost:3003
**Docs:** http://localhost:3003/docs
**Container:** `synthstack-api-gateway`
**Source:** `packages/api-gateway/`

**Route Prefixes:**
```
/api/v1/
├── auth/          # Authentication
├── agents/        # AI Co-Founders
├── copilot/       # Legacy AI chat
├── suggestions/   # Proactive suggestions
├── github/        # GitHub integration
├── printers/      # (Domain-specific)
├── filaments/     # (Domain-specific)
├── profiles/      # User profiles
├── analyze/       # Analysis endpoints
├── generate/      # Generation endpoints
├── credits/       # Credit system
├── billing/       # Stripe integration
├── subscriptions/ # Subscription management
├── community/     # Community features
├── newsletter/    # Newsletter management
├── analytics/     # Analytics data
├── workers/       # Background workers
├── admin/         # Admin endpoints
├── themes/        # Theme management
├── docs/          # Documentation API
├── blog/          # Blog API
└── onboarding/    # Onboarding API
```

---

### ML Service (FastAPI)

**URL:** http://localhost:8001
**Container:** `synthstack-ml-service`
**Source:** `packages/ml-service/`

**Endpoints:**
```
/health           # Health check
/embed            # Text embedding
/analyze          # Content analysis
/generate         # Content generation
/rag/query        # RAG queries
/rag/ingest       # Document ingestion
```

---

### PostgreSQL

**Host:** localhost
**Port:** 5499
**Container:** `synthstack-postgres`

**Connection:**
```bash
# Direct connection
psql -h localhost -p 5499 -U synthstack -d synthstack

# Via Docker
docker exec -it synthstack-postgres psql -U synthstack
```

**Key Tables:**
```sql
-- Core
app_users, user_sessions, user_preferences

-- AI Co-Founders
ai_agents, ai_agent_sessions, ai_agent_messages
ai_suggestions, ai_agent_knowledge
github_integrations, user_agent_settings

-- Content
blog_posts, blog_categories, pages

-- Commerce
subscription_plans, user_subscriptions
credit_transactions, payment_history

-- Analytics
analytics_events, page_views
```

---

### Redis

**Host:** localhost
**Port:** 6399
**Container:** `synthstack-redis`

**Connection:**
```bash
# Via Docker
docker exec -it synthstack-redis redis-cli

# Commands
> KEYS *
> GET session:xxx
> TTL key_name
```

**Usage:**
- Session storage
- Rate limiting
- Cache layer
- Pub/sub for real-time

---

### Qdrant (Vector DB)

**HTTP:** http://localhost:6333
**gRPC:** localhost:6334
**Container:** `synthstack-qdrant`

**Dashboard:** http://localhost:6333/dashboard

**Collections:**
```
synthstack_docs      # Documentation embeddings
synthstack_code      # Code embeddings
synthstack_chat      # Chat history embeddings
agent_knowledge_*    # Agent-specific knowledge
```

**API Examples:**
```bash
# List collections
curl http://localhost:6333/collections

# Search
curl -X POST http://localhost:6333/collections/synthstack_docs/points/search \
  -H "Content-Type: application/json" \
  -d '{"vector": [...], "limit": 5}'
```

---

## Network Architecture

```
                                    ┌─────────────┐
                                    │   Browser   │
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
            │   Frontend    │     │   Directus    │     │  API Gateway  │
            │   :3050       │     │   :8099       │     │   :3003       │
            └───────────────┘     └───────┬───────┘     └───────┬───────┘
                                          │                     │
                    ┌─────────────────────┼─────────────────────┤
                    │                     │                     │
                    ▼                     ▼                     ▼
            ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
            │   PostgreSQL  │     │    Redis      │     │    Qdrant     │
            │   :5499       │     │    :6399      │     │    :6333      │
            └───────────────┘     └───────────────┘     └───────────────┘
                                          │
                                          ▼
                                  ┌───────────────┐
                                  │  ML Service   │
                                  │   :8001       │
                                  └───────────────┘
```

---

## Docker Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f [service]

# Restart service
docker compose restart [service]

# Rebuild service
docker compose build [service]
docker compose up -d [service]

# Shell into container
docker exec -it synthstack-[service] sh

# Check status
docker compose ps
```

---

## Environment Variables

**Required:**
```env
# Database
DB_DATABASE=synthstack
DB_USER=synthstack
DB_PASSWORD=synthstack_dev_2024

# Directus
DIRECTUS_KEY=your-key
DIRECTUS_SECRET=your-secret
DIRECTUS_ADMIN_EMAIL=admin@synthstack.app
DIRECTUS_ADMIN_PASSWORD=Synthstackadmin!

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

**Optional:**
```env
# Supabase (auth)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (payments)
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY

# Email
MAILGUN_API_KEY=
SENDGRID_API_KEY=
```

---

## Health Checks

```bash
# All services
curl http://localhost:3003/health
curl http://localhost:8099/server/ping
curl http://localhost:8001/health
curl http://localhost:6333/healthz

# Database
docker exec synthstack-postgres pg_isready

# Redis
docker exec synthstack-redis redis-cli ping
```

---

*Keep this reference handy during development.*

# SynthStack

![Tests](https://img.shields.io/badge/tests-920%2B-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![Vue](https://img.shields.io/badge/Vue-3.x-42b883)

**Your Agency in a Box**

AI-native, cross-platform SaaS boilerplate built with Vue Quasar. Ships for web, iOS, Android, desktop, and PWA from a single codebase. Complete with Directus CMS (models your Postgres DB), AI copilot, analytics, email, newsletter, blog, and product management.

![SynthStack](apps/web/public/og-image.svg)

## Choose Your Backend

SynthStack offers **three equivalent backend options** - choose based on your team's preference:

### Option A: TypeScript (NestJS) - Community & Pro

TypeScript backend with complete API capabilities. Default for the Community Edition.

```bash
# TypeScript backend (Community default)
pnpm install && docker compose up -d && pnpm dev:web
```

### Option B: Python FastAPI - Pro Edition 🔒

> ⚠️ **Note:** Python backends are available in [SynthStack Pro](https://github.com/manicinc/synthstack-pro) only.

High-performance async Python backend. Drop-in replacement for TypeScript.

```bash
# FastAPI backend (Pro Edition)
docker compose -f docker-compose.fastapi.yml up -d
```

### Option C: Python Django - Pro Edition 🔒

Batteries-included Python backend. Drop-in replacement for TypeScript.

```bash
# Django backend (Pro Edition)
docker compose -f docker-compose.django.yml up -d
```

**All backends provide identical functionality:**
- Full Vue/Quasar frontend with cross-platform (iOS, Android, Desktop, PWA)
- API Gateway with auth, billing, agents, workflows
- RAG/embeddings (OpenAI, Anthropic, OpenRouter)
- Vector search (Qdrant)
- AI agents and orchestration
- Document processing
- All cloud LLM integrations

> 💡 **Community Edition** uses TypeScript (NestJS). **Pro Edition** adds Python (FastAPI, Django) as alternative backends.

**[Architecture Decision Guide](./docs/ARCHITECTURE_DECISION.md)** | **[TypeScript Quick Start](./docs/QUICKSTART_TYPESCRIPT.md)** | **[Full AI Quick Start](./docs/QUICKSTART_FULL_AI.md)**

---

## 🚀 Get Started in 30 Minutes

### Choose Your Edition

| Edition | Repository | Best For |
|---------|------------|----------|
| **Community (Free)** | **[github.com/manicinc/synthstack](https://github.com/manicinc/synthstack)** | Side projects, learning, MVP |
| **Pro (Premium)** | **[github.com/manicinc/synthstack-pro](https://github.com/manicinc/synthstack-pro)** _(Coming Soon)_ | Production apps, commercial use |

## 📄 License & Usage

### Dual License Model

| License | Use Case | Restrictions |
|---------|----------|--------------|
| **MIT (Community)** | Learning, personal projects, evaluation | Non-commercial only, cannot build competing boilerplates |
| **Commercial License** | Production SaaS, commercial use, client work | Cannot resell as boilerplate, cannot redistribute source |

**What You Can Build:**
- ✅ Any SaaS product (CRM, invoicing, AI tools, e-commerce, etc.)
- ✅ White-labeled client projects
- ✅ Revenue-generating applications
- ❌ Competing SaaS boilerplate products

**[View Full License Terms →](./LICENSE)** | **[Commercial License →](./COMMERCIAL-LICENSE.md)** | **[License FAQ →](./docs/LICENSE-FAQ.md)**

### Early Bird Pricing 🎉

**Limited to first 500 buyers:**
- ~~$297~~ **$149** Lifetime License
- All features + commercial use rights
- **[Get Early Bird Access →](https://synthstack.app/pricing)**

---

### Quick Deployment

**[📖 Complete Quick Start Guide →](./docs/QUICK_START.md)**

1. **Use Template:** Click "Use this template" on GitHub
2. **Configure Secrets:** Add these GitHub secrets:
   - `REMOTE_SSH_KEY` - Your SSH private key
   - `REMOTE_HOST_PRODUCTION` - Server IP address
   - `REMOTE_USER` - SSH user (usually `root`)
   - `GH_PAT` - GitHub token with `read:packages` scope ([create here](https://github.com/settings/tokens))
3. **Deploy:** `./deploy-with-env.sh` or push to `main` for auto-deploy
4. **Done!** Your SaaS is live

**Deployment Methods:**
- ✅ **Automated:** Push to GitHub → auto-deploys via GitHub Actions
- ✅ **Manual:** One-command deployment script
- ✅ **Any Provider:** Works with Linode, DigitalOcean, AWS, Vultr, Hetzner

**[View Deployment Providers →](./docs/DEPLOYMENT_PROVIDERS.md)**

## 🚀 Features

- **📱 Cross-Platform** - Vue Quasar builds web, iOS, Android, desktop (Electron), and PWA from one codebase
- **🤖 AI Copilot** - Built-in chat assistant with RAG, streaming, and markdown support ([Guide](./docs/features/COPILOT.md))
- **📝 Directus CMS** - Headless CMS with WYSIWYG editor, custom extensions, models your Postgres DB - manage blog, products, users, and custom content
- **🔐 Flexible Authentication** - Choose between Supabase (managed) or Local PostgreSQL (self-hosted). Both support OAuth, JWT, and RBAC
- **💳 Stripe Billing** - Subscriptions, lifetime licenses, one-time payments, usage-based pricing
- **📧 Email System** - Mailgun/SendGrid for transactional emails, newsletters, and marketing automation
- **📊 Analytics** - Built-in event tracking, dashboards, and user behavior insights
- **🎯 Vector Search** - Qdrant integration for semantic search and RAG
- **👥 Community** - Built-in forums, user profiles, voting, and content sharing

### 🔐 Flexible Authentication

**Choose Your Auth Provider:**
- **Supabase Auth** (Default) - Managed service with built-in OAuth providers
- **Local PostgreSQL Auth** - Self-hosted with no external dependencies

**Security Features:**
- Argon2id password hashing (65536 memory cost)
- JWT access tokens (1h) + refresh tokens (7d)
- OAuth support: Google, GitHub, Discord, Microsoft
- Account lockout after failed attempts
- Email verification workflow
- Session management with token rotation

**Toggle via database config** - switch providers at runtime without code changes.

📖 [Authentication Documentation](docs/AUTHENTICATION.md)

## 💳 Flexible Pricing Models

SynthStack supports **both subscription and lifetime licensing** out of the box:

### Monthly/Yearly Subscriptions
Recurring billing with Stripe:
- **Free**: $0 - 10 credits/day
- **Maker**: $12.99/month or $116.91/year - 30 credits/day
- **Pro**: $24.99/month or $224.91/year - 100 credits/day
- **Agency**: $39.99/month or $359.91/year - ∞ credits/day

### Lifetime License
One-time payment for perpetual access:
- **Early Bird**: $149 (limited to first 150 copies)
- **Regular**: $249
- Includes complete source code
- Full Stripe subscription system included

**Both models work together** - you get a complete billing system with subscriptions, credits, webhooks, and customer portal ready to use.

### 🎯 Live Demo = Your Product

This site **dogfoods its own stack** - everything you see running on [synthstack.app](https://synthstack.app) is built with the exact code you get:
- ✅ Working subscriptions with Stripe integration
- ✅ AI copilot with credit system
- ✅ Client portal with project management
- ✅ Multi-language support (6 languages)
- ✅ Full documentation and integrations

**Test it live, get it working** - no surprises, complete compatibility.

## 🔗 Quick Access Links

| Service | URL | Description |
|---------|-----|-------------|
| **🌐 Frontend** | [localhost:3050](http://localhost:3050) | Vue 3 + Quasar web app |
| **🔌 API Gateway** | [localhost:3003](http://localhost:3003) | Fastify REST API |
| **📚 API Docs** | [localhost:3003/docs](http://localhost:3003/docs) | Swagger UI |
| **🤖 ML Service Docs** | [localhost:8001/docs](http://localhost:8001/docs) | FastAPI ML endpoints |
| **📝 Directus CMS** | [localhost:8099/admin](http://localhost:8099/admin) | Admin panel & content |
| **🔍 Qdrant** | [localhost:6333/dashboard](http://localhost:6333/dashboard) | Vector database UI |

### Internal Admin (requires admin account)

| Dashboard | URL | Description |
|-----------|-----|-------------|
| **💰 LLM Costs** | [localhost:3050/admin/llm-costs](http://localhost:3050/admin/llm-costs) | Monitor AI API costs |
| **🏢 Org Breakdown** | [localhost:3050/admin/llm-costs/orgs](http://localhost:3050/admin/llm-costs/orgs) | Costs per organization |
| **🚨 Budget Alerts** | [localhost:3050/admin/llm-costs/alerts](http://localhost:3050/admin/llm-costs/alerts) | Cost threshold alerts |

## 🔐 Default Credentials

### Directus CMS Admin

| Access Level | Email | Password | Permissions |
|--------------|-------|----------|-------------|
| **👑 Admin** | `admin@synthstack.app` | `Synthstackadmin!` | Full access |
| **👁️ Demo/Guest** | `demo@synthstack.app` | `DemoUser2024!` | Read-only (limited) |

**[→ Try Directus Admin (Demo Mode)](http://localhost:8099/admin)**

### API Token (for programmatic access)

```bash
# Static admin token for development
Authorization: Bearer synthstack-static-admin-token-2024
```

### 📝 Directus CMS Details

Directus is the **headless CMS** that powers content management, blog, products, and user-facing content. It automatically models your PostgreSQL database and provides:

**Core Features:**
- **WYSIWYG Rich Text Editor** - Tiptap-based editor with formatting, images, links
- **Media Library** - File uploads, image transformations, asset management
- **Content Modeling** - Create custom collections/fields that sync to PostgreSQL
- **Built-in Roles/Permissions** - Granular access control for content editors
- **REST & GraphQL APIs** - Access content from any client

**Custom Extensions Included:**
- Blog post management with SEO fields
- Product catalog with pricing tiers
- Theme configuration with light/dark variants
- Newsletter/email template management
- FAQ and documentation pages

**Admin vs Client Dashboard:**
- **Directus Admin** (`/admin`) - Full CMS for content editors, blog authors, product managers
- **Client Dashboard** - User-facing app with admin features for users with `ADMIN_EMAIL`

### 👑 Admin Users

Admin users have elevated permissions in both Directus and the client-facing dashboard.

**Configuration (`.env`):**
```bash
# Admin email - same user gets admin in Directus + client dashboard
ADMIN_EMAIL=admin@yourdomain.com

# Directus admin credentials
DIRECTUS_ADMIN_EMAIL=admin@yourdomain.com
DIRECTUS_ADMIN_PASSWORD=your-secure-password
```

**Admin Capabilities:**
| Feature | Directus Admin | Client Dashboard Admin |
|---------|----------------|------------------------|
| Content editing | ✅ Full CMS access | ❌ View only |
| User management | ✅ Directus users | ✅ App users |
| Analytics/reports | ✅ Directus insights | ✅ Admin page |
| System settings | ✅ Full control | ❌ Limited |
| Billing/subscriptions | ❌ | ✅ Manage |

**Client Dashboard Admin Page:**
Users matching `ADMIN_EMAIL` see an "Admin" page in the dashboard with:
- User analytics and metrics
- System health monitoring
- Credit/usage management
- Moderation tools

### Database (PostgreSQL)

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `5499` |
| Database | `synthstack` |
| User | `synthstack` |
| Password | `synthstack_dev_2024` |

### Redis Cache

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `6399` |

> ⚠️ **Security Note**: Change all default credentials in production! Copy `.env.example` to `.env` and update the values.

## 🛠️ Tech Stack

### Core (TypeScript)

| Layer | Technology |
|-------|------------|
| **Frontend** | Vue 3, Quasar 2, TypeScript, Pinia |
| **Styling** | SCSS, CSS Variables, Quasar SASS |
| **API Gateway** | Fastify, Node.js |
| **LLM Integration** | OpenAI, Anthropic, OpenRouter SDKs |
| **Vector DB** | Qdrant (TypeScript client) |
| **CMS/Admin** | Directus 11.x |
| **Auth** | Supabase or Local PostgreSQL |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Payments** | Stripe |

### Machine Learning Service

| Service | Technology | Use Case |
|---------|------------|----------|
| **ts-ml-service** | NestJS (TypeScript) | RAG, embeddings, analysis - **No Python Required** |

### Styling Architecture

SynthStack uses a comprehensive SCSS-based styling system:

- **CSS Variables** - Runtime theming via custom properties
- **SCSS Modules** - `app.scss`, `theme.scss`, `animations.scss`, `responsive.scss`
- **Quasar SASS** - `quasar.variables.scss` for component customization
- **Multi-Theme Support** - Themes stored in Directus with light/dark variants

## 🏗️ Modular Architecture

SynthStack is built as a **modular monorepo** enabling flexible deployment strategies:

### Deployment Flexibility

Deploy as **monolithic** (single server) or **microservices** (distributed):

- **Monolithic** - All services in single Docker Compose stack
- **Microservices** - Each service on dedicated servers
- **Hybrid** - Critical services separated (e.g., ML on GPU server)

### Independently Deployable Services

| Service | Technology | Port | Can Deploy Separately |
|---------|-----------|------|----------------------|
| **Frontend** | Vue 3 + Quasar | 3050 | ✅ Yes (static hosting) |
| **API Gateway** | Fastify + Node.js | 3003 | ✅ Yes (stateless, scalable) |
| **ML Service** | NestJS (TypeScript) | 8001 | ✅ Yes (full-stack TS) |
| **CMS** | Directus | 8055 | ✅ Yes (headless CMS) |
| **Database** | PostgreSQL | 5432 | ✅ Yes (can use hosted) |
| **Cache/Queue** | Redis | 6379 | ✅ Yes (can use hosted) |
| **Vector DB** | Qdrant | 6333 | ✅ Yes (for RAG) |

### Message Brokering & Async Processing

Built-in queue system for production workloads:

- **BullMQ + Redis** - Reliable job processing with retry logic
- **Email Queue** - Batch email delivery with priority support
- **Orchestration Queue** - AI workflow execution and automation
- **Server-Sent Events** - Real-time updates to connected clients
- **Event-Driven Architecture** - Loose coupling between services

**Features:**
- Automatic retry with exponential backoff
- Priority queues (high/normal/low)
- Scheduled job execution
- Job progress tracking
- Dead letter queue for failed jobs

### Remote Service Configuration

Configure services to communicate across servers:

```env
# Frontend → API Gateway
VITE_API_URL=https://api.example.com

# API Gateway → ML Service
ML_SERVICE_URL=https://ml.example.com

# Shared Infrastructure
DATABASE_URL=postgresql://user:pass@db.example.com/synthstack
REDIS_URL=redis://redis.example.com:6379
QDRANT_URL=https://qdrant.example.com:6333
```

**Communication Patterns:**
- ✅ REST APIs for synchronous requests
- ✅ Server-Sent Events for real-time updates
- ✅ Message queues for async processing
- ✅ Fire-and-forget for non-blocking operations

📖 See [QUEUE_WORKERS_GUIDE.md](./docs/QUEUE_WORKERS_GUIDE.md) for queue architecture and scaling
📖 See [MICROSERVICES_DEPLOYMENT.md](./docs/MICROSERVICES_DEPLOYMENT.md) for deployment examples
📖 See [ARCHITECTURE_DECISION.md](./docs/ARCHITECTURE_DECISION.md) for architecture choices

## 📁 Project Structure

```
synthstack/
├── apps/
│   └── web/                      # Vue 3 + Quasar frontend (iOS, Android, PWA, Desktop)
├── packages/
│   ├── api-gateway/              # Fastify API Gateway (core backend)
│   ├── types/                    # Shared TypeScript types
│   ├── ts-ml-service/            # NestJS ML service (TypeScript-only)
│   └── directus-extension-synthstack/  # Directus extensions
├── services/
│   └── directus/                 # Directus CMS config (101 migrations)
├── tests/
│   └── admin/                    # Admin/API tests
├── docker-compose.community.yml  # Community Docker environment
└── turbo.json                    # Turborepo config
```

> 💡 **Pro Edition** includes additional packages: `referrals-credits`, `agentic-ai`, `ml-service`, `django-ml-service`, `node-red-contrib-synthstack`, and `nodered-data`.

## 🏃 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Python 3.11+ (optional - only for Python ML services)

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/manicinc/synthstack.git
cd synthstack

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials:
# - Auth: Supabase URL & keys (default) OR JWT secret for Local PostgreSQL
# - Stripe keys
# - AI API keys (OpenAI/Anthropic)
```

**Authentication Setup:**

**Option A: Supabase (Recommended for most users)**
1. Sign up at [supabase.com](https://supabase.com)
2. Create project and get API keys
3. Add to `.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Option B: Local PostgreSQL (Self-hosted)**
1. Generate JWT secret: `openssl rand -base64 32`
2. Add to `.env`: `JWT_SECRET=your-generated-secret`
3. Configure provider via database (see [Auth Docs](docs/AUTHENTICATION.md))

### 3. Start Development Services

```bash
# Start Docker services (Postgres, Redis, Qdrant, Directus)
docker compose up -d

# Wait for services to initialize (~30 seconds)
# Then start the frontend
pnpm dev:web
```

### 4. Access the App

- **Frontend**: http://localhost:3050
- **Directus Admin**: http://localhost:8099/admin
- **API Gateway**: http://localhost:3003
- **API Docs**: http://localhost:3003/docs

## 🤖 AI Copilot

The AI Copilot is available throughout the app once you're logged in:

| Access Method | How to Use |
|---------------|------------|
| **Floating Button** | Click 🤖 in bottom-right corner |
| **Keyboard Shortcut** | `⌘K` (Mac) or `Ctrl+K` (Win/Linux) |

**Features:**
- 💬 Real-time streaming responses (GPT-4o + Claude 3.5 fallback)
- 📝 Markdown & code syntax highlighting
- 🎯 RAG-powered context from indexed docs
- 💾 Conversation history with export

**[Read Full Copilot Guide →](./docs/features/COPILOT.md)**

## 🐳 Docker Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild containers
docker compose build --no-cache
```

### Service Ports

| Service | Port | Internal |
|---------|------|----------|
| PostgreSQL | 5499 | 5432 |
| Redis | 6399 | 6379 |
| Qdrant | 6333, 6334 | 6333, 6334 |
| Directus | 8099 | 8055 |
| API Gateway | 3003 | 3003 |
| ML Service | 8001 | 8000 |
| Web Frontend | 3050 | 3050 |

## 🔐 Authentication

SynthStack uses **Supabase** for authentication:

1. Create a project at [supabase.com](https://supabase.com)
2. Enable Email/Password auth
3. (Optional) Enable Google/GitHub OAuth
4. Copy your project URL and anon key to `.env`

## 💳 Payments (Stripe)

1. Create products for each tier in Stripe Dashboard
2. Set environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
3. Frontend: `VITE_STRIPE_PUBLISHABLE_KEY`
4. Webhook endpoint: `/api/v1/webhooks/stripe`

See [Stripe Integration Guide](./docs/features/STRIPE_INTEGRATION.md) for detailed setup.

## 🎨 Branding Configuration

All branding is centralized in [`apps/web/src/config/branding.ts`](apps/web/src/config/branding.ts):

```typescript
export const branding = {
  name: 'SynthStack',
  tagline: 'Your Agency in a Box',
  colors: {
    primary: '#6366F1',
    accent: '#00D4AA',
  },
  social: {
    github: 'https://github.com/manicinc/synthstack',
    discord: 'https://discord.gg/synthstack',
  },
  // ... more options
}
```

To rebrand: update this file and replace logo files in `apps/web/public/logo/`.

## 🧪 Tests & Lint

![Tests](https://img.shields.io/badge/tests-920%2B-brightgreen)

| Package | Passing | Skipped | Total |
|---------|---------|---------|-------|
| API Gateway | 785 | 70 | 877 |
| Web App | 138 | 0 | 139 |
| **Total** | **~923** | **70** | **1016** |

> **Note:** Community Edition has ~600 fewer tests than Pro because it excludes Pro-only features (Copilot, Referrals, Workflows, Node-RED, AI Agents). Pro Edition has ~1500+ tests.

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Lint
pnpm lint

# Typecheck
pnpm typecheck

# E2E tests (web app)
pnpm --filter @synthstack/web test:e2e
```

### Testing Guides

| Guide | Description |
|-------|-------------|
| [Testing Guide](docs/TESTING_GUIDE.md) | Complete testing strategy, setup, and best practices |
| [Feature Flags Testing](docs/testing/FEATURE_FLAGS_TESTING.md) | LITE vs PRO version testing, conditional features |
| [API Gateway Tests](packages/api-gateway/TESTING.md) | Backend-specific testing |

**Key Concepts:**
- **Feature Flag Testing** - Tests verify AI Copilot and Referral features are properly gated
- **LITE vs PRO** - E2E tests run separately for community and commercial editions
- **Protected Features** - Critical features (copilot, billing, auth) have dedicated test suites

See [Testing Guide](docs/TESTING_GUIDE.md) for how to write and edit tests.

## 📦 Deployment

### Docker Production

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Deploy
docker compose -f docker-compose.prod.yml up -d
```

### Environment Variables (Production)

| Variable | Description |
|----------|-------------|
| `DIRECTUS_KEY` | Random secret key |
| `DIRECTUS_SECRET` | Random secret |
| `DIRECTUS_ADMIN_EMAIL` | Admin email |
| `DIRECTUS_ADMIN_PASSWORD` | Strong password |
| `DB_PASSWORD` | Database password |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ by the SynthStack Team

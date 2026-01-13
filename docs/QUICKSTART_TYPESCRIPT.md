# TypeScript-Only Quick Start

Get SynthStack running with pure TypeScript in 15 minutes. No Python required.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

## 1. Clone & Install

```bash
git clone https://github.com/manicinc/synthstack.git
cd synthstack
pnpm install
```

## 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# Required for AI features
OPENAI_API_KEY=sk-...

# Optional - for advanced LLM routing
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...

# Stripe (for billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase Auth (or use local PostgreSQL)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

### LITE vs PRO Configuration

SynthStack offers two editions controlled by environment variables:

**LITE (Community Edition)** - Free for learning/personal/evaluation (Community License, non-commercial):
```env
ENABLE_COPILOT=false
ENABLE_REFERRALS=false
VITE_ENABLE_COPILOT=false
VITE_ENABLE_REFERRALS=false
```

**PRO (Commercial Edition)** - Includes AI Copilot & Referrals:
```env
ENABLE_COPILOT=true
ENABLE_REFERRALS=true
VITE_ENABLE_COPILOT=true
VITE_ENABLE_REFERRALS=true
```

**Quick setup:**
```bash
# LITE: Use community edition template
cp .env.lite.example .env

# PRO: Use commercial edition template
cp .env.pro.example .env
```

See [VERSIONS.md](./VERSIONS.md) for detailed feature comparison.

## 3. Start Services

```bash
# Start Docker services (Postgres, Redis, Qdrant, Directus)
docker compose up -d

# Wait ~30 seconds for services to initialize

# Start the API Gateway
pnpm dev:api

# In a new terminal - Start the frontend
pnpm dev:web
```

## 4. Access Your App

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3050 |
| API Gateway | http://localhost:3003 |
| API Docs | http://localhost:3003/docs |
| Directus CMS | http://localhost:8099/admin |

## What You Get (No Python)

The TypeScript stack includes:

### Authentication
- Supabase or Local PostgreSQL auth
- OAuth (Google, GitHub, Discord, Microsoft)
- JWT tokens with refresh rotation
- Role-based access control

### Billing & Credits
- Stripe subscriptions and one-time payments
- Credit-based usage system
- Referral program with tiered rewards

### AI Features (Direct from TypeScript)
- LLM chat (OpenAI, Anthropic, OpenRouter)
- Streaming responses
- Conversation history
- Agent orchestration
- Workflow builder

### Frontend
- Vue 3 + Quasar cross-platform app
- iOS, Android, Desktop (Electron), PWA
- Responsive design with dark mode
- Real-time updates

## Adding TypeScript ML Service (Optional)

If you need RAG, embeddings, or text analysis without Python:

```bash
# Start ts-ml-service
cd packages/ts-ml-service
pnpm install
pnpm start:dev
```

This provides:
- `/embeddings/*` - Text embeddings with OpenAI
- `/rag/*` - Document indexing and semantic search
- `/analysis/*` - Summarization, sentiment, keywords
- `/transcription/*` - Audio transcription (Whisper)
- `/complexity/*` - Task complexity estimation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│                   Vue 3 + Quasar                           │
│              (Web, iOS, Android, PWA, Electron)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│                    Fastify + TypeScript                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Auth   │ │ Billing  │ │  Agents  │ │ LLM Router   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
       │              │              │               │
       ▼              ▼              ▼               ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐
│ Supabase │   │  Stripe  │   │ Directus │   │ OpenAI/      │
│   Auth   │   │          │   │   CMS    │   │ Anthropic    │
└──────────┘   └──────────┘   └──────────┘   └──────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                        PostgreSQL                            │
│                     (via Directus)                          │
└──────────────────────────────────────────────────────────────┘
```

## Common Tasks

### Add a New API Endpoint

```typescript
// packages/api-gateway/src/routes/my-feature.ts
import { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/my-endpoint', async (request, reply) => {
    return { message: 'Hello from TypeScript!' };
  });
};

export default routes;
```

### Use LLM from API Gateway

```typescript
import { llmRouter } from '../services/llm-router';

const response = await llmRouter.chat({
  messages: [{ role: 'user', content: 'Hello!' }],
  model: 'gpt-4o-mini',
});
```

### Add a Pinia Store

```typescript
// apps/web/src/stores/my-store.ts
import { defineStore } from 'pinia';

export const useMyStore = defineStore('my-store', {
  state: () => ({
    items: [],
  }),
  actions: {
    async fetchItems() {
      const { data } = await api.get('/my-endpoint');
      this.items = data;
    },
  },
});
```

## Troubleshooting

### Docker services not starting
```bash
docker compose down -v
docker compose up -d
```

### Port conflicts
Change ports in `.env`:
```env
WEB_PORT=3051
API_PORT=3004
```

### Database connection issues
Wait 30-60 seconds after `docker compose up` for Postgres to initialize.

## Next Steps

- [Full AI Stack Guide](./QUICKSTART_FULL_AI.md) - Add Python ML services
- [Architecture Decision Guide](./ARCHITECTURE_DECISION.md) - Choose your stack
- [Mobile Guide](./MOBILE_GUIDE.md) - Build iOS/Android apps
- [Stripe Integration](./features/STRIPE_INTEGRATION.md) - Configure billing

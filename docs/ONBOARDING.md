# SynthStack Onboarding Guide

## Your AI Co-Founders Platform

Welcome to SynthStack - not just a chatbot, but a team of 6 specialized AI agents that know your business, access your data, and take action.

## ⚖️ License & Usage Rights

**Community Edition (This Repo):**
- Free for learning, personal projects, and evaluation
- Non-commercial use only
- Cannot build competing SaaS boilerplates

**Commercial License ($297 lifetime):**
- Build unlimited SaaS products in any industry
- White-label and rebrand completely
- Commercial production use
- No revenue sharing or per-project fees

**[View License FAQ →](./LICENSE-FAQ.md)** | **[Buy Commercial License →](https://synthstack.app/pricing)**

---

## 🎉 For Lifetime License Buyers

If you purchased a SynthStack Lifetime License, welcome to the community! You have full access to this source code repository.

### Getting Repository Access

After purchasing your lifetime license:

1. **Check your email** for the welcome message from SynthStack
2. **Submit your GitHub username** using the link provided
3. **Accept the GitHub invitation** sent to your GitHub account email
4. **Clone this repository**: `git clone https://github.com/manicinc/synthstack-pro.git`

### Complete Getting Started Guide

Follow our comprehensive step-by-step guide for lifetime buyers:

**[→ Lifetime License Getting Started Guide](./guides/LIFETIME_LICENSE_GETTING_STARTED.md)**

This guide includes:
- Detailed repository access instructions
- Development environment setup
- Database configuration
- Running your first instance
- Getting lifetime updates
- Support and community access

### What's Included in Your License

- ✅ Full source code (this entire repository)
- ✅ All 6 AI Co-Founder agents
- ✅ Complete documentation and tutorials
- ✅ Lifetime updates (bug fixes + security patches)
- ✅ Priority support via Discord
- ✅ Commercial usage rights (build unlimited SaaS products)
- ✅ No monthly fees or revenue sharing

### Need Help?

- **Email**: team@manic.agency
- **Discord**: Priority support channel for lifetime buyers
- **Troubleshooting**: See the [Getting Started Guide](./guides/LIFETIME_LICENSE_GETTING_STARTED.md#troubleshooting)

---

## Quick Links (Development Environment)

### Core Services

| Service | URL | Description |
|---------|-----|-------------|
| **Web Frontend** | http://localhost:3050 | Vue 3 + Quasar web application |
| **Directus CMS** | http://localhost:8099 | Admin panel, content management, AI dashboard |
| **API Gateway** | http://localhost:3003 | Fastify REST API |
| **API Docs** | http://localhost:3003/docs | Swagger/OpenAPI documentation |

### Infrastructure Services

| Service | URL | Description |
|---------|-----|-------------|
| **PostgreSQL** | localhost:5499 | Primary database |
| **Redis** | localhost:6399 | Cache & session storage |
| **Qdrant** | http://localhost:6333 | Vector database for RAG |
| **ML Service** | http://localhost:8001 | Python ML/AI service |

### Demo Credentials

```
Directus Admin:
  Email:    admin@synthstack.app
  Password: Synthstackadmin!

Demo User:
  Email:    demo@synthstack.app
  Password: DemoUser2024!
```

---

## The 6 AI Co-Founders

Each agent has specialized expertise, system prompts, and capabilities:

### 1. General Assistant
- **Slug:** `general`
- **Icon:** `smart_toy`
- **Color:** `#6366F1` (Indigo)
- **Role:** General-purpose AI assistant for everyday tasks
- **Capabilities:**
  - Answer questions about your business
  - Help with task coordination
  - Route complex queries to specialized agents
  - Provide general guidance and support

### 2. Researcher
- **Slug:** `researcher`
- **Icon:** `science`
- **Color:** `#10B981` (Emerald)
- **Role:** Market research and competitive intelligence
- **Capabilities:**
  - Competitor analysis
  - Market sizing and trends
  - Industry reports
  - Data synthesis from multiple sources

### 3. Marketer
- **Slug:** `marketer`
- **Icon:** `campaign`
- **Color:** `#F59E0B` (Amber)
- **Role:** Marketing strategy and content creation
- **Capabilities:**
  - Marketing campaign planning
  - Social media content calendars
  - Launch strategies
  - Brand messaging and positioning

### 4. Software Developer
- **Slug:** `developer`
- **Icon:** `code`
- **Color:** `#3B82F6` (Blue)
- **Role:** Technical guidance and code automation
- **Capabilities:**
  - Code review and suggestions
  - Create GitHub pull requests
  - Technical documentation
  - Architecture recommendations

### 5. SEO Writer
- **Slug:** `seo_writer`
- **Icon:** `trending_up`
- **Color:** `#8B5CF6` (Violet)
- **Role:** SEO-optimized content creation
- **Capabilities:**
  - Blog post drafting
  - Keyword research and optimization
  - Meta descriptions and titles
  - Content performance analysis

### 6. Designer
- **Slug:** `designer`
- **Icon:** `palette`
- **Color:** `#EC4899` (Pink)
- **Role:** Visual design and UX analysis
- **Capabilities:**
  - UI/UX feedback
  - Responsive design testing
  - Visual accessibility audits
  - Design system recommendations

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- pnpm (recommended) or npm

### 1. Clone & Install

```bash
git clone https://github.com/manicinc/synthstack.git
cd synthstack
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys:
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY
# - STRIPE_SECRET_KEY (optional)
# - SUPABASE_URL (optional)
```

### 3. Start Services

```bash
# Start all Docker services
docker compose up -d

# Or start frontend locally for development
cd apps/web && pnpm dev
```

### 4. Access the Platform

1. Open http://localhost:8099 for Directus CMS
2. Login with admin credentials
3. Navigate to the AI Co-Founders dashboard
4. Start chatting with your AI agents!

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Frontend (Vue 3 + Quasar)            │
│                          http://localhost:3050                   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (Fastify)                     │
│                          http://localhost:3003                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Routes:                                                      ││
│  │ • /api/v1/auth/*       - Authentication                     ││
│  │ • /api/v1/copilot/*    - AI Copilot (legacy)               ││
│  │ • /api/v1/agents/*     - AI Co-Founders agents             ││
│  │ • /api/v1/suggestions/* - Proactive suggestions            ││
│  │ • /api/v1/github/*     - GitHub integration                ││
│  │ • /api/v1/billing/*    - Stripe payments                   ││
│  │ • /api/v1/blog/*       - Blog management                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Redis       │  │    Qdrant       │
│   Port: 5499    │  │   Port: 6399    │  │   Port: 6333    │
│   Primary DB    │  │   Cache/Queue   │  │   Vector DB     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Directus CMS                                 │
│                   http://localhost:8099                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Extensions:                                                  ││
│  │ • copilot-widget    - Legacy AI chat panel                  ││
│  │ • ai-cofounders     - Multi-agent tabbed chat              ││
│  │ • ai-suggestions    - Proactive suggestions panel          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Agent Endpoints

```bash
# List all agents
GET /api/v1/agents

# Get specific agent
GET /api/v1/agents/:slug

# Chat with agent
POST /api/v1/agents/:slug/chat
{
  "message": "Analyze our top competitors",
  "session_id": "optional-session-id"
}

# Stream chat response
POST /api/v1/agents/:slug/chat/stream

# Get agent sessions
GET /api/v1/agents/:slug/sessions

# Get session messages
GET /api/v1/agents/:slug/sessions/:sessionId/messages
```

### Suggestions Endpoints

```bash
# Get all suggestions
GET /api/v1/suggestions?status=pending&agent_slug=researcher

# Review suggestion (approve/reject)
PUT /api/v1/suggestions/:id/review
{
  "status": "approved",
  "feedback": "Great suggestion!"
}

# Execute approved suggestion
POST /api/v1/suggestions/:id/execute
```

### GitHub Integration

```bash
# Connect GitHub account
POST /api/v1/github/connect
{
  "pat": "ghp_xxxxxxxxxxxxx"
}

# Get connected repos
GET /api/v1/github/repos

# Create pull request
POST /api/v1/github/repos/:repo/pr
{
  "title": "Fix: Update authentication flow",
  "body": "This PR addresses...",
  "head": "feature-branch",
  "base": "main"
}
```

---

## Directus Extensions

### AI Co-Founders Widget (`ai-cofounders`)

Located at: `services/directus/extensions/ai-cofounders/`

Multi-tab chat interface for all 6 agents:
- Tab-based navigation
- Per-agent chat history
- Quick action prompts
- Real-time streaming

### AI Suggestions Panel (`ai-suggestions`)

Located at: `services/directus/extensions/ai-suggestions/`

Proactive recommendations from agents:
- Stats overview (pending, approved, recent)
- Filter by status, type, agent
- Approve/reject workflow
- Detail drawer with full context

---

## Database Schema

Key tables for AI Co-Founders:

```sql
-- Agent definitions
ai_agents
  - id, slug, name, description
  - icon, color, system_prompt
  - capabilities (JSONB)
  - model_config (JSONB)

-- Chat sessions
ai_agent_sessions
  - id, user_id, agent_id
  - title, context (JSONB)
  - created_at, updated_at

-- Chat messages
ai_agent_messages
  - id, session_id
  - role (user/assistant/system)
  - content, reasoning_trace
  - tokens_used, model_used

-- Proactive suggestions
ai_suggestions
  - id, user_id, agent_id
  - type (content/action/insight/improvement)
  - priority (low/medium/high/critical)
  - title, description, data (JSONB)
  - status (pending/approved/rejected/executed)

-- GitHub integrations
github_integrations
  - id, user_id
  - encrypted_pat
  - repos_access (JSONB)
  - connected_at
```

---

## Key Features

### 1. Human Approval Required

**All AI actions require your approval.** Nothing goes live without your review:
- Blog posts saved as drafts
- GitHub PRs created for review
- Marketing content queued for approval
- Suggestions pending your decision

### 2. RAG-Powered Context

Automatic document ingestion gives agents full context:
- Your codebase (via GitHub)
- CMS content (blog posts, pages)
- Custom knowledge bases
- Previous conversation history

### 3. Proactive Suggestions

Agents don't just wait for questions. They proactively recommend:
- "Your blog hasn't been updated in 2 weeks"
- "Competitor X just launched a new feature"
- "This code pattern could be improved"
- "SEO opportunity: target keyword 'X'"

### 4. Shared Context

Agents collaborate and share information:
- Researcher findings available to Marketer
- Developer insights inform SEO Writer
- Cross-agent memory and context
- Unified business understanding

---

## 💳 Pricing & Business Models

SynthStack includes **two complete billing systems** ready to use:

### 1. Subscription Plans (Recurring)

Monthly and yearly billing via Stripe:

| Plan | Monthly | Yearly | Credits/Day |
|------|---------|--------|-------------|
| Free | $0 | $0 | 10 |
| Maker | $9.99 | $99.90 | 30 |
| Pro | $24.99 | $249.90 | 100 |
| Agency | $49.99 | $499.90 | ∞ |

**Includes:**
- Automatic Stripe webhook handling
- Credit allocation and daily reset
- Customer billing portal
- Proration on plan changes
- Invoice caching and history

### 2. Lifetime License (One-Time)

One-time payment model for perpetual access:
- **Early bird:** $149 (first 500 copies)
- **Regular:** $297
- No recurring charges
- Full source code access

### How They Work Together

**If you buy the lifetime license**, you get:
1. ✅ Complete source code for the SaaS
2. ✅ Working subscription system (code for plans above)
3. ✅ All Stripe integrations
4. ✅ You can offer subscriptions to YOUR customers

**This is dogfooding** - The site you're looking at (synthstack.app) runs on the exact code you'll receive. Test subscriptions, credits, AI features - it all works out of the box.

### Live Demo

Try it now:
- **Demo Mode**: 5 free AI credits (no signup)
- **Free Account**: 10 credits/day (sign up)
- **Test Subscriptions**: Use Stripe test mode

Every feature you see live on this site is included in your license.

---

## Troubleshooting

### Services not starting

```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f [service-name]

# Restart specific service
docker compose restart directus
```

### Database issues

```bash
# Reset database (WARNING: destroys data)
docker compose down -v
docker compose up -d
```

### Extension not loading

```bash
# Rebuild Directus
docker compose build directus
docker compose up -d directus
```

---

## Support

- **Documentation:** http://localhost:3050/docs
- **API Docs:** http://localhost:3003/docs
- **GitHub Issues:** https://github.com/manicinc/synthstack/issues
- **Email:** support@synthstack.app

---

*Your AI Co-Founders are ready to help you build.*

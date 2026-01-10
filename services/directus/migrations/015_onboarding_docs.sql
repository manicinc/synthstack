-- Migration: 015_onboarding_docs.sql
-- Description: Seed onboarding documentation and wiki content
-- Created: 2024-12-13

-- ============================================
-- Create docs/wiki table if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS docs_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    content TEXT NOT NULL,
    excerpt TEXT,
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    icon VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_docs_articles_category ON docs_articles(category);
CREATE INDEX IF NOT EXISTS idx_docs_articles_slug ON docs_articles(slug);
CREATE INDEX IF NOT EXISTS idx_docs_articles_tags ON docs_articles USING GIN(tags);

-- ============================================
-- Insert Onboarding Documentation
-- ============================================

-- Quick Start Guide
INSERT INTO docs_articles (slug, title, category, content, excerpt, sort_order, is_featured, icon, tags) VALUES
('quick-start', 'Quick Start Guide', 'getting-started',
$DOC$# Quick Start Guide

Welcome to SynthStack - Your AI Co-Founders Platform!

## Prerequisites

- Docker & Docker Compose
- Node.js 18+
- pnpm (recommended)

## 3 Steps to Launch

### 1. Clone & Install

```bash
git clone https://github.com/manicinc/synthstack.git
cd synthstack
pnpm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Launch

```bash
docker compose up -d
```

## Access Your Platform

| Service | URL |
|---------|-----|
| Web App | http://localhost:3050 |
| Directus CMS | http://localhost:8099 |
| API Docs | http://localhost:3003/docs |

## Default Credentials

**Directus Admin:**
- Email: `admin@synthstack.app`
- Password: `SynthStack2024!`

## Next Steps

1. Explore the AI Co-Founders dashboard in Directus
2. Chat with your 6 specialized AI agents
3. Review proactive suggestions
4. Connect your GitHub for code automation

Ready to meet your AI team? They're waiting in the dashboard!
$DOC$,
'Get started with SynthStack in 3 simple steps',
1, true, 'rocket_launch', ARRAY['quickstart', 'setup', 'installation']
) ON CONFLICT (slug) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Service Map
INSERT INTO docs_articles (slug, title, category, content, excerpt, sort_order, icon, tags) VALUES
('service-map', 'Service Map & URLs', 'architecture',
$DOC$# Service Map

## Development URLs

| Service | Port | URL |
|---------|------|-----|
| **Web Frontend** | 3050 | http://localhost:3050 |
| **Directus CMS** | 8099 | http://localhost:8099 |
| **API Gateway** | 3003 | http://localhost:3003 |
| **API Docs** | 3003 | http://localhost:3003/docs |
| **ML Service** | 8001 | http://localhost:8001 |
| **Qdrant** | 6333 | http://localhost:6333 |
| **PostgreSQL** | 5499 | localhost:5499 |
| **Redis** | 6399 | localhost:6399 |

## Architecture

```
Browser → Frontend (3050)
       → Directus (8099)
       → API Gateway (3003) → PostgreSQL (5499)
                           → Redis (6399)
                           → Qdrant (6333)
                           → ML Service (8001)
```

## Docker Commands

```bash
# Start all
docker compose up -d

# View logs
docker compose logs -f [service]

# Stop all
docker compose down
```
$DOC$,
'All service URLs and architecture overview',
2, 'map', ARRAY['services', 'urls', 'architecture', 'docker']
) ON CONFLICT (slug) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- AI Co-Founders Overview
INSERT INTO docs_articles (slug, title, category, content, excerpt, sort_order, is_featured, icon, tags) VALUES
('ai-cofounders', 'AI Co-Founders Overview', 'ai-agents',
$DOC$# Your AI Co-Founders

Not just chatbots. A team of 6 specialized AI agents that know your business, access your data, and take action.

## The Team

### 1. General Assistant
- **Icon:** 🤖
- **Color:** Indigo (#6366F1)
- **Role:** Task coordination, general Q&A
- **Best for:** Everyday questions, routing to specialists

### 2. Researcher
- **Icon:** 🔬
- **Color:** Emerald (#10B981)
- **Role:** Market research, competitive analysis
- **Best for:** Competitor reports, market sizing, trends

### 3. Marketer
- **Icon:** 📣
- **Color:** Amber (#F59E0B)
- **Role:** Marketing strategy, content planning
- **Best for:** Campaigns, social calendars, launch plans

### 4. Developer
- **Icon:** 💻
- **Color:** Blue (#3B82F6)
- **Role:** Code review, GitHub automation
- **Best for:** PR creation, code analysis, tech docs

### 5. SEO Writer
- **Icon:** 📈
- **Color:** Violet (#8B5CF6)
- **Role:** SEO content creation
- **Best for:** Blog posts, meta tags, keyword research

### 6. Designer
- **Icon:** 🎨
- **Color:** Pink (#EC4899)
- **Role:** Visual feedback, UX analysis
- **Best for:** UI review, accessibility, responsive testing

## Key Features

### Human Approval Required
All actions require your approval. Blog posts, PRs, and content are saved as drafts first.

### Proactive Suggestions
Agents don't wait for questions. They analyze your data and proactively recommend improvements.

### RAG-Powered Context
Automatic document ingestion means agents understand your business deeply.

### Cross-Agent Collaboration
Agents share context and collaborate on complex tasks.
$DOC$,
'Meet your 6 specialized AI agents',
3, true, 'groups', ARRAY['ai', 'agents', 'cofounders', 'overview']
) ON CONFLICT (slug) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Proactive Suggestions
INSERT INTO docs_articles (slug, title, category, content, excerpt, sort_order, icon, tags) VALUES
('proactive-suggestions', 'Proactive Suggestions', 'ai-agents',
$DOC$# Proactive Suggestions

AI agents don't just wait for you to ask. They analyze your business and proactively suggest improvements.

## Suggestion Types

| Type | Description | Example |
|------|-------------|---------|
| **Content** | Content opportunities | "Write a blog about X" |
| **Action** | Recommended actions | "Create PR for bug fix" |
| **Insight** | Business insights | "Traffic from Y increased" |
| **Improvement** | System improvements | "Page X loads slowly" |

## Priority Levels

- 🔴 **Critical** - Immediate attention needed
- 🟠 **High** - Should address soon
- 🟡 **Medium** - When you have time
- 🟢 **Low** - Nice to have

## Workflow

1. Agent generates suggestion
2. Saved as "pending" status
3. Appears in Suggestions panel
4. You review and decide:
   - ✅ **Approve** → Execute action
   - ❌ **Reject** → Dismiss with feedback
   - ⏸️ **Defer** → Review later

## Configure Frequency

Set how often agents generate suggestions:
- Hourly (most proactive)
- Daily (recommended)
- Weekly (minimal interruption)
$DOC$,
'How AI agents proactively help you',
4, 'notifications_active', ARRAY['suggestions', 'ai', 'proactive', 'recommendations']
) ON CONFLICT (slug) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- GitHub Integration
INSERT INTO docs_articles (slug, title, category, content, excerpt, sort_order, icon, tags) VALUES
('github-integration', 'GitHub Integration', 'integrations',
$DOC$# GitHub Integration

Connect your GitHub account to let the Developer agent analyze code and create pull requests.

## Setup

### 1. Generate Personal Access Token (PAT)

1. Go to GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token with scopes:
   - `repo` (full access)
   - `read:user`

### 2. Connect Account

```bash
POST /api/v1/github/connect
{
  "pat": "ghp_xxxxxxxxxxxx"
}
```

Or use the Settings panel in Directus.

## Capabilities

| Action | Human Approval |
|--------|----------------|
| Read repositories | No |
| Analyze code | No |
| Create branches | Yes |
| Create pull requests | Yes |
| Add comments | Yes |
| Merge PRs | Yes |

## Security

- PAT encrypted with AES-256-GCM
- Stored securely in database
- Never logged or exposed
- Revocable at any time

## What Developer Agent Can Do

1. **Code Review** - Analyze PRs and suggest improvements
2. **Create PRs** - Draft changes for your review
3. **Bug Hunting** - Find potential issues
4. **Documentation** - Generate tech docs
5. **Architecture** - Recommend improvements
$DOC$,
'Connect GitHub for code automation',
5, 'code', ARRAY['github', 'integration', 'developer', 'code']
) ON CONFLICT (slug) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- API Reference
INSERT INTO docs_articles (slug, title, category, content, excerpt, sort_order, icon, tags) VALUES
('api-reference', 'API Reference', 'development',
$DOC$# API Reference

Base URL: `http://localhost:3003/api/v1`

Full Swagger docs: http://localhost:3003/docs

## Authentication

```bash
Authorization: Bearer <jwt_token>
```

## Agent Endpoints

### List Agents
```bash
GET /agents
```

### Chat with Agent
```bash
POST /agents/:slug/chat
{
  "message": "Your message",
  "session_id": "optional-uuid"
}
```

### Stream Response
```bash
POST /agents/:slug/chat/stream
Accept: text/event-stream
```

### Get Sessions
```bash
GET /agents/:slug/sessions
```

## Suggestion Endpoints

### List Suggestions
```bash
GET /suggestions?status=pending&agent_slug=researcher
```

### Review Suggestion
```bash
PUT /suggestions/:id/review
{
  "status": "approved",
  "feedback": "Great idea"
}
```

## GitHub Endpoints

### Connect Account
```bash
POST /github/connect
{
  "pat": "ghp_xxx"
}
```

### List Repos
```bash
GET /github/repos
```

### Create PR
```bash
POST /github/repos/:repo/pr
{
  "title": "PR Title",
  "body": "Description",
  "head": "feature-branch",
  "base": "main"
}
```
$DOC$,
'API endpoints for AI Co-Founders',
6, 'api', ARRAY['api', 'endpoints', 'reference', 'development']
) ON CONFLICT (slug) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Pricing
INSERT INTO docs_articles (slug, title, category, content, excerpt, sort_order, icon, tags) VALUES
('pricing', 'Pricing & Plans', 'general',
$DOC$# Pricing & Plans

## Tiers

### Community (Free)
Open source SaaS boilerplate
- Full source code (MIT license)
- Directus CMS integration
- Stripe/LemonSqueezy billing
- Blog & newsletter
- Cross-platform builds
- ❌ No AI Co-Founders

### Pro ($297 lifetime)
Full AI Co-Founders experience
- Everything in Community
- **All 6 AI agents**
- GitHub PR automation
- Proactive suggestions
- RAG knowledge base
- All prompt templates
- Priority support
- Lifetime updates

### Enterprise (Custom)
For teams and agencies
- Everything in Pro
- Custom agent training
- White-label branding
- Dedicated support
- SLA guarantees
- On-premise deployment
- Team training

## FAQ

**Is the $297 one-time?**
Yes. Lifetime license with no recurring fees.

**What about AI API costs?**
You use your own OpenAI/Anthropic API keys. You pay them directly.

**Can I self-host?**
Yes. Full control over your deployment.
$DOC$,
'Plans and pricing for SynthStack',
7, 'payments', ARRAY['pricing', 'plans', 'subscription', 'license']
) ON CONFLICT (slug) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- Troubleshooting
INSERT INTO docs_articles (slug, title, category, content, excerpt, sort_order, icon, tags) VALUES
('troubleshooting', 'Troubleshooting', 'support',
$DOC$# Troubleshooting

## Common Issues

### Services Not Starting

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f [service]

# Restart specific service
docker compose restart directus
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection
docker exec -it synthstack-postgres psql -U synthstack -c "SELECT 1"

# Reset database (WARNING: destroys data)
docker compose down -v
docker compose up -d
```

### Agent Not Responding

1. Check API Gateway logs:
   ```bash
   docker compose logs -f api-gateway
   ```

2. Verify API keys in `.env`:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`

3. Check rate limits on AI provider

### Directus Extension Not Loading

```bash
# Rebuild Directus
docker compose build directus
docker compose up -d directus
```

### Redis Connection Issues

```bash
# Check Redis
docker compose logs redis

# Test connection
docker exec -it synthstack-redis redis-cli ping
```

## Get Help

- **Docs:** http://localhost:3050/docs
- **API Docs:** http://localhost:3003/docs
- **GitHub Issues:** https://github.com/manicinc/synthstack/issues
- **Email:** support@synthstack.app
$DOC$,
'Common issues and solutions',
8, 'help', ARRAY['troubleshooting', 'help', 'support', 'issues']
) ON CONFLICT (slug) DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = NOW();

-- ============================================
-- Add updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_docs_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS docs_articles_updated_at ON docs_articles;
CREATE TRIGGER docs_articles_updated_at
    BEFORE UPDATE ON docs_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_docs_articles_updated_at();

-- ============================================
-- Grant permissions
-- ============================================
GRANT ALL ON docs_articles TO synthstack;

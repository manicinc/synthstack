# Strategy Debates - Complete Guide

## Overview

Strategy Debates is SynthStack's **Pro** feature for AI-powered strategic decision-making. Instead of getting a single AI perspective, you get a structured multi-agent debate where specialized agents argue from different angles, challenge assumptions, and synthesize their insights into a comprehensive **Decision Brief**.

Think of it as having a virtual boardroom of experts debating your most important business decisions.

---

## How It Works

### The Debate Flow

```
User Prompt (Strategic Question)
         ↓
┌─────────────────────────────┐
│     Research Phase          │
│  • SERP queries             │
│  • Competitive analysis     │
│  • Data gathering           │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│   Initial Positions         │
│  Each agent stakes a        │
│  position with evidence     │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│   Challenge Phase           │
│  Agents challenge weak      │
│  arguments from others      │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│   Rebuttal Phase            │
│  Agents defend positions    │
│  and adapt their views      │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│   Synthesis Phase           │
│  General agent mediates     │
│  and produces Decision Brief│
└─────────────────────────────┘
         ↓
    Decision Brief
```

---

## The Agents

Strategy Debates uses the same 6 AI Co-Founders agents, but assigns them **debate personas** that change throughout the session:

| Agent | Expertise | Example Contribution |
|-------|-----------|---------------------|
| **General** | Coordination & Synthesis | Moderates debate, synthesizes final brief |
| **Researcher** | Data & Analysis | "Market data shows 73% of users prefer..." |
| **Marketer** | Growth & Positioning | "From a brand perspective, this risks..." |
| **Developer** | Technical Feasibility | "Implementation would require 3 sprints..." |
| **SEO Writer** | Content & Messaging | "The messaging resonates with search intent..." |
| **Designer** | UX & Visual Impact | "Users will struggle with this flow because..." |

### Debate Personas

Each agent rotates through personas during the debate:

| Persona | Role | When Used |
|---------|------|-----------|
| **Advocate** | Stakes and defends a position | Initial positions, rebuttals |
| **Critic** | Challenges weakest arguments | Challenge phase |
| **Analyst** | Evaluates claims objectively | After challenges |
| **Mediator** | Synthesizes opposing views | Final synthesis |

**Persona Assignment Example:**
- Round 1: All agents as `advocate` (state positions)
- Round 2: 2 agents swap to `critic` role (challenge)
- Round 3: Original advocates become `analyst` (evaluate)
- Final: General agent as `mediator` (synthesize)

---

## Credit Tiers

Strategy Debates offers three tiers to match your needs and budget:

| Tier | Credits | Agents | Rounds | Best For |
|------|---------|--------|--------|----------|
| **Light** | 30 | 4 | 2 | Quick decisions, validation |
| **Standard** | 60 | 6 | 4 | Most business decisions |
| **Full** | 100 | 6 | 6 | Complex strategic choices |

### What's Included Per Tier

**Light (30 credits)**
- 4 participating agents
- 2 debate rounds
- Basic research phase
- Executive summary only

**Standard (60 credits)**
- All 6 agents
- 4 debate rounds
- Full research phase
- Complete Decision Brief with risk matrix

**Full (100 credits)**
- All 6 agents
- 6 debate rounds with deep challenges
- Deep research with competitive analysis
- Complete Decision Brief
- Implementation timeline
- Dissenting views preserved

---

## Decision Brief

The final output of every Strategy Debate is a **Decision Brief** - a structured document that synthesizes all agent perspectives.

### Brief Structure

```json
{
  "executive_summary": "Concise recommendation...",
  "key_recommendations": [
    {
      "title": "Recommendation 1",
      "description": "Details...",
      "priority": "high",
      "confidence": 0.85
    }
  ],
  "risk_matrix": [
    {
      "risk": "Market timing",
      "likelihood": "medium",
      "impact": "high",
      "mitigation": "Phase rollout..."
    }
  ],
  "implementation_timeline": [
    {
      "phase": "Phase 1",
      "tasks": ["Task A", "Task B"],
      "duration": "2 weeks",
      "dependencies": []
    }
  ],
  "dissenting_views": [
    {
      "agent": "developer",
      "concern": "Technical debt accumulation",
      "recommendation": "Consider phased approach"
    }
  ],
  "confidence_score": 0.78
}
```

### Confidence Scores

Each recommendation includes a confidence score (0.00-1.00) based on:
- Agent consensus level
- Strength of supporting evidence
- Number of unresolved challenges
- Research data quality

---

## Using Strategy Debates

### Creating a Session

1. Navigate to **Strategy** in the sidebar (or the Strategy tab in a project)
2. Click **New Strategy Session**
3. Enter your strategic question
4. Select a tier (Light, Standard, or Full)
5. Click **Start Debate**

### Example Prompts

**Product Strategy:**
```
Should we launch a mobile app this quarter, or focus on improving
our web experience? Consider our current resources, market position,
and user feedback.
```

**Pricing Decision:**
```
We're considering switching from per-seat pricing to usage-based pricing.
Analyze the pros and cons for our B2B SaaS product targeting SMBs.
```

**Technical Architecture:**
```
Should we migrate from our monolith to microservices? Consider our
team size of 8 engineers, current technical debt, and growth projections.
```

**Market Expansion:**
```
Evaluate whether we should expand to the European market in 2025.
Consider GDPR compliance, localization costs, and competitive landscape.
```

### Watching the Debate

Strategy Debates stream in real-time. You'll see:
- Each agent's contribution as it's generated
- The current phase (Research → Initial → Challenge → Rebuttal → Synthesis)
- Confidence indicators for each position
- Challenges and rebuttals between agents

---

## Project Integration

Strategy Debates can be accessed in two ways:

### 1. Top-Level Dashboard
Navigate to `/app/strategy` for a global view of all your Strategy sessions across projects.

### 2. Project Tab
Within any project, access the **Strategy** tab to create debates scoped to that project's context. The agents will automatically have access to project-specific knowledge and documents.

---

## Developer Bot Integration

For technical decisions, the **Developer** agent can create GitHub Pull Requests based on debate conclusions.

### How It Works

1. During or after a debate involving technical decisions
2. Developer agent analyzes the recommended changes
3. With your approval, it can:
   - Analyze your connected repository
   - Generate code changes
   - Create a PR for your review

### Repository Connection

```bash
POST /api/v1/developer-bot/repos
{
  "github_repo_url": "https://github.com/yourorg/yourrepo",
  "default_branch": "main"
}
```

### PR Generation Credits

| Scope | Credits |
|-------|---------|
| Small (<5 files) | 20 |
| Medium (5-15 files) | 40 |
| Large (>15 files) | 80 |

---

## API Reference

### Create Session

```bash
POST /api/v1/strategy/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Q1 Product Strategy",
  "prompt": "Should we prioritize feature X or feature Y?",
  "projectId": "optional-project-uuid",
  "config": {
    "tier": "standard",
    "focusAreas": ["technical", "market"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid",
      "title": "Q1 Product Strategy",
      "status": "pending",
      "created_at": "2025-01-13T..."
    }
  }
}
```

### List Sessions

```bash
GET /api/v1/strategy/sessions?page=1&limit=12&projectId=optional-uuid
Authorization: Bearer <token>
```

### Get Session

```bash
GET /api/v1/strategy/sessions/:sessionId
Authorization: Bearer <token>
```

Returns full session data including all rounds and agent contributions.

### Start Debate

```bash
POST /api/v1/strategy/sessions/:sessionId/start
Authorization: Bearer <token>
```

Begins the debate execution. Returns immediately; use SSE stream for progress.

### Stream Updates (SSE)

```bash
GET /api/v1/strategy/sessions/:sessionId/stream?token=<jwt>
Accept: text/event-stream
```

**Event Types:**
```
data: {"type": "connected", "timestamp": "..."}
data: {"type": "status_update", "status": "researching"}
data: {"type": "round_started", "round": {"id": "...", "phase": "initial_positions"}}
data: {"type": "contribution", "round_id": "...", "contribution": {"agent_slug": "researcher", "content": "..."}}
data: {"type": "round_completed", "round_id": "...", "completed_at": "..."}
data: {"type": "brief_ready", "brief": {"id": "...", "confidence_score": 0.78}}
data: {"type": "error", "message": "..." }
```

### Get Decision Brief

```bash
GET /api/v1/strategy/sessions/:sessionId/brief
Authorization: Bearer <token>
```

### Export Session

```bash
POST /api/v1/strategy/sessions/:sessionId/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "markdown"  // or "pdf"
}
```

---

## Best Practices

### 1. Be Specific with Your Prompt

```
❌ "Should we do marketing?"
✅ "Should we invest $50K in paid advertising or content marketing
    for the next quarter? Our current MRR is $100K with 80% of
    traffic from organic search."
```

### 2. Provide Context

The more context you provide, the better the debate:
- Current metrics and KPIs
- Constraints (budget, timeline, team size)
- Previous decisions and outcomes
- Competitive landscape

### 3. Choose the Right Tier

- **Light**: Quick validation of an idea you're already leaning toward
- **Standard**: Most decisions - balanced depth and cost
- **Full**: High-stakes decisions with long-term implications

### 4. Review Dissenting Views

Don't ignore the minority opinions. Dissenting views often surface risks that the majority missed.

### 5. Use Project Context

Create strategy sessions within a project to give agents access to project-specific documents and history.

---

## Troubleshooting

### Session Stuck in "Researching"

1. Check API Gateway logs: `docker logs synthstack-api-gateway`
2. Verify OpenAI/Anthropic API keys in `.env`
3. Check SERP API configuration for research phase

### Brief Not Generating

1. Ensure all debate rounds completed (check session status)
2. Verify sufficient credits were available
3. Check for timeout errors in logs

### SSE Stream Disconnects

1. Reconnect with the same token
2. Stream will resume from current state
3. Check network/proxy timeout settings

### Credit Deduction Issues

1. Credits are reserved at session start
2. Refunded if session fails before synthesis
3. Check `strategy_credit_usage` table for breakdown

---

## Managing in Directus

### Session Data

Strategy sessions are stored in several collections:

| Collection | Purpose |
|------------|---------|
| `strategy_sessions` | Main session data |
| `strategy_debate_rounds` | Individual round records |
| `strategy_agent_contributions` | Agent inputs per round |
| `strategy_decision_briefs` | Final synthesized briefs |
| `strategy_credit_usage` | Credit tracking |

### Viewing Sessions

1. Log in to Directus Admin: `http://localhost:8055`
2. Navigate to **Strategy Sessions**
3. Filter by status, user, or project

### Manual Session Management

You can manually update session status in Directus if needed:
- Set status to `failed` to trigger credit refund
- Set status to `completed` to mark finished
- Edit `config` to adjust tier settings

---

## Feature Flag

Strategy Debates requires the `ai_cofounders` feature flag. This is automatically enabled for:
- Lifetime license holders
- Pro tier subscribers

Check access via:
```bash
GET /api/v1/user/features
# Response includes: { "ai_cofounders": true }
```

---

## Coming Soon

- **Saved Templates**: Reuse prompts for recurring decisions
- **Team Collaboration**: Invite team members to observe debates
- **Custom Agents**: Add specialized agents for your industry
- **Decision Tracking**: Track outcomes of past decisions

---

*Make better decisions with the power of structured AI debate.*

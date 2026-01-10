# AI Co-Founders - Complete Guide

## Overview

AI Co-Founders is SynthStack's premium feature that transforms your platform from a simple SaaS boilerplate into an AI-powered business operations center. Instead of a single chatbot, you get a team of 6 specialized AI agents that understand your business deeply.

---

## The Agents

### General Assistant (`general`)

**The Coordinator**

Your all-purpose AI helper that handles everyday tasks and routes complex queries to specialists.

**System Prompt Focus:**
- Friendly, helpful demeanor
- Task coordination and delegation
- General Q&A about your business
- Onboarding new users

**Example Interactions:**
```
User: What's on my agenda today?
Agent: Based on your calendar and pending tasks, here's your day...

User: I need help with a marketing campaign
Agent: I'll bring in our Marketer agent who specializes in campaigns.
       They can help with strategy, content, and timeline.
```

---

### Researcher (`researcher`)

**The Intelligence Gatherer**

Conducts deep research, competitive analysis, and synthesizes information from multiple sources.

**System Prompt Focus:**
- Methodical research approach
- Source citation and verification
- Data synthesis and summary
- Trend identification

**Capabilities:**
- Competitor analysis reports
- Market sizing estimates
- Industry trend reports
- Customer research synthesis

**Example Interactions:**
```
User: Analyze our top 3 competitors
Agent: I'll conduct a comprehensive analysis. Here's what I found:

## Competitor A - Acme Corp
- **Pricing:** $49-299/mo
- **Strengths:** Strong brand, large user base
- **Weaknesses:** Outdated UI, slow support
- **Recent moves:** Launched AI features last month

## Competitor B - Beta Inc
...
```

---

### Marketer (`marketer`)

**The Growth Driver**

Creates marketing strategies, content plans, and campaign materials.

**System Prompt Focus:**
- Growth-oriented mindset
- Data-driven recommendations
- Creative content ideation
- Multi-channel strategy

**Capabilities:**
- Marketing campaign planning
- Social media content calendars
- Email sequences
- Launch strategies
- Brand positioning

**Output Examples:**
- 30-day social media calendar
- Product launch playbook
- Email nurture sequences
- Ad copy variations

---

### Software Developer (`developer`)

**The Technical Partner**

Reviews code, suggests improvements, and creates GitHub pull requests.

**System Prompt Focus:**
- Clean code principles
- Security awareness
- Performance optimization
- Best practices adherence

**Capabilities:**
- Code review with suggestions
- Pull request creation
- Technical documentation
- Architecture recommendations
- Bug identification

**GitHub Integration:**
```bash
# The developer agent can:
1. Read your repositories
2. Analyze code patterns
3. Suggest improvements
4. Create pull requests for your review
5. Add code comments
```

---

### SEO Writer (`seo_writer`)

**The Content Optimizer**

Creates SEO-optimized content that ranks and converts.

**System Prompt Focus:**
- Search intent understanding
- Keyword optimization
- Readability and engagement
- Conversion-focused writing

**Capabilities:**
- Blog post drafting
- Meta descriptions
- Title tag optimization
- Keyword research
- Content audits

**Output Format:**
```markdown
# [SEO Title - 60 chars max]

Meta Description: [155 chars max, includes primary keyword]

## Introduction
[Hook + primary keyword in first 100 words]

## [H2 with secondary keyword]
...

## Conclusion
[CTA + summary]

---
Target Keywords: primary, secondary, long-tail
Word Count: 1,500+
Readability: Grade 8
```

---

### Designer (`designer`)

**The Visual Expert**

Provides design feedback, UI/UX analysis, and accessibility audits.

**System Prompt Focus:**
- Visual hierarchy principles
- Accessibility (WCAG) compliance
- Responsive design
- User experience optimization

**Capabilities:**
- UI/UX review and feedback
- Responsive design testing
- Color contrast checking
- Layout recommendations
- Design system guidance

---

## How Agents Work Together

### Shared Context

All agents share a common understanding of your business:

```
┌─────────────────────────────────────────┐
│           Shared Knowledge Base          │
│  • Company info      • Products         │
│  • Brand guidelines  • Target audience  │
│  • Previous chats    • Documents        │
└─────────────────────────────────────────┘
        │         │         │
        ▼         ▼         ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │Research│ │ Market │ │  Dev   │
   │   er   │ │   er   │ │        │
   └────────┘ └────────┘ └────────┘
```

### Cross-Agent Collaboration

```
Example: Launching a New Feature

1. Developer: "New authentication feature is ready"
       ↓
2. Researcher: "Competitor analysis shows auth is a top request"
       ↓
3. Marketer: "Here's a launch campaign plan"
       ↓
4. SEO Writer: "Blog post draft: 'Secure Authentication Made Easy'"
       ↓
5. Designer: "Landing page looks good, but CTA button needs more contrast"
```

---

## Proactive Suggestions

Agents don't wait for you to ask. They analyze your business and proactively suggest improvements.

### Suggestion Types

| Type | Description | Example |
|------|-------------|---------|
| `content` | Content creation opportunities | "Your blog needs a post about X" |
| `action` | Recommended actions | "Create a PR for this bug fix" |
| `insight` | Business insights | "Traffic from Y is increasing" |
| `improvement` | System improvements | "This page loads slowly" |

### Suggestion Workflow

```
1. Agent generates suggestion
       ↓
2. Saved as "pending" in database
       ↓
3. Appears in Suggestions panel
       ↓
4. User reviews and decides:
   • Approve → Execute action
   • Reject → Dismiss with feedback
   • Defer → Review later
```

### Frequency Settings

Configure how often agents generate suggestions:

```javascript
user_agent_settings {
  suggestion_frequency: 'daily',  // hourly, daily, weekly
  enabled_agents: ['researcher', 'marketer', 'seo_writer'],
  notification_preference: 'digest'  // immediate, digest, off
}
```

---

## Human Approval

**Critical:** All AI actions require human approval.

### What Gets Drafted (Not Published)

- Blog posts → Saved as draft in CMS
- GitHub PRs → Created for review (not merged)
- Marketing content → Queued for approval
- Code changes → Suggested, not committed

### Approval Flow

```
AI Action Request
       ↓
    [DRAFT]
       ↓
Human Review ──→ Approve ──→ Execute
       │
       └──→ Reject ──→ Feedback to AI
```

---

## GitHub Integration

### Setup

1. Generate a GitHub Personal Access Token (PAT)
2. Required scopes: `repo`, `read:user`
3. Connect via API or Directus settings

```bash
POST /api/v1/github/connect
{
  "pat": "ghp_xxxxxxxxxxxxxxxxxxxx"
}
```

### Security

- PAT encrypted with AES-256-GCM
- Stored in `github_integrations` table
- Never logged or exposed in responses
- Revocable at any time

### Capabilities

| Action | Human Approval |
|--------|----------------|
| Read repos | No |
| Analyze code | No |
| Create branch | Yes |
| Create PR | Yes |
| Add comments | Yes |
| Merge PR | Yes |

---

## RAG (Retrieval-Augmented Generation)

### How It Works

```
User Query
    ↓
┌─────────────────────┐
│  Vector Search      │ ← Qdrant
│  (Find relevant     │
│   documents)        │
└─────────────────────┘
    ↓
┌─────────────────────┐
│  Context Assembly   │
│  (Combine docs +    │
│   query)            │
└─────────────────────┘
    ↓
┌─────────────────────┐
│  LLM Generation     │ ← OpenAI/Anthropic
│  (Generate response │
│   with context)     │
└─────────────────────┘
    ↓
Response with Sources
```

### Indexed Sources

1. **Code repositories** (via GitHub)
2. **CMS content** (blog posts, pages)
3. **Documentation** (markdown files)
4. **Custom uploads** (PDFs, docs)
5. **Chat history** (for context)

### Agent-Specific Knowledge

Each agent can have specialized knowledge:

```
ai_agent_knowledge {
  agent_id: 'researcher',
  collection: 'market_reports',
  documents: [...]
}
```

---

## API Reference

### Chat with Agent

```bash
POST /api/v1/agents/:slug/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Your message here",
  "session_id": "optional-uuid",
  "context": {
    "additional": "context"
  }
}
```

### Stream Response

```bash
POST /api/v1/agents/:slug/chat/stream
Accept: text/event-stream

# Returns SSE stream:
data: {"type": "chunk", "content": "Hello"}
data: {"type": "chunk", "content": " there"}
data: {"type": "done", "usage": {"tokens": 150}}
```

### Get Suggestions

```bash
GET /api/v1/suggestions?status=pending&agent_slug=researcher&limit=10
```

### Review Suggestion

```bash
PUT /api/v1/suggestions/:id/review
{
  "status": "approved",
  "feedback": "Good suggestion"
}
```

---

## Best Practices

### 1. Be Specific

```
❌ "Help me with marketing"
✅ "Create a 7-day email sequence for our product launch targeting SMB owners"
```

### 2. Provide Context

```
❌ "Write a blog post"
✅ "Write a blog post about our new authentication feature, targeting developers who care about security"
```

### 3. Review Suggestions Daily

Set aside time to review proactive suggestions. The AI learns from your feedback.

### 4. Use the Right Agent

Don't ask the Designer about code. Don't ask the Developer about marketing. Each agent is specialized.

### 5. Trust but Verify

AI suggestions are good starting points. Always review before approving actions.

---

## Troubleshooting

### Agent Not Responding

1. Check API Gateway logs: `docker logs synthstack-api-gateway`
2. Verify OpenAI/Anthropic API keys in `.env`
3. Check rate limits on AI provider

### Suggestions Not Appearing

1. Verify suggestion frequency settings
2. Check `ai_suggestions` table for entries
3. Ensure agents are enabled for user

### GitHub Integration Failed

1. Verify PAT has correct scopes
2. Check PAT hasn't expired
3. Ensure repo access permissions

---

## Managing Agents in Directus

Agents are fully customizable through the Directus admin panel. You can modify their personality, prompts, capabilities, and appearance without code changes.

### Accessing Agent Settings

1. Log in to Directus Admin: `http://localhost:8055`
2. Navigate to **AI Agents** collection in the sidebar
3. Click on an agent to edit it

### Editable Fields

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Display name shown in UI | "Marketing Specialist" |
| `slug` | URL-safe identifier (don't change existing) | "marketer" |
| `description` | Short description for agent selector | "Growth & marketing strategies" |
| `system_prompt` | The full system prompt for the LLM | See below |
| `icon` | Material Design icon name | "campaign", "code", "science" |
| `color` | Quasar color for agent avatar | "orange", "blue", "green" |
| `greeting` | Message shown when agent is selected | "Ready to grow your audience!" |
| `quick_prompts` | Array of suggested prompts (JSON) | `["Write a blog post", "Analyze SEO"]` |
| `capabilities` | Array of capability tags (JSON) | `["content", "strategy", "analytics"]` |
| `is_premium` | Restrict to premium users | true/false |
| `is_active` | Enable/disable the agent | true/false |
| `display_order` | Sort order in agent list | 1, 2, 3... |

### Customizing System Prompts

The `system_prompt` field is the most important customization. This is sent to the LLM and defines the agent's personality and expertise.

**Best Practices:**

```text
You are [Agent Name], a specialized AI assistant for [Domain].

Your expertise includes:
- [Capability 1]
- [Capability 2]
- [Capability 3]

Communication style:
- [Tone description]
- [Response format preferences]

When helping users, always:
1. [Guideline 1]
2. [Guideline 2]
3. [Guideline 3]
```

### Adding a New Agent

1. In Directus, click **+ Create Item** in the AI Agents collection
2. Fill in required fields:
   - `slug`: unique URL-safe identifier (e.g., "finance_advisor")
   - `name`: display name (e.g., "Finance Advisor")
   - `system_prompt`: detailed prompt defining behavior
   - `icon`: Material Design icon name
   - `color`: Quasar color name
3. Set `is_active: true` to enable the agent
4. Save and the agent will appear in the frontend immediately

### Agent Updates (Notifications)

Agents can send proactive messages to users that appear as notification badges.

**Creating Agent Updates in Directus:**

1. Navigate to **AI Agent Updates** collection
2. Click **+ Create Item**
3. Fill in:
   - `agent_id`: Select the sending agent
   - `user_id`: Select the target user
   - `type`: greeting, insight, reminder, suggestion, tip, alert
   - `content`: The message content
   - `priority`: low, normal, high
4. Save to send the notification

**Update Types:**

| Type | Use Case | Badge Color |
|------|----------|-------------|
| `greeting` | Welcome new users | Blue |
| `insight` | Share discovered information | Green |
| `reminder` | Remind about pending tasks | Yellow |
| `suggestion` | Quick tip or action | Blue |
| `tip` | Helpful hint | Purple |
| `alert` | Attention needed | Red |

### API Access

Agents are also accessible via API:

```bash
# List all active agents
GET /api/v1/copilot/agents

# Get agent updates
GET /api/v1/copilot/agents/:agentId/updates

# Create agent update (admin)
POST /api/v1/copilot/agents/:agentId/updates
{
  "type": "insight",
  "title": "New finding",
  "content": "I discovered something interesting...",
  "priority": "high"
}
```

### Caching Notes

Agent configurations are cached for 60 seconds in the API gateway. After editing an agent in Directus, changes will be visible within 1 minute.

---

*Your AI team is ready. Let's build something great together.*

# Portal Copilot Architecture

## Overview

The Portal Copilot is a project-scoped AI assistant for client portal users, providing intelligent Q&A capabilities with strict data isolation and tier-based rate limiting. Unlike the global copilot available to authenticated app users, the portal copilot uses RAG (Retrieval-Augmented Generation) with context limited exclusively to the user's accessible projects.

**Key Characteristics**:
- **Authenticated Access**: Requires portal user JWT authentication
- **Data Isolation**: RLS-enforced context filtering by contact_id and organization_id
- **Project-Scoped RAG**: Context built only from accessible projects, tasks, and conversations
- **Tier-Based Limits**: Rate limiting based on organization's portal_tier
- **Usage Tracking**: Comprehensive logging for analytics and billing

---

## System Architecture

### High-Level Data Flow

```
┌────────────────┐
│  Client Portal │
│   (Vue 3 App)  │
└────────┬───────┘
         │ 1. Chat request with JWT
         ▼
┌────────────────────────┐
│   API Gateway (Fastify) │
│   /portal/copilot/chat │
└────────┬───────────────┘
         │ 2. Verify JWT, extract contact_id
         ▼
┌────────────────────────┐
│  Rate Limit Check      │
│  (PostgreSQL)          │
│  - Check tier limits   │
│  - Count today's usage │
└────────┬───────────────┘
         │ 3. If allowed, build RAG context
         ▼
┌────────────────────────┐
│  Context Builder       │
│  - Query accessible    │
│    projects via RLS    │
│  - Fetch tasks, files, │
│    conversations       │
│  - Rank by relevance   │
└────────┬───────────────┘
         │ 4. Context + messages
         ▼
┌────────────────────────┐
│  LLM API (OpenAI/etc)  │
│  - System prompt with  │
│    context injection   │
│  - Generate response   │
└────────┬───────────────┘
         │ 5. Response + metadata
         ▼
┌────────────────────────┐
│  Usage Logger          │
│  - Log to              │
│    copilot_usage_log   │
│  - Track tokens, cost  │
└────────┬───────────────┘
         │ 6. Return to client
         ▼
┌────────────────────────┐
│  Client Portal UI      │
│  - Display response    │
│  - Update credits UI   │
└────────────────────────┘
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ PortalCopilot    │         │ UsageIndicator   │         │
│  │ Widget (Vue)     │◄────────┤ Component        │         │
│  │                  │         │                  │         │
│  │ - Message input  │         │ - Tier badge     │         │
│  │ - Chat history   │         │ - Usage counter  │         │
│  │ - Context display│         │ - Limit warning  │         │
│  └────────┬─────────┘         └──────────────────┘         │
│           │                                                  │
│           │ API calls via axios                             │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │       Pinia Store: portalCopilot             │          │
│  │                                              │          │
│  │  State:                                      │          │
│  │  - messages[]                                │          │
│  │  - loading                                   │          │
│  │  - usageToday                                │          │
│  │  - dailyLimit                                │          │
│  │  - tier                                      │          │
│  │                                              │          │
│  │  Actions:                                    │          │
│  │  - sendMessage()                             │          │
│  │  - loadUsageStats()                          │          │
│  │  - clearConversation()                       │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ HTTPS (JWT in Authorization header)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │       Fastify Routes & Middleware            │          │
│  │                                              │          │
│  │  Middleware:                                 │          │
│  │  1. authenticateJWT()                        │          │
│  │     - Verify token signature                 │          │
│  │     - Extract user payload                   │          │
│  │     - Attach to request.user                 │          │
│  │                                              │          │
│  │  2. requirePortalAccess()                    │          │
│  │     - Verify user.contact_id exists          │          │
│  │     - Check organization.portal_enabled      │          │
│  │                                              │          │
│  │  Routes:                                     │          │
│  │  POST /portal/copilot/chat                   │          │
│  │  GET  /portal/copilot/usage                  │          │
│  │  GET  /portal/copilot/context/:projectId     │          │
│  └────────┬─────────────────────────────────────┘          │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │       Rate Limiter Service                   │          │
│  │                                              │          │
│  │  checkRateLimit(contactId, tier):           │          │
│  │  1. Query rate_limits table for tier        │          │
│  │  2. Count usage in last 24h from             │          │
│  │     copilot_usage_log                        │          │
│  │  3. Compare: used < limit?                   │          │
│  │  4. Return: {allowed, remaining, resetAt}    │          │
│  └────────┬─────────────────────────────────────┘          │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │       Context Builder Service                │          │
│  │                                              │          │
│  │  buildContext(contactId, query, projectId?): │          │
│  │  1. Get accessible project IDs:              │          │
│  │     SELECT p.id FROM projects p              │          │
│  │     JOIN project_contacts pc                 │          │
│  │     WHERE pc.contact_id = :contactId         │          │
│  │                                              │          │
│  │  2. Fetch context sources:                   │          │
│  │     - Project descriptions                   │          │
│  │     - Client-visible tasks                   │          │
│  │     - Non-internal messages                  │          │
│  │     - Shared files metadata                  │          │
│  │                                              │          │
│  │  3. Rank by relevance:                       │          │
│  │     - Keyword matching                       │          │
│  │     - Recency weighting                      │          │
│  │     - Project scope filtering                │          │
│  │                                              │          │
│  │  4. Return top 10 context docs               │          │
│  └────────┬─────────────────────────────────────┘          │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │       LLM Integration Service                │          │
│  │                                              │          │
│  │  callLLM(messages, context, options):        │          │
│  │  1. Build system prompt with context         │          │
│  │  2. Call LLM API (OpenAI, Anthropic, etc)    │          │
│  │  3. Stream or await response                 │          │
│  │  4. Parse and return result                  │          │
│  └────────┬─────────────────────────────────────┘          │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │       Usage Logger Service                   │          │
│  │                                              │          │
│  │  logUsage(contactId, tokensUsed, success):   │          │
│  │  INSERT INTO copilot_usage_log (             │          │
│  │    contact_id, message_type, tokens_used,    │          │
│  │    credits_deducted, model_used, scope,      │          │
│  │    project_id, success, created_at           │          │
│  │  )                                           │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ SQL queries via pg client
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │  PostgreSQL Tables                           │          │
│  │                                              │          │
│  │  ┌────────────────────────────────┐         │          │
│  │  │ rate_limits                     │         │          │
│  │  │ - tier                          │         │          │
│  │  │ - requests_per_minute           │         │          │
│  │  │ - requests_per_day              │         │          │
│  │  │ - max_tokens_per_request        │         │          │
│  │  └────────────────────────────────┘         │          │
│  │                                              │          │
│  │  ┌────────────────────────────────┐         │          │
│  │  │ copilot_usage_log               │         │          │
│  │  │ - id                            │         │          │
│  │  │ - contact_id (FK)               │         │          │
│  │  │ - message_type                  │         │          │
│  │  │ - tokens_used                   │         │          │
│  │  │ - credits_deducted              │         │          │
│  │  │ - model_used                    │         │          │
│  │  │ - scope ('portal')              │         │          │
│  │  │ - project_id (FK, optional)     │         │          │
│  │  │ - success                       │         │          │
│  │  │ - created_at                    │         │          │
│  │  └────────────────────────────────┘         │          │
│  │                                              │          │
│  │  ┌────────────────────────────────┐         │          │
│  │  │ organizations                   │         │          │
│  │  │ - id                            │         │          │
│  │  │ - name                          │         │          │
│  │  │ - portal_tier                   │         │          │
│  │  │   ('community', 'subscriber',   │         │          │
│  │  │    'premium', 'lifetime')       │         │          │
│  │  └────────────────────────────────┘         │          │
│  │                                              │          │
│  │  ┌────────────────────────────────┐         │          │
│  │  │ contacts                        │         │          │
│  │  │ - id                            │         │          │
│  │  │ - organization_id (FK)          │         │          │
│  │  │ - email                         │         │          │
│  │  │ - first_name                    │         │          │
│  │  └────────────────────────────────┘         │          │
│  │                                              │          │
│  │  ┌────────────────────────────────┐         │          │
│  │  │ projects                        │         │          │
│  │  │ - id                            │         │          │
│  │  │ - name                          │         │          │
│  │  │ - description                   │         │          │
│  │  │ - is_client_visible             │         │          │
│  │  └────────────────────────────────┘         │          │
│  │                                              │          │
│  │  ┌────────────────────────────────┐         │          │
│  │  │ project_contacts                │         │          │
│  │  │ - project_id (FK)               │         │          │
│  │  │ - contact_id (FK)               │         │          │
│  │  │ - can_view_tasks                │         │          │
│  │  │ - can_view_files                │         │          │
│  │  └────────────────────────────────┘         │          │
│  │                                              │          │
│  │  ┌────────────────────────────────┐         │          │
│  │  │ todos                           │         │          │
│  │  │ - id                            │         │          │
│  │  │ - title                         │         │          │
│  │  │ - description                   │         │          │
│  │  │ - is_visible_to_client          │         │          │
│  │  │ - client_task_details           │         │          │
│  │  │ - project_id (FK)               │         │          │
│  │  └────────────────────────────────┘         │          │
│  │                                              │          │
│  │  ┌────────────────────────────────┐         │          │
│  │  │ conversations                   │         │          │
│  │  │ - id                            │         │          │
│  │  │ - title                         │         │          │
│  │  │ - collection                    │         │          │
│  │  │ - item (FK to projects)         │         │          │
│  │  └────────────────────────────────┘         │          │
│  │                                              │          │
│  │  ┌────────────────────────────────┐         │          │
│  │  │ conversation_participants       │         │          │
│  │  │ - conversation_id (FK)          │         │          │
│  │  │ - contact_id (FK)               │         │          │
│  │  │ - can_send_messages             │         │          │
│  │  └────────────────────────────────┘         │          │
│  │                                              │          │
│  │  ┌────────────────────────────────┐         │          │
│  │  │ messages                        │         │          │
│  │  │ - id                            │         │          │
│  │  │ - conversation_id (FK)          │         │          │
│  │  │ - text                          │         │          │
│  │  │ - is_internal_note              │         │          │
│  │  │ - date_created                  │         │          │
│  │  └────────────────────────────────┘         │          │
│  │                                              │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Authentication & Authorization

#### JWT Middleware (`authenticate`)

**Location**: `packages/api-gateway/src/middleware/auth.ts`

```typescript
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing authentication token' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Attach user to request
    request.user = {
      id: decoded.id,
      email: decoded.email,
      contactId: decoded.contactId,
      organizationId: decoded.organizationId,
      role: decoded.role
    }
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }
}
```

**JWT Payload Structure**:
```typescript
interface PortalJWT {
  id: string              // user_id (if app user) or contact_id
  email: string           // contact email
  contactId: string       // contacts.id (required for portal)
  organizationId: string  // organizations.id
  role: 'portal_user'     // distinguishes from app users
  iat: number            // issued at
  exp: number            // expires at (24 hours default)
}
```

#### Portal Access Check (`requirePortalAccess`)

```typescript
export async function requirePortalAccess(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user.contactId) {
    return reply.status(403).send({
      success: false,
      error: 'Portal access required'
    })
  }

  // Verify organization has portal enabled
  const org = await fastify.pg.query(
    `SELECT portal_enabled FROM organizations WHERE id = $1`,
    [request.user.organizationId]
  )

  if (!org.rows[0]?.portal_enabled) {
    return reply.status(403).send({
      success: false,
      error: 'Portal access not enabled for your organization'
    })
  }
}
```

### 2. Rate Limiting Service

**Location**: `packages/api-gateway/src/services/rateLimiter.ts`

```typescript
export interface RateLimitResult {
  allowed: boolean
  tier: string
  used: number
  limit: number
  remaining: number
  resetAt: Date
}

export async function checkPortalCopilotRateLimit(
  contactId: string
): Promise<RateLimitResult> {
  // Get organization tier
  const orgResult = await fastify.pg.query(
    `SELECT o.portal_tier
     FROM organizations o
     JOIN contacts c ON c.organization_id = o.id
     WHERE c.id = $1`,
    [contactId]
  )

  const tier = orgResult.rows[0]?.portal_tier || 'community'

  // Get tier limits
  const limitsResult = await fastify.pg.query(
    `SELECT requests_per_day, max_tokens_per_request
     FROM rate_limits
     WHERE tier = $1`,
    [tier]
  )

  if (limitsResult.rows.length === 0) {
    throw new Error(`Rate limits not configured for tier: ${tier}`)
  }

  const dailyLimit = limitsResult.rows[0].requests_per_day

  // Count usage in last 24 hours
  const usageResult = await fastify.pg.query(
    `SELECT COUNT(*) as count
     FROM copilot_usage_log
     WHERE contact_id = $1
       AND scope = 'portal'
       AND created_at > NOW() - INTERVAL '24 hours'`,
    [contactId]
  )

  const used = parseInt(usageResult.rows[0].count)
  const remaining = Math.max(0, dailyLimit - used)
  const allowed = used < dailyLimit

  // Calculate reset time (midnight UTC)
  const now = new Date()
  const resetAt = new Date(now)
  resetAt.setUTCHours(24, 0, 0, 0)

  return {
    allowed,
    tier,
    used,
    limit: dailyLimit,
    remaining,
    resetAt
  }
}
```

**Tier Configuration** (from `rate_limits` table):

| Tier | Requests/Min | Requests/Day | Max Tokens/Request |
|------|--------------|--------------|---------------------|
| community | 5 | 100 | 2048 |
| subscriber | 10 | 500 | 4096 |
| premium | 20 | 2000 | 8192 |
| lifetime | 20 | 10000 | 8192 |
| byok | unlimited | unlimited | 16384 |
| admin | unlimited | unlimited | 16384 |

### 3. Context Builder Service

**Location**: `packages/api-gateway/src/services/contextBuilder.ts`

```typescript
export interface ContextDocument {
  source: string      // e.g., "Project: Website Redesign"
  content: string     // actual text content
  type: 'project' | 'task' | 'conversation' | 'file'
  score: number       // relevance score (0-1)
  metadata?: any      // additional context
}

export async function buildPortalContext(
  contactId: string,
  query: string,
  projectId?: string
): Promise<ContextDocument[]> {
  const contextDocs: ContextDocument[] = []

  // Step 1: Get accessible project IDs
  const accessibleProjects = await getAccessibleProjects(contactId, projectId)

  if (accessibleProjects.length === 0) {
    return [] // No accessible projects = no context
  }

  // Step 2: Fetch project descriptions
  const projectDocs = await fetchProjectContext(accessibleProjects)
  contextDocs.push(...projectDocs)

  // Step 3: Fetch client-visible tasks
  const taskDocs = await fetchTaskContext(accessibleProjects, contactId)
  contextDocs.push(...taskDocs)

  // Step 4: Fetch non-internal conversations
  const conversationDocs = await fetchConversationContext(accessibleProjects, contactId)
  contextDocs.push(...conversationDocs)

  // Step 5: Fetch file metadata
  const fileDocs = await fetchFileContext(accessibleProjects, contactId)
  contextDocs.push(...fileDocs)

  // Step 6: Rank by relevance to query
  const rankedDocs = rankDocumentsByRelevance(contextDocs, query)

  // Step 7: Return top 10
  return rankedDocs.slice(0, 10)
}

async function getAccessibleProjects(
  contactId: string,
  projectId?: string
): Promise<string[]> {
  const query = projectId
    ? `SELECT p.id
       FROM projects p
       JOIN project_contacts pc ON pc.project_id = p.id
       WHERE pc.contact_id = $1
         AND p.id = $2
         AND p.is_client_visible = true`
    : `SELECT p.id
       FROM projects p
       JOIN project_contacts pc ON pc.project_id = p.id
       WHERE pc.contact_id = $1
         AND p.is_client_visible = true`

  const params = projectId ? [contactId, projectId] : [contactId]
  const result = await fastify.pg.query(query, params)

  return result.rows.map(row => row.id)
}

async function fetchProjectContext(
  projectIds: string[]
): Promise<ContextDocument[]> {
  const result = await fastify.pg.query(
    `SELECT id, name, description
     FROM projects
     WHERE id = ANY($1::uuid[])`,
    [projectIds]
  )

  return result.rows.map(p => ({
    source: `Project: ${p.name}`,
    content: `${p.name}\n\n${p.description || ''}`,
    type: 'project' as const,
    score: 0.9, // Projects get high base score
    metadata: { projectId: p.id, projectName: p.name }
  }))
}

async function fetchTaskContext(
  projectIds: string[],
  contactId: string
): Promise<ContextDocument[]> {
  // Only fetch tasks where contact has can_view_tasks permission
  const result = await fastify.pg.query(
    `SELECT t.id, t.title, t.description, t.client_task_details, t.status,
            p.name as project_name
     FROM todos t
     JOIN projects p ON p.id = t.project_id
     JOIN project_contacts pc ON pc.project_id = t.project_id
     WHERE t.project_id = ANY($1::uuid[])
       AND pc.contact_id = $2
       AND pc.can_view_tasks = true
       AND t.is_visible_to_client = true
     ORDER BY t.date_created DESC
     LIMIT 50`,
    [projectIds, contactId]
  )

  return result.rows.map(t => ({
    source: `Task: ${t.title} (${t.project_name})`,
    content: `
Task: ${t.title}
Status: ${t.status}
Description: ${t.description || ''}
${t.client_task_details ? `Client Details: ${t.client_task_details}` : ''}
    `.trim(),
    type: 'task' as const,
    score: 0.8,
    metadata: { taskId: t.id, projectName: t.project_name, status: t.status }
  }))
}

async function fetchConversationContext(
  projectIds: string[],
  contactId: string
): Promise<ContextDocument[]> {
  // Fetch recent messages from conversations where user is participant
  // Exclude internal notes
  const result = await fastify.pg.query(
    `SELECT c.title as conversation_title, m.text, m.date_created
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id
     JOIN messages m ON m.conversation_id = c.id
     WHERE c.collection = 'projects'
       AND c.item = ANY($1::uuid[])
       AND cp.contact_id = $2
       AND m.is_internal_note = false
     ORDER BY m.date_created DESC
     LIMIT 30`,
    [projectIds, contactId]
  )

  return result.rows.map(m => ({
    source: `Conversation: ${m.conversation_title}`,
    content: m.text,
    type: 'conversation' as const,
    score: 0.7,
    metadata: { conversationTitle: m.conversation_title, date: m.date_created }
  }))
}

async function fetchFileContext(
  projectIds: string[],
  contactId: string
): Promise<ContextDocument[]> {
  // Fetch metadata only (not file contents)
  // Only files where contact has can_view_files permission
  const result = await fastify.pg.query(
    `SELECT f.filename_download, f.type, f.filesize, f.uploaded_on,
            pf.description, p.name as project_name
     FROM directus_files f
     JOIN project_files pf ON pf.file_id = f.id
     JOIN projects p ON p.id = pf.project_id
     JOIN project_contacts pc ON pc.project_id = pf.project_id
     WHERE pf.project_id = ANY($1::uuid[])
       AND pc.contact_id = $2
       AND pc.can_view_files = true
       AND pf.is_client_visible = true
     ORDER BY f.uploaded_on DESC
     LIMIT 20`,
    [projectIds, contactId]
  )

  return result.rows.map(f => ({
    source: `File: ${f.filename_download} (${f.project_name})`,
    content: `
File: ${f.filename_download}
Type: ${f.type}
Project: ${f.project_name}
${f.description ? `Description: ${f.description}` : ''}
Uploaded: ${new Date(f.uploaded_on).toLocaleDateString()}
    `.trim(),
    type: 'file' as const,
    score: 0.6,
    metadata: { filename: f.filename_download, type: f.type, projectName: f.project_name }
  }))
}

function rankDocumentsByRelevance(
  docs: ContextDocument[],
  query: string
): ContextDocument[] {
  const queryLower = query.toLowerCase()
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2)

  // Simple keyword-based relevance scoring
  // In production, use embeddings + vector similarity
  return docs
    .map(doc => {
      const contentLower = doc.content.toLowerCase()
      let matchScore = doc.score // Start with base score

      // Boost for exact query match
      if (contentLower.includes(queryLower)) {
        matchScore += 0.3
      }

      // Boost for individual term matches
      queryTerms.forEach(term => {
        if (contentLower.includes(term)) {
          matchScore += 0.1
        }
      })

      return { ...doc, score: Math.min(1, matchScore) }
    })
    .sort((a, b) => b.score - a.score)
}
```

**Context Limits**:
- Maximum 10 documents per request
- Total context size capped at 4000 tokens (~3000 words)
- Fallback to most recent if no keyword matches

### 4. LLM Integration Service

**Location**: `packages/api-gateway/src/services/llmClient.ts`

```typescript
export interface LLMOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

export interface LLMResponse {
  content: string
  model: string
  tokensUsed: number
  finishReason: 'stop' | 'length' | 'error'
}

export async function callLLMWithContext(
  messages: Array<{ role: string; content: string }>,
  contextDocs: ContextDocument[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  // Build system prompt with context injection
  const contextText = contextDocs.length > 0
    ? `\n\nRELEVANT INFORMATION:\n${contextDocs.map(doc =>
        `[${doc.source}]\n${doc.content}`
      ).join('\n\n---\n\n')}`
    : ''

  const systemMessage = {
    role: 'system',
    content: `You are a helpful AI assistant for client portal users. You help clients understand their projects, find information, and answer questions.

IMPORTANT GUIDELINES:
1. Only answer based on the provided context - do not make up information
2. If you don't know something, say so clearly
3. Be concise and professional
4. Refer to specific projects, tasks, or conversations when relevant
5. If the user asks about something not in the context, explain that you only have access to their portal data
${contextText}`
  }

  const fullMessages = [systemMessage, ...messages]

  // Call LLM API (example using OpenAI)
  const response = await fetch(process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4',
      messages: fullMessages,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.7,
      stream: false
    })
  })

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    content: data.choices[0].message.content,
    model: data.model,
    tokensUsed: data.usage.total_tokens,
    finishReason: data.choices[0].finish_reason
  }
}
```

**System Prompt Design**:
- Role: Helpful assistant for portal users
- Context: Injected relevant documents
- Constraints: Only use provided context
- Tone: Professional, concise, helpful

**Model Selection** (configurable per tier):
- Community: GPT-3.5-turbo (fast, economical)
- Subscriber: GPT-4-turbo (balanced)
- Premium: GPT-4 (highest quality)
- BYOK: Customer's own API key/model

### 5. Usage Logger Service

**Location**: `packages/api-gateway/src/services/usageLogger.ts`

```typescript
export interface UsageLogEntry {
  contactId: string
  messageType: 'chat' | 'search' | 'generation'
  tokensUsed: number
  creditsDeducted: number
  modelUsed: string
  scope: 'portal'
  projectId?: string
  success: boolean
  errorMessage?: string
}

export async function logPortalCopilotUsage(
  entry: UsageLogEntry
): Promise<void> {
  await fastify.pg.query(
    `INSERT INTO copilot_usage_log (
      contact_id, message_type, tokens_used, credits_deducted,
      model_used, scope, project_id, success, error_message, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [
      entry.contactId,
      entry.messageType,
      entry.tokensUsed,
      entry.creditsDeducted,
      entry.modelUsed,
      entry.scope,
      entry.projectId || null,
      entry.success,
      entry.errorMessage || null
    ]
  )
}

export async function getUsageStats(
  contactId: string
): Promise<{
  requestsToday: number
  tokensToday: number
  errorCount: number
  tier: string
  limits: {
    dailyRequests: number
    maxTokensPerRequest: number
    remaining: number
  }
}> {
  // Get tier and limits
  const tierResult = await fastify.pg.query(
    `SELECT o.portal_tier
     FROM organizations o
     JOIN contacts c ON c.organization_id = o.id
     WHERE c.id = $1`,
    [contactId]
  )

  const tier = tierResult.rows[0]?.portal_tier || 'community'

  const limitsResult = await fastify.pg.query(
    `SELECT requests_per_day, max_tokens_per_request
     FROM rate_limits
     WHERE tier = $1`,
    [tier]
  )

  const dailyLimit = limitsResult.rows[0].requests_per_day
  const maxTokens = limitsResult.rows[0].max_tokens_per_request

  // Get today's usage
  const usageResult = await fastify.pg.query(
    `SELECT
       COUNT(*) as requests_today,
       COALESCE(SUM(tokens_used), 0) as tokens_today,
       COUNT(*) FILTER (WHERE success = false) as error_count
     FROM copilot_usage_log
     WHERE contact_id = $1
       AND scope = 'portal'
       AND created_at > NOW() - INTERVAL '24 hours'`,
    [contactId]
  )

  const { requests_today, tokens_today, error_count } = usageResult.rows[0]

  return {
    requestsToday: parseInt(requests_today),
    tokensToday: parseInt(tokens_today),
    errorCount: parseInt(error_count),
    tier,
    limits: {
      dailyRequests: dailyLimit,
      maxTokensPerRequest: maxTokens,
      remaining: Math.max(0, dailyLimit - parseInt(requests_today))
    }
  }
}
```

---

## API Endpoints

### POST /portal/copilot/chat

Process a chat message with project-scoped RAG context.

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "messages": [
    { "role": "user", "content": "What is the status of my Website Redesign project?" }
  ],
  "chatId": "optional-chat-id-for-conversation-history",
  "projectId": "optional-project-uuid-to-scope-context",
  "options": {
    "temperature": 0.7,
    "maxTokens": 2048
  }
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Your Website Redesign project is currently in progress...",
    "model": "gpt-4",
    "tokensUsed": 342
  },
  "context": [
    {
      "source": "Project: Website Redesign",
      "relevance": 0.95,
      "type": "project"
    },
    {
      "source": "Task: Homepage mockup review",
      "relevance": 0.87,
      "type": "task"
    }
  ],
  "rateLimit": {
    "tier": "subscriber",
    "used": 12,
    "dailyLimit": 500,
    "remaining": 488,
    "resetAt": "2026-01-07T00:00:00Z"
  }
}
```

**Error Responses**:

401 Unauthorized:
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

403 Forbidden:
```json
{
  "success": false,
  "error": "Portal access required"
}
```

429 Too Many Requests:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "rateLimit": {
    "tier": "community",
    "used": 100,
    "dailyLimit": 100,
    "remaining": 0,
    "resetAt": "2026-01-07T00:00:00Z"
  },
  "message": "You've reached your daily limit of 100 messages. Upgrade to Premium for more."
}
```

### GET /portal/copilot/usage

Get current usage statistics and rate limits.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "tier": "subscriber",
    "usage": {
      "requestsToday": 45,
      "tokensToday": 12450,
      "errorCount": 2
    },
    "limits": {
      "dailyRequests": 500,
      "maxTokensPerRequest": 4096,
      "remaining": 455
    },
    "resetAt": "2026-01-07T00:00:00Z"
  }
}
```

### GET /portal/copilot/context/:projectId

Preview available context for a specific project (for debugging/transparency).

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "projectId": "abc-123",
    "projectName": "Website Redesign",
    "contextSources": {
      "projects": 1,
      "tasks": 12,
      "conversations": 8,
      "files": 15
    },
    "sampleContext": [
      {
        "type": "project",
        "preview": "Website Redesign\n\nComplete redesign of company website..."
      },
      {
        "type": "task",
        "preview": "Homepage mockup review\nStatus: In Progress..."
      }
    ]
  }
}
```

---

## Security & Data Isolation

### Row-Level Security (RLS)

All context queries enforce RLS through JOIN conditions:

**Projects**:
```sql
SELECT p.*
FROM projects p
JOIN project_contacts pc ON pc.project_id = p.id
WHERE pc.contact_id = $contact_id
  AND p.is_client_visible = true
```

**Tasks**:
```sql
SELECT t.*
FROM todos t
JOIN project_contacts pc ON pc.project_id = t.project_id
WHERE pc.contact_id = $contact_id
  AND pc.can_view_tasks = true
  AND t.is_visible_to_client = true
```

**Conversations**:
```sql
SELECT c.*, m.*
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
JOIN messages m ON m.conversation_id = c.id
WHERE cp.contact_id = $contact_id
  AND m.is_internal_note = false
```

**Files**:
```sql
SELECT f.*
FROM directus_files f
JOIN project_files pf ON pf.file_id = f.id
JOIN project_contacts pc ON pc.project_id = pf.project_id
WHERE pc.contact_id = $contact_id
  AND pc.can_view_files = true
  AND pf.is_client_visible = true
```

### Data Isolation Checks

1. **JWT Verification**: Every request verifies token signature and expiration
2. **Contact ID Extraction**: Extract contact_id from JWT payload
3. **Organization Verification**: Confirm organization has portal enabled
4. **Project Access**: Only fetch data from projects linked via project_contacts
5. **Visibility Flags**: Respect is_client_visible, is_internal_note flags
6. **Permission Flags**: Check can_view_tasks, can_view_files, can_send_messages

### Attack Prevention

**SQL Injection**: All queries use parameterized statements
**JWT Tampering**: Verify signature with secret key
**Cross-Organization Leakage**: Always filter by organization_id in queries
**Privilege Escalation**: Never expose admin/internal data to portal users
**Rate Limit Bypass**: Server-side enforcement, no client trust

---

## Performance Optimization

### Query Optimization

**Indexes Required**:
```sql
-- Context builder queries
CREATE INDEX idx_project_contacts_contact ON project_contacts(contact_id);
CREATE INDEX idx_todos_project_visible ON todos(project_id, is_visible_to_client);
CREATE INDEX idx_conversation_participants_contact ON conversation_participants(contact_id);
CREATE INDEX idx_messages_conversation_internal ON messages(conversation_id, is_internal_note);

-- Rate limiting queries
CREATE INDEX idx_copilot_usage_contact_created ON copilot_usage_log(contact_id, created_at DESC);
CREATE INDEX idx_copilot_usage_scope_created ON copilot_usage_log(scope, created_at DESC);
```

**Query Limits**:
- Projects: All accessible (typically 1-10)
- Tasks: 50 most recent client-visible
- Conversations: 30 most recent messages
- Files: 20 most recent
- Total context docs: 10 after ranking

### Caching Strategy

**Tier Limits** (Redis cache):
```typescript
// Cache tier limits for 1 hour
const cacheKey = `rate_limits:${tier}`
let limits = await redis.get(cacheKey)

if (!limits) {
  limits = await fetchRateLimits(tier)
  await redis.setex(cacheKey, 3600, JSON.stringify(limits))
}
```

**Project Access** (Session cache):
```typescript
// Cache accessible project IDs for 15 minutes per user
const cacheKey = `projects:${contactId}`
let projectIds = await redis.get(cacheKey)

if (!projectIds) {
  projectIds = await getAccessibleProjects(contactId)
  await redis.setex(cacheKey, 900, JSON.stringify(projectIds))
}
```

### Streaming Responses

For long-form responses, use streaming:

```typescript
// Enable SSE (Server-Sent Events)
reply.raw.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
})

// Stream LLM tokens as they arrive
for await (const chunk of llmStream) {
  reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`)
}

reply.raw.end()
```

---

## Error Handling

### Error Types

1. **Authentication Errors** (401)
   - Invalid JWT signature
   - Expired token
   - Missing authorization header

2. **Authorization Errors** (403)
   - User is not a portal contact
   - Organization doesn't have portal enabled
   - Accessing project without permission

3. **Rate Limit Errors** (429)
   - Exceeded daily request limit
   - Exceeded per-minute limit

4. **Validation Errors** (400)
   - Missing required fields (messages)
   - Invalid message format
   - Invalid project ID format

5. **Server Errors** (500)
   - LLM API failures
   - Database connection errors
   - Context building failures

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific error details"
  }
}
```

### Error Logging

All errors logged to `copilot_usage_log` with `success = false`:

```sql
INSERT INTO copilot_usage_log (
  contact_id, message_type, success, error_message, created_at
) VALUES (
  $contact_id, 'chat', false, 'LLM API timeout', NOW()
)
```

---

## Monitoring & Analytics

### Key Metrics

**Usage Metrics**:
- Total requests per day/week/month
- Requests by tier
- Average tokens per request
- Error rate by type

**Performance Metrics**:
- P50/P95/P99 response times
- Context building time
- LLM API latency
- Database query time

**Business Metrics**:
- Active portal users
- Conversion rate (community → paid tiers)
- Most common queries
- Average session length

### Analytics Queries

**Requests by tier**:
```sql
SELECT
  o.portal_tier,
  COUNT(*) as request_count,
  AVG(cul.tokens_used) as avg_tokens
FROM copilot_usage_log cul
JOIN contacts c ON c.id = cul.contact_id
JOIN organizations o ON o.id = c.organization_id
WHERE cul.scope = 'portal'
  AND cul.created_at > NOW() - INTERVAL '30 days'
GROUP BY o.portal_tier
ORDER BY request_count DESC;
```

**Top users**:
```sql
SELECT
  c.email,
  c.first_name,
  c.last_name,
  COUNT(*) as messages_sent,
  SUM(cul.tokens_used) as total_tokens
FROM copilot_usage_log cul
JOIN contacts c ON c.id = cul.contact_id
WHERE cul.scope = 'portal'
  AND cul.created_at > NOW() - INTERVAL '7 days'
GROUP BY c.id, c.email, c.first_name, c.last_name
ORDER BY messages_sent DESC
LIMIT 20;
```

**Error rate by type**:
```sql
SELECT
  cul.error_message,
  COUNT(*) as error_count
FROM copilot_usage_log cul
WHERE cul.scope = 'portal'
  AND cul.success = false
  AND cul.created_at > NOW() - INTERVAL '7 days'
GROUP BY cul.error_message
ORDER BY error_count DESC;
```

---

## Testing Strategy

### Unit Tests

- **Rate Limiter**: Test tier limits, usage counting, reset logic
- **Context Builder**: Test project access filtering, RLS enforcement
- **LLM Client**: Test prompt construction, error handling

### Integration Tests

- **Authentication**: JWT verification, contact ID extraction
- **API Endpoints**: Request/response validation, error codes
- **Database Queries**: RLS filtering, data isolation

### E2E Tests

- **User Flows**: Login → ask question → receive answer
- **Security**: Cross-organization data leakage tests
- **Performance**: Load testing with concurrent users

---

## Deployment

### Environment Variables

```bash
# LLM API
OPENAI_API_KEY=sk-...
LLM_API_URL=https://api.openai.com/v1/chat/completions

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/synthstack

# Redis (caching)
REDIS_URL=redis://localhost:6379

# Feature flags
ENABLE_PORTAL_COPILOT=true
DEFAULT_PORTAL_TIER=community
```

### Scaling Considerations

**Horizontal Scaling**:
- Stateless API servers behind load balancer
- Redis for shared session/cache storage
- Read replicas for analytics queries

**Rate Limiting**:
- Use Redis atomic counters for distributed rate limiting
- Sliding window algorithm for per-minute limits

**Cost Management**:
- Cache LLM responses for identical queries (10min TTL)
- Use cheaper models for simple queries (GPT-3.5)
- Implement token budgets per tier

---

## Future Enhancements

### Planned Features

1. **Vector Embeddings**: Replace keyword matching with semantic search
2. **Conversation Memory**: Multi-turn context awareness
3. **Proactive Insights**: "You have 3 overdue tasks" notifications
4. **Voice Input**: Speech-to-text for mobile users
5. **Multi-Language**: Support for Spanish, French, German
6. **Custom Training**: Fine-tune model on org-specific data (BYOK tier)

### Roadmap

**Q1 2026**:
- ✅ Basic RAG implementation
- ✅ Tier-based rate limiting
- ⏳ Streaming responses
- ⏳ Conversation history

**Q2 2026**:
- Vector embeddings (Pinecone/Weaviate)
- Advanced analytics dashboard
- Mobile app integration

**Q3 2026**:
- Multi-language support
- Voice input/output
- Proactive notifications

**Q4 2026**:
- Custom model fine-tuning (BYOK)
- Advanced RAG (graph-based context)
- Predictive insights

---

## References

- **API Gateway README**: `packages/api-gateway/README.md`
- **Demo Credit System**: `docs/DEMO_CREDIT_SYSTEM.md`
- **Client Portal Guide**: `docs/CLIENT_PORTAL_GUIDE.md`
- **Migration 082**: `services/directus/migrations/082_demo_copilot_credits.sql`

---

**Version**: 1.0
**Last Updated**: January 2026
**Maintainer**: Engineering Team

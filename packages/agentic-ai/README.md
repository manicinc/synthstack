# @synthstack/agentic-ai

Production-grade LangGraph-based agentic AI system with multi-agent orchestration, persistent memory, and workflow integration.

## Features

- **Multi-Agent Orchestration** - Supervisor pattern with 6 specialized agents
- **Persistent Conversations** - Thread-based history with PostgreSQL checkpoints
- **Long-Term Memory** - Automatic extraction with vector embeddings
- **Human-in-the-Loop** - Approval gates for risky operations
- **RAG Integration** - Context-aware responses with source attribution
- **Workflow Execution** - Node-RED integration with credit estimation
- **StateGraph Definitions** - Official LangGraph.js integration

## Installation

```bash
npm install @synthstack/agentic-ai
# or
pnpm add @synthstack/agentic-ai
# or
yarn add @synthstack/agentic-ai
```

### Peer Dependencies

```bash
npm install @anthropic-ai/sdk openai
```

## Quick Start

```typescript
import { createAgenticAIService } from '@synthstack/agentic-ai';

// Define dependencies (dependency injection)
const dependencies = {
  db: postgresAdapter,
  getUserById: async (userId) => { /* ... */ },
  checkPermission: async (userId, action) => { /* ... */ },
  chargeCredits: async (userId, amount, reason) => { /* ... */ },
  ragSearch: async (query, options) => { /* ... */ },
  executeWorkflow: async (flowId, input) => { /* ... */ },
  logAuditEvent: async (event) => { /* ... */ },
  llmClient: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  logger: customLogger,
};

// Create service instance
const agenticAI = await createAgenticAIService(dependencies);

// Start a conversation
const thread = await agenticAI.createThread({
  userId: 'user-123',
  agentSlug: 'general',
  scope: 'global',
});

// Send a message
const response = await agenticAI.sendMessage({
  threadId: thread.id,
  message: 'Help me understand machine learning',
  userId: 'user-123',
});

console.log(response.answer);
```

## Architecture

### Agents

- **General Assistant** (`general`) - Q&A, coordination
- **Research Agent** (`researcher`) - Market research, competitive analysis
- **Marketing Agent** (`marketer`) - Campaigns, content strategy
- **Developer Agent** (`developer`) - Code review, technical guidance
- **SEO Writer** (`seo_writer`) - SEO content, keyword research
- **Designer** (`designer`) - UI/UX, visual design

### Orchestration Pattern

```
User Request → Orchestrator analyzes expertise needed
              ↓
         Creates delegation plan
              ↓
         Delegates to specialized agents in parallel
              ↓
         Synthesizes responses
              ↓
         Returns unified answer with attribution
```

### StateGraph Definitions

**Copilot Graph:**
```
retrieve_context → generate_response → extract_memories
```

**Workflow Graph:**
```
validate_workflow → request_approval → execute_workflow → log_result
```
- Interrupt before: `execute_workflow` (approval required)

**Orchestrator Graph:**
```
plan → delegate → aggregate → respond
```

## Dependency Injection

The package uses dependency injection to decouple from specific implementations:

```typescript
export interface AgenticAIDependencies {
  // Database
  db: DatabaseAdapter;

  // User & Auth
  getUserById: (userId: string) => Promise<User>;
  checkPermission: (userId: string, action: string) => Promise<boolean>;

  // Credits & Billing
  chargeCredits: (userId: string, amount: number, reason: string) => Promise<void>;
  getCreditsBalance: (userId: string) => Promise<number>;

  // RAG
  ragSearch: (query: string, options: RAGOptions) => Promise<RAGResult[]>;

  // Workflow
  executeWorkflow: (flowId: string, input: any) => Promise<WorkflowResult>;
  validateWorkflow: (flowId: string) => Promise<boolean>;

  // Audit
  logAuditEvent: (event: AuditEvent) => Promise<void>;

  // LLM
  llmClient: LLMClient;

  // Optional
  logger?: Logger;
}
```

## Core APIs

### Thread Management

```typescript
// Create a new thread
const thread = await service.createThread({
  userId: 'user-123',
  agentSlug: 'general',
  scope: 'global',
});

// List threads
const threads = await service.listThreads({ userId: 'user-123' });

// Get thread history
const history = await service.getThreadHistory({ threadId: 'thread-456' });

// Delete thread
await service.deleteThread({ threadId: 'thread-456' });
```

### Messaging

```typescript
// Send message
const response = await service.sendMessage({
  threadId: 'thread-456',
  message: 'Explain quantum computing',
  userId: 'user-123',
});

// Streaming response
for await (const chunk of service.streamMessage({
  threadId: 'thread-456',
  message: 'Write a blog post',
  userId: 'user-123',
})) {
  process.stdout.write(chunk.content);
}
```

### Memory Management

```typescript
// List memories
const memories = await service.listMemories({
  threadId: 'thread-456',
  types: ['insight', 'decision', 'fact'],
});

// Search memories
const results = await service.searchMemories({
  query: 'previous decisions about architecture',
  userId: 'user-123',
  limit: 10,
});
```

### Approvals (Human-in-the-Loop)

```typescript
// List pending approvals
const approvals = await service.listPendingApprovals({ userId: 'user-123' });

// Review approval
await service.reviewApproval({
  approvalId: 'approval-789',
  approved: true,
  reviewedBy: 'user-123',
  notes: 'Looks good',
});
```

## Configuration

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...
POSTGRES_URL=postgresql://...

# Optional
ANTHROPIC_API_KEY=sk-ant-...
LOG_LEVEL=info
```

### Database Setup

The package requires PostgreSQL with the LangGraph checkpoint tables:

```sql
-- Run migrations from @langchain/langgraph-checkpoint-postgres
-- Tables: langgraph_checkpoints, langgraph_threads, etc.
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# UI
pnpm test:ui
```

## Documentation

- [API Reference](./docs/API.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Migration Guide](./docs/MIGRATION.md)

## License

See LICENSE in the root directory.

## Support

- **GitHub Issues**: https://github.com/synthstack/synthstack/issues
- **Discord**: https://discord.gg/synthstack
- **Email**: support@synthstack.app

# Adapters

This directory contains example adapter implementations showing how to implement the `AgenticAIDependencies` interface for different backends.

## Available Adapters

- **`fastify-adapter.ts`** - Adapter for Fastify-based applications (like api-gateway)
- **`express-adapter.ts`** - Adapter for Express-based applications (example)

## Usage

```typescript
import { createAgenticAIService } from '@synthstack/agentic-ai';
import { createFastifyAdapter } from '@synthstack/agentic-ai/adapters/fastify-adapter';

// In your Fastify application
const dependencies = createFastifyAdapter(fastify, {
  // Optional overrides
});

const agenticAI = await createAgenticAIService(dependencies);
```

## Creating Custom Adapters

To create a custom adapter, implement the `AgenticAIDependencies` interface:

```typescript
import type { AgenticAIDependencies } from '@synthstack/agentic-ai';

export function createCustomAdapter(/* your dependencies */): AgenticAIDependencies {
  return {
    db: /* DatabaseAdapter */,
    getUserById: async (userId) => { /* ... */ },
    checkPermission: async (userId, action) => { /* ... */ },
    chargeCredits: async (userId, amount, reason) => { /* ... */ },
    getCreditsBalance: async (userId) => { /* ... */ },
    ragSearch: async (query, options) => { /* ... */ },
    executeWorkflow: async (flowId, input) => { /* ... */ },
    validateWorkflow: async (flowId) => { /* ... */ },
    logAuditEvent: async (event) => { /* ... */ },
    llmClient: /* OpenAI or Anthropic client */,
    logger: /* optional custom logger */,
  };
}
```

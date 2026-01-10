# Migration Guide: Integrating @synthstack/agentic-ai

This guide shows how to migrate from the embedded LangGraph implementation in `packages/api-gateway/src/services/langgraph/` to the standalone `@synthstack/agentic-ai` package.

## Overview

The migration follows a **dependency injection pattern** where the agentic-ai package receives all external dependencies through a standardized interface. This allows the package to remain decoupled from specific implementations.

## Migration Steps

### 1. Install the Package

```bash
cd packages/api-gateway
pnpm add @synthstack/agentic-ai
```

### 2. Create Dependencies Adapter

Create a file to map your existing services to the `AgenticAIDependencies` interface:

```typescript
// packages/api-gateway/src/adapters/agentic-ai-adapter.ts

import { createFastifyAdapter } from '@synthstack/agentic-ai/adapters/fastify-adapter';
import type { FastifyInstance } from 'fastify';
import type { AgenticAIDependencies } from '@synthstack/agentic-ai';

export function createAgenticAIDependencies(
  fastify: FastifyInstance
): AgenticAIDependencies {
  // Get existing services from Fastify decorators
  const {
    agentService,
    agentContextService,
    creditsService,
    nodeRedService,
    auditService,
    openaiClient,
  } = fastify;

  // Use the Fastify adapter
  return createFastifyAdapter(fastify, {
    agentService: {
      getUserById: (userId: string) => agentService.getUserById(userId),
      checkPermission: (userId: string, action: string) =>
        agentService.checkPermission(userId, action),
    },

    contextService: {
      searchContext: (query: string, options: any) =>
        agentContextService.searchContext(query, options),
    },

    creditsService: {
      chargeCredits: (userId: string, amount: number, reason: string) =>
        creditsService.chargeCredits(userId, amount, reason),
      getBalance: (userId: string) =>
        creditsService.getBalance(userId),
    },

    workflowService: {
      executeWorkflow: (flowId: string, input: any) =>
        nodeRedService.executeFlow(flowId, input),
      validateWorkflow: (flowId: string) =>
        nodeRedService.validateFlow(flowId),
    },

    auditService: {
      logEvent: (event: any) => auditService.logEvent(event),
    },

    llmClient: openaiClient,
  });
}
```

### 3. Initialize the Service

Replace the existing LangGraph service initialization:

**Before:**
```typescript
// packages/api-gateway/src/services/langgraph/index.ts
import { LangGraphService } from './services/langgraph/index.js';

const langGraphService = new LangGraphService(fastify);
await langGraphService.initialize();
```

**After:**
```typescript
// packages/api-gateway/src/plugins/agentic-ai.ts
import { createAgenticAIService } from '@synthstack/agentic-ai';
import { createAgenticAIDependencies } from '../adapters/agentic-ai-adapter.js';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const agenticAIPlugin: FastifyPluginAsync = async (fastify) => {
  // Create dependencies from existing services
  const dependencies = createAgenticAIDependencies(fastify);

  // Initialize the agentic AI service
  const agenticAI = await createAgenticAIService(dependencies);

  // Decorate Fastify with the service
  fastify.decorate('agenticAI', agenticAI);
};

export default fp(agenticAIPlugin);
```

### 4. Update Route Handlers

Update your route handlers to use the new service interface:

**Before:**
```typescript
// packages/api-gateway/src/routes/copilot.ts
fastify.post('/threads', async (request, reply) => {
  const { agentSlug, projectId } = request.body;
  const userId = request.user.id;

  const thread = await fastify.langGraphService.createThread({
    userId,
    agentSlug,
    projectId,
  });

  return thread;
});
```

**After:**
```typescript
// packages/api-gateway/src/routes/copilot.ts
fastify.post('/threads', async (request, reply) => {
  const { agentSlug, projectId } = request.body;
  const userId = request.user.id;

  const thread = await fastify.agenticAI.createThread({
    userId,
    agentSlug,
    projectId,
  });

  return thread;
});
```

### 5. Update Type Imports

Replace type imports from the old location:

**Before:**
```typescript
import type { Thread, Message, Memory } from '../services/langgraph/types.js';
```

**After:**
```typescript
import type { Thread, Message, Memory } from '@synthstack/agentic-ai';
```

## Feature Flags for LITE vs PRO Versions

To conditionally enable/disable the agentic AI system:

### Backend Configuration

```typescript
// packages/api-gateway/src/plugins/conditional-features.ts
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const conditionalFeaturesPlugin: FastifyPluginAsync = async (fastify) => {
  // Check environment variable
  const ENABLE_COPILOT = process.env.ENABLE_COPILOT === 'true';
  const ENABLE_REFERRALS = process.env.ENABLE_REFERRALS === 'true';

  fastify.decorate('features', {
    copilot: ENABLE_COPILOT,
    referrals: ENABLE_REFERRALS,
  });

  // Conditionally load copilot
  if (ENABLE_COPILOT) {
    const agenticAIPlugin = await import('./agentic-ai.js');
    await fastify.register(agenticAIPlugin.default);
    fastify.log.info('✅ Agentic AI (Copilot) enabled');
  } else {
    fastify.log.info('⚠️  Agentic AI (Copilot) disabled');
  }

  // Conditionally load referrals
  if (ENABLE_REFERRALS) {
    const referralsPlugin = await import('./referrals.js');
    await fastify.register(referralsPlugin.default);
    fastify.log.info('✅ Referrals & Credits enabled');
  } else {
    fastify.log.info('⚠️  Referrals & Credits disabled');
  }
};

export default fp(conditionalFeaturesPlugin);
```

### Conditional Routes

```typescript
// packages/api-gateway/src/routes/index.ts
import type { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (fastify) => {
  // Always available routes
  await fastify.register(import('./auth.js'), { prefix: '/auth' });
  await fastify.register(import('./projects.js'), { prefix: '/projects' });

  // Conditional routes
  if (fastify.features.copilot) {
    await fastify.register(import('./copilot.js'), { prefix: '/copilot' });
  }

  if (fastify.features.referrals) {
    await fastify.register(import('./referrals.js'), { prefix: '/referrals' });
  }
};

export default routes;
```

### Environment Configuration

**LITE Version (.env.lite):**
```bash
ENABLE_COPILOT=false
ENABLE_REFERRALS=false
```

**PRO Version (.env.pro):**
```bash
ENABLE_COPILOT=true
ENABLE_REFERRALS=true
```

### Build Scripts

```json
{
  "scripts": {
    "dev:lite": "cp .env.lite .env && pnpm dev",
    "dev:pro": "cp .env.pro .env && pnpm dev",
    "build:lite": "cp .env.lite .env && pnpm build",
    "build:pro": "cp .env.pro .env && pnpm build"
  }
}
```

## Frontend Integration

### Feature Flags

```typescript
// apps/web/src/config/features.ts
export const FEATURES = {
  COPILOT: import.meta.env.VITE_ENABLE_COPILOT === 'true',
  REFERRALS: import.meta.env.VITE_ENABLE_REFERRALS === 'true',
};
```

### Conditional Component Loading

```vue
<!-- apps/web/src/layouts/DashboardLayout.vue -->
<template>
  <div class="dashboard-layout">
    <Sidebar />
    <main>
      <RouterView />
    </main>

    <!-- Conditionally render copilot widget -->
    <CopilotWidget v-if="FEATURES.COPILOT" />
  </div>
</template>

<script setup lang="ts">
import { FEATURES } from '@/config/features';

// Conditional import
const CopilotWidget = FEATURES.COPILOT
  ? defineAsyncComponent(() => import('@/components/copilot/CopilotWidget.vue'))
  : null;
</script>
```

### Conditional Routes

```typescript
// apps/web/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { FEATURES } from '@/config/features';

const routes = [
  // Always available
  { path: '/', component: () => import('@/views/Home.vue') },
  { path: '/dashboard', component: () => import('@/views/Dashboard.vue') },

  // Conditional routes
  ...(FEATURES.COPILOT ? [
    { path: '/copilot', component: () => import('@/views/Copilot.vue') },
  ] : []),

  ...(FEATURES.REFERRALS ? [
    { path: '/referrals', component: () => import('@/views/Referrals.vue') },
  ] : []),
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
```

## Rollback Plan

If issues arise during migration:

1. **Keep Old Code**: Don't delete the old `langgraph/` directory until migration is complete and tested
2. **Feature Flag**: Use environment variable to toggle between old and new implementations
3. **Gradual Migration**: Migrate route by route, not all at once

```typescript
// Temporary migration strategy
const USE_NEW_AGENTIC_AI = process.env.USE_NEW_AGENTIC_AI === 'true';

if (USE_NEW_AGENTIC_AI) {
  // Use @synthstack/agentic-ai package
  const { createAgenticAIService } = await import('@synthstack/agentic-ai');
  const agenticAI = await createAgenticAIService(dependencies);
  fastify.decorate('agenticAI', agenticAI);
} else {
  // Use old embedded implementation
  const { LangGraphService } = await import('./services/langgraph/index.js');
  const langGraph = new LangGraphService(fastify);
  await langGraph.initialize();
  fastify.decorate('agenticAI', langGraph);
}
```

## Testing Strategy

1. **Unit Tests**: Test adapters and dependency injection
2. **Integration Tests**: Test API endpoints with new service
3. **E2E Tests**: Test full user flows (thread creation, messaging, approvals)
4. **Comparison Tests**: Run same operations with old and new implementations, compare results

```typescript
// packages/api-gateway/src/__tests__/migration.test.ts
import { describe, it, expect } from 'vitest';

describe('Agentic AI Migration', () => {
  it('should produce same results as old implementation', async () => {
    const oldService = new OldLangGraphService(fastify);
    const newService = await createAgenticAIService(dependencies);

    const oldThread = await oldService.createThread({ userId: 'test', agentSlug: 'general' });
    const newThread = await newService.createThread({ userId: 'test', agentSlug: 'general' });

    expect(newThread).toMatchObject({
      userId: oldThread.userId,
      agentSlug: oldThread.agentSlug,
    });
  });
});
```

## Common Issues

### Issue 1: Missing Dependencies

**Error:** `TypeError: Cannot read property 'getUserById' of undefined`

**Solution:** Ensure all services are initialized before creating the agentic AI service. Check plugin load order.

### Issue 2: Database Connection

**Error:** `Connection terminated unexpectedly`

**Solution:** Verify PostgreSQL connection pool is initialized before agentic AI service. The Fastify adapter expects `fastify.pg.pool` to be available.

### Issue 3: Type Mismatches

**Error:** Type compatibility issues between old and new types

**Solution:** Update imports to use types from `@synthstack/agentic-ai` package. Some field names may have changed during refactoring.

## Next Steps

After successful migration:

1. **Remove Old Code**: Delete `packages/api-gateway/src/services/langgraph/` directory
2. **Update Documentation**: Update API docs to reference new package
3. **Publish Package**: If open-sourcing PRO version, publish to npm registry
4. **Monitor**: Track performance and errors in production

## Support

For issues during migration:
- Check [GitHub Issues](https://github.com/synthstack/synthstack/issues)
- Review [API Documentation](./API.md)
- See [Examples](./examples/)

# Extraction Strategy: Multi-Phase Migration

This document outlines the strategy for extracting the ~7,000 lines of LangGraph code from `packages/api-gateway/src/services/langgraph/` to `@synthstack/agentic-ai`.

## Overview

The existing LangGraph implementation is tightly coupled to api-gateway through:
- Direct Fastify instance access
- Directus database queries
- Service decorators (audit, credits, context, workflow)
- PostgreSQL connection pool
- Logger integration

This extraction requires a **multi-phase approach** to safely decouple and migrate the code while maintaining functionality.

## Current State Analysis

### Files to Extract

| File | Lines | Complexity | Dependencies |
|------|-------|------------|--------------|
| `index.ts` | 1,691 | High | Fastify, Directus, all services |
| `orchestrator.ts` | 554 | Medium | LangGraph, LLM clients |
| `state-graph.ts` | 473 | Medium | LangGraph StateGraph |
| `tools.ts` | 981 | High | RAG, workflows, external APIs |
| `workflow-executor.ts` | 968 | High | Node-RED, approval system |
| `types.ts` | 636 | Low | TypeScript types only |
| `thread-manager.ts` | ~300 | Medium | PostgreSQL, Directus |
| `memory-extractor.ts` | ~300 | Medium | LLM, embeddings, PostgreSQL |
| **Total** | **~5,900** | | |

### Additional Dependencies

- Database schema (migrations needed)
- Directus agent configurations
- PostgreSQL extensions (pgvector)
- Environment variables
- LangChain dependencies

## Migration Phases

### Phase 1: Foundation (COMPLETED ✅)

**Goal**: Create package structure and define interfaces

**Tasks**:
- ✅ Create package structure
- ✅ Define type system (`src/types/index.ts`)
- ✅ Define dependency injection interfaces
- ✅ Create factory pattern (`src/core/factory.ts`)
- ✅ Create service skeleton (`src/core/langgraph-service.ts`)
- ✅ Create utilities (logger, postgres-adapter)
- ✅ Create Fastify adapter example
- ✅ Write migration documentation

**Status**: Complete

---

### Phase 2: Pure Logic Extraction

**Goal**: Extract code with NO external dependencies

**Files to Extract**:

1. **types.ts** → `src/types/langgraph-types.ts`
   - All TypeScript type definitions
   - No dependencies
   - **Effort**: 1-2 hours
   - **Risk**: Low

2. **state-graph.ts** → `src/orchestration/state-graph.ts`
   - StateGraph wrappers
   - Minimal dependencies (only LangGraph)
   - **Effort**: 2-3 hours
   - **Risk**: Low

**Steps**:
```bash
# 1. Copy types
cp packages/api-gateway/src/services/langgraph/types.ts \
   packages/agentic-ai/src/types/langgraph-types.ts

# 2. Update imports (replace relative imports)
# 3. Export from main index
# 4. Run type check
cd packages/agentic-ai && pnpm tsc --noEmit
```

**Testing**:
- TypeScript compilation succeeds
- No import errors
- Types match exactly

---

### Phase 3: Tool System Extraction

**Goal**: Extract tool definitions and registry

**Files to Extract**:

1. **tools.ts** → Split into multiple files:
   - `src/tools/rag-tools.ts` - RAG search tools
   - `src/tools/workflow-tools.ts` - Node-RED tools
   - `src/tools/api-tools.ts` - External API tools
   - `src/tools/analysis-tools.ts` - Data analysis tools
   - `src/tools/registry.ts` - Tool registration system

**Refactoring Required**:

**Before (tightly coupled):**
```typescript
// packages/api-gateway/src/services/langgraph/tools.ts
async function ragSearchTool(input: string) {
  // Direct access to Fastify service
  const results = await this.fastify.agentContextService.searchContext(input);
  return results;
}
```

**After (dependency injection):**
```typescript
// packages/agentic-ai/src/tools/rag-tools.ts
export function createRAGTools(deps: AgenticAIDependencies) {
  return {
    name: 'rag_search',
    description: 'Search knowledge base',
    async execute(input: string) {
      const results = await deps.ragSearch(input, { limit: 5 });
      return results;
    },
  };
}
```

**Steps**:
1. Extract tool definitions
2. Replace direct service access with dependency injection
3. Create tool factory functions
4. Create tool registry
5. Update tool tests

**Effort**: 1-2 days
**Risk**: Medium (requires refactoring all tool implementations)

---

### Phase 4: Memory System Extraction

**Goal**: Extract memory extraction and search

**Files to Extract**:

1. **memory-extractor.ts** → `src/core/memory/memory-extractor.ts`
   - Extract memories from conversations
   - Generate embeddings
   - Store in PostgreSQL

**Refactoring Required**:

**Before:**
```typescript
class MemoryExtractor {
  constructor(private fastify: FastifyInstance) {}

  async extractMemories(conversation: Message[]) {
    const embedding = await this.fastify.openaiClient.embeddings.create({...});
    await this.fastify.pg.pool.query('INSERT INTO langgraph_memories ...');
  }
}
```

**After:**
```typescript
export function createMemoryExtractor(deps: AgenticAIDependencies) {
  return {
    async extractMemories(conversation: Message[]) {
      const embedding = await deps.llmClient.embeddings.create({...});
      await deps.db.query('INSERT INTO langgraph_memories ...');
    },
  };
}
```

**Steps**:
1. Extract memory extraction logic
2. Replace Fastify access with dependencies
3. Create memory search functions
4. Add tests

**Effort**: 1 day
**Risk**: Medium

---

### Phase 5: Thread Management Extraction

**Goal**: Extract thread lifecycle management

**Files to Extract**:

1. **thread-manager.ts** → `src/core/thread-manager.ts`
   - Create/list/delete threads
   - Checkpoint management
   - Thread history

**Refactoring Required**:

**Before:**
```typescript
class ThreadManager {
  async createThread(params: CreateThreadParams) {
    // Direct Directus query
    const agent = await this.fastify.directus.items('agents').readOne(...);

    // Direct PostgreSQL query
    await this.fastify.pg.pool.query('INSERT INTO langgraph_threads ...');
  }
}
```

**After:**
```typescript
export function createThreadManager(deps: AgenticAIDependencies) {
  return {
    async createThread(params: CreateThreadParams) {
      // Get agent config through dependency
      const agent = await deps.getAgentConfig(params.agentSlug);

      // Database through adapter
      await deps.db.query('INSERT INTO langgraph_threads ...');
    },
  };
}
```

**Note**: Need to add `getAgentConfig` to `AgenticAIDependencies` interface.

**Steps**:
1. Add `getAgentConfig` to dependencies interface
2. Extract thread management logic
3. Replace database access with adapter
4. Add tests

**Effort**: 1 day
**Risk**: Medium

---

### Phase 6: Workflow Executor Extraction

**Goal**: Extract Node-RED workflow execution with approvals

**Files to Extract**:

1. **workflow-executor.ts** → `src/execution/workflow-executor.ts`
   - Workflow validation
   - Approval system integration
   - Execution adapters
   - Cost estimation

**Refactoring Required**:

**Before:**
```typescript
class WorkflowExecutor {
  async executeWorkflow(flowId: string, input: any) {
    const flow = await this.fastify.nodeRedService.getFlow(flowId);

    // Check if approval needed
    const needsApproval = this.requiresApproval(flow);
    if (needsApproval) {
      await this.requestApproval(...);
    }

    const result = await this.fastify.nodeRedService.executeFlow(flowId, input);
    await this.fastify.auditService.logEvent(...);

    return result;
  }
}
```

**After:**
```typescript
export function createWorkflowExecutor(deps: AgenticAIDependencies) {
  return {
    async executeWorkflow(flowId: string, input: any) {
      const isValid = await deps.validateWorkflow(flowId);
      if (!isValid) throw new Error('Invalid workflow');

      // Approval system (kept internal)
      const needsApproval = this.requiresApproval(flowId);
      if (needsApproval) {
        await this.requestApproval(flowId, input);
      }

      const result = await deps.executeWorkflow(flowId, input);
      await deps.logAuditEvent({
        type: 'workflow_executed',
        flowId,
        result,
      });

      return result;
    },
  };
}
```

**Steps**:
1. Extract workflow executor
2. Extract approval manager
3. Replace service access with dependencies
4. Add tests

**Effort**: 2 days
**Risk**: High (complex approval logic)

---

### Phase 7: Orchestrator Extraction

**Goal**: Extract multi-agent orchestration

**Files to Extract**:

1. **orchestrator.ts** → `src/orchestration/orchestrator.ts`
   - Supervisor pattern implementation
   - Agent delegation logic
   - Response aggregation

**Refactoring Required**:

**Before:**
```typescript
class Orchestrator {
  async orchestrate(query: string, userId: string) {
    const agents = await this.fastify.directus.items('agents').readMany();

    // Delegate to agents
    const responses = await Promise.all(
      agents.map(agent => this.invokeAgent(agent, query))
    );

    // Aggregate
    return this.synthesize(responses);
  }
}
```

**After:**
```typescript
export function createOrchestrator(deps: AgenticAIDependencies) {
  return {
    async orchestrate(query: string, userId: string) {
      const agents = await deps.listAgents();

      const responses = await Promise.all(
        agents.map(agent => this.invokeAgent(agent, query))
      );

      return this.synthesize(responses);
    },
  };
}
```

**Note**: Need to add `listAgents()` to dependencies.

**Steps**:
1. Add `listAgents()` to dependencies interface
2. Extract orchestrator logic
3. Replace agent loading with dependency
4. Add tests

**Effort**: 1 day
**Risk**: Medium

---

### Phase 8: Main Service Integration

**Goal**: Integrate all extracted modules into LangGraphService

**Files to Update**:

1. **src/core/langgraph-service.ts** - Remove TODOs, implement methods

**Implementation**:

```typescript
export class LangGraphService implements AgenticAIService {
  private threadManager: ThreadManager;
  private memoryExtractor: MemoryExtractor;
  private workflowExecutor: WorkflowExecutor;
  private orchestrator: Orchestrator;
  private toolRegistry: ToolRegistry;

  constructor(private deps: AgenticAIDependencies & { logger: Logger }) {
    // Initialize subsystems
    this.threadManager = createThreadManager(deps);
    this.memoryExtractor = createMemoryExtractor(deps);
    this.workflowExecutor = createWorkflowExecutor(deps);
    this.orchestrator = createOrchestrator(deps);
    this.toolRegistry = createToolRegistry(deps);
  }

  async initialize(): Promise<void> {
    // Setup PostgreSQL checkpointer
    this.checkpointer = await PostgresSaver.fromConnString(
      this.deps.db.connectionString
    );

    // Initialize state graphs
    await this.initializeGraphs();

    // Load tools
    await this.toolRegistry.loadTools();

    this.initialized = true;
  }

  // Implement all AgenticAIService methods
  async createThread(params: CreateThreadParams): Promise<Thread> {
    return this.threadManager.createThread(params);
  }

  async sendMessage(params: SendMessageParams): Promise<MessageResponse> {
    // Use orchestrator, tools, memory extractor
    // ...
  }

  // ... other methods
}
```

**Steps**:
1. Integrate thread manager
2. Integrate memory extractor
3. Integrate workflow executor
4. Integrate orchestrator
5. Integrate tool registry
6. Implement all service methods
7. Add comprehensive tests

**Effort**: 3-4 days
**Risk**: High (integration complexity)

---

### Phase 9: API Gateway Integration

**Goal**: Replace embedded implementation with package in api-gateway

**Steps**:

1. **Install package**:
```bash
cd packages/api-gateway
pnpm add @synthstack/agentic-ai@workspace:*
```

2. **Create adapter** (already documented in MIGRATION.md):
```typescript
// packages/api-gateway/src/adapters/agentic-ai-adapter.ts
export function createAgenticAIDependencies(fastify: FastifyInstance) {
  return createFastifyAdapter(fastify, {
    agentService: fastify.agentService,
    contextService: fastify.agentContextService,
    creditsService: fastify.creditsService,
    workflowService: fastify.nodeRedService,
    auditService: fastify.auditService,
    llmClient: fastify.openaiClient,
  });
}
```

3. **Create plugin**:
```typescript
// packages/api-gateway/src/plugins/agentic-ai.ts
import { createAgenticAIService } from '@synthstack/agentic-ai';

const agenticAIPlugin: FastifyPluginAsync = async (fastify) => {
  const deps = createAgenticAIDependencies(fastify);
  const agenticAI = await createAgenticAIService(deps);
  fastify.decorate('agenticAI', agenticAI);
};

export default fp(agenticAIPlugin);
```

4. **Update route handlers**:
```typescript
// Before
await fastify.langGraphService.createThread(...)

// After
await fastify.agenticAI.createThread(...)
```

5. **Add feature flags** (for LITE vs PRO):
```typescript
// packages/api-gateway/src/plugins/conditional-features.ts
if (process.env.ENABLE_COPILOT === 'true') {
  await fastify.register(agenticAIPlugin);
}
```

6. **Test thoroughly**:
- Unit tests
- Integration tests
- E2E tests
- Manual testing

7. **Remove old code**:
```bash
# Only after full testing and deployment
rm -rf packages/api-gateway/src/services/langgraph/
```

**Effort**: 2-3 days
**Risk**: High (production system)

---

### Phase 10: Frontend Integration

**Goal**: Update Vue.js frontend with feature flags

**Steps**:

1. **Create feature config**:
```typescript
// apps/web/src/config/features.ts
export const FEATURES = {
  COPILOT: import.meta.env.VITE_ENABLE_COPILOT === 'true',
  REFERRALS: import.meta.env.VITE_ENABLE_REFERRALS === 'true',
};
```

2. **Update components**:
```vue
<CopilotWidget v-if="FEATURES.COPILOT" />
```

3. **Update routes**:
```typescript
...(FEATURES.COPILOT ? [
  { path: '/copilot', component: () => import('@/views/Copilot.vue') },
] : []),
```

4. **Update stores** (keep all copilot stores, just conditionally import):
```typescript
// apps/web/src/stores/index.ts
export const stores = {
  auth: useAuthStore,
  projects: useProjectsStore,
  ...(FEATURES.COPILOT ? {
    copilot: useCopilotStore,
    langgraph: useLangGraphStore,
  } : {}),
};
```

5. **Environment files**:
```bash
# .env.lite
VITE_ENABLE_COPILOT=false
VITE_ENABLE_REFERRALS=false

# .env.pro
VITE_ENABLE_COPILOT=true
VITE_ENABLE_REFERRALS=true
```

**Effort**: 1-2 days
**Risk**: Medium

---

## Dependencies Interface Additions

During extraction, we'll need to add these to `AgenticAIDependencies`:

```typescript
export interface AgenticAIDependencies {
  // Existing...
  db: DatabaseAdapter;
  getUserById: (userId: string) => Promise<User | null>;
  // ... etc

  // NEW: Agent configuration
  getAgentConfig: (agentSlug: string) => Promise<AgentConfig | null>;
  listAgents: () => Promise<AgentConfig[]>;

  // NEW: Directus integration (optional)
  directus?: DirectusClient;

  // NEW: Database connection string (for LangGraph checkpointer)
  dbConnectionString?: string;
}
```

## Testing Strategy

### Unit Tests
- Test each extracted module independently
- Mock all dependencies
- Achieve 80%+ coverage

### Integration Tests
- Test service with real PostgreSQL (test database)
- Test adapter implementations
- Test full message flow

### Comparison Tests
- Run same operations with old and new code
- Compare results to ensure parity
- Validate state persistence

### E2E Tests
- Full user flows (create thread → send message → get response)
- Approval workflows
- Memory extraction
- Multi-agent orchestration

## Rollback Strategy

1. **Keep old code** until fully tested
2. **Feature flag** to toggle between old/new
3. **Database compatibility** - ensure schema works with both
4. **Gradual rollout** - test with subset of users first

## Timeline Estimate

| Phase | Effort | Dependencies | Start | End |
|-------|--------|--------------|-------|-----|
| 1. Foundation | 2 days | None | Complete | Complete |
| 2. Pure Logic | 0.5 days | Phase 1 | Week 1 | Week 1 |
| 3. Tool System | 2 days | Phase 2 | Week 1 | Week 1 |
| 4. Memory System | 1 day | Phase 2 | Week 1-2 | Week 2 |
| 5. Thread Mgmt | 1 day | Phase 2 | Week 2 | Week 2 |
| 6. Workflow Executor | 2 days | Phase 2,5 | Week 2 | Week 2 |
| 7. Orchestrator | 1 day | Phase 2,5 | Week 2 | Week 2 |
| 8. Service Integration | 4 days | Phase 2-7 | Week 2-3 | Week 3 |
| 9. API Gateway | 3 days | Phase 8 | Week 3 | Week 3 |
| 10. Frontend | 2 days | Phase 9 | Week 3 | Week 3 |
| **Total** | **~3 weeks** | | | |

This is a **conservative estimate** assuming:
- Full-time work (not other tasks)
- No major blockers
- Testing included in each phase
- Buffer for unexpected issues

## Success Criteria

- ✅ All tests pass (unit, integration, E2E)
- ✅ Feature parity with old implementation
- ✅ Performance equivalent or better
- ✅ No breaking changes to API
- ✅ Documentation complete
- ✅ LITE version builds without copilot/referrals
- ✅ PRO version has full functionality
- ✅ Zero downtime migration

## Next Actions

1. **Review this plan** with team
2. **Start Phase 2** (Pure Logic Extraction)
3. **Setup test harness** for comparison testing
4. **Create feature branches** for each phase
5. **Begin extraction** following this phased approach

## Notes

- Each phase should be a separate PR
- Run full test suite after each phase
- Document any changes to interfaces
- Keep old code until Phase 9 is complete and tested

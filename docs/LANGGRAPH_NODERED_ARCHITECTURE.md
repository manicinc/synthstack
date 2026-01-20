# LangGraph + Node-RED Architecture

This document describes the architecture of SynthStack's AI agent orchestration system, which combines LangGraph for intelligent workflow management with Node-RED for visual automation.

## Overview

SynthStack implements a production-ready architecture that follows industry best practices for AI agent systems:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Nuxt/Quasar Frontend                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Chat UI  │  │ Run Logs │  │ Approvals│  │ Workflow Templates   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Fastify API Gateway                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    LangGraph Service                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │   │
│  │  │ Orchestrator│  │ Checkpointer│  │ Approval Manager    │   │   │
│  │  │ (Supervisor)│  │ (PostgreSQL)│  │ (Human-in-the-Loop) │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │   │
│  │  │Tool Registry│  │Memory Service│ │ Workflow Executor   │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                    │                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Node-RED Service                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │   │
│  │  │Multi-Tenant │  │ Runtime     │  │ Template            │   │   │
│  │  │ Isolation   │  │ Client      │  │ Marketplace         │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
         ┌──────────────────┐            ┌──────────────────┐
         │  PostgreSQL DB   │            │ Node-RED Runtime │
         │  - Threads       │            │ (External/Docker)│
         │  - Checkpoints   │            │                  │
         │  - Approvals     │            │ Custom Nodes:    │
         │  - Memories      │            │ - synthstack-*   │
         │  - Exec Logs     │            │ - BYOK creds     │
         └──────────────────┘            └──────────────────┘
```

## Core Components

### 1. LangGraph Service

**Location:** `packages/api-gateway/src/services/langgraph/`

The LangGraph service provides the "brain" of the system - intelligent orchestration of AI agents with persistent state.

#### Key Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| PostgreSQL Checkpointer | `checkpointer.ts` | ✅ Complete |
| Thread Management | `ThreadManager` class | ✅ Complete |
| Memory Extraction | `memory.ts` | ✅ Complete |
| Tool Registry | `tools.ts` | ✅ Complete |
| Human-in-the-Loop | `ApprovalManager` class | ✅ Complete |
| Agent Orchestrator | `orchestrator.ts` | ✅ Complete |
| Workflow Executor | `workflow-executor.ts` | ✅ Complete |
| Official StateGraph | `state-graph.ts` | ✅ Complete |

#### Graph Architecture

The system implements the recommended graph shape for workflow runners:

```
┌────────────────────────────────────────────────────────────────┐
│                    Orchestrator Graph                          │
│                                                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  Intake  │───▶│  Planner │───▶│ Delegate │───▶│Aggregate │ │
│  │  (Parse) │    │(Workflow)│    │ (Agents) │    │(Synthesize)│
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                        │                       │
│                                        ▼                       │
│                              ┌──────────────────┐              │
│                              │ Specialized      │              │
│                              │ Agents:          │              │
│                              │ - Researcher     │              │
│                              │ - Marketer       │              │
│                              │ - Developer      │              │
│                              │ - SEO Writer     │              │
│                              │ - Designer       │              │
│                              │ - General        │              │
│                              └──────────────────┘              │
└────────────────────────────────────────────────────────────────┘
```

#### Workflow Execution Graph

```
┌────────────────────────────────────────────────────────────────┐
│                    Workflow Graph                              │
│                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐ │
│  │  Validate    │───▶│   Request    │───▶│    Execute       │ │
│  │  Workflow    │    │   Approval   │    │    Workflow      │ │
│  └──────────────┘    └──────────────┘    └──────────────────┘ │
│                             │                     │            │
│                             ▼                     │            │
│                    ┌────────────────┐             │            │
│                    │   INTERRUPT    │             │            │
│                    │ (Human Review) │             │            │
│                    └────────────────┘             │            │
│                             │                     │            │
│                             ▼                     ▼            │
│                    ┌────────────────────────────────┐          │
│                    │         Log Result            │          │
│                    └────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────┘
```

### 2. Node-RED Service

**Location:** `packages/api-gateway/src/services/nodered/`

Node-RED provides the "hands" - actual execution of workflows with integrations.

#### Key Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| Multi-Tenant Isolation | File-based directories | ✅ Complete |
| Credential Encryption | Per-tenant secrets | ✅ Complete |
| Flow Limits by Tier | `nodered_flow_limits` table | ✅ Complete |
| Execution Logging | `nodered_execution_logs` table | ✅ Complete |
| Template Marketplace | `nodered_templates` table | ✅ Complete |
| Runtime Client | `runtime.ts` | ✅ Complete |
| Admin API | `/admin/runtime/*` routes | ✅ Complete |

#### Custom Nodes

**Location:** `packages/node-red-contrib-synthstack/`

18 custom nodes for SynthStack integrations:

| Node | Purpose | BYOK Support |
|------|---------|--------------|
| `synthstack-agent` | AI agent invocation | N/A |
| `synthstack-directus` | Directus CMS operations | N/A |
| `synthstack-trigger` | Flow trigger endpoint | N/A |
| `synthstack-approval` | Human-in-the-loop | N/A |
| `synthstack-copilot` | RAG Q&A | N/A |
| `synthstack-slack` | Slack messaging | ✅ |
| `synthstack-discord` | Discord messaging | ✅ |
| `synthstack-notion` | Notion integration | ✅ |
| `synthstack-gsheets` | Google Sheets | ✅ |
| `synthstack-gdrive` | Google Drive | ✅ |
| `synthstack-gmail` | Gmail integration | ✅ |
| `synthstack-twilio` | SMS/Voice | ✅ |
| `synthstack-jira` | Jira integration | ✅ |
| `synthstack-github` | GitHub integration | ✅ |
| `synthstack-stripe` | Stripe payments | ✅ |
| `synthstack-knowledge` | Knowledge base | N/A |

### 3. BYOK (Bring Your Own Keys)

**Location:** `packages/api-gateway/src/services/byok.ts`

Credentials are stored separately from flows, following Node-RED best practices:

```typescript
// Credentials are NOT included in flow exports
// Each tenant has a unique credential_secret for encryption
{
  organization_id: 'uuid',
  credential_secret: 'encrypted-key',
  // API keys stored in user_api_keys table
}
```

## API Endpoints

### LangGraph Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/langgraph/threads` | GET | List user threads |
| `/api/v1/langgraph/threads` | POST | Create new thread |
| `/api/v1/langgraph/threads/:id` | GET | Get thread details |
| `/api/v1/langgraph/threads/:id/chat` | POST | Send message |
| `/api/v1/langgraph/threads/:id/stream` | POST | Stream response |
| `/api/v1/langgraph/approvals` | GET | List pending approvals |
| `/api/v1/langgraph/approvals/:id/review` | POST | Approve/reject |
| `/api/v1/langgraph/orchestrate` | POST | Multi-agent orchestration |
| `/api/v1/langgraph/workflows/execute` | POST | Execute workflow |

### Node-RED Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/nodered/health` | GET | Service health |
| `/api/v1/nodered/config` | GET | Tenant configuration |
| `/api/v1/nodered/enable` | POST | Enable for organization |
| `/api/v1/nodered/flows` | GET | Get tenant flows |
| `/api/v1/nodered/flows` | PUT | Save tenant flows |
| `/api/v1/nodered/flows/:id/run` | POST | Execute flow |
| `/api/v1/nodered/logs` | GET | Execution logs |
| `/api/v1/nodered/templates` | GET | List templates |
| `/api/v1/nodered/templates/:id/install` | POST | Install template |

### Node-RED Admin API (CI/CD)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/nodered/admin/runtime/status` | GET | Runtime status |
| `/api/v1/nodered/admin/runtime/flows` | GET | Get all flows |
| `/api/v1/nodered/admin/runtime/flows` | POST | Deploy flows |
| `/api/v1/nodered/admin/runtime/flow/:id` | GET | Get specific flow |
| `/api/v1/nodered/admin/runtime/flow/:id` | PUT | Update flow |
| `/api/v1/nodered/admin/runtime/flow/:id` | DELETE | Delete flow |
| `/api/v1/nodered/admin/runtime/flow/:id/execute` | POST | Execute flow |
| `/api/v1/nodered/admin/runtime/validate` | POST | Validate flows |
| `/api/v1/nodered/admin/runtime/nodes` | GET | List installed nodes |

## Database Schema

### LangGraph Tables

```sql
-- Thread management
CREATE TABLE langgraph_threads (
  thread_id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_slug VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  ...
);

-- Checkpoint persistence
CREATE TABLE langgraph_checkpoints (
  thread_id VARCHAR(255) PRIMARY KEY,
  checkpoint JSONB NOT NULL,
  parent_checkpoint_id VARCHAR(255),
  ...
);

-- Long-term memory
CREATE TABLE langgraph_memories (
  id UUID PRIMARY KEY,
  thread_id VARCHAR(255),
  user_id UUID NOT NULL,
  agent_slug VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  embedding vector(1536),
  ...
);

-- Human-in-the-loop approvals
CREATE TABLE langgraph_approvals (
  id VARCHAR(255) PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_payload JSONB NOT NULL,
  risk_level VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  ...
);
```

### Node-RED Tables

```sql
-- Tenant configuration
CREATE TABLE nodered_tenant_config (
  id UUID PRIMARY KEY,
  organization_id UUID UNIQUE,
  enabled BOOLEAN DEFAULT false,
  credential_secret TEXT,
  ...
);

-- Flow limits by tier
CREATE TABLE nodered_flow_limits (
  id UUID PRIMARY KEY,
  organization_id UUID,
  tier VARCHAR(50),
  max_flows INTEGER,
  max_executions_per_day INTEGER,
  ...
);

-- Execution logging
CREATE TABLE nodered_execution_logs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  flow_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  duration_ms INTEGER,
  ...
);

-- Template marketplace
CREATE TABLE nodered_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  flow_json JSONB NOT NULL,
  category VARCHAR(50),
  ...
);
```

## Deployment Modes

### 1. Embedded Mode (Development)

Node-RED runs within the API Gateway process:

```bash
# Start API Gateway with embedded Node-RED
npm run dev
```

### 2. External Mode (Production)

Node-RED runs as a separate Docker container:

```yaml
# docker-compose.yml
services:
  api-gateway:
    image: synthstack/api-gateway
    environment:
      - NODERED_URL=http://nodered:1880
      - NODERED_ADMIN_TOKEN=${NODERED_ADMIN_TOKEN}
  
  nodered:
    image: nodered/node-red
    volumes:
      - nodered-data:/data
    environment:
      - NODE_RED_CREDENTIAL_SECRET=${CREDENTIAL_SECRET}
```

### Environment Variables

```bash
# Node-RED Runtime
NODERED_URL=http://localhost:1880
NODERED_ADMIN_TOKEN=your-admin-token
NODERED_EXECUTION_TIMEOUT=30000
NODERED_DATA_DIR=/data/nodered

# LangGraph
DATABASE_URL=postgresql://user:pass@localhost:5432/synthstack
LANGGRAPH_CHECKPOINT_TABLE=langgraph_checkpoints
```

## Human-in-the-Loop Flow

```mermaid
sequenceDiagram
    participant User
    participant Chat UI
    participant LangGraph
    participant ApprovalManager
    participant NodeRED

    User->>Chat UI: "Run the marketing workflow"
    Chat UI->>LangGraph: orchestrate(message)
    LangGraph->>LangGraph: Analyze required agents
    LangGraph->>LangGraph: Create workflow execution request
    LangGraph->>ApprovalManager: requestApproval(workflow)
    ApprovalManager-->>LangGraph: approvalId (pending)
    LangGraph-->>Chat UI: "Workflow requires approval"
    
    Note over Chat UI: User reviews workflow details
    
    User->>Chat UI: Click "Approve"
    Chat UI->>ApprovalManager: reviewApproval(approvalId, 'approve')
    ApprovalManager->>LangGraph: Resume execution
    LangGraph->>NodeRED: executeFlow(flowId, input)
    NodeRED-->>LangGraph: execution result
    LangGraph-->>Chat UI: "Workflow completed successfully"
```

## Migration to Official LangGraph.js

SynthStack includes both a custom implementation and official LangGraph.js integration:

### Custom Implementation (Current Default)

- `packages/api-gateway/src/services/langgraph/index.ts`
- Full feature parity with existing system
- Custom checkpointer using PostgreSQL

### Official LangGraph.js (Available)

- `packages/api-gateway/src/services/langgraph/state-graph.ts`
- Uses `@langchain/langgraph` StateGraph
- Uses `@langchain/langgraph-checkpoint-postgres` for persistence
- Enables LangGraph Studio debugging

### Migration Path

1. **Phase 1 (Current):** Custom implementation with official packages installed
2. **Phase 2:** Parallel operation - both systems available
3. **Phase 3:** Gradual migration of agents to StateGraph
4. **Phase 4:** Full migration with custom implementation deprecated

## Best Practices

### 1. Workflow Design

- Keep LLM in a controlled lane: select workflows and supply parameters
- Don't let LLM improvise multiple tool calls
- Use approval gates for dangerous operations

### 2. Credential Management

- Never bake secrets into flow JSON
- Use Node-RED's credential system with per-tenant encryption
- BYOK for third-party integrations

### 3. Multi-Tenancy

- One flow directory per tenant
- Isolated credential secrets
- Tier-based limits enforced at API level

### 4. Observability

- Log every workflow execution
- Track token usage per thread
- Audit all approval decisions

## Related Documentation

- [Node-RED Custom Nodes](../packages/node-red-contrib-synthstack/README.md)
- [AI Co-founders System](./AI_COFOUNDERS.md)
- [BYOK Configuration](./BYOK.md)
- [Extension Publishing](./EXTENSION_PUBLISHING.md)



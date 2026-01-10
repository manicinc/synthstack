# SynthStack Workflow System Guide

**Node-RED Visual Workflow Platform**

**Version:** 1.0
**Last Updated:** 2026-01-08
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Multi-Tenant Isolation](#multi-tenant-isolation)
4. [Getting Started](#getting-started)
5. [Creating Custom Nodes](#creating-custom-nodes)
6. [Workflow Examples](#workflow-examples)
7. [Credit Consumption System](#credit-consumption-system)
8. [Premium Nodes Reference](#premium-nodes-reference)
9. [Debugging & Troubleshooting](#debugging--troubleshooting)
10. [Performance Optimization](#performance-optimization)
11. [Best Practices](#best-practices)
12. [Advanced Topics](#advanced-topics)

---

## Overview

SynthStack includes an embedded **Node-RED** visual workflow platform that enables users to:

- Build visual workflows with drag-and-drop UI
- Integrate with AI services (OpenAI, Anthropic, Gemini)
- Connect to external APIs (Slack, Discord, GitHub, Stripe, etc.)
- Automate business processes
- Execute LangGraph agents from workflows
- Query Directus CMS data
- Process data with built-in and custom nodes

### Key Features

✅ **Multi-tenant** - Isolated workflows per organization
✅ **Credit-based** - Fair usage tracking with tier multipliers
✅ **Embedded Mode** - Runs in the same process as API Gateway
✅ **External Mode** - Can run as a separate service/container
✅ **Custom Nodes** - 15+ SynthStack-specific nodes
✅ **Flow Templates** - Pre-built workflows for common tasks
✅ **Execution Logging** - Full audit trail in PostgreSQL
✅ **Rate Limiting** - Per-tier execution limits
✅ **LangGraph Integration** - AI agents can trigger workflows

---

## Architecture

### Deployment Modes

SynthStack supports two Node-RED deployment architectures:

#### 1. Embedded Mode (Default)

Node-RED runs **in the same process** as the API Gateway using the `node-red` npm package.

**Pros:**
- Simpler deployment (one service)
- Lower latency (no network hop)
- Shared memory and configuration

**Cons:**
- Coupled scaling (can't scale independently)
- Single point of failure
- Higher memory usage in API Gateway

**Configuration:**
```typescript
// packages/api-gateway/src/services/nodered/index.ts
import RED from 'node-red';

const server = RED.init(fastifyServer, settings);
await RED.start();
```

#### 2. External Mode

Node-RED runs as a **separate service** (Docker container, standalone process).

**Pros:**
- Independent scaling
- Better fault isolation
- Can deploy Node-RED separately

**Cons:**
- Extra network latency
- More complex deployment
- Need to manage two services

**Configuration:**
```bash
# Environment variables
NODERED_URL=http://nodered:1880
NODERED_ADMIN_TOKEN=your_admin_token

# Docker Compose
services:
  nodered:
    image: nodered/node-red:latest
    ports:
      - "1880:1880"
    volumes:
      - nodered_data:/data
    environment:
      - NODE_RED_CREDENTIAL_SECRET=...
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Fastify)                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Node-RED Runtime Client                       │ │
│  │  - Flow execution                                      │ │
│  │  - Flow management (CRUD)                              │ │
│  │  - Credit tracking                                     │ │
│  │  - Tenant context injection                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Node-RED Service (Embedded/External)          │ │
│  │                                                         │ │
│  │  ┌──────────────────┐  ┌──────────────────┐           │ │
│  │  │  Flow Editor     │  │  HTTP Endpoints  │           │ │
│  │  │  (Admin UI)      │  │  /api/wf/*       │           │ │
│  │  └──────────────────┘  └──────────────────┘           │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │           Custom SynthStack Nodes               │ │ │
│  │  │                                                  │ │ │
│  │  │  • synthstack-agent     (AI agents)            │ │ │
│  │  │  • synthstack-directus  (CMS integration)      │ │ │
│  │  │  • synthstack-openai    (GPT models)           │ │ │
│  │  │  • synthstack-anthropic (Claude models)        │ │ │
│  │  │  • synthstack-slack     (Slack API)            │ │ │
│  │  │  • synthstack-github    (GitHub API)           │ │ │
│  │  │  • synthstack-stripe    (Payments)             │ │ │
│  │  │  • synthstack-kb        (Knowledge base)       │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │   PostgreSQL        │
                  │  • Execution logs   │
                  │  • Credit txns      │
                  │  • Flow metadata    │
                  │  • Tenant configs   │
                  └─────────────────────┘
```

---

## Multi-Tenant Isolation

SynthStack implements **strict multi-tenant isolation** for Node-RED workflows:

### Tenant Configuration

Each organization has a `nodered_tenant_configs` record:

```sql
CREATE TABLE nodered_tenant_configs (
    id UUID PRIMARY KEY,
    organization_id UUID UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT true,
    editor_access_roles TEXT[] DEFAULT ARRAY['admin', 'developer'],
    flow_execution_tier VARCHAR(50) DEFAULT 'free',
    custom_nodes TEXT[],
    credential_secret VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    date_created TIMESTAMPTZ DEFAULT NOW(),
    date_updated TIMESTAMPTZ DEFAULT NOW()
);
```

### Isolation Mechanisms

#### 1. **User Directory Isolation**

Each tenant gets a separate user directory for flows and credentials:

```typescript
// packages/api-gateway/src/services/nodered/tenants.ts
export function getTenantUserDir(organizationId: string): string {
  return path.join(process.env.NODERED_USER_DIR || './data/nodered', organizationId);
}

// Separate directories:
// ./data/nodered/org-123/flows.json
// ./data/nodered/org-123/flows_cred.json
// ./data/nodered/org-456/flows.json
// ./data/nodered/org-456/flows_cred.json
```

#### 2. **Credential Encryption**

Each tenant has a unique `credential_secret` for encrypting stored credentials:

```typescript
const settings: NodeRedSettings = {
  userDir: getTenantUserDir(context.orgId),
  credentialSecret: context.credentialSecret, // Unique per org
  flowFile: 'flows.json',
};
```

#### 3. **Runtime Context Injection**

All workflow executions receive tenant context:

```typescript
const msg = {
  payload: input,
  _synthstack: {
    organizationId: context.orgId,
    userId: context.userId,
    role: context.role,
    executedAt: new Date().toISOString(),
  },
};
```

Custom nodes can access this context:

```javascript
// In a custom node
node.on('input', function(msg) {
  const orgId = msg._synthstack?.organizationId;
  const userId = msg._synthstack?.userId;

  // Use tenant context for API calls
  // ...
});
```

#### 4. **Flow Access Control**

API routes enforce tenant ownership:

```typescript
// Only return flows for authenticated user's organization
fastify.get('/api/v1/nodered/flows', async (request, reply) => {
  const flows = await getFlowsForOrganization(request.user.organization_id);
  return { data: flows };
});
```

### Flow Limits Per Tier

Rate limiting enforced at the tenant level:

```sql
CREATE TABLE nodered_flow_limits (
    id UUID PRIMARY KEY,
    organization_id UUID UNIQUE,
    tier VARCHAR(50) NOT NULL,
    max_flows INTEGER DEFAULT 10,
    max_executions_per_day INTEGER DEFAULT 100,
    max_nodes_per_flow INTEGER DEFAULT 50,
    current_flow_count INTEGER DEFAULT 0,
    current_daily_executions INTEGER DEFAULT 0,
    executions_reset_at TIMESTAMPTZ
);
```

**Default Limits by Tier:**

| Tier       | Max Flows | Daily Executions | Max Nodes/Flow | Free Executions |
|------------|-----------|------------------|----------------|-----------------|
| Free       | 10        | 100              | 50             | 10              |
| Maker      | 50        | 500              | 100            | 50              |
| Pro        | 100       | 2,000            | 200            | Unlimited       |
| Agency     | 500       | 10,000           | 500            | Unlimited       |
| Enterprise | Unlimited | Unlimited        | Unlimited      | Unlimited       |

---

## Getting Started

### 1. Enable Node-RED for Your Organization

```bash
# Via API Gateway
POST /api/v1/nodered/enable
Authorization: Bearer <your_token>

{
  "organizationId": "your-org-id",
  "tier": "pro"
}
```

### 2. Access the Flow Editor

**URL:** `https://app.synthstack.app/nodered/`

**Authentication:** Uses your SynthStack session (automatic SSO)

### 3. Create Your First Flow

1. **Drag** an `inject` node onto the canvas
2. **Drag** a `synthstack-agent` node
3. **Drag** a `debug` node
4. **Connect** them: inject → agent → debug
5. **Configure** the agent node:
   ```json
   {
     "agent": "researcher",
     "query": "What are the benefits of visual workflows?"
   }
   ```
6. **Deploy** the flow (top-right button)
7. **Trigger** by clicking the inject node button
8. **View output** in the debug panel (right sidebar)

### 4. Test via API

```bash
# Trigger flow execution via API
POST /api/v1/nodered/execute/{flowId}
Authorization: Bearer <token>

{
  "input": {
    "query": "Hello from API"
  }
}
```

---

## Creating Custom Nodes

SynthStack includes 15+ custom nodes. You can add your own.

### Node Structure

Node-RED nodes consist of two files:

1. **Node Definition (JavaScript)** - Runtime logic
2. **Node UI (HTML)** - Editor interface and help

### Example: Creating a Custom HTTP Node

**File:** `packages/api-gateway/src/services/nodered/custom-nodes/synthstack-http.js`

```javascript
module.exports = function(RED) {
  function SynthStackHttpNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.on('input', async function(msg) {
      try {
        // Get tenant context
        const orgId = msg._synthstack?.organizationId;
        const credentialSecret = msg._synthstack?.credentialSecret;

        // Make HTTP request with tenant context
        const response = await fetch(config.url, {
          method: config.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-SynthStack-Org': orgId,
            'X-SynthStack-Secret': credentialSecret,
          },
          body: config.method !== 'GET' ? JSON.stringify(msg.payload) : undefined,
        });

        const data = await response.json();

        // Set output
        msg.payload = data;
        msg.statusCode = response.status;

        // Send to next node
        node.send(msg);

        // Update node status
        node.status({ fill: "green", shape: "dot", text: "success" });
      } catch (error) {
        // Handle errors
        node.error(error.message, msg);
        node.status({ fill: "red", shape: "ring", text: "error" });
      }
    });

    node.on('close', function() {
      // Cleanup on flow stop
      node.status({});
    });
  }

  // Register the node
  RED.nodes.registerType("synthstack-http", SynthStackHttpNode);
};
```

**File:** `packages/api-gateway/src/services/nodered/custom-nodes/synthstack-http.html`

```html
<script type="text/javascript">
  RED.nodes.registerType('synthstack-http', {
    category: 'synthstack',
    color: '#3FADB5',
    defaults: {
      name: { value: "" },
      url: { value: "", required: true },
      method: { value: "POST" },
      timeout: { value: 30000 }
    },
    inputs: 1,
    outputs: 1,
    icon: "white-globe.svg",
    label: function() {
      return this.name || "HTTP Request";
    },
    oneditprepare: function() {
      // Setup editor UI
      $("#node-input-method").typedInput({
        types: [
          { value: "GET", label: "GET" },
          { value: "POST", label: "POST" },
          { value: "PUT", label: "PUT" },
          { value: "DELETE", label: "DELETE" }
        ]
      });
    }
  });
</script>

<script type="text/html" data-template-name="synthstack-http">
  <div class="form-row">
    <label for="node-input-name"><i class="fa fa-tag"></i> Name</label>
    <input type="text" id="node-input-name" placeholder="Name">
  </div>
  <div class="form-row">
    <label for="node-input-url"><i class="fa fa-link"></i> URL</label>
    <input type="text" id="node-input-url" placeholder="https://api.example.com/endpoint">
  </div>
  <div class="form-row">
    <label for="node-input-method"><i class="fa fa-exchange"></i> Method</label>
    <input type="text" id="node-input-method">
  </div>
  <div class="form-row">
    <label for="node-input-timeout"><i class="fa fa-clock-o"></i> Timeout (ms)</label>
    <input type="number" id="node-input-timeout" placeholder="30000">
  </div>
</script>

<script type="text/html" data-help-name="synthstack-http">
  <p>Makes HTTP requests with SynthStack tenant context.</p>
  <h3>Inputs</h3>
  <dl class="message-properties">
    <dt>payload <span class="property-type">any</span></dt>
    <dd>The request body (for POST/PUT requests)</dd>
  </dl>
  <h3>Outputs</h3>
  <dl class="message-properties">
    <dt>payload <span class="property-type">object</span></dt>
    <dd>The response body</dd>
    <dt>statusCode <span class="property-type">number</span></dt>
    <dd>The HTTP status code</dd>
  </dl>
  <h3>Details</h3>
  <p>Automatically includes tenant context headers for secure API calls.</p>
</script>
```

### Registering Custom Nodes

**File:** `packages/api-gateway/src/services/nodered/settings.ts`

```typescript
export function getNodeRedSettings(context: TenantContext): NodeRedSettings {
  return {
    // ... other settings
    nodesDir: path.join(__dirname, 'custom-nodes'),

    // Or dynamically load nodes
    editorTheme: {
      palette: {
        catalogues: [
          'https://catalogue.nodered.org/catalogue.json',
        ],
      },
    },

    // Make tenant context available globally
    functionGlobalContext: {
      synthstack: {
        organizationId: context.orgId,
        credentialSecret: context.credentialSecret,
        // Add more context...
      },
    },
  };
}
```

### Testing Custom Nodes

**File:** `tests/nodered/unit/synthstack-http.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import helper from 'node-red-node-test-helper';
import httpNode from '../../../packages/api-gateway/src/services/nodered/custom-nodes/synthstack-http.js';

describe('SynthStack HTTP Node', () => {
  beforeEach((done) => {
    helper.startServer(done);
  });

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('should make HTTP request with tenant context', (done) => {
    const flow = [
      { id: "n1", type: "synthstack-http", url: "https://api.example.com/test", method: "POST", wires: [["n2"]] },
      { id: "n2", type: "helper" }
    ];

    helper.load(httpNode, flow, () => {
      const n2 = helper.getNode("n2");
      const n1 = helper.getNode("n1");

      n2.on("input", (msg) => {
        expect(msg.payload).toBeDefined();
        expect(msg.statusCode).toBe(200);
        done();
      });

      n1.receive({
        payload: { test: "data" },
        _synthstack: {
          organizationId: "test-org",
          credentialSecret: "secret123",
        },
      });
    });
  });
});
```

---

## Workflow Examples

### Example 1: AI-Powered Slack Bot

**Use Case:** Respond to Slack mentions with AI-generated replies

**Flow:**
```
[Slack Listen] → [Extract Mention] → [OpenAI Chat] → [Slack Reply]
```

**Configuration:**

1. **Slack Listen** node:
   ```json
   {
     "type": "synthstack-slack",
     "event": "app_mention",
     "channel": "#general"
   }
   ```

2. **Extract Mention** (function node):
   ```javascript
   // Extract user query from Slack mention
   const text = msg.payload.event.text;
   const query = text.replace(/<@[A-Z0-9]+>/g, '').trim();
   msg.query = query;
   return msg;
   ```

3. **OpenAI Chat** node:
   ```json
   {
     "type": "synthstack-openai",
     "model": "gpt-4",
     "temperature": 0.7,
     "system": "You are a helpful assistant for SynthStack users."
   }
   ```

4. **Slack Reply** node:
   ```json
   {
     "type": "synthstack-slack",
     "action": "post_message",
     "channel": "{{msg.payload.event.channel}}",
     "thread_ts": "{{msg.payload.event.ts}}"
   }
   ```

**Cost:** ~5 credits per execution (2 for OpenAI + 1 for Slack + 1 for Slack reply + 1 base)

### Example 2: Content Generation Pipeline

**Use Case:** Generate blog posts and publish to CMS

**Flow:**
```
[HTTP Webhook] → [Research Agent] → [Writer Agent] → [SEO Optimizer] → [Directus Create]
```

**Configuration:**

1. **HTTP Webhook**:
   ```json
   {
     "url": "/webhook/content-pipeline",
     "method": "POST"
   }
   ```

2. **Research Agent**:
   ```json
   {
     "type": "synthstack-agent",
     "agent": "researcher",
     "query": "{{msg.payload.topic}}"
   }
   ```

3. **Writer Agent**:
   ```json
   {
     "type": "synthstack-agent",
     "agent": "writer",
     "context": "{{msg.research}}"
   }
   ```

4. **SEO Optimizer**:
   ```json
   {
     "type": "synthstack-agent",
     "agent": "seo_writer",
     "content": "{{msg.draft}}"
   }
   ```

5. **Directus Create**:
   ```json
   {
     "type": "synthstack-directus",
     "collection": "articles",
     "operation": "create",
     "data": {
       "title": "{{msg.title}}",
       "content": "{{msg.finalContent}}",
       "status": "draft"
     }
   }
   ```

**Cost:** ~12 credits per execution (3 agents × 3 + 0 for Directus + 1 base + 2 duration)

### Example 3: GitHub PR Review Automation

**Use Case:** Auto-review pull requests with AI

**Flow:**
```
[GitHub Webhook] → [Fetch PR Diff] → [Code Analysis] → [Post Review Comment]
```

**Configuration:**

1. **GitHub Webhook**:
   ```json
   {
     "type": "synthstack-github",
     "event": "pull_request.opened",
     "repo": "your-org/your-repo"
   }
   ```

2. **Fetch PR Diff**:
   ```json
   {
     "type": "synthstack-github",
     "action": "get_pr_diff",
     "pr_number": "{{msg.payload.number}}"
   }
   ```

3. **Code Analysis** (Anthropic):
   ```json
   {
     "type": "synthstack-anthropic",
     "model": "claude-3-5-sonnet-20241022",
     "temperature": 0.3,
     "system": "You are a code reviewer. Analyze the diff and provide constructive feedback."
   }
   ```

4. **Post Review Comment**:
   ```json
   {
     "type": "synthstack-github",
     "action": "create_review_comment",
     "pr_number": "{{msg.payload.number}}",
     "body": "{{msg.analysis}}"
   }
   ```

**Cost:** ~5 credits per execution (1 GitHub + 2 Anthropic + 1 GitHub + 1 base)

---

## Credit Consumption System

SynthStack tracks workflow execution costs using a **credit-based system**.

### Cost Formula

```
workflow_credits = (base_cost + duration_cost + complexity_cost + premium_node_cost) × tier_multiplier
```

**Components:**

1. **Base Cost:** 1 credit (minimum per execution)
2. **Duration Cost:** 1 credit per 30 seconds
3. **Complexity Cost:** 1 credit per 10 nodes executed
4. **Premium Node Cost:** Sum of premium node costs (1-3 credits each)
5. **Tier Multiplier:** Varies by subscription tier
6. **Max Cap:** 100 credits per execution

### Cost Calculation Service

**Location:** `packages/referrals-credits/src/services/workflow-cost-service.ts`

```typescript
export function calculateWorkflowCreditCost(
  durationMs: number,
  nodesExecuted: number,
  premiumNodesUsed: string[] = [],
  tier: SubscriptionTier | string = 'free'
): WorkflowCreditCost {
  // Base cost - minimum per execution
  const baseCost = 1;

  // Duration cost - 1 credit per 30 seconds
  const durationCost = Math.floor(durationMs / 30000) * 1;

  // Complexity cost - 1 credit per 10 nodes
  const complexityCost = Math.floor(nodesExecuted / 10) * 1;

  // Premium node cost
  const premiumNodeCost = premiumNodesUsed.reduce((total, nodeType) => {
    return total + (PREMIUM_NODES[nodeType] || 0);
  }, 0);

  // Raw total before multiplier
  const rawTotal = baseCost + durationCost + complexityCost + premiumNodeCost;

  // Apply tier multiplier
  const tierMultiplier = TIER_WORKFLOW_MULTIPLIERS[tier] || 1.0;
  const multipliedTotal = Math.ceil(rawTotal * tierMultiplier);

  // Apply cap
  const totalCost = Math.min(multipliedTotal, 100);

  return {
    baseCost,
    durationCost,
    complexityCost,
    premiumNodeCost,
    totalCost,
    breakdown: `Base: ${baseCost} | Duration: +${durationCost} | Complexity: +${complexityCost} | Premium: +${premiumNodeCost} | Tier: ×${tierMultiplier} = ${totalCost}`,
  };
}
```

### Tier Multipliers

```typescript
export const TIER_WORKFLOW_MULTIPLIERS: Record<SubscriptionTier, number> = {
  free: 2.0,      // Pay double
  maker: 1.5,     // Pay 50% more
  pro: 1.0,       // Standard rate
  agency: 0.5,    // 50% discount
  enterprise: 0.5,
  lifetime: 0.8,
  unlimited: 0.0, // Free executions
};
```

### Free Executions Per Day

```typescript
export const FREE_EXECUTIONS_PER_TIER: Record<SubscriptionTier, number> = {
  free: 10,
  maker: 50,
  pro: Infinity,  // Unlimited free executions
  agency: Infinity,
  enterprise: Infinity,
  lifetime: Infinity,
  unlimited: Infinity,
};
```

### Cost Estimation (Pre-Flight)

Before executing a workflow, estimate the cost:

```typescript
export function estimateWorkflowCost(
  flowNodeCount: number,
  flowNodeTypes: string[],
  tier: SubscriptionTier | string,
  creditsRemaining: number
): WorkflowCostEstimate {
  // Find premium nodes in the flow
  const premiumNodesInFlow = flowNodeTypes.filter(
    (nodeType) => isPremiumNode(nodeType)
  );

  // Minimum estimate: fast execution, 30% of nodes run, 50% of premium nodes
  const minCost = calculateWorkflowCreditCost(
    1000, // 1 second
    Math.ceil(flowNodeCount * 0.3),
    premiumNodesInFlow.slice(0, Math.ceil(premiumNodesInFlow.length * 0.5)),
    tier
  );

  // Maximum estimate: slow execution, all nodes run, all premium nodes
  const maxCost = calculateWorkflowCreditCost(
    120000, // 2 minutes
    flowNodeCount,
    premiumNodesInFlow,
    tier
  );

  const canAfford = creditsRemaining >= minCost.totalCost;

  return {
    estimatedMinCost: minCost.totalCost,
    estimatedMaxCost: maxCost.totalCost,
    breakdown: `Estimated ${minCost.totalCost}-${maxCost.totalCost} credits`,
    canAfford,
    creditsRemaining,
  };
}
```

### Execution Logging

Every workflow execution is logged with credit tracking:

```sql
-- Logged in nodered_execution_logs table
INSERT INTO nodered_execution_logs (
  id,
  organization_id,
  flow_id,
  flow_name,
  trigger_type,
  status,
  started_at,
  completed_at,
  duration_ms,
  nodes_executed,
  credits_charged,
  premium_nodes_used,
  is_free_execution,
  credit_transaction_id
) VALUES (
  gen_random_uuid(),
  $1,
  $2,
  $3,
  'api',
  'completed',
  $4,
  $5,
  $6,
  $7,
  $8,
  ARRAY['synthstack-agent', 'synthstack-openai'],
  false,
  $9
);
```

### Credit Deduction Flow

```
1. User triggers workflow via API/webhook/schedule
   ↓
2. Pre-flight check:
   - Estimate cost range
   - Check credit balance
   - Check free executions remaining
   ↓
3. If insufficient credits:
   → Return 402 Payment Required
   ↓
4. Execute workflow
   ↓
5. Calculate actual cost:
   - Measure duration
   - Count nodes executed
   - Identify premium nodes used
   ↓
6. Deduct credits (atomic transaction):
   - BEGIN TRANSACTION
   - UPDATE app_users SET credits_remaining = credits_remaining - cost
   - INSERT INTO credit_transactions
   - INSERT INTO nodered_execution_logs
   - COMMIT
   ↓
7. Return result to user with credit headers:
   - X-Credits-Remaining: 1234
   - X-Credits-Charged: 5
```

---

## Premium Nodes Reference

Premium nodes incur additional credit costs due to external API calls or AI processing.

### Complete Premium Nodes List

**Location:** `packages/referrals-credits/src/constants/premium-nodes.ts`

| Node Type | Cost | Category | Description |
|-----------|------|----------|-------------|
| `synthstack-agent` | 3 | AI | LangGraph AI Co-founder agents |
| `synthstack-openai` | 2 | AI | OpenAI GPT models |
| `synthstack-anthropic` | 2 | AI | Claude models |
| `synthstack-gemini` | 2 | AI | Google Gemini models |
| `synthstack-twilio` | 2 | Communication | SMS/Voice via Twilio |
| `synthstack-stripe` | 2 | Payment | Stripe payment processing |
| `synthstack-slack` | 1 | Communication | Slack API integration |
| `synthstack-discord` | 1 | Communication | Discord bot integration |
| `synthstack-gmail` | 1 | Email | Gmail API |
| `synthstack-notion` | 1 | Productivity | Notion API |
| `synthstack-github` | 1 | Dev Tools | GitHub API |
| `synthstack-jira` | 1 | Project Mgmt | Jira API |
| `synthstack-sheets` | 1 | Productivity | Google Sheets API |
| `synthstack-drive` | 1 | Storage | Google Drive API |
| `synthstack-kb` | 1 | Knowledge | Knowledge base (RAG) |
| `synthstack-directus` | 0 | CMS | Directus CMS (free) |

### Cost Examples

**Example 1: Simple Flow (No Premium Nodes)**
```
[inject] → [function] → [debug]
Cost: 1 base = 1 credit
```

**Example 2: AI Chat Flow**
```
[inject] → [synthstack-openai] → [debug]
Cost: 1 base + 2 AI = 3 credits (×2 for free tier = 6 credits)
```

**Example 3: Complex Automation**
```
[inject] → [synthstack-agent (researcher)] → [synthstack-agent (writer)] → [synthstack-directus] → [synthstack-slack]
Cost: 1 base + 3 + 3 + 0 + 1 = 8 credits
+ 1 duration (if > 30s) + 1 complexity (if > 10 nodes)
= 10 credits (×1.5 for maker tier = 15 credits)
```

**Example 4: Payment Processing**
```
[http in] → [synthstack-stripe (create charge)] → [synthstack-gmail (send receipt)] → [http response]
Cost: 1 base + 2 stripe + 1 gmail = 4 credits
```

---

## Debugging & Troubleshooting

### Debug Panel

Node-RED includes a built-in debug panel (right sidebar).

**Usage:**
1. Add `debug` nodes to your flow
2. Deploy the flow
3. Trigger execution
4. View output in debug panel

**Debug Node Configuration:**
```json
{
  "output": "msg.payload",  // Can debug any msg property
  "to": "debug",            // Output to debug panel
  "name": "Debug Step 1"
}
```

### Logging Levels

Configure logging in Node-RED settings:

```typescript
logging: {
  console: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    metrics: true,
    audit: true,
  },
}
```

**Available Levels:** `fatal`, `error`, `warn`, `info`, `debug`, `trace`

### Common Issues

#### Issue 1: Flow Not Triggering

**Symptoms:**
- Flow deploys successfully but doesn't execute
- No entries in debug panel

**Debugging:**
1. Check trigger node configuration (inject, http in, webhook)
2. Verify trigger URL/schedule is correct
3. Check Node-RED logs:
   ```bash
   docker logs -f synthstack-api-gateway | grep nodered
   ```
4. Test with manual inject:
   - Click the inject node button in editor

**Solution:**
```javascript
// Add status updates to track flow execution
node.status({ fill: "blue", shape: "ring", text: "triggered" });

// Add debug logs
node.log("Flow started with input: " + JSON.stringify(msg.payload));
```

#### Issue 2: Insufficient Credits

**Symptoms:**
- 402 Payment Required error
- Flow execution blocked

**Debugging:**
1. Check current credit balance:
   ```bash
   GET /api/v1/credits
   ```
2. Check estimated cost:
   ```bash
   POST /api/v1/credits/workflow/estimate
   {
     "flowId": "abc123",
     "flowNodeCount": 15,
     "flowNodeTypes": ["synthstack-agent", "synthstack-slack"]
   }
   ```

**Solution:**
- Purchase more credits
- Upgrade to higher tier (lower multiplier)
- Optimize flow (remove premium nodes, reduce complexity)

#### Issue 3: Timeout Errors

**Symptoms:**
- Flow execution times out after 30 seconds
- "Execution timeout" in logs

**Debugging:**
1. Check execution duration in logs:
   ```sql
   SELECT flow_name, duration_ms, status
   FROM nodered_execution_logs
   WHERE organization_id = 'your-org'
   ORDER BY started_at DESC
   LIMIT 10;
   ```

2. Identify slow nodes (add timing):
   ```javascript
   const startTime = Date.now();
   // ... node processing
   node.log(`Processing took ${Date.now() - startTime}ms`);
   ```

**Solution:**
- Increase timeout in environment:
  ```bash
  NODERED_EXECUTION_TIMEOUT=60000  # 60 seconds
  ```
- Optimize slow operations (caching, batching)
- Split into multiple smaller flows

#### Issue 4: Premium Node Not Found

**Symptoms:**
- "Unknown node type" error
- Node appears red in editor

**Debugging:**
1. Check installed nodes:
   ```bash
   GET /api/v1/nodered/nodes
   ```
2. Verify custom nodes directory:
   ```bash
   ls packages/api-gateway/src/services/nodered/custom-nodes/
   ```

**Solution:**
1. Install missing node module:
   ```bash
   # In Node-RED data directory
   npm install node-red-contrib-<module-name>
   ```
2. Restart Node-RED service
3. Refresh browser and re-deploy flow

### Execution Logs Query

View recent executions with credit details:

```sql
SELECT
  el.flow_name,
  el.status,
  el.duration_ms,
  el.nodes_executed,
  el.credits_charged,
  el.premium_nodes_used,
  el.is_free_execution,
  ct.amount as credit_deduction,
  ct.balance_after as remaining_credits
FROM nodered_execution_logs el
LEFT JOIN credit_transactions ct ON ct.id = el.credit_transaction_id
WHERE el.organization_id = 'your-org-id'
ORDER BY el.started_at DESC
LIMIT 20;
```

---

## Performance Optimization

### 1. Flow Design Optimization

**Use Parallel Execution:**
```
Bad (Serial):
[A] → [B] → [C] → [D]
Total: sum of all durations

Good (Parallel):
        ┌→ [B] ┐
[A] ----├→ [C] ├---→ [E]
        └→ [D] ┘
Total: max of parallel durations
```

**Implement Early Returns:**
```javascript
// Check conditions early and exit if not met
if (!msg.payload.shouldProcess) {
  return null; // Stop flow execution
}
// ... rest of processing
```

**Batch Operations:**
```javascript
// Bad: Process items one-by-one
items.forEach(item => {
  sendToAPI(item); // 10 API calls
});

// Good: Batch process
sendToAPI(items); // 1 API call
```

### 2. Caching Strategies

**Implement Flow-Level Cache:**
```javascript
// In a function node
const cacheKey = `result_${msg.topic}`;
const cached = flow.get(cacheKey);

if (cached && (Date.now() - cached.timestamp < 300000)) {
  // Use cached result (5 min TTL)
  msg.payload = cached.data;
  return msg;
}

// ... fetch fresh data
flow.set(cacheKey, { data: freshData, timestamp: Date.now() });
```

**Use Redis for Shared Cache:**
```javascript
// Custom node with Redis
const redis = RED.settings.functionGlobalContext.redis;
const cacheKey = `flow:${msg._synthstack.organizationId}:${msg.topic}`;

const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// ... fetch data
await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5 min TTL
```

### 3. Database Query Optimization

**Avoid N+1 Queries:**
```javascript
// Bad: Query in loop
for (const item of items) {
  const details = await db.query('SELECT * FROM table WHERE id = $1', [item.id]);
}

// Good: Single query with IN clause
const ids = items.map(i => i.id);
const details = await db.query('SELECT * FROM table WHERE id = ANY($1)', [ids]);
```

**Use Connection Pooling:**
```javascript
// Configure in Node-RED settings
functionGlobalContext: {
  pgPool: new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
  }),
}

// In custom node
const pool = RED.settings.functionGlobalContext.pgPool;
const client = await pool.connect();
try {
  const result = await client.query('SELECT ...');
  return result.rows;
} finally {
  client.release();
}
```

### 4. Memory Management

**Clean Up Large Objects:**
```javascript
// Process large data
const largeData = await fetchLargeDataset();
msg.payload = processData(largeData);

// Clean up
delete largeData;
msg._largeData = null;

return msg;
```

**Limit Array Sizes:**
```javascript
// Paginate large results
const PAGE_SIZE = 100;
const results = await fetchAll();

// Process in chunks
for (let i = 0; i < results.length; i += PAGE_SIZE) {
  const chunk = results.slice(i, i + PAGE_SIZE);
  await processChunk(chunk);
}
```

### 5. Monitoring & Metrics

**Add Performance Tracking:**
```javascript
// In custom nodes
const startTime = Date.now();

// ... processing

const duration = Date.now() - startTime;
node.metric('duration', msg, duration);

if (duration > 5000) {
  node.warn(`Slow execution: ${duration}ms`);
}
```

**Query Execution Metrics:**
```sql
-- Find slowest flows
SELECT
  flow_name,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) as execution_count
FROM nodered_execution_logs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY flow_name
ORDER BY avg_duration DESC
LIMIT 10;
```

---

## Best Practices

### 1. Flow Design

✅ **DO:**
- Use descriptive node names ("Fetch User Data", not "HTTP Request")
- Add comments to complex flows (Comment node)
- Group related nodes with Group node
- Use link nodes for long flows (avoid spaghetti wiring)
- Implement error handling (catch nodes)
- Add status updates to track execution

❌ **DON'T:**
- Create overly complex flows (>50 nodes)
- Skip error handling
- Hardcode credentials (use Credentials)
- Ignore security (validate inputs)

### 2. Error Handling

**Always Use Catch Nodes:**
```
[Flow Nodes] --error--> [Catch] → [Log Error] → [Notify Admin] → [Return 500]
```

**Implement Retry Logic:**
```javascript
// In function node
const maxRetries = 3;
const retryCount = msg._retryCount || 0;

if (retryCount < maxRetries) {
  msg._retryCount = retryCount + 1;
  // Retry after delay
  setTimeout(() => {
    node.send(msg);
  }, Math.pow(2, retryCount) * 1000); // Exponential backoff
} else {
  node.error("Max retries exceeded", msg);
}
```

### 3. Security

**Validate All Inputs:**
```javascript
// In function node
if (!msg.payload || typeof msg.payload !== 'object') {
  node.error("Invalid payload");
  return null;
}

// Sanitize user input
const sanitized = msg.payload.text
  .replace(/<script>/gi, '')
  .trim()
  .substring(0, 1000); // Max length

msg.payload.text = sanitized;
return msg;
```

**Use Environment Variables:**
```javascript
// Good: Use credentials or env vars
const apiKey = env.get('OPENAI_API_KEY');

// Bad: Hardcoded secrets
const apiKey = "sk-1234567890"; // Never do this!
```

**Implement Rate Limiting:**
```javascript
// Custom rate limiter node
const rateLimit = flow.get('rateLimit') || { count: 0, resetAt: Date.now() };

if (Date.now() > rateLimit.resetAt) {
  rateLimit.count = 0;
  rateLimit.resetAt = Date.now() + 60000; // 1 minute
}

if (rateLimit.count >= 60) {
  node.status({ fill: "red", shape: "ring", text: "rate limited" });
  return null;
}

rateLimit.count++;
flow.set('rateLimit', rateLimit);
```

### 4. Testing

**Create Test Flows:**
- Use inject nodes with test data
- Add assert nodes to validate output
- Create separate "Test" flow tab

**Example Test Flow:**
```
[Inject Test Data] → [Flow to Test] → [Assert Expected Output] → [Debug Result]
```

**Unit Test Custom Nodes:**
```typescript
// tests/nodered/unit/my-node.test.ts
import helper from 'node-red-node-test-helper';

it('should process data correctly', (done) => {
  helper.load(myNode, flow, () => {
    const n1 = helper.getNode("n1");
    n1.receive({ payload: testData });

    helper.getNode("n2").on("input", (msg) => {
      expect(msg.payload).toEqual(expectedOutput);
      done();
    });
  });
});
```

### 5. Documentation

**Document Complex Flows:**
- Add Comment nodes with explanations
- Include flow description in properties
- Document required environment variables
- Add example inputs/outputs

**Flow Metadata:**
```json
{
  "info": "## User Onboarding Flow\n\n**Purpose:** Automated user onboarding with welcome email and Slack notification.\n\n**Inputs:**\n- `msg.payload.email` - User email\n- `msg.payload.name` - User name\n\n**Outputs:**\n- `msg.payload.success` - Boolean\n- `msg.payload.userId` - Created user ID\n\n**Cost:** ~3 credits (1 base + 1 Gmail + 1 Slack)"
}
```

---

## Advanced Topics

### 1. LangGraph Integration

Workflows can trigger LangGraph agents and vice versa.

**Workflow → LangGraph:**
```javascript
// In synthstack-agent node
const agent = msg._synthstack.agents.get('researcher');
const result = await agent.invoke({
  query: msg.payload.query,
  context: msg.payload.context,
});
msg.payload = result;
return msg;
```

**LangGraph → Workflow:**
```typescript
// In LangGraph tool
import { getNodeRedRuntime } from '../services/nodered/runtime.js';

const runtime = getNodeRedRuntime();
const result = await runtime.executeFlowViaTrigger(context, flowId, {
  data: toolInput,
});
```

### 2. Scheduled Workflows

**Cron-based Triggers:**
```
[Inject - Cron] → [Flow Logic] → [Output]

Inject Config:
{
  "repeat": "0 9 * * *",  // Every day at 9 AM
  "crontab": "0 9 * * *",
  "once": false
}
```

**Database-driven Schedules:**
```sql
-- Store workflow schedules
CREATE TABLE workflow_schedules (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  flow_id VARCHAR(255) NOT NULL,
  cron_expression VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  next_run TIMESTAMPTZ,
  last_run TIMESTAMPTZ
);

-- Trigger via API periodically
-- (Handled by a background job)
```

### 3. Webhook Endpoints

**Create HTTP Endpoints:**
```
[HTTP In] → [Process] → [HTTP Response]

HTTP In Config:
{
  "url": "/webhook/customer-signup",
  "method": "POST"
}

HTTP Response Config:
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  }
}
```

**Webhook URL:**
```
https://app.synthstack.app/api/wf/webhook/customer-signup
```

**Secure Webhooks:**
```javascript
// Validate webhook signature
const crypto = require('crypto');
const signature = msg.req.headers['x-webhook-signature'];
const body = JSON.stringify(msg.payload);
const secret = env.get('WEBHOOK_SECRET');

const expectedSig = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

if (signature !== expectedSig) {
  msg.statusCode = 401;
  msg.payload = { error: 'Invalid signature' };
  return msg;
}
```

### 4. Multi-Step Approvals

**Human-in-the-Loop Pattern:**
```
[Trigger] → [Generate Report] → [Request Approval] → [Wait] → [If Approved] → [Execute Action]
```

**Implementation:**
```javascript
// Request approval node
const approvalId = generateId();
await db.query(`
  INSERT INTO workflow_approvals (id, flow_id, data, status)
  VALUES ($1, $2, $3, 'pending')
`, [approvalId, msg.flowId, JSON.stringify(msg.payload)]);

// Send notification
await sendSlackMessage(`Approval needed: ${approvalLink}`);

// Store approval ID in context
flow.set(`approval_${approvalId}`, msg);
return null; // Pause flow

// Approval webhook resumes flow
// POST /api/v1/nodered/approve/{approvalId}
```

### 5. Data Transformation Patterns

**Map/Reduce:**
```javascript
// Map: Transform array
msg.payload = msg.payload.map(item => ({
  id: item.id,
  fullName: `${item.firstName} ${item.lastName}`,
  age: calculateAge(item.birthDate),
}));

// Reduce: Aggregate
const total = msg.payload.reduce((sum, item) => sum + item.amount, 0);
msg.payload = { total };
```

**Filter/Sort:**
```javascript
// Filter
msg.payload = msg.payload.filter(item => item.status === 'active');

// Sort
msg.payload.sort((a, b) => b.createdAt - a.createdAt);
```

---

## Summary Checklist

### Development

- [ ] Design flow with clear purpose
- [ ] Add descriptive node names
- [ ] Implement error handling (catch nodes)
- [ ] Validate inputs
- [ ] Add debug nodes for testing
- [ ] Document complex logic (comments)
- [ ] Test with inject nodes

### Security

- [ ] Use credentials, not hardcoded secrets
- [ ] Validate and sanitize inputs
- [ ] Implement rate limiting for public endpoints
- [ ] Verify webhook signatures
- [ ] Check user permissions

### Performance

- [ ] Optimize for parallel execution
- [ ] Implement caching where appropriate
- [ ] Batch API calls
- [ ] Set reasonable timeouts
- [ ] Monitor execution metrics

### Production

- [ ] Test in staging environment
- [ ] Review estimated credit costs
- [ ] Set up monitoring and alerts
- [ ] Document required environment variables
- [ ] Train users on flow usage
- [ ] Plan for scaling (flow limits, rate limits)

---

## Additional Resources

- **Node-RED Official Docs:** https://nodered.org/docs/
- **SynthStack API Reference:** https://docs.synthstack.app
- **Community Forum:** https://community.synthstack.app
- **GitHub Repo:** https://github.com/synthstack/synthstack

---

**Questions? Issues?**

- Create an issue: https://github.com/synthstack/synthstack/issues
- Join Discord: https://discord.gg/synthstack
- Email support: support@synthstack.app

---

*This guide is part of the comprehensive SynthStack documentation suite. For more guides, see [docs/](../docs/).*

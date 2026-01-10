# Node-RED Operator Guide (Multi-Tenant)

This guide describes how SynthStack embeds Node-RED with per-tenant isolation and how to operate it for self-hosted deployments.

## Overview

SynthStack integrates Node-RED as its visual workflow engine, providing:

- **Multi-tenant isolation**: Each organization has isolated flows and credentials
- **Secure authentication**: JWT-based access tied to SynthStack users
- **Approval-gated execution**: Dangerous actions require user approval
- **Usage tracking**: Executions are logged and metered per tenant
- **Custom nodes**: SynthStack-specific nodes for AI, CMS, and integrations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SynthStack Platform                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Org A     │  │   Org B     │  │   Org C     │         │
│  │  Flows      │  │  Flows      │  │  Flows      │         │
│  │  Creds      │  │  Creds      │  │  Creds      │         │
│  │  Context    │  │  Context    │  │  Context    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│  ┌───────────────────────┴───────────────────────┐         │
│  │              Node-RED Runtime                  │         │
│  │  • Shared runtime, isolated contexts          │         │
│  │  • Per-org credential encryption              │         │
│  │  • Execution logging & metering               │         │
│  └───────────────────────────────────────────────┘         │
│                          │                                  │
│  ┌───────────────────────┴───────────────────────┐         │
│  │           SynthStack API Gateway               │         │
│  │  • JWT validation                              │         │
│  │  • Role-based access control                   │         │
│  │  • Approval workflow integration               │         │
│  └───────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Tenant Isolation

### Per-Tenant Components

Each organization receives:

| Component | Isolation Method |
|-----------|------------------|
| **Flows** | Stored with `organization_id` |
| **Credentials** | Encrypted with org-specific secret |
| **Context** | Scoped to org namespace |
| **Execution Logs** | Tagged with org ID |
| **Environment Variables** | Per-org env store |

### Credential Security

1. **Encryption**: Each org has a unique credential secret
2. **Generation**: Secret auto-generated on org creation
3. **Storage**: Secrets stored encrypted in database
4. **Rotation**: Admins can rotate secrets (requires re-entering credentials)

## Configuration

### Environment Variables

```bash
# Node-RED Core
NODERED_ENABLED=true
NODERED_PORT=1880
NODERED_ADMIN_ROOT=/admin
NODERED_HTTP_ROOT=/api

# Multi-Tenant Settings
NODERED_MULTI_TENANT=true
NODERED_FLOWS_DIR=/data/nodered/flows
NODERED_CONTEXT_DIR=/data/nodered/context

# Authentication
NODERED_AUTH_TYPE=synthstack
NODERED_JWT_SECRET=${JWT_SECRET}

# External Access (for webhooks)
NODERED_HTTP_BASE_URL=https://api.synthstack.app/nodered
NODERED_ADMIN_BASE_URL=https://api.synthstack.app/nodered/admin

# Limits
NODERED_MAX_FLOWS_PER_ORG=50
NODERED_MAX_EXECUTIONS_PER_DAY=1000
NODERED_EXECUTION_TIMEOUT_MS=30000
```

### Tier-Based Limits

| Tier | Max Flows | Daily Executions | Execution Timeout |
|------|-----------|------------------|-------------------|
| Free | 0 | 0 | N/A |
| Maker | 5 | 100 | 15s |
| Pro | 25 | 500 | 30s |
| Agency | 100 | 2000 | 60s |
| Enterprise | Unlimited | Unlimited | 120s |

## Setup Instructions

### Initial Setup

1. **Enable Node-RED in config**:
   ```bash
   NODERED_ENABLED=true
   ```

2. **Initialize the data directory**:
   ```bash
   mkdir -p /data/nodered/{flows,context,credentials}
   chmod 750 /data/nodered
   ```

3. **Start the service**:
   ```bash
   npm run start:nodered
   # Or with Docker:
   docker-compose up -d nodered
   ```

4. **Verify health**:
   ```bash
   curl http://localhost:1880/health
   # Should return: {"status":"ok"}
   ```

### Docker Deployment

```yaml
# docker-compose.yml
services:
  nodered:
    image: synthstack/nodered:latest
    environment:
      - NODERED_ENABLED=true
      - NODERED_MULTI_TENANT=true
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - nodered_data:/data/nodered
    ports:
      - "1880:1880"
    depends_on:
      - postgres
      - redis

volumes:
  nodered_data:
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: synthstack-nodered
spec:
  replicas: 2
  selector:
    matchLabels:
      app: synthstack-nodered
  template:
    spec:
      containers:
      - name: nodered
        image: synthstack/nodered:latest
        env:
        - name: NODERED_ENABLED
          value: "true"
        - name: NODERED_MULTI_TENANT
          value: "true"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: synthstack-secrets
              key: jwt-secret
        volumeMounts:
        - name: nodered-data
          mountPath: /data/nodered
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

## Access Control

### Role Permissions

| Role | View Flows | Edit Flows | Execute | Admin |
|------|------------|------------|---------|-------|
| Viewer | ✓ | ✗ | ✗ | ✗ |
| Member | ✓ | ✓ | ✓ | ✗ |
| Admin | ✓ | ✓ | ✓ | ✓ |
| Owner | ✓ | ✓ | ✓ | ✓ |

### Authentication Flow

```
User Request → API Gateway → JWT Validation → Role Check → Node-RED
                                    ↓
                            Extract org_id
                                    ↓
                            Scope to tenant
```

### SSO Token Generation

Users access the editor via SSO:

```typescript
// API endpoint: POST /api/v1/nodered/sso-token
const response = await api.post('/api/v1/nodered/sso-token');
const { token, editorUrl } = response.data.data;
window.open(editorUrl, '_blank');
```

## Execution Management

### Execution Lifecycle

```
Trigger → Validate → Check Limits → Execute → Log → Debit Credits
            ↓            ↓
         Reject      Rate Limit
```

### Approval-Gated Execution

Certain flows require approval:

1. **Manual Trigger**: Always allowed
2. **Scheduled**: Allowed if pre-approved
3. **Webhook**: Allowed with signature validation
4. **AI-Initiated**: Requires human approval

### Execution Logging

All executions are logged to `nodered_execution_logs`:

| Field | Description |
|-------|-------------|
| `id` | Unique execution ID |
| `organization_id` | Tenant ID |
| `flow_id` | Flow that was executed |
| `flow_name` | Human-readable flow name |
| `status` | completed, failed, timeout |
| `started_at` | Execution start time |
| `completed_at` | Execution end time |
| `duration_ms` | Total execution time |
| `nodes_executed` | Count of nodes run |
| `credits_charged` | Credits deducted |
| `error_message` | Error details (if failed) |

### Credit Calculation

```
Credits = Base Cost + (Duration × Rate) + (Nodes × Node Cost) + Premium Node Costs

Example:
  Base: 1 credit
  Duration: 5s × 0.1 = 0.5 credits
  Nodes: 10 × 0.05 = 0.5 credits
  Premium (AI node): 2 credits
  Total: 4 credits
```

## Monitoring

### Health Checks

```bash
# Basic health
GET /nodered/health
→ {"status":"ok","uptime":12345}

# Detailed status
GET /nodered/admin/status
→ {"flows":42,"executions_today":156,"memory":"256MB"}
```

### Metrics

Exposed Prometheus metrics:

```
# HELP nodered_executions_total Total workflow executions
# TYPE nodered_executions_total counter
nodered_executions_total{org="org_123",status="completed"} 1234

# HELP nodered_execution_duration_seconds Execution duration
# TYPE nodered_execution_duration_seconds histogram
nodered_execution_duration_seconds_bucket{le="1"} 500
nodered_execution_duration_seconds_bucket{le="5"} 800
nodered_execution_duration_seconds_bucket{le="30"} 950
```

### Alerts

Recommended alerts:

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Failure Rate | >10% failures in 5min | Warning |
| Execution Timeout | >5 timeouts in 5min | Warning |
| Memory High | >80% memory usage | Warning |
| Queue Backlog | >100 pending executions | Critical |

## Maintenance

### Daily Tasks

- [ ] Check execution logs for errors
- [ ] Review credit usage by org
- [ ] Monitor queue depth

### Weekly Tasks

- [ ] Archive old execution logs (>30 days)
- [ ] Review and clean orphaned flows
- [ ] Check credential expiration

### Monthly Tasks

- [ ] Rotate credential encryption keys
- [ ] Audit access logs
- [ ] Review and update limits

### Log Retention

```sql
-- Archive logs older than 30 days
INSERT INTO nodered_execution_logs_archive
SELECT * FROM nodered_execution_logs
WHERE started_at < NOW() - INTERVAL '30 days';

DELETE FROM nodered_execution_logs
WHERE started_at < NOW() - INTERVAL '30 days';
```

### Backup Procedures

```bash
# Backup flows
pg_dump -t nodered_flows > flows_backup.sql

# Backup credentials (encrypted)
pg_dump -t nodered_credentials > credentials_backup.sql

# Backup execution logs
pg_dump -t nodered_execution_logs > logs_backup.sql
```

## Troubleshooting

### Common Issues

#### Flows Not Loading

```bash
# Check flow file permissions
ls -la /data/nodered/flows/

# Verify database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM nodered_flows"

# Check Node-RED logs
docker logs synthstack-nodered --tail 100
```

#### Execution Failures

```bash
# Check recent failures
SELECT * FROM nodered_execution_logs
WHERE status = 'failed'
ORDER BY started_at DESC
LIMIT 10;

# Check error messages
SELECT flow_name, error_message, COUNT(*)
FROM nodered_execution_logs
WHERE status = 'failed'
  AND started_at > NOW() - INTERVAL '1 hour'
GROUP BY flow_name, error_message;
```

#### Credential Issues

```bash
# Verify credential secret exists
SELECT organization_id, 
       CASE WHEN credential_secret IS NOT NULL THEN 'SET' ELSE 'MISSING' END
FROM organizations;

# Re-generate credential secret
UPDATE organizations
SET credential_secret = encode(gen_random_bytes(32), 'hex')
WHERE id = 'org_123';
```

#### Memory Issues

```bash
# Check Node-RED memory usage
docker stats synthstack-nodered

# Force garbage collection (if supported)
curl -X POST http://localhost:1880/admin/gc

# Restart with increased memory
docker-compose up -d --scale nodered=0
docker-compose up -d nodered
```

### Debug Mode

Enable debug logging:

```bash
# Set environment variable
DEBUG=nodered:* npm run start:nodered

# Or in Docker
docker run -e DEBUG=nodered:* synthstack/nodered
```

## Custom Nodes

### Available SynthStack Nodes

| Node | Purpose | Premium |
|------|---------|---------|
| `synthstack-agent` | Invoke AI agents | Yes |
| `synthstack-directus` | CMS operations | No |
| `synthstack-copilot` | RAG Q&A | Yes |
| `synthstack-trigger` | Event triggers | No |
| `synthstack-approval` | Human approval gate | No |
| `synthstack-email` | Send emails | No |
| `synthstack-slack` | Slack integration | No |
| `synthstack-discord` | Discord integration | No |
| `synthstack-stripe` | Stripe operations | Yes |
| `synthstack-github` | GitHub operations | No |
| `synthstack-notion` | Notion integration | No |
| `synthstack-gsheets` | Google Sheets | No |
| `synthstack-gdrive` | Google Drive | No |
| `synthstack-twilio` | SMS/WhatsApp | Yes |
| `synthstack-gmail` | Gmail operations | No |
| `synthstack-jira` | Jira integration | No |
| `synthstack-kb-ingest` | KB ingestion | Yes |
| `synthstack-kb-search` | KB search | Yes |

### Installing Custom Nodes

```bash
# Via npm
cd /data/nodered
npm install @synthstack/node-red-contrib-synthstack

# Via palette manager (UI)
# Settings → Manage Palette → Install → Search "synthstack"
```

## API Reference

### Admin API

```bash
# List flows
GET /api/v1/nodered/flows
Authorization: Bearer <jwt>

# Get flow
GET /api/v1/nodered/flows/:id
Authorization: Bearer <jwt>

# Deploy flows
POST /api/v1/nodered/flows
Authorization: Bearer <jwt>
Content-Type: application/json

# Execute flow
POST /api/v1/nodered/flows/:id/run
Authorization: Bearer <jwt>
Content-Type: application/json
{"payload": {...}}

# Get execution logs
GET /api/v1/nodered/logs?limit=50
Authorization: Bearer <jwt>

# Get usage stats
GET /api/v1/nodered/usage
Authorization: Bearer <jwt>
```

### Webhook API

```bash
# Receive webhook (HMAC signed)
POST /api/v1/nodered/webhook/:flowId
X-Webhook-Signature: sha256=...
Content-Type: application/json
{"event": "...", "data": {...}}
```

## Related Documentation

- [Workflow Quick Start](./guides/WORKFLOW_QUICK_START.md) - User guide
- [API Keys Setup](./guides/WORKFLOW_API_KEYS_SETUP.md) - Integration setup
- [LangGraph User Guide](./LANGGRAPH_USER_GUIDE.md) - AI features
- [Unified Credit System](./UNIFIED_CREDIT_SYSTEM.md) - Credit calculation
- [Workflows Documentation](./workflows/README.md) - Complete reference

---

**Support**: For operator support, contact enterprise@synthstack.app

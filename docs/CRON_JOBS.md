# Cron Jobs Configuration

## Overview

The API Gateway includes worker endpoints for scheduled background tasks. These should be triggered via cron jobs in production.

## Authentication

All worker endpoints require authentication via the `CRON_SECRET` environment variable:

```bash
Authorization: Bearer YOUR_CRON_SECRET
```

## Recommended Schedule

### Docker Compose Setup

Add to `docker-compose.yml`:

```yaml
services:
  cron:
    image: alpine:latest
    command: crond -f
    volumes:
      - ./cron/crontab:/etc/crontabs/root
    environment:
      - API_URL=http://api-gateway:3003
      - CRON_SECRET=${CRON_SECRET}
```

Create `cron/crontab`:

```cron
# Daily credit reset (midnight UTC)
0 0 * * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" $API_URL/api/v1/workers/reset-credits

# Check subscription expirations (daily 1 AM)
0 1 * * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" $API_URL/api/v1/workers/check-expirations

# Aggregate daily analytics (daily 2 AM)
0 2 * * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" $API_URL/api/v1/workers/aggregate-analytics

# Newsletter sync (daily 3 AM)
0 3 * * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" $API_URL/api/v1/workers/sync-newsletter

# Process email sequences (every 6 hours)
0 */6 * * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" $API_URL/api/v1/workers/process-sequences

# Update segments (daily 4 AM)
0 4 * * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" $API_URL/api/v1/workers/update-segments

# Aggregate hourly analytics (every hour)
0 * * * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" $API_URL/api/v1/workers/aggregate-hourly

# Compute funnels (daily 5 AM)
0 5 * * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" $API_URL/api/v1/workers/compute-funnels

# Refresh cohorts (weekly Monday 6 AM)
0 6 * * 1 wget -qO- --header="Authorization: Bearer $CRON_SECRET" $API_URL/api/v1/workers/refresh-cohorts

# Cleanup old data (monthly 1st at 7 AM)
0 7 1 * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" $API_URL/api/v1/workers/cleanup

# =====================================================
# AUTONOMOUS AGENT ORCHESTRATION (Premium Feature)
# =====================================================

# Batch orchestration - analyze GitHub & run agents (every 6 hours)
0 */6 * * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" "$API_URL/api/v1/workers/orchestration/batch"

# Retry failed orchestration jobs (hourly at :30)
30 * * * * wget -qO- --header="Authorization: Bearer $CRON_SECRET" "$API_URL/api/v1/workers/orchestration/retry-failed"

# Cleanup old orchestration logs (weekly Sunday 8 AM, retain 30 days)
0 8 * * 0 wget -qO- --header="Authorization: Bearer $CRON_SECRET" --post-data='{"retentionDays":30}' "$API_URL/api/v1/workers/orchestration/cleanup"
```

## Manual Execution

For development/testing:

```bash
# Test credit reset
curl -X POST http://localhost:3003/api/v1/workers/reset-credits \
  -H "Authorization: Bearer dev-admin-secret"

# Test analytics aggregation
curl -X POST http://localhost:3003/api/v1/workers/aggregate-analytics \
  -H "Authorization: Bearer dev-admin-secret"

# === Orchestration Manual Triggers ===

# Run full batch orchestration for all enabled projects
curl -X POST http://localhost:3003/api/v1/workers/orchestration/batch \
  -H "Authorization: Bearer dev-admin-secret"

# Run orchestration for a specific project
curl -X POST http://localhost:3003/api/v1/workers/orchestration/project/PROJECT_UUID \
  -H "Authorization: Bearer dev-admin-secret"

# Analyze GitHub for a project (without running agents)
curl -X POST http://localhost:3003/api/v1/workers/orchestration/project/PROJECT_UUID/analyze-github \
  -H "Authorization: Bearer dev-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"periodHours": 24}'

# Retry failed jobs
curl -X POST http://localhost:3003/api/v1/workers/orchestration/retry-failed \
  -H "Authorization: Bearer dev-admin-secret"
```

## Monitoring

Check worker health:

```bash
curl http://localhost:3003/api/v1/workers/health
```

## Kubernetes CronJob Example

## Autonomous Agent Orchestration

The orchestration system enables AI agents to autonomously analyze GitHub repositories and generate suggestions.

### How It Works

1. **Batch Trigger**: Every 6 hours (configurable), the orchestration batch job runs
2. **Project Selection**: Finds all projects with `github_sync_enabled = true` and active schedules
3. **GitHub Analysis**: Fetches commits, issues, PRs, computes velocity metrics
4. **Agent Distribution**: Routes analysis data to appropriate agents based on their capabilities
5. **Suggestion Generation**: Agents create suggestions (or skip if nothing valuable)
6. **Human Review**: All suggestions flow to the approval workflow

### Agent Task Distribution

| Agent | Analyzes | Creates |
|-------|----------|---------|
| Developer | PRs, code changes, stale items | PR reviews, code improvements |
| Researcher | Issue patterns, trends | Research reports |
| Marketer | Releases, milestones | Blog posts, release notes |
| SEO Writer | README, docs | Documentation improvements |
| Designer | UI issues | Design feedback |

### "Do Nothing" Intelligence

Agents evaluate before acting:
- **RELEVANCE**: Is this data relevant to their expertise? (0-1)
- **ACTIONABILITY**: Can they provide meaningful suggestions? (0-1)
- **FRESHNESS**: Is this new information? (0-1)
- **VALUE**: Will this help the project? (0-1)

If any score < threshold (default 0.5), the agent skips execution.

### Configurable Settings (per-project, per-agent)

- `frequency_hours`: How often to run (1-168 hours)
- `autonomous_mode`: `disabled` | `suggest` | `auto_approve` | `auto_publish`
- `min_confidence_score`: Threshold for "do nothing" intelligence
- `max_per_run`: Max suggestions per orchestration run
- `cooldown_hours`: Min hours between similar suggestions

---

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: synthstack-daily-tasks
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: worker
            image: curlimages/curl:latest
            env:
            - name: API_URL
              value: "http://api-gateway:3003"
            - name: CRON_SECRET
              valueFrom:
                secretKeyRef:
                  name: printverse-secrets
                  key: cron-secret
            command:
            - /bin/sh
            - -c
            - |
              curl -X POST $API_URL/api/v1/workers/reset-credits -H "Authorization: Bearer $CRON_SECRET"
              curl -X POST $API_URL/api/v1/workers/aggregate-analytics -H "Authorization: Bearer $CRON_SECRET"
          restartPolicy: OnFailure
```

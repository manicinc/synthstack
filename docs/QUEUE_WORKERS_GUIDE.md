# SynthStack Queue Workers Guide

## 📋 Overview

SynthStack uses **BullMQ + Redis** for reliable background job processing with embedded workers running inside the API Gateway. This guide covers architecture, scaling strategies, monitoring, and production best practices.

---

## 🏗️ Architecture

### Embedded Workers

Workers run **inside the API Gateway process**, providing:
- ✅ Simple deployment (no separate worker service needed)
- ✅ Automatic graceful degradation (falls back to direct processing if Redis unavailable)
- ✅ Shared database connections and service instances
- ✅ Easy local development

### Queue System Components

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway Process                   │
│                                                          │
│  ┌────────────┐      ┌────────────┐                    │
│  │   Routes   │      │  Workers   │                    │
│  │            │      │            │                    │
│  │ Add Jobs   │─────▶│ Process    │                    │
│  │ to Queue   │      │ Jobs       │                    │
│  └────────────┘      └────────────┘                    │
│         │                   │                           │
└─────────┼───────────────────┼───────────────────────────┘
          │                   │
          ▼                   ▼
    ┌──────────────────────────────┐
    │         Redis Queue          │
    │  ┌────────────────────────┐  │
    │  │  Email Queue           │  │
    │  │  - Waiting: 25         │  │
    │  │  - Active: 5           │  │
    │  │  - Failed: 2           │  │
    │  └────────────────────────┘  │
    │  ┌────────────────────────┐  │
    │  │  Orchestration Queue   │  │
    │  │  - Waiting: 10         │  │
    │  │  - Active: 3           │  │
    │  │  - Completed: 150      │  │
    │  └────────────────────────┘  │
    └──────────────────────────────┘
```

---

## 📦 Queue Implementations

### 1. Email Queue

**Location:** [packages/api-gateway/src/services/email/queue.ts](../packages/api-gateway/src/services/email/queue.ts)

**Configuration:**
- **Queue Name:** `email-queue`
- **Concurrency:** 5 workers
- **Rate Limit:** 10 jobs/second
- **Retry:** 3 attempts with exponential backoff (starts at 1 minute)
- **Retention:** 24h completed, 7d failed

**Job Types:**
```typescript
interface EmailJobData {
  queueId: string;      // Email queue DB record ID
  priority?: number;    // 0-10 (higher = sent first)
  userId?: string;      // For tracking
}

interface EmailJobResult {
  success: boolean;
  messageId?: string;   // SMTP message ID
  error?: string;
}
```

**Usage Example:**
```typescript
import { getEmailQueueService } from './services/email/queue.js';

const queueService = getEmailQueueService();

// Add high-priority email
await queueService.addHighPriority({
  queueId: 'email-uuid',
  userId: 'user-123'
});

// Schedule email for later
await queueService.scheduleEmail(
  { queueId: 'email-uuid' },
  new Date('2024-12-25T09:00:00Z')
);

// Get queue stats
const stats = await queueService.getStats();
// { waiting: 25, active: 5, completed: 1000, failed: 2 }
```

---

### 2. Orchestration Queue

**Location:** [packages/api-gateway/src/services/orchestration/queue.ts](../packages/api-gateway/src/services/orchestration/queue.ts)

**Configuration:**
- **Queue Name:** `orchestration-queue`
- **Concurrency:** 3 workers
- **Rate Limit:** 5 jobs/minute
- **Retry:** 3 attempts with exponential backoff (starts at 30 seconds)
- **Timeout:** 10 minutes per job
- **Retention:** 24h completed, 7d failed

**Job Types:**
```typescript
interface OrchestrationJobData {
  projectId: string;
  triggeredBy: TriggerSource;  // 'cron' | 'webhook' | 'manual' | 'api' | 'system'
  userId?: string;
  priority?: number;
  jobType: 'batch' | 'single_agent' | 'github_analysis' | 'retry';
  agentSlug?: string;
  context?: Record<string, unknown>;
}

interface OrchestrationJobResult {
  success: boolean;
  jobId?: string;
  agentsExecuted?: number;
  agentsSucceeded?: number;
  agentsFailed?: number;
  tasksCreated?: number;
  suggestionsCreated?: number;
  error?: string;
  durationMs?: number;
}
```

**Usage Example:**
```typescript
import { getOrchestrationQueueService } from './services/orchestration/queue.js';

const queueService = getOrchestrationQueueService();

// Add batch orchestration job
await queueService.addJob({
  projectId: 'project-uuid',
  triggeredBy: 'cron',
  jobType: 'batch',
  priority: 5
});

// Add high-priority manual trigger
await queueService.addHighPriorityJob({
  projectId: 'project-uuid',
  triggeredBy: 'manual',
  userId: 'user-123',
  jobType: 'single_agent',
  agentSlug: 'code-review'
});

// Retry all failed jobs
const retried = await queueService.retryAllFailed();
```

---

## 🚀 Horizontal Scaling

### Strategy 1: Multiple API Gateway Instances (Recommended)

Run multiple API Gateway instances - BullMQ automatically distributes jobs across all connected workers.

```bash
# Server 1
docker run -e DATABASE_URL=... -e REDIS_URL=redis://shared-redis:6379 api-gateway

# Server 2
docker run -e DATABASE_URL=... -e REDIS_URL=redis://shared-redis:6379 api-gateway

# Server 3
docker run -e DATABASE_URL=... -e REDIS_URL=redis://shared-redis:6379 api-gateway
```

**Load Distribution:**
```
Instance 1: 5 email workers + 3 orchestration workers
Instance 2: 5 email workers + 3 orchestration workers
Instance 3: 5 email workers + 3 orchestration workers
────────────────────────────────────────────────────────
Total:      15 email workers + 9 orchestration workers
```

**Benefits:**
- ✅ Automatic job distribution (BullMQ handles this)
- ✅ High availability (if one instance dies, others continue)
- ✅ Simple configuration (same env vars on all instances)
- ✅ Stateless scaling (add/remove instances dynamically)

---

### Strategy 2: Kubernetes Horizontal Pod Autoscaler

Scale API Gateway pods based on queue depth or CPU usage.

**Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3  # Start with 3 instances
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: synthstack/api-gateway:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          value: redis://redis-cluster:6379
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
```

**Horizontal Pod Autoscaler:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: queue_waiting_jobs
      target:
        type: AverageValue
        averageValue: "50"  # Scale up if >50 waiting jobs per pod
```

**Custom Metrics (Optional):**
```typescript
// Expose queue metrics for Prometheus
import { register } from 'prom-client';

server.get('/metrics', async (request, reply) => {
  const emailStats = await emailQueueService.getStats();
  const orchStats = await orchestrationQueueService.getStats();

  // Metrics are automatically collected by prom-client
  reply.header('Content-Type', register.contentType);
  return register.metrics();
});
```

---

### Strategy 3: Process Manager (PM2)

Run multiple API Gateway processes on a single server.

**pm2.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: './dist/index.js',
      instances: 4,  // Run 4 instances (or "max" for CPU cores)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://...',
        REDIS_URL: 'redis://localhost:6379'
      },
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

**Commands:**
```bash
# Start with clustering
pm2 start pm2.config.js

# Scale to 8 instances
pm2 scale api-gateway 8

# Monitor
pm2 monit

# Logs
pm2 logs api-gateway
```

---

## 📊 Monitoring & Debugging

### Queue Statistics

**Email Queue Stats:**
```bash
# Via API endpoint (admin-only)
# Tip: authenticate as an admin user and pass your JWT as a Bearer token.
curl -H "Authorization: Bearer <ADMIN_JWT>" http://localhost:3003/api/v1/admin/email/queue

# Response
{
  "success": true,
  "data": {
    "stats": {
      "waiting": 25,
      "active": 5,
      "completed": 1000,
      "failed": 2,
      "delayed": 10,
      "total": 1042
    },
    "failedJobs": []
  }
}
```

**Redis CLI Inspection:**
```bash
# Connect to Redis
docker exec -it synthstack-redis redis-cli

# List all BullMQ keys
KEYS bull:*

# Check email queue length
LLEN bull:email-queue:wait
LLEN bull:email-queue:active
LLEN bull:email-queue:failed

# Check orchestration queue
LLEN bull:orchestration-queue:wait
LLEN bull:orchestration-queue:active

# View failed job details
LRANGE bull:email-queue:failed 0 10
```

---

### Failed Job Debugging

**Get Failed Jobs:**
```typescript
const failedJobs = await emailQueueService.getFailedJobs(50);

failedJobs.forEach(job => {
  console.log({
    id: job.id,
    data: job.data,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp
  });
});
```

**Retry Failed Jobs:**
```typescript
// Retry specific job
await emailQueueService.retryJob('job-id-123');

// Retry all failed jobs
const orchestrationQueue = getOrchestrationQueueService();
const retriedCount = await orchestrationQueue.retryAllFailed();
console.log(`Retried ${retriedCount} failed jobs`);
```

---

### Logging Best Practices

**Worker Event Logging:**

Workers automatically log:
- ✅ Job completion: `"Email job completed"`
- ✅ Job failures: `"Email job failed"` with error details
- ✅ Worker errors: `"Email worker error"`
- ✅ Stalled jobs: `"Job stalled"` (job took too long)

**Custom Logging:**
```typescript
// In processJob method
this.fastify.log.info({
  jobId: job.id,
  queueId: job.data.queueId,
  attempt: job.attemptsMade + 1,
  priority: job.opts.priority
}, 'Processing email job');
```

---

## ⚙️ Redis Configuration for Production

### Redis Persistence

**Enable AOF (Append-Only File):**
```bash
# redis.conf
appendonly yes
appendfsync everysec
```

**Why?** Jobs in queue won't be lost if Redis restarts.

---

### Redis High Availability (Sentinel)

**Setup Redis Sentinel for automatic failover:**

```yaml
# docker-compose.sentinel.yml
version: '3.8'

services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  redis-replica-1:
    image: redis:7-alpine
    command: redis-server --appendonly yes --replicaof redis-master 6379

  redis-replica-2:
    image: redis:7-alpine
    command: redis-server --appendonly yes --replicaof redis-master 6379

  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf

  redis-sentinel-2:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf

  redis-sentinel-3:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf
```

**sentinel.conf:**
```
sentinel monitor mymaster redis-master 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 10000
```

**API Gateway Connection:**
```env
# Use Sentinel instead of direct Redis connection
REDIS_URL=redis://sentinel1:26379,sentinel2:26379,sentinel3:26379
REDIS_SENTINEL_NAME=mymaster
```

---

### Redis Cluster (Horizontal Scaling)

For **very high throughput** (>10k jobs/sec):

```yaml
version: '3.8'

services:
  redis-node-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes

  redis-node-2:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes

  redis-node-3:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
```

**API Gateway Connection:**
```env
REDIS_URL=redis://node1:6379,node2:6379,node3:6379
REDIS_CLUSTER_MODE=true
```

---

## 🎯 Performance Tuning

### Adjust Worker Concurrency

**Email Queue (High Volume):**
```typescript
// packages/api-gateway/src/services/email/queue.ts
concurrency: 10,  // Increase from 5 to 10
limiter: {
  max: 20,        // Increase from 10 to 20
  duration: 1000, // Per second
}
```

**Orchestration Queue (CPU-Intensive):**
```typescript
// packages/api-gateway/src/services/orchestration/queue.ts
concurrency: 5,   // Increase from 3 to 5
limiter: {
  max: 10,        // Increase from 5 to 10
  duration: 60000, // Per minute
}
```

---

### Adjust Retry Strategy

**Faster Retries for Transient Errors:**
```typescript
backoff: {
  type: 'exponential',
  delay: 5000,  // Start with 5 seconds instead of 60 seconds
}
```

**More Retry Attempts:**
```typescript
attempts: 5,  // Increase from 3 to 5
```

---

### Job Retention Policies

**Reduce Redis Memory Usage:**
```typescript
removeOnComplete: {
  age: 3600,   // Keep completed jobs for 1 hour (instead of 24h)
  count: 100,  // Keep last 100 completed jobs (instead of 1000)
},
removeOnFail: {
  age: 86400,  // Keep failed jobs for 1 day (instead of 7 days)
}
```

---

## 🔧 Troubleshooting

### Problem: Jobs Stuck in "Active" State

**Cause:** Worker crashed while processing job

**Solution:**
```bash
# Check for stalled jobs
redis-cli LRANGE bull:email-queue:active 0 -1

# BullMQ automatically moves stalled jobs to "waiting" after timeout
# Configure stalled job timeout:
```

```typescript
new Worker('email-queue', processJob, {
  connection: redisConnection,
  stalledInterval: 30000,  // Check for stalled jobs every 30 seconds
  maxStalledCount: 2,      // Move to failed after 2 stalled attempts
});
```

---

### Problem: Jobs Not Processing

**Diagnosis:**
```bash
# 1. Check Redis connection
docker exec synthstack-redis redis-cli ping
# Should return "PONG"

# 2. Check API Gateway logs
docker logs synthstack-api-gateway | grep "queue initialized"

# 3. Check queue stats
curl -H "Authorization: Bearer <ADMIN_JWT>" http://localhost:3003/api/v1/admin/email/queue

# 4. Check worker count
# Should see: "Email queue initialized" in logs
```

**Common Causes:**
- ❌ Redis not running
- ❌ Wrong REDIS_URL environment variable
- ❌ Network connectivity issues
- ❌ Queue service not initialized

---

### Problem: High Memory Usage

**Cause:** Too many completed jobs in Redis

**Solution:**
```typescript
// Run cleanup periodically
setInterval(async () => {
  const emailQueue = getEmailQueueService();
  await emailQueue.cleanup(86400000); // Clean jobs older than 24h

  const orchQueue = getOrchestrationQueueService();
  await orchQueue.cleanup(86400000);
}, 3600000); // Run every hour
```

Or configure aggressive retention policies (see Performance Tuning above).

---

## 📚 Additional Resources

### Code References

- **Email Queue:** [packages/api-gateway/src/services/email/queue.ts](../packages/api-gateway/src/services/email/queue.ts)
- **Orchestration Queue:** [packages/api-gateway/src/services/orchestration/queue.ts](../packages/api-gateway/src/services/orchestration/queue.ts)
- **Queue Types:** [packages/types/src/queue/index.ts](../packages/types/src/queue/index.ts)

### External Documentation

- **BullMQ:** https://docs.bullmq.io/
- **Redis Best Practices:** https://redis.io/docs/management/optimization/
- **Kubernetes HPA:** https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

---

**Last Updated:** 2026-01-08
**Status:** ✅ Production Ready

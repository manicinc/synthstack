# SynthStack Operations Guide

**Production deployment, monitoring, scaling, and troubleshooting**

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Production Checklist](#pre-production-checklist)
3. [Deployment](#deployment)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Log Aggregation](#log-aggregation)
6. [Performance Monitoring](#performance-monitoring)
7. [Database Operations](#database-operations)
8. [Scaling Strategies](#scaling-strategies)
9. [Disaster Recovery](#disaster-recovery)
10. [Incident Response](#incident-response)
11. [Common Issues & Solutions](#common-issues--solutions)

---

## Overview

This guide covers operational best practices for running SynthStack in production environments.

### Architecture Overview

```
Internet → Load Balancer → API Gateway (Fastify) → Services
                              ├─→ ML Service (FastAPI/Django/NestJS)
                              ├─→ Postgres (Directus)
                              ├─→ Postgres (ML Database)
                              ├─→ Redis (Cache)
                              ├─→ Qdrant (Vector DB)
                              └─→ Node-RED (Workflows)
```

### Service Dependencies

| Service | Critical | Fallback |
|---------|----------|----------|
| **API Gateway** | ✅ Yes | None (primary entry) |
| **PostgreSQL** | ✅ Yes | None (data loss) |
| **Redis** | ⚠️ Recommended | Degraded performance |
| **ML Service** | ⚠️ Recommended | Features disabled |
| **Qdrant** | ⚠️ Optional | Keyword search fallback |
| **Node-RED** | ⚠️ Optional | Workflows disabled |

---

## Pre-Production Checklist

### Security

```bash
# ✅ Required Security Steps

# 1. Generate strong secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # DATABASE_ENCRYPTION_KEY
openssl rand -base64 32  # SESSION_SECRET

# 2. Update all default passwords
# - PostgreSQL admin password
# - Redis password
# - Directus admin password

# 3. Enable SSL/TLS
# - Use Let's Encrypt for certificates
# - Force HTTPS redirects
# - Enable HSTS headers

# 4. Configure CORS properly
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# 5. Rate limiting
RATE_LIMIT_MAX=100  # Requests per minute
RATE_LIMIT_BAN_DURATION=3600  # 1 hour ban

# 6. Disable debug mode
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
```

### Environment Variables

**File:** `.env.production`

```bash
# ========================================
# Application
# ========================================
NODE_ENV=production
PORT=3003
HOST=0.0.0.0
LOG_LEVEL=warn

# ========================================
# Security
# ========================================
JWT_SECRET=<strong-random-secret>
SESSION_SECRET=<strong-random-secret>
ENCRYPTION_KEY=<strong-random-secret>

CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# ========================================
# Databases
# ========================================
DATABASE_URL=postgresql://user:pass@postgres.internal:5432/synthstack?sslmode=require
REDIS_URL=redis://:password@redis.internal:6379?ssl=true

# Connection pooling
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000

# ========================================
# ML Service
# ========================================
ML_SERVICE_BACKEND=fastapi
ML_SERVICE_URL=http://ml-service.internal:8000

# ========================================
# External Services
# ========================================
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
SENDGRID_API_KEY=SG....

# Qdrant Vector Database (open-source; self-host or Qdrant Cloud)
QDRANT_URL=https://qdrant.yourdomain.com
# Optional: only needed for Qdrant Cloud (or secured self-hosted Qdrant).
QDRANT_API_KEY=

# ========================================
# Monitoring
# ========================================
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# ========================================
# Feature Flags
# ========================================
ENABLE_COPILOT=true
ENABLE_REFERRALS=true
ENABLE_WORKFLOWS=true
```

### Infrastructure Requirements

**Minimum Production Setup:**

| Component | Specs | Storage |
|-----------|-------|---------|
| **API Gateway** | 2 vCPU, 4GB RAM | 20GB |
| **ML Service** | 2 vCPU, 4GB RAM | 20GB |
| **PostgreSQL** | 2 vCPU, 8GB RAM | 100GB SSD |
| **Redis** | 1 vCPU, 2GB RAM | 10GB |
| **Qdrant** | 2 vCPU, 4GB RAM | 50GB SSD |
| **Web (Nginx)** | 1 vCPU, 1GB RAM | 10GB |

**Recommended Production Setup:**

| Component | Specs | Storage | HA |
|-----------|-------|---------|-----|
| **API Gateway** | 4 vCPU, 8GB RAM | 50GB | 3 replicas |
| **ML Service** | 4 vCPU, 8GB RAM | 50GB | 2 replicas |
| **PostgreSQL** | 8 vCPU, 16GB RAM | 500GB SSD | Primary + Read Replica |
| **Redis** | 2 vCPU, 4GB RAM | 20GB | Cluster (3 nodes) |
| **Qdrant** | 4 vCPU, 8GB RAM | 200GB SSD | Cluster (3 nodes) |
| **Web (Nginx)** | 2 vCPU, 2GB RAM | 20GB | 2 replicas |

---

## Microservices Deployment Strategies

### Deployment Topology Options

SynthStack supports flexible deployment patterns based on your scaling needs:

#### 1. Monolithic (Single Server)
**Best for:** Development, MVP, small teams (< 100 users)

```yaml
# docker-compose.yml (default)
services:
  web:
    build: ./apps/web
    ports: ["3050:3050"]
  api-gateway:
    build: ./packages/api-gateway
    ports: ["3003:3003"]
  ml-service:
    build: ./packages/ml-service
    ports: ["8001:8000"]
  postgres:
    image: pgvector/pgvector:pg15
  redis:
    image: redis:7-alpine
  qdrant:
    image: qdrant/qdrant:v1.7.4
  directus:
    build: ./services/directus
```

**Pros:**
- Simple deployment
- Low operational overhead
- Fast inter-service communication

**Cons:**
- Single point of failure
- Limited horizontal scaling
- Resource contention

---

#### 2. Separated Frontend/Backend
**Best for:** Production, global users, high traffic

**Frontend (CDN):**
```bash
cd apps/web
pnpm build

# Deploy to Vercel
vercel deploy --prod

# Or Netlify
netlify deploy --prod

# Or S3 + CloudFront
aws s3 sync dist/spa/ s3://my-bucket/
aws cloudfront create-invalidation --distribution-id XYZ
```

**Backend (Application Server):**
```bash
# On backend server
docker compose up -d api-gateway ml-service postgres redis qdrant directus
```

**Environment Variables:**
```env
# Frontend (.env.production)
VITE_API_URL=https://api.example.com
VITE_DIRECTUS_URL=https://cms.example.com

# Backend
CORS_ORIGIN=https://example.com
```

**Pros:**
- Global CDN for fast frontend delivery
- Independent scaling of frontend/backend
- Better security isolation

**Cons:**
- CORS configuration required
- More complex deployment pipeline

---

#### 3. Dedicated ML Server
**Best for:** Heavy ML workloads, custom model training

**Main Server (API + Web):**
```yaml
# docker-compose.main.yml
services:
  web:
    build: ./apps/web
    environment:
      - VITE_API_URL=https://api.example.com
  api-gateway:
    build: ./packages/api-gateway
    environment:
      - ML_SERVICE_URL=https://ml.example.com:8001
      - QDRANT_URL=https://ml.example.com:6333
  postgres:
    image: pgvector/pgvector:pg15
  redis:
    image: redis:7-alpine
  directus:
    build: ./services/directus
```

**ML Server (GPU-enabled):**
```yaml
# docker-compose.ml.yml
services:
  ml-service:
    build: ./packages/ml-service
    ports: ["8001:8000"]
    environment:
      - DATABASE_URL=postgresql://main.example.com/synthstack
      - QDRANT_URL=http://localhost:6333
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
  qdrant:
    image: qdrant/qdrant:v1.7.4
    ports: ["6333:6333"]
```

**Pros:**
- GPU acceleration for ML workloads
- Independent ML service scaling
- Reduce load on main server

**Cons:**
- Network latency between services
- More infrastructure to manage

---

#### 4. Full Microservices
**Best for:** Enterprise, high-availability, large teams

```
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Load         │   │  Load         │   │  Load         │
│  Balancer     │   │  Balancer     │   │  Balancer     │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
   ┌────┴────┐         ┌────┴────┐        ┌────┴────┐
   │  Web    │         │  API    │        │  ML     │
   │  (×3)   │         │  (×5)   │        │  (×2)   │
   └─────────┘         └─────────┘        └─────────┘
                            │                   │
                    ┌───────┴────────┬──────────┘
                    │                │
            ┌───────┴────┐   ┌───────┴────┐
            │ PostgreSQL │   │   Redis    │
            │  Primary   │   │  Cluster   │
            │ + Replicas │   │            │
            └────────────┘   └────────────┘
```

**Environment Configuration:**

```env
# Frontend Servers (×3)
VITE_API_URL=https://api.example.com

# API Gateway Servers (×5)
DATABASE_URL=postgresql://db-primary.example.com:5432/synthstack
REDIS_URL=redis://redis-cluster.example.com:6379
ML_SERVICE_URL=https://ml.example.com:8001

# ML Service Servers (×2)
DATABASE_URL=postgresql://db-primary.example.com:5432/synthstack
QDRANT_URL=https://qdrant.example.com:6333

# Shared Databases (managed)
DATABASE_URL=postgresql://rds.amazonaws.com/synthstack  # AWS RDS
REDIS_URL=redis://elasticache.amazonaws.com:6379        # AWS ElastiCache
```

**Pros:**
- Maximum scalability
- Fault isolation
- Independent service updates
- Optimal resource utilization

**Cons:**
- Complex orchestration (Kubernetes recommended)
- Higher operational cost
- Network latency between services

---

### Message Brokering for Microservices

BullMQ + Redis enable reliable async processing across distributed services:

```
┌─────────────────┐
│  API Gateway    │
│  (Server 1)     │
└────────┬────────┘
         │ Add job to queue
         ↓
┌─────────────────┐
│  Redis          │
│  (Managed)      │
└────────┬────────┘
         │ Job picked up
         ↓
┌─────────────────┐
│  Worker Process │
│  (Server 2)     │
└─────────────────┘
```

**Queue Features:**
- **Retry Logic:** Exponential backoff, 3 attempts
- **Priority Levels:** High (10), Normal (0), Low (1)
- **Scheduled Jobs:** Delay parameter for future execution
- **Progress Tracking:** Real-time status updates
- **Dead Letter Queue:** Failed jobs for manual review

**Example: Email Queue**
```typescript
// API Gateway (Server 1) - Add email job
await emailQueue.addEmail({
  to: 'user@example.com',
  subject: 'Welcome',
  template: 'welcome',
}, { priority: 10, delay: 5000 });

// Worker Process (Server 2) - Process email
emailQueue.process(async (job) => {
  await sendEmail(job.data);
});
```

**Example: Orchestration Queue**
```typescript
// API Gateway - Trigger AI workflow
await orchestrationQueue.addJob({
  type: 'batch',
  input: { documents: [...] },
  userId: 'user-123',
}, { priority: 5 });

// Worker Process - Execute workflow
orchestrationQueue.process(async (job) => {
  const result = await runBatchOrchestration(job.data);
  // Emit SSE event to user
  emitDashboardEvent('workflow_completed', result);
});
```

---

### Load Balancing Strategies

#### API Gateway (Stateless)
```nginx
# nginx.conf
upstream api_backend {
    least_conn;
    server api1.example.com:3003;
    server api2.example.com:3003;
    server api3.example.com:3003;
}

server {
    location /api/ {
        proxy_pass http://api_backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### ML Service (GPU Workloads)
```nginx
upstream ml_backend {
    least_conn;  # Route to least busy server
    server ml1.example.com:8001 max_fails=3 fail_timeout=30s;
    server ml2.example.com:8001 max_fails=3 fail_timeout=30s;
}
```

---

### Database Scaling

#### PostgreSQL Read Replicas
```env
# Write operations (API Gateway)
DATABASE_URL=postgresql://primary.example.com:5432/synthstack

# Read operations (Analytics, Reports)
DATABASE_READ_URL=postgresql://replica.example.com:5432/synthstack
```

#### Redis Cluster
```env
# High availability with Redis Sentinel
REDIS_URL=redis://sentinel1.example.com:26379,sentinel2.example.com:26379
REDIS_SENTINEL_NAME=synthstack-redis
```

---

### Monitoring Multi-Server Deployments

**Health Checks:**
```bash
# API Gateway
curl https://api.example.com/health

# ML Service
curl https://ml.example.com/health

# Database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Redis connectivity
redis-cli -h redis.example.com ping
```

**Distributed Tracing:**
- Use Sentry for error tracking across services
- Add `X-Request-ID` header for request tracing
- Log service-to-service calls with correlation IDs

**Metrics to Monitor:**
- API Gateway: Request rate, latency, error rate
- ML Service: Queue depth, processing time, GPU utilization
- PostgreSQL: Connection count, query time, replication lag
- Redis: Memory usage, queue size, eviction rate

📖 See [MICROSERVICES_DEPLOYMENT.md](./MICROSERVICES_DEPLOYMENT.md) for detailed examples

---

## Deployment

### Docker Compose Production

Use the production compose file included in this repository:

- **File:** `deploy/docker-compose.yml`
- **Reverse proxy + TLS:** Traefik (Let’s Encrypt)
- **Images:** `ghcr.io/<org>/<app>/*` (override via env)

```bash
docker compose -f deploy/docker-compose.yml up -d
```

### Kubernetes Deployment

**File:** `k8s/api-gateway-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: synthstack
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1.0.0
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api-gateway
              topologyKey: kubernetes.io/hostname
      containers:
      - name: api-gateway
        image: synthstack/api-gateway:v1.0.0
        ports:
        - containerPort: 3003
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3003
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: synthstack
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3003
    protocol: TCP
  selector:
    app: api-gateway
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: synthstack
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Zero-Downtime Deployment

```bash
#!/bin/bash
# deploy.sh - Zero-downtime rolling deployment

set -e

echo "🚀 Starting deployment..."

# 1. Build new images
echo "📦 Building Docker images..."
docker build -t synthstack/api-gateway:$VERSION -f packages/api-gateway/Dockerfile .
docker build -t synthstack/ml-service:$VERSION -f packages/ml-service/Dockerfile .

# 2. Push to registry
echo "📤 Pushing to registry..."
docker push synthstack/api-gateway:$VERSION
docker push synthstack/ml-service:$VERSION

# 3. Apply database migrations (if any)
echo "🗄️  Applying database migrations..."
kubectl exec -it deploy/api-gateway -- pnpm run migrate

# 4. Rolling update
echo "🔄 Starting rolling update..."
kubectl set image deployment/api-gateway \
  api-gateway=synthstack/api-gateway:$VERSION \
  --record

kubectl set image deployment/ml-service \
  ml-service=synthstack/ml-service:$VERSION \
  --record

# 5. Wait for rollout
echo "⏳ Waiting for rollout..."
kubectl rollout status deployment/api-gateway
kubectl rollout status deployment/ml-service

# 6. Verify health
echo "🏥 Checking health..."
HEALTH=$(curl -s https://api.yourdomain.com/health | jq -r '.status')
if [ "$HEALTH" != "ok" ]; then
  echo "❌ Health check failed! Rolling back..."
  kubectl rollout undo deployment/api-gateway
  kubectl rollout undo deployment/ml-service
  exit 1
fi

echo "✅ Deployment successful!"
```

---

## Monitoring & Alerting

### Health Checks

**API Gateway Health Endpoints:**

```typescript
// GET /health - Basic health check
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0"
}

// GET /ready - Readiness check (dependencies)
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "ml_service": "ok",
    "qdrant": "ok"
  }
}

// GET /live - Liveness check (process alive)
{
  "status": "alive"
}
```

### Prometheus Metrics

**Expose metrics endpoint:**

```typescript
// packages/api-gateway/src/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// ML service metrics
export const mlRequestDuration = new Histogram({
  name: 'ml_request_duration_seconds',
  help: 'Duration of ML service requests',
  labelNames: ['endpoint', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const mlCreditsCharged = new Counter({
  name: 'ml_credits_charged_total',
  help: 'Total ML credits charged',
  labelNames: ['endpoint', 'tier'],
});

// Database metrics
export const dbConnectionPool = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Current database connection pool size',
  labelNames: ['state'],  // active, idle, waiting
});

// Register metrics endpoint
fastify.get('/metrics', async (request, reply) => {
  reply.type('text/plain');
  return register.metrics();
});
```

### Grafana Dashboards

**Import dashboard JSON:**

```json
{
  "dashboard": {
    "title": "SynthStack API Gateway",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(http_requests_total[5m])"
        }]
      },
      {
        "title": "Response Time (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
        }]
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])"
        }]
      },
      {
        "title": "ML Credits/Hour",
        "targets": [{
          "expr": "increase(ml_credits_charged_total[1h])"
        }]
      }
    ]
  }
}
```

### Alert Rules

**File:** `alerts/synthstack.rules.yml`

```yaml
groups:
- name: synthstack_alerts
  interval: 30s
  rules:
  # High error rate
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }}% over the last 5 minutes"

  # High latency
  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency detected"
      description: "P95 latency is {{ $value }}s"

  # Database down
  - alert: DatabaseDown
    expr: up{job="postgres"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Database is down"
      description: "PostgreSQL instance is not responding"

  # Low credits remaining
  - alert: LowSystemCredits
    expr: sum(credits_remaining) < 1000
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "System credits running low"
      description: "Only {{ $value }} credits remaining across all users"

  # ML service down
  - alert: MLServiceDown
    expr: up{job="ml-service"} == 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "ML service is down"
      description: "ML service instance is not responding"
```

### PagerDuty Integration

```yaml
# alertmanager.yml
receivers:
- name: 'pagerduty'
  pagerduty_configs:
  - service_key: '<your-service-key>'
    severity: '{{ .GroupLabels.severity }}'
    description: '{{ .CommonAnnotations.summary }}'
    details:
      firing: '{{ .Alerts.Firing | len }}'
      resolved: '{{ .Alerts.Resolved | len }}'
```

---

## Log Aggregation

### Structured Logging

```typescript
// packages/api-gateway/src/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      node_version: process.version,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.credit_card',
    ],
    remove: true,
  },
});

// Usage
logger.info({ userId: '123', endpoint: '/api/v1/credits' }, 'Credit check');
logger.error({ err, userId: '123' }, 'Failed to deduct credits');
```

### ELK Stack (Elasticsearch, Logstash, Kibana)

**Logstash Config:**

```ruby
# logstash.conf
input {
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  # Parse JSON logs
  json {
    source => "message"
  }

  # Add geo-location from IP
  geoip {
    source => "ip_address"
  }

  # Parse user agent
  useragent {
    source => "user_agent"
    target => "ua"
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "synthstack-%{+YYYY.MM.dd}"
  }
}
```

### CloudWatch Logs

```typescript
// AWS CloudWatch integration
import { CloudWatchLogsClient, PutLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

const cloudwatchStream = new CloudWatchLogsClient({
  region: process.env.AWS_REGION,
});

// Send logs to CloudWatch
logger.addTarget({
  stream: cloudwatchStream,
  group: '/synthstack/api-gateway',
  stream: process.env.HOSTNAME,
});
```

---

## Performance Monitoring

### Application Performance Monitoring (APM)

**Sentry Integration:**

```typescript
// packages/api-gateway/src/instrument.ts
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of transactions
  profilesSampleRate: 0.1,
  integrations: [
    new ProfilingIntegration(),
  ],
});

// Capture performance
const transaction = Sentry.startTransaction({
  op: "ml.request",
  name: "Generate Embeddings",
});

try {
  const result = await mlService.generateEmbeddings(text);
  transaction.setStatus("ok");
} catch (error) {
  transaction.setStatus("internal_error");
  Sentry.captureException(error);
} finally {
  transaction.finish();
}
```

### Database Query Monitoring

```typescript
// Log slow queries
fastify.pg.pool.on('query', (query) => {
  const start = Date.now();
  query.on('end', () => {
    const duration = Date.now() - start;
    if (duration > 100) {  // Log queries > 100ms
      logger.warn({
        query: query.text,
        duration,
        params: query.values,
      }, 'Slow query detected');
    }
  });
});
```

---

## Database Operations

### Backup Strategy

**Automated Daily Backups:**

```bash
#!/bin/bash
# backup-database.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
BACKUP_FILE="$BACKUP_DIR/synthstack_$TIMESTAMP.sql.gz"

# Create backup with compression
pg_dump -h localhost -U synthstack synthstack | gzip > "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "s3://synthstack-backups/database/"

# Keep only last 30 days locally
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

**Cron Schedule:**

```bash
# Run daily at 2 AM
0 2 * * * /scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

### Restore Procedure

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1

# Download from S3 if needed
if [[ $BACKUP_FILE == s3://* ]]; then
  aws s3 cp "$BACKUP_FILE" /tmp/restore.sql.gz
  BACKUP_FILE="/tmp/restore.sql.gz"
fi

# Stop application
kubectl scale deployment/api-gateway --replicas=0

# Drop and recreate database
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS synthstack;"
psql -h localhost -U postgres -c "CREATE DATABASE synthstack;"

# Restore
gunzip -c "$BACKUP_FILE" | psql -h localhost -U synthstack synthstack

# Restart application
kubectl scale deployment/api-gateway --replicas=3

echo "Restore completed from: $BACKUP_FILE"
```

---

## Scaling Strategies

### Horizontal Scaling

**Auto-scaling based on metrics:**

```yaml
# HPA configuration
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
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### Vertical Scaling

```bash
# Increase resources for API Gateway
kubectl set resources deployment/api-gateway \
  --requests=cpu=2,memory=4Gi \
  --limits=cpu=4,memory=8Gi

# Restart pods with new resources
kubectl rollout restart deployment/api-gateway
```

### Database Read Replicas

```yaml
# PostgreSQL read replica
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: synthstack-postgres
spec:
  instances: 3  # 1 primary + 2 replicas
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "1GB"

  # Route read queries to replicas
  replicationSlots:
    highAvailability:
      enabled: true
```

---

## Disaster Recovery

### Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

| Component | RTO | RPO | Strategy |
|-----------|-----|-----|----------|
| **API Gateway** | 5 min | 0 | Multi-region deployment |
| **Database** | 15 min | 5 min | Point-in-time recovery |
| **Redis** | 5 min | 1 hour | Rebuild from source |
| **ML Service** | 10 min | 0 | Stateless, redeploy |

### Multi-Region Failover

```bash
# Primary region fails, switch to secondary
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z789012",
          "DNSName": "api-secondary.yourdomain.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0 - Critical** | Total outage | Immediate | Database down, site unreachable |
| **P1 - High** | Major degradation | < 15 min | High error rate (>10%), slow responses |
| **P2 - Medium** | Partial degradation | < 1 hour | Single service down, elevated latency |
| **P3 - Low** | Minor issue | < 4 hours | Non-critical feature broken |

### Incident Response Playbook

**1. Detection** (Auto-alert or manual report)
```bash
# Check overall health
curl https://api.yourdomain.com/health

# Check metrics dashboard
https://grafana.yourdomain.com/d/synthstack

# View recent logs
kubectl logs -l app=api-gateway --tail=100 -f
```

**2. Assessment** (Determine severity)
```bash
# Check error rates
curl https://api.yourdomain.com/metrics | grep http_requests_total

# Check database connections
psql -h postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check resource usage
kubectl top pods -n synthstack
```

**3. Mitigation** (Quick fixes)
```bash
# Restart unhealthy pods
kubectl delete pod -l app=api-gateway,status=CrashLoopBackOff

# Scale up if under heavy load
kubectl scale deployment/api-gateway --replicas=10

# Enable maintenance mode (if needed)
kubectl set env deployment/api-gateway MAINTENANCE_MODE=true
```

**4. Resolution** (Fix root cause)
```bash
# Rollback to previous version
kubectl rollout undo deployment/api-gateway

# Apply hotfix
git cherry-pick <commit-sha>
./deploy.sh v1.0.1-hotfix
```

**5. Post-Mortem** (Document learnings)
- Create incident report
- Root cause analysis
- Action items to prevent recurrence

---

## Common Issues & Solutions

### Issue: High API Latency

**Symptoms:**
- P95 response time > 1s
- Slow database queries

**Diagnosis:**
```bash
# Check slow queries
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check connection pool
psql -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Check API metrics
curl localhost:3003/metrics | grep http_request_duration
```

**Solutions:**
1. Add database indexes
2. Increase connection pool size
3. Enable Redis caching
4. Scale horizontally (add replicas)

---

### Issue: Out of Memory (OOM)

**Symptoms:**
- Pods restarting frequently
- `OOMKilled` status

**Diagnosis:**
```bash
# Check memory usage
kubectl top pods -n synthstack

# View OOM events
kubectl describe pod <pod-name> | grep OOM
```

**Solutions:**
1. Increase memory limits
2. Fix memory leaks (check Sentry)
3. Implement request throttling
4. Add horizontal scaling

---

### Issue: Database Connection Exhaustion

**Symptoms:**
- `FATAL: sorry, too many clients already`
- 503 errors

**Diagnosis:**
```bash
# Check active connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check max connections
psql -c "SHOW max_connections;"
```

**Solutions:**
1. Increase `max_connections` in PostgreSQL
2. Implement connection pooling
3. Close unused connections
4. Add read replicas

---

### Issue: ML Service Timeout

**Symptoms:**
- 504 Gateway Timeout
- ML requests failing

**Diagnosis:**
```bash
# Check ML service health
curl http://ml-service:8000/health

# View ML service logs
kubectl logs -l app=ml-service --tail=50
```

**Solutions:**
1. Increase timeout limits
2. Scale ML service replicas
3. Check OpenAI API status
4. Implement request queuing

---

## Summary

### Production Checklist

✅ **Before Go-Live:**
- [ ] All secrets rotated (JWT, database, API keys)
- [ ] SSL certificates installed and auto-renewal configured
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting enabled
- [ ] Health checks passing on all services
- [ ] Monitoring dashboards configured
- [ ] Alerts configured in PagerDuty/Opsgenie
- [ ] Log aggregation working (ELK/CloudWatch)
- [ ] Database backups scheduled (daily)
- [ ] Disaster recovery plan documented
- [ ] Load testing completed (target: 10,000 req/s)
- [ ] Security audit completed

✅ **Post-Launch:**
- [ ] Monitor error rates (target: < 0.1%)
- [ ] Monitor latency (target: p95 < 500ms)
- [ ] Monitor resource usage (CPU < 70%, Memory < 80%)
- [ ] Review logs daily for issues
- [ ] Test backup restoration monthly
- [ ] Conduct incident response drills quarterly

---

**Need help?** Open an issue at [github.com/manicinc/synthstack](https://github.com/manicinc/synthstack/issues)

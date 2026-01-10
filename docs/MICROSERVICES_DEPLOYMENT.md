# SynthStack Microservices Deployment Guide

**Comprehensive guide for deploying SynthStack services across multiple servers**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Deployment Scenarios](#deployment-scenarios)
4. [Configuration Examples](#configuration-examples)
5. [Load Balancing](#load-balancing)
6. [Database Scaling](#database-scaling)
7. [Message Brokering](#message-brokering)
8. [Monitoring & Observability](#monitoring--observability)
9. [Troubleshooting](#troubleshooting)

---

## Overview

SynthStack is built as a **modular monorepo** that supports flexible deployment strategies. You can deploy everything on a single server (monolithic) or distribute services across multiple servers (microservices) based on your scaling needs.

### Key Benefits

- **Flexible Deployment** - Start monolithic, scale to microservices
- **Independent Scaling** - Scale each service based on demand
- **Technology Diversity** - Use managed services or self-hosted
- **Fault Isolation** - Service failures don't cascade
- **Cost Optimization** - Pay only for resources you need

### Service Independence

All services communicate via well-defined APIs and can be deployed independently:

| Service | Stateless | Horizontally Scalable | Can Use Managed Service |
|---------|-----------|----------------------|------------------------|
| **Frontend** | ✅ Yes | ✅ Yes | ✅ Yes (CDN, Vercel, Netlify) |
| **API Gateway** | ✅ Yes | ✅ Yes | ✅ Yes (Docker, Kubernetes) |
| **ML Service** | ✅ Yes | ✅ Yes | ✅ Yes (GPU instances) |
| **PostgreSQL** | ❌ No | ⚠️ Read replicas | ✅ Yes (RDS, Supabase) |
| **Redis** | ⚠️ Depends | ✅ Yes | ✅ Yes (ElastiCache, Redis Cloud) |
| **Qdrant** | ⚠️ Depends | ✅ Yes | ✅ Yes (Qdrant Cloud) |
| **Directus** | ⚠️ Depends | ❌ No* | ❌ No |

*Directus manages media uploads, requires shared storage for horizontal scaling

---

## Architecture Patterns

### Pattern 1: Monolithic (Default)

**Best For:** Development, MVP, small teams (< 100 users)

```
┌─────────────────────────────────────┐
│         Single Server (4 vCPU)      │
│  ┌─────────────────────────────┐   │
│  │  Web (Vue 3)     :3050      │   │
│  │  API Gateway     :3003      │   │
│  │  ML Service      :8001      │   │
│  │  Directus CMS    :8055      │   │
│  │  PostgreSQL      :5432      │   │
│  │  Redis           :6379      │   │
│  │  Qdrant          :6333      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Pros:**
- ✅ Simple deployment (single `docker compose up`)
- ✅ Low operational overhead
- ✅ Fast inter-service communication (no network hops)
- ✅ Easy to debug and monitor

**Cons:**
- ❌ Single point of failure
- ❌ Limited horizontal scaling
- ❌ Resource contention between services
- ❌ Downtime required for updates

**When to Use:**
- Development and testing
- MVP with < 100 active users
- Budget-constrained projects
- Single-region deployments

---

### Pattern 2: Separated Frontend/Backend

**Best For:** Production, global users, high traffic (100-10K users)

```
┌──────────────────┐         ┌─────────────────────────┐
│  CDN / Vercel    │         │  Application Server     │
│  ┌────────────┐  │  HTTPS  │  ┌───────────────────┐  │
│  │ Web :443   │──┼────────→│  │ API Gateway :3003 │  │
│  │ (Static)   │  │         │  │ ML Service  :8001 │  │
│  └────────────┘  │         │  │ Directus    :8055 │  │
└──────────────────┘         │  └───────────────────┘  │
         ↓                   │  ┌───────────────────┐  │
    Cloudflare               │  │ PostgreSQL :5432  │  │
    (Global CDN)             │  │ Redis      :6379  │  │
                             │  │ Qdrant     :6333  │  │
                             │  └───────────────────┘  │
                             └─────────────────────────┘
```

**Pros:**
- ✅ Fast global frontend delivery via CDN
- ✅ Independent scaling of frontend/backend
- ✅ Better security isolation
- ✅ Zero-downtime frontend deployments

**Cons:**
- ⚠️ CORS configuration required
- ⚠️ More complex deployment pipeline
- ⚠️ Two separate deployment processes

**When to Use:**
- Production applications
- Global user base
- High traffic (> 100 concurrent users)
- Need fast page loads worldwide

---

### Pattern 3: Dedicated ML Server

**Best For:** Heavy ML workloads, custom model training (1K-100K users)

```
┌────────────────────────┐         ┌─────────────────────────┐
│  Main Server (4 vCPU)  │  HTTP   │  ML Server (GPU 16GB)   │
│  ┌──────────────────┐  │         │  ┌───────────────────┐  │
│  │ Web :3050        │  │         │  │ ML Service :8001  │  │
│  │ API Gateway:3003 │──┼────────→│  │ (FastAPI/Django)  │  │
│  │ Directus :8055   │  │         │  │ + PyTorch/TF      │  │
│  └──────────────────┘  │         │  └───────────────────┘  │
│  ┌──────────────────┐  │         │  ┌───────────────────┐  │
│  │ PostgreSQL :5432 │  │         │  │ Qdrant :6333      │  │
│  │ Redis :6379      │  │         │  │ (Vector DB)       │  │
│  └──────────────────┘  │         │  └───────────────────┘  │
└────────────────────────┘         └─────────────────────────┘
```

**Pros:**
- ✅ GPU acceleration for ML workloads
- ✅ Independent ML service scaling
- ✅ Reduce load on main server
- ✅ Cost-effective (GPU only where needed)

**Cons:**
- ⚠️ Network latency between services (50-200ms)
- ⚠️ More infrastructure to manage
- ⚠️ Higher total cost

**When to Use:**
- Custom model training/fine-tuning
- Local LLM inference (Ollama, vLLM)
- Heavy RAG workloads
- GPU-accelerated tasks

---

### Pattern 4: Full Microservices

**Best For:** Enterprise, high-availability (10K-1M+ users)

```
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Load         │   │  Load         │   │  Load         │
│  Balancer     │   │  Balancer     │   │  Balancer     │
│  (Nginx/HAP)  │   │  (Nginx/HAP)  │   │  (Nginx/HAP)  │
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
            │ + Replicas │   │  (3 nodes) │
            └────────────┘   └────────────┘
```

**Pros:**
- ✅ Maximum scalability (millions of users)
- ✅ Fault isolation (service failures don't cascade)
- ✅ Independent service updates
- ✅ Optimal resource utilization

**Cons:**
- ⚠️ Complex orchestration (Kubernetes required)
- ⚠️ Higher operational cost
- ⚠️ Network latency between services
- ⚠️ Distributed tracing required

**When to Use:**
- Enterprise applications
- High-availability requirements (99.99% SLA)
- Multiple geographic regions
- Large teams with dedicated DevOps

---

## Deployment Scenarios

### Scenario 1: All-in-One Development

**Infrastructure:** Single server (4 vCPU, 8GB RAM, 100GB SSD)

```bash
# 1. Clone repository
git clone https://github.com/manicinc/synthstack.git
cd synthstack

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start all services
docker compose up -d

# 4. Access services
# Frontend: http://localhost:3050
# API Gateway: http://localhost:3003
# Directus: http://localhost:8099
```

**Environment Variables:**
```env
# Development - all services on localhost
VITE_API_URL=http://localhost:3003
VITE_DIRECTUS_URL=http://localhost:8099
DATABASE_URL=postgresql://synthstack:synthstack_dev_2024@localhost:5499/synthstack
REDIS_URL=redis://localhost:6399
ML_SERVICE_URL=http://localhost:8001
QDRANT_URL=http://localhost:6333
```

**Cost:** ~$40/month (DigitalOcean Droplet, 4GB)

---

### Scenario 2: Separated Frontend on CDN

**Infrastructure:**
- Frontend: Vercel/Netlify (CDN)
- Backend: Single server (4 vCPU, 8GB RAM)

```bash
# ============================================
# FRONTEND DEPLOYMENT (Vercel)
# ============================================

# 1. Deploy to Vercel
cd apps/web
pnpm build
vercel deploy --prod

# Set environment variables in Vercel dashboard
VITE_API_URL=https://api.yourdomain.com
VITE_DIRECTUS_URL=https://cms.yourdomain.com

# ============================================
# BACKEND DEPLOYMENT (Application Server)
# ============================================

# 1. SSH into server
ssh root@your-server-ip

# 2. Clone and configure
git clone https://github.com/manicinc/synthstack.git
cd synthstack
cp .env.example .env

# 3. Edit .env for production
nano .env
```

**Backend .env:**
```env
# Production - backend on dedicated server
NODE_ENV=production
PORT=3003
HOST=0.0.0.0

# Database (local or managed)
DATABASE_URL=postgresql://synthstack:password@localhost:5432/synthstack
REDIS_URL=redis://localhost:6379

# Services
ML_SERVICE_URL=http://localhost:8001
QDRANT_URL=http://localhost:6333
DIRECTUS_URL=http://localhost:8055

# CORS (allow frontend domain)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
```

```bash
# 4. Start backend services
docker compose up -d api-gateway ml-service postgres redis qdrant directus

# 5. Setup nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/synthstack
```

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/synthstack

# API Gateway
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

# Directus CMS
server {
    listen 80;
    server_name cms.yourdomain.com;

    location / {
        proxy_pass http://localhost:8055;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# 6. Enable site and get SSL
sudo ln -s /etc/nginx/sites-available/synthstack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Let's Encrypt SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com -d cms.yourdomain.com
```

**Cost:** ~$60/month
- Vercel: Free (Hobby) or $20/month (Pro)
- Backend Server: $40/month (DigitalOcean, 4GB)

---

### Scenario 3: Dedicated ML Server with GPU

**Infrastructure:**
- Main Server: 4 vCPU, 8GB RAM (API + Web + DB)
- ML Server: GPU instance (NVIDIA T4 16GB)

```bash
# ============================================
# MAIN SERVER SETUP
# ============================================

# 1. SSH into main server
ssh root@main-server-ip

# 2. Clone and configure
git clone https://github.com/manicinc/synthstack.git
cd synthstack

# 3. Create docker-compose.main.yml
nano docker-compose.main.yml
```

**docker-compose.main.yml:**
```yaml
version: '3.8'

services:
  web:
    build: ./apps/web
    ports:
      - "3050:3050"
    environment:
      - VITE_API_URL=https://api.yourdomain.com
      - VITE_DIRECTUS_URL=https://cms.yourdomain.com
    restart: always

  api-gateway:
    build: ./packages/api-gateway
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://synthstack:password@postgres:5432/synthstack
      - REDIS_URL=redis://redis:6379
      - ML_SERVICE_URL=https://ml.yourdomain.com:8001
      - QDRANT_URL=https://ml.yourdomain.com:6333
      - DIRECTUS_URL=http://directus:8055
    depends_on:
      - postgres
      - redis
    restart: always

  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: synthstack
      POSTGRES_USER: synthstack
      POSTGRES_PASSWORD: password
    volumes:
      - ./db_data/postgres:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - ./db_data/redis:/data
    restart: always

  directus:
    build: ./services/directus
    ports:
      - "8055:8055"
    environment:
      DB_CLIENT: pg
      DB_HOST: postgres
      DB_PORT: 5432
      DB_DATABASE: synthstack
      DB_USER: synthstack
      DB_PASSWORD: password
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis
    restart: always
```

```bash
# 4. Start main services
docker compose -f docker-compose.main.yml up -d

# ============================================
# ML SERVER SETUP (GPU Instance)
# ============================================

# 1. SSH into ML server
ssh root@ml-server-ip

# 2. Install NVIDIA Docker
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# 3. Clone repository
git clone https://github.com/manicinc/synthstack.git
cd synthstack

# 4. Create docker-compose.ml.yml
nano docker-compose.ml.yml
```

**docker-compose.ml.yml:**
```yaml
version: '3.8'

services:
  ml-service:
    build: ./packages/ml-service
    ports:
      - "8001:8000"
    environment:
      - DATABASE_URL=postgresql://synthstack:password@main-server-ip:5432/synthstack
      - QDRANT_URL=http://qdrant:6333
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: always

  qdrant:
    image: qdrant/qdrant:v1.7.4
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - ./db_data/qdrant:/qdrant/storage
    restart: always
```

```bash
# 5. Start ML services with GPU
docker compose -f docker-compose.ml.yml up -d

# 6. Verify GPU is accessible
docker exec -it synthstack-ml-service nvidia-smi
```

**Cost:** ~$250/month
- Main Server: $40/month (DigitalOcean, 4GB)
- ML Server: $200/month (Lambda Labs, GPU T4)

---

### Scenario 4: Full Microservices with Managed Services

**Infrastructure:**
- Frontend: Vercel (CDN)
- API Gateway: 3× instances (Kubernetes)
- ML Service: 2× GPU instances
- PostgreSQL: AWS RDS (managed)
- Redis: AWS ElastiCache (managed)
- Qdrant: Qdrant Cloud (managed)

```bash
# ============================================
# KUBERNETES DEPLOYMENT
# ============================================

# 1. Create k8s manifests
mkdir k8s && cd k8s

# 2. Create namespace
cat <<EOF > namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: synthstack
EOF

# 3. Create secrets
cat <<EOF > secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: synthstack-secrets
  namespace: synthstack
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@rds.amazonaws.com:5432/synthstack"
  REDIS_URL: "redis://elasticache.amazonaws.com:6379"
  OPENAI_API_KEY: "sk-..."
  ANTHROPIC_API_KEY: "sk-ant-..."
  STRIPE_SECRET_KEY: "sk_live_..."
EOF

# 4. Create API Gateway deployment
cat <<EOF > api-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: synthstack
spec:
  replicas: 3
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
        ports:
        - containerPort: 3003
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: synthstack-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: synthstack-secrets
              key: REDIS_URL
        - name: ML_SERVICE_URL
          value: "http://ml-service:8001"
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
        readinessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: synthstack
spec:
  selector:
    app: api-gateway
  ports:
  - port: 3003
    targetPort: 3003
  type: LoadBalancer
EOF

# 5. Create ML Service deployment
cat <<EOF > ml-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-service
  namespace: synthstack
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ml-service
  template:
    metadata:
      labels:
        app: ml-service
    spec:
      containers:
      - name: ml-service
        image: synthstack/ml-service:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: synthstack-secrets
              key: DATABASE_URL
        - name: QDRANT_URL
          value: "https://qdrant-cloud.com:6333"
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: synthstack-secrets
              key: OPENAI_API_KEY
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
            nvidia.com/gpu: 1
          limits:
            memory: "16Gi"
            cpu: "4000m"
            nvidia.com/gpu: 1
---
apiVersion: v1
kind: Service
metadata:
  name: ml-service
  namespace: synthstack
spec:
  selector:
    app: ml-service
  ports:
  - port: 8001
    targetPort: 8000
  type: ClusterIP
EOF

# 6. Apply manifests
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f api-gateway.yaml
kubectl apply -f ml-service.yaml

# 7. Check status
kubectl get pods -n synthstack
kubectl get services -n synthstack
```

**Frontend Deployment (Vercel):**
```bash
cd apps/web
pnpm build

# Set environment variables in Vercel
VITE_API_URL=https://api.yourdomain.com

vercel deploy --prod
```

**Cost:** ~$800-1500/month
- Vercel: $20/month (Pro)
- Kubernetes: $300-500/month (AWS EKS or DigitalOcean)
- API Gateway (3×): $120/month
- ML Service (2× GPU): $400-800/month
- RDS PostgreSQL: $50-100/month
- ElastiCache Redis: $30-50/month
- Qdrant Cloud: $50-100/month

---

## Configuration Examples

### Environment Variables by Service

#### Frontend (Vue 3 + Quasar)
```env
# apps/web/.env.production
VITE_API_URL=https://api.yourdomain.com
VITE_DIRECTUS_URL=https://cms.yourdomain.com
VITE_ENABLE_COPILOT=true
VITE_ENABLE_REFERRALS=true
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

#### API Gateway (Fastify)
```env
# packages/api-gateway/.env
NODE_ENV=production
PORT=3003
HOST=0.0.0.0
LOG_LEVEL=warn

# Security
JWT_SECRET=<strong-random-secret>
SESSION_SECRET=<strong-random-secret>
CORS_ORIGINS=https://yourdomain.com

# Databases
DATABASE_URL=postgresql://user:pass@postgres:5432/synthstack
REDIS_URL=redis://redis:6379

# Services
ML_SERVICE_URL=https://ml.yourdomain.com:8001
DIRECTUS_URL=http://directus:8055
QDRANT_URL=https://qdrant.yourdomain.com:6333

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...

# Feature Flags
ENABLE_COPILOT=true
ENABLE_REFERRALS=true
```

#### ML Service (FastAPI/Django)
```env
# packages/ml-service/.env
DATABASE_URL=postgresql://user:pass@postgres:5432/synthstack
QDRANT_URL=http://qdrant:6333
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# GPU Configuration (optional)
CUDA_VISIBLE_DEVICES=0
```

---

## Load Balancing

### Nginx Configuration for API Gateway

```nginx
# /etc/nginx/nginx.conf

http {
    # API Gateway upstream
    upstream api_backend {
        least_conn;  # Route to least busy server
        server api1.yourdomain.com:3003 max_fails=3 fail_timeout=30s;
        server api2.yourdomain.com:3003 max_fails=3 fail_timeout=30s;
        server api3.yourdomain.com:3003 max_fails=3 fail_timeout=30s;
    }

    # ML Service upstream
    upstream ml_backend {
        least_conn;
        server ml1.yourdomain.com:8001 max_fails=3 fail_timeout=30s;
        server ml2.yourdomain.com:8001 max_fails=3 fail_timeout=30s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=ml_limit:10m rate=2r/s;

    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

        # API Gateway
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # ML Service
        location /ml/ {
            limit_req zone=ml_limit burst=5 nodelay;

            proxy_pass http://ml_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            # Longer timeout for ML operations
            proxy_read_timeout 300s;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "OK";
            add_header Content-Type text/plain;
        }
    }
}
```

### HAProxy Configuration (Alternative)

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

# API Gateway Backend
backend api_backend
    balance leastconn
    option httpchk GET /health
    http-check expect status 200
    server api1 api1.yourdomain.com:3003 check inter 2000 rise 2 fall 3
    server api2 api2.yourdomain.com:3003 check inter 2000 rise 2 fall 3
    server api3 api3.yourdomain.com:3003 check inter 2000 rise 2 fall 3

# ML Service Backend
backend ml_backend
    balance leastconn
    option httpchk GET /health
    http-check expect status 200
    timeout server 300000  # 5 minutes for ML operations
    server ml1 ml1.yourdomain.com:8001 check inter 5000 rise 2 fall 3
    server ml2 ml2.yourdomain.com:8001 check inter 5000 rise 2 fall 3

# Frontend
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/yourdomain.pem
    redirect scheme https if !{ ssl_fc }

    # Route to backends
    acl is_api path_beg /api/
    acl is_ml path_beg /ml/

    use_backend api_backend if is_api
    use_backend ml_backend if is_ml
    default_backend api_backend
```

---

## Database Scaling

### PostgreSQL Read Replicas

**Primary (Write Operations):**
```env
DATABASE_URL=postgresql://synthstack:password@db-primary.yourdomain.com:5432/synthstack?sslmode=require
```

**Replica (Read Operations):**
```env
DATABASE_READ_URL=postgresql://synthstack:password@db-replica.yourdomain.com:5432/synthstack?sslmode=require
```

**API Gateway Configuration:**
```typescript
// packages/api-gateway/src/config/database.ts

import { Pool } from 'pg';

// Primary connection (write operations)
const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
});

// Replica connection (read operations)
const replicaPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
  max: 50,  // More connections for read-heavy workload
  min: 10,
  idleTimeoutMillis: 30000,
});

// Route queries to appropriate pool
export async function query(sql: string, params: any[], write = false) {
  const pool = write ? primaryPool : replicaPool;
  return pool.query(sql, params);
}

// Example usage
// await query('INSERT INTO users ...', [], true);  // Write to primary
// await query('SELECT * FROM users ...', [], false);  // Read from replica
```

### Redis Cluster (High Availability)

**Redis Sentinel Configuration:**
```env
REDIS_SENTINELS=sentinel1.yourdomain.com:26379,sentinel2.yourdomain.com:26379,sentinel3.yourdomain.com:26379
REDIS_SENTINEL_NAME=synthstack-redis
REDIS_PASSWORD=your-password
```

**API Gateway Configuration:**
```typescript
// packages/api-gateway/src/config/redis.ts

import Redis from 'ioredis';

const redisConfig = {
  sentinels: process.env.REDIS_SENTINELS.split(',').map(s => {
    const [host, port] = s.split(':');
    return { host, port: parseInt(port) };
  }),
  name: process.env.REDIS_SENTINEL_NAME,
  password: process.env.REDIS_PASSWORD,
  // Retry strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

export const redis = new Redis(redisConfig);
```

---

## Message Brokering

### BullMQ Queue Configuration

**Email Queue (High Priority):**
```typescript
// packages/api-gateway/src/services/email/queue.ts

import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

// Create queue
export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: false,
  },
});

// Create worker (can be on different server)
const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, subject, template, data } = job.data;
    await sendEmail({ to, subject, template, data });
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,  // 10 jobs per second
      duration: 1000,
    },
  }
);

// Add email job (from API Gateway)
await emailQueue.add('welcome-email', {
  to: 'user@example.com',
  subject: 'Welcome to SynthStack',
  template: 'welcome',
  data: { name: 'John' },
}, {
  priority: 10,  // High priority
  delay: 5000,   // Send after 5 seconds
});
```

**Orchestration Queue (ML Workloads):**
```typescript
// packages/api-gateway/src/services/orchestration/queue.ts

import { Queue, Worker } from 'bullmq';

export const orchestrationQueue = new Queue('orchestration', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    timeout: 600000,  // 10 minutes timeout
  },
});

const orchestrationWorker = new Worker(
  'orchestration',
  async (job) => {
    const { type, input, userId } = job.data;

    // Update progress
    await job.updateProgress(10);

    // Execute batch orchestration
    const result = await runBatchOrchestration(input);

    await job.updateProgress(100);

    // Emit SSE event to notify user
    emitDashboardEvent(userId, 'workflow_completed', result);

    return result;
  },
  {
    connection,
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 60000,  // 5 jobs per minute
    },
  }
);

// Add orchestration job
await orchestrationQueue.add('batch-processing', {
  type: 'batch',
  input: { documents: [...] },
  userId: 'user-123',
}, {
  priority: 5,
});
```

### Server-Sent Events (SSE) for Real-Time Updates

```typescript
// packages/api-gateway/src/routes/dashboard-events.ts

import { FastifyRequest, FastifyReply } from 'fastify';

export async function streamDashboardEvents(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const orgId = request.user.organizationId;

  // Set SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send initial connection event
  reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Listen for events
  const eventHandler = (event: any) => {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Subscribe to organization events
  eventEmitter.on(`org:${orgId}`, eventHandler);

  // Handle client disconnect
  request.raw.on('close', () => {
    eventEmitter.off(`org:${orgId}`, eventHandler);
  });
}

// Emit event from worker process
import { eventEmitter } from './events';

eventEmitter.emit(`org:${orgId}`, {
  type: 'workflow_execution_completed',
  data: {
    executionId: '123',
    status: 'success',
    result: {...},
  },
});
```

---

## Monitoring & Observability

### Health Checks

**API Gateway Health Endpoint:**
```typescript
// packages/api-gateway/src/routes/health.ts

import { FastifyRequest, FastifyReply } from 'fastify';

export async function healthCheck(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const checks = {
    postgres: await checkPostgres(),
    redis: await checkRedis(),
    mlService: await checkMLService(),
    qdrant: await checkQdrant(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'healthy');

  reply.code(healthy ? 200 : 503).send({
    status: healthy ? 'healthy' : 'degraded',
    version: process.env.npm_package_version,
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

async function checkPostgres() {
  try {
    await db.query('SELECT 1');
    return { status: 'healthy', latency: 5 };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkRedis() {
  try {
    await redis.ping();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkMLService() {
  try {
    const response = await fetch(`${process.env.ML_SERVICE_URL}/health`);
    return { status: response.ok ? 'healthy' : 'unhealthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}
```

### Prometheus Metrics

```typescript
// packages/api-gateway/src/metrics.ts

import client from 'prom-client';

// Create metrics registry
const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const queueJobsProcessed = new client.Counter({
  name: 'queue_jobs_processed_total',
  help: 'Total number of queue jobs processed',
  labelNames: ['queue_name', 'status'],
  registers: [register],
});

export const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  registers: [register],
});

// Metrics endpoint
export async function metricsEndpoint(
  request: FastifyRequest,
  reply: FastifyReply
) {
  reply.type('text/plain').send(await register.metrics());
}
```

### Grafana Dashboard

**Prometheus Configuration:**
```yaml
# prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # API Gateway instances
  - job_name: 'api-gateway'
    static_configs:
      - targets:
          - 'api1.yourdomain.com:3003'
          - 'api2.yourdomain.com:3003'
          - 'api3.yourdomain.com:3003'

  # ML Service instances
  - job_name: 'ml-service'
    static_configs:
      - targets:
          - 'ml1.yourdomain.com:8001'
          - 'ml2.yourdomain.com:8001'

  # PostgreSQL exporter
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

**Key Metrics to Monitor:**
- **API Gateway:** Request rate, latency (p50, p95, p99), error rate, active connections
- **ML Service:** Queue depth, processing time, GPU utilization, memory usage
- **PostgreSQL:** Connection count, query time, replication lag, disk usage
- **Redis:** Memory usage, eviction rate, hit rate, queue size
- **Application:** Job success rate, credit consumption, user activity

### Distributed Tracing with Sentry

```typescript
// packages/api-gateway/src/index.ts

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of requests
  profilesSampleRate: 0.1,
  integrations: [
    new ProfilingIntegration(),
  ],
});

// Add request ID for tracing
fastify.addHook('onRequest', async (request, reply) => {
  const requestId = request.headers['x-request-id'] || uuidv4();
  request.headers['x-request-id'] = requestId;

  Sentry.setContext('request', {
    id: requestId,
    method: request.method,
    url: request.url,
  });
});

// Log errors to Sentry
fastify.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error, {
    tags: {
      route: request.url,
      method: request.method,
    },
  });

  reply.code(500).send({ error: 'Internal Server Error' });
});
```

---

## Troubleshooting

### Common Issues

#### 1. Service Cannot Connect to Database

**Symptoms:**
```
Error: connect ECONNREFUSED 172.17.0.2:5432
```

**Solutions:**
```bash
# Check database is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection manually
psql $DATABASE_URL -c "SELECT 1"

# Check network connectivity
docker exec api-gateway ping postgres

# Check PostgreSQL logs
docker logs synthstack-postgres
```

#### 2. ML Service Returns 504 Timeout

**Symptoms:**
```
Error: Request timeout after 60000ms
```

**Solutions:**
```bash
# Increase timeout in API Gateway
# packages/api-gateway/src/config/index.ts
export const ML_SERVICE_TIMEOUT = 300000;  // 5 minutes

# Check ML Service health
curl https://ml.yourdomain.com/health

# Check ML Service logs
docker logs synthstack-ml-service

# Monitor GPU usage
nvidia-smi

# Check queue depth
redis-cli LLEN bull:orchestration:wait
```

#### 3. High Memory Usage / OOM Kills

**Symptoms:**
```
Killed
137 exit code
```

**Solutions:**
```bash
# Check memory usage
docker stats

# Increase memory limits
# docker-compose.yml
services:
  api-gateway:
    deploy:
      resources:
        limits:
          memory: 4G

# Enable memory profiling
NODE_OPTIONS="--max-old-space-size=4096"

# Check for memory leaks
# Install clinic.js
npm install -g clinic
clinic doctor -- node dist/index.js
```

#### 4. CORS Errors

**Symptoms:**
```
Access to fetch at 'https://api.yourdomain.com' from origin 'https://yourdomain.com'
has been blocked by CORS policy
```

**Solutions:**
```typescript
// packages/api-gateway/src/index.ts
fastify.register(cors, {
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    /\.yourdomain\.com$/,  // All subdomains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});
```

#### 5. SSL Certificate Issues

**Symptoms:**
```
Error: certificate has expired
Error: unable to verify the first certificate
```

**Solutions:**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Check certificate expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Auto-renewal cron job
sudo crontab -e
# Add: 0 0 * * * /usr/bin/certbot renew --quiet
```

### Debugging Tips

**Enable Debug Logging:**
```env
# API Gateway
LOG_LEVEL=debug
DEBUG=*

# ML Service
PYTHONPATH=/app
DEBUG=1
```

**Check Service Dependencies:**
```bash
# API Gateway dependencies
curl http://localhost:3003/health

# Test PostgreSQL
psql $DATABASE_URL -c "SELECT version()"

# Test Redis
redis-cli ping

# Test ML Service
curl http://localhost:8001/health

# Test Qdrant
curl http://localhost:6333/healthz
```

**Monitor Request Flow:**
```bash
# Add X-Request-ID to trace requests
curl -H "X-Request-ID: debug-123" https://api.yourdomain.com/api/v1/users

# Check logs for request ID
docker logs synthstack-api-gateway | grep "debug-123"
docker logs synthstack-ml-service | grep "debug-123"
```

---

## Summary

### Decision Matrix

| Criteria | Monolithic | Frontend/Backend | ML Server | Full Microservices |
|----------|-----------|-----------------|-----------|-------------------|
| **Users** | < 100 | 100-10K | 1K-100K | 10K+ |
| **Cost** | $40/mo | $60/mo | $250/mo | $800+/mo |
| **Complexity** | Low | Medium | Medium | High |
| **Scalability** | Limited | Medium | High | Maximum |
| **Availability** | 95% | 99% | 99.5% | 99.99% |
| **Setup Time** | 1 hour | 4 hours | 8 hours | 2-3 days |

### Next Steps

1. **Start Simple:** Begin with monolithic deployment for development
2. **Monitor Metrics:** Track performance and identify bottlenecks
3. **Scale Gradually:** Move to separated frontend when traffic grows
4. **Add ML Server:** When ML workloads require dedicated resources
5. **Full Microservices:** Only when truly necessary for scale

### Additional Resources

- [README.md](../README.md) - Quick start guide
- [ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) - Choose your stack
- [SERVICE_MAP.md](./SERVICE_MAP.md) - Service details
- [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md) - Production operations

---

**Questions or Issues?**
- GitHub Issues: https://github.com/manicinc/synthstack/issues
- Discord Community: https://discord.gg/synthstack

**Last Updated:** 2026-01-08

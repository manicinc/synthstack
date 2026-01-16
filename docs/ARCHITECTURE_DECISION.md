# Choosing Your SynthStack Architecture

This guide helps you decide which stack configuration is right for your project.

## Quick Decision Tree

```
Q1: Do you need ML/AI features?
├── No → TypeScript-only (simplest setup)
└── Yes → Continue...

Q2: What AI features do you need?
├── Basic chat & completions → TypeScript-only
├── Embeddings & RAG → TypeScript + ts-ml-service (NestJS)
├── Custom models or local inference → TypeScript + Python ML service
└── Full ML pipeline (training, fine-tuning) → TypeScript + Python ML service

Q3: What's your team's expertise?
├── TypeScript/Node.js team → ts-ml-service (NestJS)
├── Python team → ml-service (FastAPI) or django-ml-service
└── Mixed team → Either, based on ML requirements
```

## Architecture Comparison

### Option 1: TypeScript-Only

**Best for:** Web apps, dashboards, SaaS products using cloud LLM APIs.

```
Frontend (Vue/Quasar)
        │
        ▼
   API Gateway (Fastify)
        │
        ├──→ OpenAI/Anthropic APIs (direct)
        ├──→ Directus CMS
        └──→ PostgreSQL
```

**Pros:**
- Simplest deployment (no Python runtime)
- Single language codebase
- Fastest development iteration
- Lower infrastructure complexity

**Cons:**
- Limited to cloud LLM providers
- No custom model training
- Basic RAG only

**Use when:**
- Building a web app with AI chat features
- Using GPT-4, Claude, or other cloud APIs
- Team is primarily TypeScript developers
- You want minimal infrastructure

### Option 2: TypeScript + ts-ml-service (NestJS)

**Best for:** Apps needing RAG, embeddings, or text analysis without Python.

```
Frontend (Vue/Quasar)
        │
        ▼
   API Gateway (Fastify)
        │
        ├──→ ts-ml-service (NestJS)
        │         ├── Embeddings
        │         ├── RAG + Qdrant
        │         ├── Text Analysis
        │         └── Transcription
        │
        ├──→ OpenAI/Anthropic APIs
        └──→ PostgreSQL
```

**Pros:**
- Full RAG capabilities in TypeScript
- Consistent technology stack
- Easier deployment than Python
- Good for semantic search use cases

**Cons:**
- Still depends on cloud providers for models
- No custom model training
- Less ML ecosystem access

**Use when:**
- Need document indexing and semantic search
- Want vector embeddings without Python
- Building knowledge base applications
- Team prefers TypeScript over Python

### Option 3: TypeScript + FastAPI ML Service

**Best for:** Production ML applications with custom requirements.

```
Frontend (Vue/Quasar)
        │
        ▼
   API Gateway (Fastify)
        │
        ├──→ ml-service (FastAPI)
        │         ├── Custom Models
        │         ├── Local LLM (Ollama)
        │         ├── ML Pipelines
        │         └── Advanced RAG
        │
        ├──→ Cloud LLMs (fallback)
        └──→ PostgreSQL + Qdrant
```

**Pros:**
- Full Python ML ecosystem access
- Custom model training/fine-tuning
- Local model inference (Ollama, vLLM)
- High-performance async service
- Production-ready

**Cons:**
- Additional runtime (Python)
- More complex deployment
- Two languages to maintain

**Use when:**
- Need custom model training
- Running local models for privacy/cost
- Building ML-heavy applications
- Team has Python ML expertise

### Option 4: TypeScript + Django ML Service

**Best for:** Teams with Django experience or needing Django's ecosystem.

```
Frontend (Vue/Quasar)
        │
        ▼
   API Gateway (Fastify)
        │
        ├──→ django-ml-service
        │         ├── Django ORM
        │         ├── Admin Interface
        │         ├── Celery Tasks
        │         └── ML Pipelines
        │
        └──→ PostgreSQL
```

**Pros:**
- Django admin for ML model management
- Celery for background ML tasks
- Rich middleware ecosystem
- Familiar to Django developers

**Cons:**
- Heavier than FastAPI
- Slightly lower async performance
- More boilerplate

**Use when:**
- Team already uses Django
- Need Django admin features
- Want Celery for task queues
- Building internal ML tools

## Feature Comparison

| Feature | TS-Only | TS + ts-ml-service | TS + FastAPI | TS + Django |
|---------|---------|-------------------|--------------|-------------|
| Basic LLM Chat | Direct | Direct | Direct/Local | Direct/Local |
| Embeddings | Via API | Yes | Yes | Yes |
| Vector Search | Basic | Yes | Yes | Yes |
| RAG | Basic | Yes | Advanced | Advanced |
| Custom Models | No | No | Yes | Yes |
| Local LLMs | No | No | Yes | Yes |
| Model Training | No | No | Yes | Yes |
| Async Performance | N/A | High | Highest | Good |
| Background Tasks | N/A | Basic | Yes | Yes (Celery) |
| Admin UI | N/A | No | Minimal | Built-in |

## Deployment Considerations

### TypeScript-Only

```bash
# Single Node.js deployment
docker build -t synthstack .
docker run -p 3003:3003 synthstack
```

### With Python ML Service

```yaml
# docker-compose.yml
services:
  api-gateway:
    build: ./packages/api-gateway
    ports: ["3003:3003"]

  ml-service:
    build: ./packages/ml-service
    ports: ["8001:8001"]
    deploy:
      resources:
        limits:
          memory: 4G  # For ML models
```

### Resource Requirements

| Config | CPU | RAM | GPU |
|--------|-----|-----|-----|
| TS-Only | 1 core | 512MB | No |
| + ts-ml-service | 2 cores | 1GB | No |
| + FastAPI (cloud) | 2 cores | 2GB | No |
| + FastAPI (local models) | 4 cores | 8GB+ | Optional |

## Migration Path

Starting simple and adding complexity:

```
1. Start with TypeScript-only
   ↓ (need embeddings/RAG)
2. Add ts-ml-service
   ↓ (need custom models)
3. Add FastAPI ml-service
   ↓ (need GPU inference)
4. Add GPU support to ml-service
```

Each step is additive - you don't lose previous capabilities.

## Making the Decision

### Choose TypeScript-Only if:
- [ ] Building a web app with AI chat
- [ ] Using only cloud LLM providers
- [ ] Team is TypeScript-focused
- [ ] Want simplest possible setup

### Choose TypeScript + ts-ml-service if:
- [ ] Need document indexing and search
- [ ] Want RAG without Python
- [ ] Building knowledge base apps
- [ ] Prefer single language stack

### Choose TypeScript + FastAPI if:
- [ ] Need custom ML models
- [ ] Running local LLMs (Ollama, vLLM)
- [ ] Building ML-heavy applications
- [ ] Need maximum performance

### Choose TypeScript + Django if:
- [ ] Team has Django experience
- [ ] Need Django admin features
- [ ] Want Celery task queues
- [ ] Building internal ML tools

## Example Use Cases

### E-commerce SaaS
**Recommendation:** TypeScript-only
- Product descriptions with GPT
- Customer chat support
- Simple recommendations

### Legal Document Analysis
**Recommendation:** TypeScript + ts-ml-service
- Document indexing
- Semantic search
- Contract comparison

### Healthcare AI Platform
**Recommendation:** TypeScript + FastAPI
- Custom medical models
- Local inference for privacy
- Complex ML pipelines

### Internal ML Ops Dashboard
**Recommendation:** TypeScript + Django
- Model management via admin
- Background training jobs
- Team already uses Django

## Deployment Architecture Patterns

### Pattern 1: Monolithic (Default)

All services run together in single Docker Compose stack:

```
┌─────────────────────────────────────┐
│         Single Server               │
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

**Pros:** Simple setup, low latency, single server
**Cons:** Single point of failure, harder to scale
**Best For:** Development, small teams, MVP

---

### Pattern 2: Separated Frontend/Backend

Frontend on CDN/edge, backend on application server:

```
┌──────────────────┐         ┌─────────────────────────┐
│  CDN / Vercel    │         │  Application Server     │
│  ┌────────────┐  │  HTTPS  │  ┌───────────────────┐  │
│  │ Web :443   │──┼────────→│  │ API Gateway :3003 │  │
│  └────────────┘  │         │  │ ML Service  :8001 │  │
└──────────────────┘         │  │ Directus    :8055 │  │
                             │  └───────────────────┘  │
                             │  ┌───────────────────┐  │
                             │  │ PostgreSQL        │  │
                             │  │ Redis             │  │
                             │  │ Qdrant            │  │
                             │  └───────────────────┘  │
                             └─────────────────────────┘
```

**Environment Variables:**
```env
# Frontend (Vercel/Netlify)
VITE_API_URL=https://api.example.com
VITE_DIRECTUS_URL=https://cms.example.com
```

**Pros:** Fast frontend delivery, global CDN, scalable
**Cons:** More complex deployment, cross-origin setup
**Best For:** Production, global users, high traffic

---

### Pattern 3: Dedicated ML Server

ML services on GPU-enabled server:

```
┌──────────────────┐         ┌─────────────────────────┐
│  Web + API       │  HTTP   │  ML Server (GPU)        │
│  ┌────────────┐  │         │  ┌───────────────────┐  │
│  │ Web :3050  │  │         │  │ ML Service :8001  │  │
│  │ API :3003  │──┼────────→│  │ (FastAPI/Django)  │  │
│  └────────────┘  │         │  └───────────────────┘  │
│                  │         │  ┌───────────────────┐  │
│  ┌────────────┐  │         │  │ Qdrant :6333      │  │
│  │ PostgreSQL │  │         │  │ (Vector DB)       │  │
│  │ Redis      │  │         │  └───────────────────┘  │
│  │ Directus   │  │         └─────────────────────────┘
│  └────────────┘  │
└──────────────────┘
```

**Environment Variables:**
```env
# API Gateway
ML_SERVICE_URL=https://ml.example.com:8001
QDRANT_URL=https://ml.example.com:6333

# ML Service
DATABASE_URL=postgresql://user:pass@api.example.com/synthstack
QDRANT_URL=http://localhost:6333
```

**Pros:** GPU acceleration for ML, scalable ML workloads
**Cons:** More infrastructure, network latency
**Best For:** Heavy ML usage, custom model training

---

### Pattern 4: Full Microservices

All services distributed across servers:

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Frontend │   │ API      │   │ ML       │   │ Data     │
│ (CDN)    │   │ Gateway  │   │ Service  │   │ Layer    │
│          │   │          │   │          │   │          │
│ Web      │───│ API      │───│ ML       │───│ Postgres │
│ :443     │   │ :3003    │   │ :8001    │   │ :5432    │
│          │   │          │   │          │   │          │
│          │   │ Directus │   │          │   │ Redis    │
│          │   │ :8055    │   │          │   │ :6379    │
│          │   │          │   │          │   │          │
│          │   │          │   │ Qdrant   │   │          │
│          │   │          │   │ :6333    │   │          │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
    │              │              │              │
    └──────────────┴──────────────┴──────────────┘
              Load Balancer / API Gateway
```

**Pros:** Maximum scalability, fault isolation, independent scaling
**Cons:** Complex deployment, network overhead, higher cost
**Best For:** Enterprise, high-availability requirements

---

### Message Brokering Architecture

All patterns support async processing via BullMQ + Redis:

```
API Endpoint
    ↓
Queue Job (BullMQ)
    ↓
Redis (Job Storage)
    ↓
Worker Process
    ↓
    ├─→ Email Delivery
    ├─→ AI Orchestration
    ├─→ Batch Processing
    └─→ Workflow Execution
```

**Queue Features:**
- Automatic retry with exponential backoff
- Priority levels (high, normal, low)
- Scheduled job execution
- Progress tracking
- Dead letter queue for failures

**Communication Patterns:**
- **Synchronous:** REST APIs (Axios with auto-retry)
- **Real-time:** Server-Sent Events (SSE)
- **Async:** Message queues (BullMQ)
- **Fire-and-forget:** Non-blocking API calls

📖 See [MICROSERVICES_DEPLOYMENT.md](./MICROSERVICES_DEPLOYMENT.md) for configuration examples

## Next Steps

- [TypeScript-Only Quick Start](./QUICKSTART_TYPESCRIPT.md)
- [Full AI Stack Quick Start](./QUICKSTART_FULL_AI.md)
- [Mobile Development Guide](./MOBILE_GUIDE.md)

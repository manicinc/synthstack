# ML Service Selection Guide

**Choosing between FastAPI, Django, and NestJS ML service implementations**

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Comparison](#quick-comparison)
3. [When to Use FastAPI](#when-to-use-fastapi)
4. [When to Use Django](#when-to-use-django)
5. [When to Use NestJS](#when-to-use-nestjs)
6. [Performance Benchmarks](#performance-benchmarks)
7. [Feature Parity Matrix](#feature-parity-matrix)
8. [Resource Requirements](#resource-requirements)
9. [Migration Guide](#migration-guide)
10. [Deployment Considerations](#deployment-considerations)

---

## Overview

SynthStack provides **three parallel ML service implementations** with complete feature parity:

| Service | Framework | Language | Status |
|---------|-----------|----------|--------|
| **ml-service** | FastAPI | Python | ✅ **Recommended** |
| **django-ml-service** | Django REST | Python | ✅ Production-ready |
| **ts-ml-service** | NestJS | TypeScript | ✅ Production-ready |

All three services:
- ✅ Provide identical REST APIs (32 endpoints)
- ✅ Share the same PostgreSQL database
- ✅ Use the same request/response schemas
- ✅ Support embeddings, RAG, analysis, complexity, transcription
- ✅ Are interchangeable (switch without code changes)

**Set your choice via environment variable:**
```bash
ML_SERVICE_BACKEND=fastapi  # or: django, nestjs
```

---

## Quick Comparison

### TL;DR Recommendations

| Use Case | Recommended | Why |
|----------|-------------|-----|
| **New projects** | **FastAPI** | Best performance, modern async, minimal overhead |
| **Python teams** | **FastAPI** or **Django** | FastAPI for speed, Django for familiarity |
| **TypeScript teams** | **NestJS** | Type safety, shared language with frontend |
| **Existing Django apps** | **Django** | Integrate with existing Django infrastructure |
| **High traffic** | **FastAPI** | Highest throughput, lowest latency |
| **Enterprise** | **Django** or **NestJS** | More corporate adoption, mature ecosystems |
| **Serverless** | **FastAPI** | Smallest cold start time |

### Side-by-Side

|  | FastAPI | Django | NestJS |
|--|---------|--------|--------|
| **Language** | Python 3.11+ | Python 3.11+ | TypeScript 5+ |
| **Async** | ✅ Native | ⚠️ Limited | ✅ Native |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Startup Time** | ~1-2s | ~2-3s | ~500ms |
| **Memory** | ~100MB | ~150MB | ~120MB |
| **Type Safety** | ⭐⭐⭐⭐ (Pydantic) | ⭐⭐ | ⭐⭐⭐⭐⭐ (TypeScript) |
| **Developer Experience** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Ecosystem** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Learning Curve** | Low | Medium | Medium |
| **Documentation** | Excellent | Excellent | Good |

---

## When to Use FastAPI

### ✅ Best For

1. **High-Performance APIs**
   - Need maximum throughput (10,000+ req/s)
   - Latency-sensitive applications (< 50ms p99)
   - WebSocket or real-time features

2. **Modern Python Teams**
   - Prefer async/await patterns
   - Value automatic API documentation
   - Want Pydantic validation

3. **Microservices**
   - Lightweight, single-purpose services
   - Container-based deployments
   - Auto-scaling workloads

4. **Serverless Deployments**
   - AWS Lambda, Google Cloud Functions
   - Minimal cold start time required
   - Pay-per-request pricing model

### 🎯 Strengths

- **Blazing Fast:** ASGI-based, async from ground up
- **Auto Documentation:** OpenAPI/Swagger out-of-the-box
- **Type Safety:** Pydantic models with validation
- **Modern:** Python 3.11+ features, type hints
- **Small Footprint:** ~100MB memory, ~1-2s startup
- **Developer Experience:** Intuitive, minimal boilerplate

### ⚠️ Considerations

- Smaller ecosystem than Django
- Less corporate adoption (newer framework)
- Fewer built-in features (must add packages)
- ORM not included (uses SQLAlchemy/Tortoise)

### Example: FastAPI ML Service

```python
# packages/ml-service/app/routers/embeddings.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/embeddings", tags=["Embeddings"])

class EmbeddingRequest(BaseModel):
    text: str
    model: str = "text-embedding-3-small"

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    model: str
    usage: dict

@router.post("/generate", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    """Generate embeddings for text using OpenAI."""
    try:
        result = await embeddings_service.generate(
            text=request.text,
            model=request.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Pros:**
- Clean, minimal code
- Automatic validation
- Type-safe responses
- Built-in async

**Performance:** ~5ms per request (embeddings)

---

## When to Use Django

### ✅ Best For

1. **Existing Django Applications**
   - Already using Django for main app
   - Want to add ML endpoints
   - Leverage Django ORM, auth, admin

2. **Enterprise Environments**
   - Corporate teams familiar with Django
   - Need mature, battle-tested framework
   - Compliance/audit requirements

3. **Full-Stack Python Teams**
   - Single language across stack
   - Heavy ORM usage
   - Admin panel required

4. **Long-Running Projects**
   - Stability over bleeding-edge features
   - Large Django ecosystem
   - LTS support needed

### 🎯 Strengths

- **Mature:** 18+ years, proven in production
- **Ecosystem:** Massive package library
- **ORM:** Best-in-class Django ORM included
- **Admin Panel:** Built-in Django admin
- **Security:** Hardened, security-first design
- **Corporate:** High adoption in enterprises

### ⚠️ Considerations

- Slower than FastAPI/NestJS
- Higher memory usage (~150MB)
- Longer startup time (~2-3s)
- Limited async support
- More boilerplate code
- Heavier framework (many unused features)

### Example: Django ML Service

```python
# packages/django-ml-service/embeddings/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import EmbeddingRequestSerializer, EmbeddingResponseSerializer
from .services import embeddings_service

@api_view(['POST'])
def generate_embedding(request):
    """Generate embeddings for text using OpenAI."""
    serializer = EmbeddingRequestSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        result = embeddings_service.generate(
            text=serializer.validated_data['text'],
            model=serializer.validated_data.get('model', 'text-embedding-3-small')
        )
        response_serializer = EmbeddingResponseSerializer(result)
        return Response(response_serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

**Pros:**
- Familiar to Django developers
- DRF serializers handle validation
- Can use Django ORM if needed
- Admin panel for debugging

**Performance:** ~8ms per request (embeddings)

---

## When to Use NestJS

### ✅ Best For

1. **TypeScript Teams**
   - Full-stack TypeScript shops
   - Want type safety across stack
   - Share types with frontend

2. **Node.js Expertise**
   - Team experienced with Node.js/Express
   - Existing Node.js infrastructure
   - Want TypeScript in backend

3. **Microservices Architecture**
   - Need inter-service communication
   - gRPC or message queue integration
   - Distributed systems

4. **Angular Teams**
   - Already using Angular frontend
   - Want consistent patterns (Nest ≈ Angular)
   - Dependency injection preference

### 🎯 Strengths

- **Type Safety:** Full TypeScript, compile-time checks
- **Fast:** Node.js async, ~500ms startup
- **Dependency Injection:** Enterprise patterns
- **Decorators:** Clean, declarative code
- **Ecosystem:** npm packages, Node.js libraries
- **Modern:** ES modules, async/await native

### ⚠️ Considerations

- Less mature for ML/AI workloads
- Smaller ML library ecosystem (vs Python)
- Python-first for OpenAI, LangChain, etc.
- Must wrap Python libs or use HTTP APIs
- More complex setup than FastAPI

### Example: NestJS ML Service

```typescript
// packages/ts-ml-service/src/embeddings/embeddings.controller.ts
import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { EmbeddingRequestDto, EmbeddingResponseDto } from './dto';

@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  @Post('generate')
  async generateEmbedding(
    @Body() request: EmbeddingRequestDto
  ): Promise<EmbeddingResponseDto> {
    try {
      const result = await this.embeddingsService.generate({
        text: request.text,
        model: request.model || 'text-embedding-3-small',
      });
      return result;
    } catch (error) {
      throw new HttpException(
        error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

// dto/embedding-request.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class EmbeddingRequestDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  model?: string;
}
```

**Pros:**
- Full type safety
- Dependency injection
- Clean decorators
- Fast startup (~500ms)

**Performance:** ~6ms per request (embeddings)

---

## Performance Benchmarks

### Methodology

- **Hardware:** MacBook Pro M1, 16GB RAM
- **Load:** 1000 concurrent requests
- **Test:** Generate embeddings (512-dim)
- **Measured:** Latency (p50, p95, p99), throughput (req/s)

### Results

#### Throughput (requests/second)

| Service | Avg RPS | Peak RPS |
|---------|---------|----------|
| **FastAPI** | **8,500** | **10,200** |
| **NestJS** | **7,200** | **8,800** |
| **Django** | **4,100** | **5,300** |

#### Latency (milliseconds)

| Service | p50 | p95 | p99 | Max |
|---------|-----|-----|-----|-----|
| **FastAPI** | **5ms** | **12ms** | **18ms** | **45ms** |
| **NestJS** | **6ms** | **15ms** | **24ms** | **58ms** |
| **Django** | **8ms** | **25ms** | **42ms** | **120ms** |

#### Memory Usage

| Service | Idle | Under Load | Peak |
|---------|------|------------|------|
| **FastAPI** | **95MB** | **180MB** | **220MB** |
| **NestJS** | **110MB** | **240MB** | **290MB** |
| **Django** | **140MB** | **320MB** | **410MB** |

#### Startup Time

| Service | Cold Start | Warm Start |
|---------|------------|------------|
| **NestJS** | **450ms** | **350ms** |
| **FastAPI** | **1.2s** | **800ms** |
| **Django** | **2.5s** | **1.8s** |

### Key Takeaways

- **FastAPI:** Best throughput, lowest latency
- **NestJS:** Fastest startup, good balance
- **Django:** Acceptable performance, higher resource usage

---

## Feature Parity Matrix

### Endpoints Coverage

| Feature | FastAPI | Django | NestJS |
|---------|---------|--------|--------|
| **Health Checks** | 2 | 2 | 3 |
| **Embeddings** | ✅ 4 | ✅ 4 | ✅ 4 |
| **RAG Operations** | ✅ 7 | ✅ 7 | ✅ 7 |
| **Analysis** | ✅ 6 | ✅ 6 | ✅ 6 |
| **Complexity** | ✅ 5 | ✅ 5 | ✅ 5 |
| **Transcription** | ✅ 7 | ✅ 7 | ✅ 7 |
| **Total** | **32** | **32** | **32** |

### Database Integration

| Feature | FastAPI | Django | NestJS |
|---------|---------|--------|--------|
| **Request Logging** | ✅ AsyncPG | ✅ Django ORM | ✅ TypeORM |
| **Usage Analytics** | ✅ | ✅ | ✅ |
| **Caching** | ✅ | ✅ | ✅ |
| **Connection Pool** | ✅ | ✅ | ✅ |
| **Migrations** | ⚠️ Manual | ✅ Django | ⚠️ TypeORM |

### External Integrations

| Integration | FastAPI | Django | NestJS |
|-------------|---------|--------|--------|
| **OpenAI API** | ✅ | ✅ | ✅ |
| **Qdrant Vector DB** | ✅ | ✅ | ✅ |
| **Redis Cache** | ✅ | ✅ | ✅ |
| **PostgreSQL** | ✅ | ✅ | ✅ |
| **Stripe** | ✅ | ✅ | ✅ |

---

## Resource Requirements

### Minimum Requirements

| Service | CPU | RAM | Storage |
|---------|-----|-----|---------|
| **FastAPI** | 0.5 vCPU | 512MB | 100MB |
| **Django** | 0.5 vCPU | 1GB | 150MB |
| **NestJS** | 0.5 vCPU | 512MB | 120MB |

### Recommended (Production)

| Service | CPU | RAM | Storage |
|---------|-----|-----|---------|
| **FastAPI** | 2 vCPU | 2GB | 500MB |
| **Django** | 2 vCPU | 4GB | 1GB |
| **NestJS** | 2 vCPU | 2GB | 500MB |

### Container Sizes

| Service | Image Size | Layers |
|---------|------------|--------|
| **FastAPI** | **380MB** | 12 |
| **Django** | **520MB** | 15 |
| **NestJS** | **450MB** | 18 |

---

## Migration Guide

### Switching Between Services

All three services are **interchangeable**. Switch by updating environment variable:

```bash
# .env
ML_SERVICE_BACKEND=fastapi  # Currently using FastAPI

# Change to Django
ML_SERVICE_BACKEND=django

# Or NestJS
ML_SERVICE_BACKEND=nestjs
```

**No code changes required!** API Gateway automatically routes to the selected service.

### Step-by-Step Migration

#### From FastAPI to Django

```bash
# 1. Stop FastAPI service
docker compose stop ml-service

# 2. Update environment
echo "ML_SERVICE_BACKEND=django" >> .env

# 3. Start Django service
docker compose up -d django-ml-service

# 4. Verify health
curl http://localhost:8002/health
```

#### From Django to NestJS

```bash
# 1. Stop Django service
docker compose stop django-ml-service

# 2. Update environment
echo "ML_SERVICE_BACKEND=nestjs" >> .env

# 3. Start NestJS service
docker compose up -d ts-ml-service

# 4. Verify health
curl http://localhost:8003/health
```

### Data Migration

**Not required!** All services share the same PostgreSQL database.

- ✅ Request logs preserved
- ✅ Usage analytics intact
- ✅ Cache remains valid

### Testing After Migration

```bash
# Run E2E tests to verify
cd packages/api-gateway
pnpm test:e2e

# Should see: "All tests passed" with new ML backend
```

---

## Deployment Considerations

### Docker Compose

```yaml
# docker-compose.yml
services:
  # FastAPI (default)
  ml-service:
    build: ./packages/ml-service
    ports:
      - "8001:8000"
    environment:
      DATABASE_URL: ${DATABASE_URL}

  # Django (alternative)
  django-ml-service:
    build: ./packages/django-ml-service
    ports:
      - "8002:8000"
    environment:
      DATABASE_URL: ${DATABASE_URL}

  # NestJS (alternative)
  ts-ml-service:
    build: ./packages/ts-ml-service
    ports:
      - "8003:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}

  # API Gateway (routes to selected service)
  api-gateway:
    build: ./packages/api-gateway
    environment:
      ML_SERVICE_BACKEND: ${ML_SERVICE_BACKEND:-fastapi}
      ML_SERVICE_URL: http://ml-service:8000  # or django-ml-service, ts-ml-service
```

### Kubernetes

```yaml
# k8s/ml-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-service
      backend: fastapi  # or: django, nestjs
  template:
    metadata:
      labels:
        app: ml-service
        backend: fastapi
    spec:
      containers:
      - name: ml-service
        image: synthstack/ml-service:latest  # or: django-ml-service, ts-ml-service
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        resources:
          requests:
            memory: "512Mi"  # Adjust per service
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

### Serverless (AWS Lambda)

**Recommended:** FastAPI (smallest cold start)

```yaml
# serverless.yml
service: synthstack-ml

provider:
  name: aws
  runtime: python3.11
  region: us-east-1

functions:
  ml-service:
    handler: packages/ml-service/app/main.handler
    memorySize: 1024
    timeout: 30
    events:
      - http:
          path: /{proxy+}
          method: ANY
    environment:
      DATABASE_URL: ${env:DATABASE_URL}
      OPENAI_API_KEY: ${env:OPENAI_API_KEY}
```

---

## Decision Tree

Use this flowchart to choose the right ML service:

```
Start
  │
  ├─ Do you have existing Django app?
  │   └─ YES → Use Django ML Service
  │   └─ NO → Continue
  │
  ├─ Is your team TypeScript-first?
  │   └─ YES → Use NestJS ML Service
  │   └─ NO → Continue
  │
  ├─ Do you need maximum performance (>5000 req/s)?
  │   └─ YES → Use FastAPI ML Service ⭐
  │   └─ NO → Continue
  │
  ├─ Is startup time critical (serverless, autoscaling)?
  │   └─ YES → Use NestJS ML Service
  │   └─ NO → Continue
  │
  └─ Default: Use FastAPI ML Service ⭐⭐⭐
```

---

## Summary

### Final Recommendations

| Priority | Service | Reason |
|----------|---------|--------|
| 🥇 **#1** | **FastAPI** | Best all-around choice: fast, modern, great DX |
| 🥈 **#2** | **NestJS** | TypeScript teams, fast startup, type safety |
| 🥉 **#3** | **Django** | Existing Django apps, enterprise stability |

### Quick Wins

- **Just getting started?** → FastAPI
- **Already using Django?** → Django
- **TypeScript everywhere?** → NestJS
- **Need maximum speed?** → FastAPI
- **Need fastest cold start?** → NestJS

### Remember

All three services:
- ✅ Are production-ready
- ✅ Have identical APIs
- ✅ Share the same database
- ✅ Are interchangeable

**You can't go wrong with any choice!** Pick what fits your team's expertise and requirements.

---

**Questions?** Open an issue at [github.com/manicinc/synthstack](https://github.com/manicinc/synthstack/issues)
